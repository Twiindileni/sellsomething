import React from "react";
import { Link } from "react-router-dom";
import { BRAND, COMPANY } from "../config/site";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link to="/" className="site-footer-logo">
            <img
              src={BRAND.logo}
              alt={COMPANY.brand}
              className="brand-logo-horizontal brand-logo-horizontal--footer"
            />
          </Link>
          <p className="site-footer-tagline">
            Namibia&apos;s trusted marketplace — buy and sell with escrow protection.
          </p>
          <p className="site-footer-legal">
            Operated by <strong>{COMPANY.legalName}</strong>
            <br />
            BIPA {COMPANY.bipaNumber} · {COMPANY.city}, {COMPANY.country}
          </p>
        </div>

        <div className="site-footer-links">
          <div className="site-footer-col">
            <h3>Marketplace</h3>
            <Link to="/">Browse Goods</Link>
            <Link to="/professionals">Find Services</Link>
            <Link to="/how-it-works">How Escrow Works</Link>
          </div>
          <div className="site-footer-col">
            <h3>Support</h3>
            <Link to="/help">Help &amp; Support</Link>
            <Link to="/about">About Us</Link>
            <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>
          </div>
          <div className="site-footer-col">
            <h3>Legal</h3>
            <Link to="/terms">Terms &amp; Conditions</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>© {year} {COMPANY.legalName}. All rights reserved.</span>
        <span className="site-footer-trust-badge">🔒 Escrow-protected payments</span>
      </div>
    </footer>
  );
}
