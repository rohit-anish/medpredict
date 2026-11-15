// Small client for the MedPredict backend.
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TOKEN_KEY = "token";
const USER_KEY = "username";

export const session = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  get username() {
    return localStorage.getItem(USER_KEY);
  },
  save({ token, username }) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, username);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status; // 0 = network error (server unreachable)
  }
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && session.token) headers.Authorization = `Bearer ${session.token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      import.meta.env.DEV
        ? "Can't reach the server. Start the backend: cd backend && uvicorn main:app --port 8000"
        : "Can't reach the server right now. It may be waking up — please try again in a minute.",
      0,
    );
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((d) => d.msg).join(", ")
      : data.detail;
    throw new ApiError(detail || `Request failed (${res.status})`, res.status);
  }
  return data;
}
