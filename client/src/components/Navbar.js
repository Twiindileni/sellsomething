import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "./BrandLogo";
import { User, Menu, X, Settings } from "lucide-react";

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
      <BrandLogo variant="nav" onClick={closeMenu} />

      <div className="navbar-tools">
        {user && (
          <NavLink
            to="/dashboard"
            className="nav-user-btn nav-user-toolbar"
            title="My Dashboard"
            aria-label="My Dashboard"
            onClick={closeMenu}
          >
            <User size={22} strokeWidth={2} />
          </NavLink>
        )}

        <button
          type="button"
          className="menu-toggle"
          onClick={toggleMenu}
          aria-label="Toggle navigation"
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={28} strokeWidth={2} /> : <Menu size={28} strokeWidth={2} />}
        </button>

        <div className={`navbar-nav ${isOpen ? "open" : ""}`}>
          <NavLink to="/" className="nav-link" onClick={closeMenu} end>
            Browse Goods
          </NavLink>
          
          <NavLink to="/professionals" className="nav-link" onClick={closeMenu}>
            Find Services
          </NavLink>

          <NavLink to="/help" className="nav-link" onClick={closeMenu}>
            Help
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
                <User size={22} strokeWidth={2} style={{marginRight: "8px"}} />
                <span>My Dashboard</span>
              </NavLink>
              {profile?.is_admin && (
                <NavLink to="/admin" className="nav-link nav-menu-dashboard" onClick={closeMenu}>
                  <Settings size={22} strokeWidth={2} style={{marginRight: "8px"}} />
                  <span>Admin Panel</span>
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
            <NavLink to="/admin" className="nav-link nav-admin-link" onClick={closeMenu} style={{display: "flex", alignItems: "center", gap: "6px"}}>
              <Settings size={18} strokeWidth={2.5} /> Admin Panel
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
