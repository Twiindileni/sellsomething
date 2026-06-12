import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (session) {
      setSessionChecked(true);
      return;
    }
    supabase.auth.getSession().finally(() => setSessionChecked(true));
  }, [session, authLoading]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;
      await supabase.auth.signOut();
      navigate("/login", {
        replace: true,
        state: { message: "Password updated! You can log in with your new password." },
      });
    } catch (err) {
      setError(err.message || "Could not update password. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !sessionChecked) {
    return (
      <div className="auth-callback-page">
        <div className="auth-callback-card">
          <div className="spinner" style={{ width: 36, height: 36, margin: "0 auto 1.25rem" }} />
          <p className="auth-callback-sub">Loading…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-callback-page">
        <div className="auth-callback-card auth-callback-error">
          <div className="auth-callback-icon">⚠️</div>
          <h1 className="auth-callback-title">Link expired or invalid</h1>
          <p className="auth-callback-sub">
            Request a new password reset link and try again.
          </p>
          <div className="auth-callback-actions">
            <Link to="/forgot-password" className="submit-btn" style={{ display: "inline-block", width: "auto", padding: "0.75rem 1.5rem" }}>
              Request new link
            </Link>
            <Link to="/login" className="auth-callback-link">Back to Log In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sell-page">
      <div className="sell-header">
        <h1 className="sell-title">Choose a new password</h1>
        <p className="sell-sub">Enter a strong password you haven&apos;t used before.</p>
      </div>

      <div className="sell-form-container">
        {error && <div className="error-banner">⚠️ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="password">New password</label>
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
          <div className="form-group">
            <label className="form-label" htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              className="form-input"
              placeholder="Repeat your new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              required
              disabled={submitting}
            />
          </div>
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
