import { useState } from "react";
import { useExpenses } from "../context/ExpenseContext";
import "./Auth.css";

function Auth() {
  const { authenticate } = useExpenses();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await authenticate(mode, mode === "signup" ? { name, email, password } : { email, password });
    } catch (authError) {
      setError(authError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

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
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="auth-subtitle">
            {mode === "login" ? "Sign in to view your expense dashboard" : "Start your personal finance journey"}
          </p>

          {mode === "signup" && (
            <label>
              Full name
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your name" autoComplete="name" />
            </label>
          )}
          <label>
            Email address
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>

          <p className="auth-switch">
            {mode === "login" ? "New to Expenso?" : "Already have an account?"}
            <button type="button" onClick={() => switchMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Auth;
