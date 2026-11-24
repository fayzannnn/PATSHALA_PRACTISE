import { useState } from "react";
import { useExpenses } from "../context/ExpenseContext";
import "./Auth.css";

function Auth() {
  const { authenticate, requestPasswordReset, resetPassword, logout } = useExpenses();
  const resetToken = new URLSearchParams(window.location.search).get("resetToken");
  const [mode, setMode] = useState(resetToken ? "reset" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      if (mode === "forgot") {
        const result = await requestPasswordReset(email);
        setNotice(result.message);
      } else if (mode === "reset") {
        const result = await resetPassword(resetToken, password);
        window.history.replaceState({}, "", window.location.pathname);
        logout();
        setPassword("");
        setMode("login");
        setNotice(result.message);
      } else {
        await authenticate(mode, mode === "signup" ? { name, email, password } : { email, password });
      }
    } catch (authError) {
      setError(authError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
  }

  const title = {
    login: "Welcome back",
    signup: "Create your account",
    forgot: "Forgot your password?",
    reset: "Choose a new password",
  }[mode];
  const subtitle = {
    login: "Sign in to view your expense dashboard",
    signup: "Start your personal finance journey",
    forgot: "Enter your email and we’ll send you a reset link",
    reset: "Choose a new password for your account",
  }[mode];
  const submitLabel = {
    login: "Sign in",
    signup: "Create account",
    forgot: "Send reset link",
    reset: "Update password",
  }[mode];

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-brand"><span>E</span> Expenso</div>
        <div className="auth-visual-copy">
          <p>SMARTER MONEY MANAGEMENT</p>
          <h1>Take control of every rupee.</h1>
          <span>Track spending, set budgets and understand your money with clear insights.</span>
        </div>
        <div className="auth-decoration auth-decoration-one" />
        <div className="auth-decoration auth-decoration-two" />
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-mobile-brand"><span>E</span> Expenso</div>
          <h2>{title}</h2>
          <p className="auth-subtitle">{subtitle}</p>

          {mode === "signup" && (
            <label>
              Full name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your name" autoComplete="name" required />
            </label>
          )}
          {mode !== "reset" && (
            <label>
              Email address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </label>
          )}
          {mode !== "forgot" && (
            <label>
              {mode === "reset" ? "New password" : "Password"}
              <span className="auth-password-control">
                <input
                  className="auth-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={6}
                  required
                />
                <button
                  className="auth-password-toggle"
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a14 14 0 0 1-3.1 3.8M6.2 6.2C3.9 7.8 2 12 2 12s3.5 7 10 7a10 10 0 0 0 3-.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </span>
            </label>
          )}

          {(mode === "login" || mode === "signup") && (
            <div className="auth-forgot-wrap">
              <button type="button" className="auth-forgot-link" onClick={() => switchMode("forgot")}>
                Forgot password?
              </button>
            </div>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Please wait..." : submitLabel}
          </button>

          {mode === "login" || mode === "signup" ? (
            <p className="auth-switch">
              {mode === "login" ? "New to Expenso?" : "Already have an account?"}
              <button type="button" onClick={() => switchMode(mode === "login" ? "signup" : "login")}>
                {mode === "login" ? "Create account" : "Sign in"}
              </button>
            </p>
          ) : (
            <p className="auth-switch">
              Remember your password?
              <button type="button" onClick={() => switchMode("login")}>Back to sign in</button>
            </p>
          )}
        </form>
      </section>
    </main>
  );
}

export default Auth;
