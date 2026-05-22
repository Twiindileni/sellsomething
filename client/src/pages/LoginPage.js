import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [user, authLoading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) throw authError;

      setSuccess("Logged in! Redirecting…");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setError(err.message || "Login failed. Check your email and password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sell-page">
      <div className="sell-header">
        <h1 className="sell-title">Welcome Back</h1>
        <p className="sell-sub">Log in to your account to manage your listings.</p>
      </div>

      {success && <div className="success-banner">✅ {success}</div>}
      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="sell-form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Logging in…" : "Log In"}
          </button>

          <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.9rem", color: "var(--muted)" }}>
            Don't have an account?{" "}
            <Link to="/signup" style={{ color: "var(--accent)", fontWeight: "600", textDecoration: "none" }}>
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
