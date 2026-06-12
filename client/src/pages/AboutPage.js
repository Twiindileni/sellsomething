import React from "react";
import { Link } from "react-router-dom";
import InfoPageLayout from "../components/InfoPageLayout";
import { COMPANY } from "../config/site";

const VALUES = [
  {
    icon: "🇳🇦",
    title: "Built for Namibia",
    text: "A local marketplace connecting buyers and sellers across the country — from Windhoek to every town.",
  },
  {
    icon: "🔒",
    title: "Escrow-first",
    text: "Payments are held securely until buyers confirm delivery. No more sending money to strangers and hoping for the best.",
  },
  {
    icon: "💬",
    title: "Transparent communication",
    text: "In-app messaging keeps a clear record. Our team can step in fairly when disputes happen.",
  },
  {
    icon: "✅",
    title: "Accountable business",
    text: "We operate as a registered Close Corporation — not an anonymous website.",
  },
];

export default function AboutPage() {
  return (
    <InfoPageLayout
      title="About Sell Something"
      subtitle="A Namibian marketplace you can trust — operated by a registered local business."
    >
      <section className="info-section">
        <div className="about-hero-card">
          <div>
            <p className="about-kicker">Operated by</p>
            <h2>{COMPANY.legalName}</h2>
            <p className="about-reg">
              BIPA Registration: <strong>{COMPANY.bipaNumber}</strong>
            </p>
            <p className="about-reg">{COMPANY.city}, {COMPANY.country}</p>
          </div>
          <div className="about-badges">
            <span className="trust-badge">🏛️ Registered CC</span>
            <span className="trust-badge">🔒 Escrow protected</span>
            <span className="trust-badge">🇳🇦 Namibian owned</span>
          </div>
        </div>
      </section>

      <section className="info-section">
        <h2>Our mission</h2>
        <p className="info-prose">
          <strong>{COMPANY.brand}</strong> makes buying and selling in Namibia safer and simpler.
          Whether you&apos;re clearing out your garage, finding a great deal, or hiring a trusted
          professional, we give you the tools — and the protection — to transact with confidence.
        </p>
        <p className="info-prose">
          Unlike informal classifieds where payments go straight to strangers, our{" "}
          <Link to="/how-it-works">escrow system</Link> holds buyer funds until delivery is
          confirmed. That means real accountability for everyone on the platform.
        </p>
      </section>

      <section className="info-section">
        <h2>Why people trust us</h2>
        <div className="about-values-grid">
          {VALUES.map((v) => (
            <div key={v.title} className="about-value-card">
              <span className="about-value-icon" aria-hidden="true">{v.icon}</span>
              <h3>{v.title}</h3>
              <p>{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="info-section">
        <h2>Questions?</h2>
        <p className="info-prose">
          Visit our <Link to="/help">Help &amp; Support</Link> page or email{" "}
          <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>.
        </p>
      </section>
    </InfoPageLayout>
  );
}
