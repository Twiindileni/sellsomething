import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  async function handleLogout() {
    try {
      await signOut();
    } finally {
      closeMenu();
      navigate("/");
    }
  }

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Account";

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo" onClick={closeMenu}>
        Sell<span>Something</span>
      </Link>

      <div className="navbar-tools">
        {user && (
          <NavLink
            to="/dashboard"
            className="nav-user-btn nav-user-toolbar"
            title="My Dashboard"
            aria-label="My Dashboard"
            onClick={closeMenu}
          >
            <UserIcon />
          </NavLink>
        )}

        <button
          type="button"
          className="menu-toggle"
          onClick={toggleMenu}
          aria-label="Toggle navigation"
          aria-expanded={isOpen}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        <div className={`navbar-nav ${isOpen ? "open" : ""}`}>
          <NavLink to="/" className="nav-link" onClick={closeMenu} end>
            Browse Goods
          </NavLink>
          
          <NavLink to="/professionals" className="nav-link" onClick={closeMenu}>
            Find Services
          </NavLink>

          {!user && (
            <NavLink to="/login" className="nav-link nav-login-btn" onClick={closeMenu}>
              Log In / Sign Up
            </NavLink>
          )}

          {user && (
            <div className="nav-user-menu nav-mobile-only">
              <p className="nav-user-greeting">Hi, {displayName}</p>
              <NavLink to="/dashboard" className="nav-link nav-menu-dashboard" onClick={closeMenu}>
                <UserIcon />
                <span>My Dashboard</span>
              </NavLink>
              {profile?.is_admin && (
                <NavLink to="/admin" className="nav-link nav-menu-dashboard" onClick={closeMenu}>
                  <span>⚙️ Admin Panel</span>
                </NavLink>
              )}
              <button
                type="button"
                className="nav-link nav-logout-btn"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          )}

          {profile?.is_admin && (
            <NavLink to="/admin" className="nav-link nav-admin-link" onClick={closeMenu}>
              ⚙️ Admin Panel
            </NavLink>
          )}

          {user && (
            <button
              type="button"
              className="nav-link nav-desktop-only"
              onClick={handleLogout}
            >
              Log Out
            </button>
          )}

          {user && (
            <NavLink to="/sell" className="nav-link nav-sell-btn" onClick={closeMenu}>
              + Post Ad / Service
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}
