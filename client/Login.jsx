import { useState } from "react";
import { login, signup } from "./services/auth";
import "./index.css";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Name is required to sign up");
      return;
    }

    setLoading(true);
    try {
      const authData =
        mode === "signup"
          ? await signup({ name: name.trim(), email: email.trim(), password })
          : await login({ email: email.trim(), password });
      onLogin(authData);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-box">
        <h2>{mode === "signup" ? "Create account" : "Sign in"}</h2>
        <p className="login-subtitle">
          {mode === "signup"
            ? "Create an account to access your tasks."
            : "Sign in with your email and password."}
        </p>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={submit} className="login-form">
          {mode === "signup" && (
            <label>
              Name
              <input
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </label>
          )}
          <label>
            Email
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </label>
          <div className="login-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </div>
        </form>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError("");
          }}
        >
          {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
