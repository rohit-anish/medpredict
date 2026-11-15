"""
User accounts and sessions for MedPredict.

- Storage: if DATABASE_URL is set (postgres://… or postgresql://…), users are kept
  in that Postgres database — use this in production. Otherwise they go in a
  local SQLite file (medpredict.db next to this module) for development.
- Passwords are hashed with salted PBKDF2-HMAC-SHA256 (stdlib).
- Login issues a random opaque session token stored server-side with an expiry.
  Clients send it as `Authorization: Bearer <token>`.
"""

import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

DB_PATH = Path(os.environ.get("MEDPREDICT_DB", Path(__file__).parent / "medpredict.db"))
SESSION_TTL_SECONDS = 7 * 24 * 3600
PBKDF2_ITERATIONS = 310_000
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,32}$")
MIN_PASSWORD_LEN = 6
MAX_PASSWORD_LEN = 128

router = APIRouter(tags=["auth"])


# ── Database ───────────────────────────────────────────────────────────────────
# Queries below are written once with "?" placeholders and run on either backend.
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
USE_POSTGRES = DATABASE_URL.startswith(("postgres://", "postgresql://"))

if USE_POSTGRES:
    import psycopg
    from psycopg.rows import dict_row

    INTEGRITY_ERRORS = (sqlite3.IntegrityError, psycopg.IntegrityError)
else:
    INTEGRITY_ERRORS = (sqlite3.IntegrityError,)


class _PostgresConn:
    """Thin adapter so Postgres accepts the same "?"-style SQL as sqlite3."""

    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql, params=()):
        return self._conn.execute(sql.replace("?", "%s"), params)


@contextmanager
def db():
    if USE_POSTGRES:
        # prepare_threshold=None keeps this compatible with Neon's pooled (PgBouncer) URLs.
        raw = psycopg.connect(DATABASE_URL, row_factory=dict_row, prepare_threshold=None)
        conn = _PostgresConn(raw)
    else:
        raw = sqlite3.connect(DB_PATH)
        raw.row_factory = sqlite3.Row
        raw.execute("PRAGMA foreign_keys = ON")
        conn = raw
    try:
        yield conn
        raw.commit()
    finally:
        raw.close()  # closing without commit rolls back


SQLITE_SCHEMA = [
    """CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        salt          TEXT NOT NULL,
        created_at    INTEGER NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS sessions (
        token      TEXT PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
    )""",
]

POSTGRES_SCHEMA = [
    """CREATE TABLE IF NOT EXISTS users (
        id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        username      TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        salt          TEXT NOT NULL,
        created_at    BIGINT NOT NULL
    )""",
    # Usernames are unique regardless of case ("Alice" == "alice").
    "CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower ON users (LOWER(username))",
    """CREATE TABLE IF NOT EXISTS sessions (
        token      TEXT PRIMARY KEY,
        user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL
    )""",
    "CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions (user_id)",
]


def init_db():
    with db() as conn:
        for statement in POSTGRES_SCHEMA if USE_POSTGRES else SQLITE_SCHEMA:
            conn.execute(statement)


# ── Password hashing ───────────────────────────────────────────────────────────
def hash_password(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS).hex()


def verify_password(password: str, salt_hex: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password, bytes.fromhex(salt_hex)), expected_hash)


# Hash computed once so failed logins for unknown users take the same time
# as for known users (avoids revealing which usernames exist).
_DUMMY_SALT = secrets.token_hex(16)
_DUMMY_HASH = hash_password("dummy-password", bytes.fromhex(_DUMMY_SALT))


# ── Sessions ───────────────────────────────────────────────────────────────────
def create_session(conn, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    now = int(time.time())
    conn.execute("DELETE FROM sessions WHERE expires_at < ?", (now,))
    conn.execute(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
        (token, user_id, now + SESSION_TTL_SECONDS),
    )
    return token


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Not signed in", headers={"WWW-Authenticate": "Bearer"}
        )
    return authorization[7:].strip()


def current_user(authorization: str | None = Header(default=None)) -> dict:
    """FastAPI dependency: resolves the Bearer token to a user or raises 401."""
    token = _bearer(authorization)
    with db() as conn:
        row = conn.execute(
            """SELECT u.id, u.username, u.created_at FROM sessions s
               JOIN users u ON u.id = s.user_id
               WHERE s.token = ? AND s.expires_at > ?""",
            (token, int(time.time())),
        ).fetchone()
    if not row:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Session expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return dict(row)


# ── Schemas ────────────────────────────────────────────────────────────────────
class Credentials(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    username: str
    expires_in: int = SESSION_TTL_SECONDS


# ── Routes ─────────────────────────────────────────────────────────────────────
@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(creds: Credentials):
    username = creds.username.strip()
    if not USERNAME_RE.match(username):
        raise HTTPException(
            422,
            "Username must be 3–32 characters: letters, numbers, dot, dash or underscore.",
        )
    if not (MIN_PASSWORD_LEN <= len(creds.password) <= MAX_PASSWORD_LEN):
        raise HTTPException(
            422,
            f"Password must be {MIN_PASSWORD_LEN}–{MAX_PASSWORD_LEN} characters.",
        )

    salt = secrets.token_bytes(16)
    with db() as conn:
        try:
            user_id = conn.execute(
                "INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?) RETURNING id",
                (username, hash_password(creds.password, salt), salt.hex(), int(time.time())),
            ).fetchall()[0]["id"]
        except INTEGRITY_ERRORS:
            raise HTTPException(status.HTTP_409_CONFLICT, "That username is already taken.")
        token = create_session(conn, user_id)
    return AuthResponse(token=token, username=username)


@router.post("/login", response_model=AuthResponse)
def login(creds: Credentials):
    with db() as conn:
        row = conn.execute(
            "SELECT id, username, password_hash, salt FROM users WHERE LOWER(username) = LOWER(?)",
            (creds.username.strip(),),
        ).fetchone()
        if row is None:
            verify_password(creds.password, _DUMMY_SALT, _DUMMY_HASH)  # equalise timing
            ok = False
        else:
            ok = verify_password(creds.password, row["salt"], row["password_hash"])
        if not ok:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password.")
        token = create_session(conn, row["id"])
    return AuthResponse(token=token, username=row["username"])


@router.get("/me")
def me(user: dict = Depends(current_user)):
    return {"username": user["username"], "created_at": user["created_at"]}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(authorization: str | None = Header(default=None)):
    token = _bearer(authorization)
    with db() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


init_db()
