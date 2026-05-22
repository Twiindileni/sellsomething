import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
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

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
        },
      });

      if (authError) throw authError;

      if (data.session) {
        setSuccess("Account created! Redirecting…");
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        setSuccess(
          "Account created! Check your email to confirm your address, then log in."
        );
      }
    } catch (err) {
      setError(err.message || "Sign up failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sell-page">
      <div className="sell-header">
        <h1 className="sell-title">Create an Account</h1>
        <p className="sell-sub">Join us to start buying and selling.</p>
      </div>

      {success && <div className="success-banner">✅ {success}</div>}
      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="sell-form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              disabled={submitting}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Creating account…" : "Sign Up"}
          </button>

          <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.9rem", color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--accent)", fontWeight: "600", textDecoration: "none" }}>
              Log In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
