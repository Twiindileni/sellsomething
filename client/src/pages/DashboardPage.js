import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyProducts, getMyEmployees } from "../services/api";
import ProductCard from "../components/ProductCard";
import EmployeeCard from "../components/EmployeeCard";
import "../pages/EmployeeDirectory.css"; // For EmployeeCard styling

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  
  const [listings, setListings] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  useEffect(() => {
    if (!user?.email || !user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const [prodRes, empRes] = await Promise.all([
          getMyProducts(user.email),
          getMyEmployees(user.id)
        ]);

        if (!cancelled) {
          setListings(prodRes.data || []);
          setServices(empRes.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || "Failed to load dashboard data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboardData();
    return () => { cancelled = true; };
  }, [user?.email, user?.id]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="dashboard-user">
          <div className="dashboard-avatar" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h1 className="dashboard-title">My Dashboard</h1>
            <p className="dashboard-sub">
              Welcome back, <strong>{displayName}</strong>
            </p>
            <p className="dashboard-email">{user?.email}</p>
          </div>
        </div>
        <div className="dashboard-actions">
          <Link to="/sell" className="submit-btn dashboard-post-btn">
            + Post New Ad
          </Link>
          <button
            type="button"
            className="dashboard-logout-btn"
            onClick={async () => {
              try {
                await signOut();
              } finally {
                navigate("/");
              }
            }}
          >
            Log Out
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-wrap" style={{ marginTop: '2rem' }}>
          <div className="spinner" />
          <p className="dashboard-muted">Loading your dashboard…</p>
        </div>
      )}

      {error && <div className="error-banner" style={{ marginTop: '2rem' }}>⚠️ {error}</div>}

      {!loading && !error && (
        <>
          <section className="dashboard-section" style={{ marginTop: '3rem' }}>
            <h2 className="dashboard-section-title" style={{ marginBottom: '1.5rem', borderBottom: '2px solid var(--clay-light)', paddingBottom: '0.5rem' }}>
              My Services
            </h2>

            {services.length === 0 ? (
              <div className="dashboard-empty">
                <p>You haven't listed any professional services yet.</p>
              </div>
            ) : (
              <div className="directory-grid" style={{ marginTop: 0 }}>
                {services.map((employee) => (
                  <EmployeeCard key={employee.id} employee={employee} />
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-section" style={{ marginTop: '3rem' }}>
            <h2 className="dashboard-section-title" style={{ marginBottom: '1.5rem', borderBottom: '2px solid var(--clay-light)', paddingBottom: '0.5rem' }}>
              My Listings (Ads)
            </h2>

            {listings.length === 0 ? (
              <div className="dashboard-empty">
                <p>You haven't posted any ads yet.</p>
                <Link to="/sell" className="submit-btn" style={{ marginTop: '1rem' }}>Post your first ad</Link>
              </div>
            ) : (
              <div className="products-grid">
                {listings.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
