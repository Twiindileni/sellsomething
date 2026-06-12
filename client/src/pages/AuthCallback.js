import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function getHashParams() {
  const hash = window.location.hash?.replace(/^#/, "") || "";
  return new URLSearchParams(hash);
}

function getAuthErrorFromUrl() {
  const hashParams = getHashParams();
  const queryParams = new URLSearchParams(window.location.search);
  return (
    hashParams.get("error_description")
    || hashParams.get("error")
    || queryParams.get("error_description")
    || queryParams.get("error")
  );
}

function isPasswordRecovery() {
  const hashParams = getHashParams();
  const queryParams = new URLSearchParams(window.location.search);
  return hashParams.get("type") === "recovery" || queryParams.get("type") === "recovery";
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  // Capture before Supabase clears the hash after session exchange
  const [recoveryFlow] = useState(() => isPasswordRecovery());

  useEffect(() => {
    const urlError = getAuthErrorFromUrl();
    if (urlError) {
      setErrorMsg(decodeURIComponent(urlError.replace(/\+/g, " ")));
      setStatus("error");
      return;
    }

    if (loading) return;

    if (user) {
      if (recoveryFlow) {
        navigate("/reset-password", { replace: true });
        return;
      }
      setStatus("success");
      const timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 2200);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setStatus("error");
      setErrorMsg("We couldn't complete sign-in. The link may have expired.");
    }, 8000);

    return () => clearTimeout(timer);
  }, [user, loading, navigate]);

  if (status === "success") {
    return (
      <div className="auth-callback-page">
        <div className="auth-callback-card auth-callback-success">
          <div className="auth-callback-icon">✅</div>
          <h1 className="auth-callback-title">Email confirmed!</h1>
          <p className="auth-callback-sub">
            Your account is ready. Taking you to your dashboard…
          </p>
          <div className="spinner" style={{ width: 28, height: 28, margin: "1.5rem auto 0" }} />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="auth-callback-page">
        <div className="auth-callback-card auth-callback-error">
          <div className="auth-callback-icon">⚠️</div>
          <h1 className="auth-callback-title">Something went wrong</h1>
          <p className="auth-callback-sub">{errorMsg}</p>
          <div className="auth-callback-actions">
            <Link to="/login" className="submit-btn" style={{ display: "inline-block", width: "auto", padding: "0.75rem 1.5rem" }}>
              Go to Log In
            </Link>
            <Link to="/" className="auth-callback-link">Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-callback-page">
      <div className="auth-callback-card">
        <div className="spinner" style={{ width: 36, height: 36, margin: "0 auto 1.25rem" }} />
        <h1 className="auth-callback-title">Confirming your email…</h1>
        <p className="auth-callback-sub">Please wait while we sign you in.</p>
      </div>
    </div>
  );
}
