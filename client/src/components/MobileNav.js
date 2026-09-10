import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, Briefcase, PlusCircle, Package, User } from "lucide-react";

/**
 * Mobile-only bottom tab navigation bar.
 * Visible on screens < 768px only (controlled via CSS).
 */
export default function MobileNav() {
  const { user } = useAuth();
  const navigate = useNavigate();

  function handleSell() {
    if (user) {
      navigate("/sell");
    } else {
      navigate("/login");
    }
  }

  function handleOrders() {
    navigate("/dashboard?tab=orders");
  }

  function handleProfile() {
    navigate("/dashboard?tab=profile");
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="App navigation">
      <NavLink to="/" end className={({ isActive }) => `mob-nav-item${isActive ? " mob-nav-active" : ""}`}>
        <Home size={22} strokeWidth={1.8} />
        <span>Home</span>
      </NavLink>

      <NavLink to="/professionals" className={({ isActive }) => `mob-nav-item${isActive ? " mob-nav-active" : ""}`}>
        <Briefcase size={22} strokeWidth={1.8} />
        <span>Services</span>
      </NavLink>

      {/* Centre FAB — Sell button */}
      <button className="mob-nav-sell" onClick={handleSell} aria-label="Post an ad">
        <PlusCircle size={28} strokeWidth={2} />
        <span>Sell</span>
      </button>

      <button className="mob-nav-item" onClick={handleOrders}>
        <Package size={22} strokeWidth={1.8} />
        <span>Orders</span>
      </button>

      <button className="mob-nav-item" onClick={handleProfile}>
        <User size={22} strokeWidth={1.8} />
        <span>Profile</span>
      </button>
    </nav>
  );
}
