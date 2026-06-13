import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { BRAND, COMPANY } from "../config/site";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

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
      // Redirect happens in useEffect once AuthContext receives the session
    } catch (err) {
      setError(err.message || "Login failed. Check your email and password.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err.message || "Google login failed.");
      setSubmitting(false);
    }
  }

  return (
    <div className="sell-page">
      <img
        src={BRAND.logo}
        alt={COMPANY.brand}
        className="brand-logo-horizontal brand-logo-horizontal--auth"
      />
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <label className="form-label" htmlFor="password" style={{ margin: 0 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: "0.85rem", color: "var(--accent)", fontWeight: "600", textDecoration: "none" }}>
                Forgot password?
              </Link>
            </div>
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

          <div className="oauth-divider">Or</div>

          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleLogin}
            disabled={submitting}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
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
