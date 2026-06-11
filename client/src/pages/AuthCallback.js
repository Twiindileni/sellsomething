import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate("/dashboard", { replace: true });
      return;
    }
    const timer = setTimeout(() => {
      navigate("/login", { replace: true });
    }, 5000);
    return () => clearTimeout(timer);
  }, [user, loading, navigate]);

  return (
    <div className="dashboard-loading">
      <p>Signing you in…</p>
    </div>
  );
}
