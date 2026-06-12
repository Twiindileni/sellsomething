import React from "react";
import { Link } from "react-router-dom";

export default function InfoPageLayout({ title, subtitle, children, breadcrumb }) {
  return (
    <div className="info-page">
      <header className="info-page-hero">
        {breadcrumb && <p className="info-breadcrumb">{breadcrumb}</p>}
        <h1 className="info-page-title">{title}</h1>
        {subtitle && <p className="info-page-sub">{subtitle}</p>}
      </header>
      <div className="info-page-body">{children}</div>
      <div className="info-page-nav">
        <Link to="/help" className="info-nav-link">Help &amp; Support</Link>
        <Link to="/about" className="info-nav-link">About Us</Link>
        <Link to="/how-it-works" className="info-nav-link">How It Works</Link>
        <Link to="/terms" className="info-nav-link">Terms</Link>
        <Link to="/privacy" className="info-nav-link">Privacy</Link>
      </div>
    </div>
  );
}
