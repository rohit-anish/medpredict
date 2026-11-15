import { useState } from "react";
import { api, session } from "./api";
import { Brand, Icon, EcgLine } from "./ui";

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;

export default function Login({ onLogin, onBack, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode); // login | register
  const [form, setForm] = useState({ username: "", password: "", confirm: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const isLogin = mode === "login";
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function switchMode(next) {
    setMode(next);
    setError(null);
    setForm((f) => ({ ...f, password: "", confirm: "" }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const username = form.username.trim();
    if (!username || !form.password) return setError("Enter a username and password.");
    if (!isLogin) {
      if (!USERNAME_RE.test(username))
        return setError("Username must be 3–32 characters: letters, numbers, dot, dash or underscore.");
      if (form.password.length < 6) return setError("Password must be at least 6 characters.");
      if (form.password !== form.confirm) return setError("Passwords do not match.");
    }

    setLoading(true);
    try {
      // Both endpoints return { token, username }; registering signs you straight in.
      const data = await api(isLogin ? "/login" : "/register", {
        method: "POST",
        body: { username, password: form.password },
        auth: false,
      });
      session.save(data);
      onLogin(data.username);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <div className="login-left">
        <Brand onClick={onBack} />
        <div>
          <EcgLine className="login-ecg" height={64} />
          <h1 style={{ marginTop: 28 }}>
            Vital signs in.
            <br />
            <span>Clear risk out.</span>
          </h1>
          <p>Record ten routine measurements and receive a risk assessment with graded clinical alerts.</p>
        </div>
        <ul className="login-checks">
          <li><Icon name="check" size={18} /> Checked against adult reference ranges</li>
          <li><Icon name="shield" size={18} /> Passwords stored as salted hashes</li>
          <li><Icon name="info" size={18} /> Educational tool, not for diagnosis</li>
        </ul>
      </div>

      <div className="login-right">
        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <button type="button" className="link back-link" onClick={onBack}>
            ← Back to home
          </button>

          <div className="login-switch">
            <button type="button" className={isLogin ? "active" : ""} onClick={() => switchMode("login")}>
              Sign in
            </button>
            <button type="button" className={!isLogin ? "active" : ""} onClick={() => switchMode("register")}>
              Register
            </button>
          </div>

          <h2>{isLogin ? "Welcome back" : "Create account"}</h2>
          <p className="sub">
            {isLogin ? "Sign in with your MedPredict account." : "It takes ten seconds. No email needed."}
          </p>


          <label htmlFor="username">Username</label>
          <input
            id="username"
            className="text-input"
            autoComplete="username"
            autoFocus
            value={form.username}
            onChange={set("username")}
            placeholder={isLogin ? "" : "e.g. dr.rao"}
          />

          <label htmlFor="password" style={{ marginTop: 18 }}>
            Password
          </label>
          <div className="pw-wrap">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              className="text-input"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={form.password}
              onChange={set("password")}
              placeholder={isLogin ? "" : "At least 6 characters"}
            />
            <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => !s)}>
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {!isLogin && (
            <>
              <label htmlFor="confirm" style={{ marginTop: 18 }}>
                Confirm password
              </label>
              <input
                id="confirm"
                type={showPw ? "text" : "password"}
                className="text-input"
                autoComplete="new-password"
                value={form.confirm}
                onChange={set("confirm")}
              />
            </>
          )}

          {error && <div className="error">{error}</div>}

          <button type="submit" className="btn" style={{ marginTop: 24 }} disabled={loading}>
            {loading ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
            {!loading && <span className="arrow">→</span>}
          </button>

          <button type="button" className="link" onClick={() => switchMode(isLogin ? "register" : "login")}>
            {isLogin ? "No account? Register" : "Have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
