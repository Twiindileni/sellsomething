import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import TermsModal from "../components/TermsModal";
import BrandLogo from "../components/BrandLogo";
import { SuccessBanner, ErrorBanner } from "../components/StatusBanners";
import { CheckCircle2, ClipboardList } from "lucide-react";

export default function SignupPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // T&C state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [user, authLoading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!termsAccepted) {
      setError("You must read and accept the Terms & Conditions to create an account.");
      return;
    }

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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: name.trim(), terms_accepted: true, terms_accepted_at: new Date().toISOString() },
        },
      });

      if (authError) throw authError;

      if (data.session) {
        // Redirect happens in useEffect once AuthContext receives the session
      } else {
        setSuccess(
          "Account created! Check your email and click Confirm my email — you'll be signed in and taken to the site."
        );
      }
    } catch (err) {
      setError(err.message || "Sign up failed. Please try again.");
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
      {showTermsModal && (
        <TermsModal
          alreadyAccepted={termsAccepted}
          onClose={() => setShowTermsModal(false)}
          onAccept={() => {
            setTermsAccepted(true);
            setShowTermsModal(false);
          }}
        />
      )}

      <BrandLogo variant="auth" link={false} />
      <div className="sell-header">
        <h1 className="sell-title">Create an Account</h1>
        <p className="sell-sub">Join us to start buying and selling across Namibia.</p>
      </div>

      {success && <SuccessBanner>{success}</SuccessBanner>}
      {error && <ErrorBanner>{error}</ErrorBanner>}

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

          {/* ── Terms & Conditions ────────────────────────────── */}
          <div className="terms-agree-box">
            <div className="terms-agree-row">
              <input
                type="checkbox"
                id="terms-signup"
                className="terms-checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  if (e.target.checked && !termsAccepted) {
                    setShowTermsModal(true);
                  } else {
                    setTermsAccepted(false);
                  }
                }}
                disabled={submitting}
              />
              <label htmlFor="terms-signup" className="terms-agree-label">
                I have read and agree to the{" "}
                <button
                  type="button"
                  className="terms-link-btn"
                  onClick={() => setShowTermsModal(true)}
                >
                  Terms &amp; Conditions
                </button>
                , including the{" "}
                <strong>N$25 ad posting fee</strong> and{" "}
                <strong>escrow payment policy</strong>.
              </label>
            </div>
            {!termsAccepted && (
              <button
                type="button"
                className="terms-read-btn"
                onClick={() => setShowTermsModal(true)}
              >
                <ClipboardList size={16} strokeWidth={2} className="inline-icon" aria-hidden="true" />
                Read Terms &amp; Conditions
              </button>
            )}
            {termsAccepted && (
              <div className="terms-accepted-badge">
                <CheckCircle2 size={16} strokeWidth={2} className="inline-icon" aria-hidden="true" />
                Terms accepted
              </div>
            )}
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={submitting || !termsAccepted}
          >
            {submitting ? "Creating account…" : "Sign Up"}
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
