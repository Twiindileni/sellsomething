import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/auth/callback` }
      );
      if (authError) throw authError;
      setSent(true);
    } catch (err) {
      setError(err.message || "Could not send reset email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sell-page">
      <div className="sell-header">
        <h1 className="sell-title">Forgot password?</h1>
        <p className="sell-sub">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {sent ? (
        <div className="sell-form-container">
          <div className="success-banner" style={{ marginBottom: "1.5rem" }}>
            ✅ Check your inbox — we sent a password reset link to <strong>{email}</strong>.
          </div>
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Click <strong>Reset my password</strong> in the email. You&apos;ll be taken to the website to choose a new password.
          </p>
          <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <Link to="/login" style={{ color: "var(--accent)", fontWeight: "600", textDecoration: "none" }}>
              ← Back to Log In
            </Link>
          </p>
        </div>
      ) : (
        <div className="sell-form-container">
          {error && <div className="error-banner">⚠️ {error}</div>}
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
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? "Sending…" : "Send reset link"}
            </button>
            <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.9rem", color: "var(--muted)" }}>
              Remember your password?{" "}
              <Link to="/login" style={{ color: "var(--accent)", fontWeight: "600", textDecoration: "none" }}>
                Log In
              </Link>
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
