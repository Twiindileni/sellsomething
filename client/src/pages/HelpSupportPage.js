import React, { useState } from "react";
import { Link } from "react-router-dom";
import InfoPageLayout from "../components/InfoPageLayout";
import { COMPANY } from "../config/site";
import { PAYMENT } from "../config/payment";

const FAQ = [
  {
    q: "Is Sell Something a registered Namibian business?",
    a: `Yes. Sell Something is operated by ${COMPANY.legalName}, registered with BIPA under registration number ${COMPANY.bipaNumber}.`,
  },
  {
    q: "How does escrow protect me as a buyer?",
    a: "When you Buy Now, your payment goes to Sell Something first — not directly to the seller. We hold the money until you confirm you received the item. If something goes wrong, you can request a refund.",
  },
  {
    q: "Why must I pay through the app?",
    a: "Off-platform payments (cash, direct EFT to seller, WhatsApp deals) bypass our escrow system. If you pay outside the app, we cannot help with disputes or refunds.",
  },
  {
    q: "How much does it cost to post an ad?",
    a: `Each product listing costs ${COMPANY.adFee}. This covers platform maintenance, promotion, and buyer-protection services.`,
  },
  {
    q: "How do I contact a seller?",
    a: "Use the Message button on any listing or service profile. Keep all communication in-app so we have a record if a dispute arises.",
  },
  {
    q: "What if my item never arrives?",
    a: "Open your order in My Dashboard, check the delivery tracker, and request a refund if the seller missed the agreed ETA. Our admin team reviews disputes fairly.",
  },
  {
    q: "How do I reset my password?",
    a: <>Go to <Link to="/login">Log In</Link> → <strong>Forgot password?</strong> and follow the email link.</>,
  },
  {
    q: "How long until the seller gets paid?",
    a: "After you confirm receipt and rate the order, admin releases the payout. Sellers are typically paid within 24 hours via Pay to Cell, EasyWallet, or Blue Wallet.",
  },
];

export default function HelpSupportPage() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <InfoPageLayout
      title="Help & Support"
      subtitle="Answers to common questions about buying, selling, and staying safe on Sell Something."
    >
      <section className="info-section">
        <h2>Quick contact</h2>
        <div className="info-contact-grid">
          <div className="info-contact-card">
            <span className="info-contact-icon" aria-hidden="true">✉️</span>
            <div className="info-contact-body">
              <strong>Email support</strong>
              <a
                className="info-contact-email"
                href={`mailto:${COMPANY.supportEmail}`}
              >
                {COMPANY.supportEmail}
              </a>
              <p className="info-contact-note">We aim to respond within 1–2 business days.</p>
            </div>
          </div>
          <div className="info-contact-card">
            <span className="info-contact-icon" aria-hidden="true">🏛️</span>
            <div className="info-contact-body">
              <strong>Registered entity</strong>
              <p className="info-contact-detail">{COMPANY.legalName}</p>
              <p className="info-contact-detail">BIPA {COMPANY.bipaNumber}</p>
            </div>
          </div>
          <div className="info-contact-card">
            <span className="info-contact-icon" aria-hidden="true">🔒</span>
            <div className="info-contact-body">
              <strong>Escrow payments</strong>
              <p className="info-contact-detail info-contact-highlight">{PAYMENT.cellNumber}</p>
              <p className="info-contact-detail">{PAYMENT.mobileMethods.join(" · ")}</p>
              {PAYMENT.bankAccount && (
                <p className="info-contact-detail">
                  {PAYMENT.bank} · {PAYMENT.bankAccount}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="info-section">
        <h2>Frequently asked questions</h2>
        <div className="faq-list">
          {FAQ.map((item, i) => (
            <div key={item.q} className={`faq-item${openIndex === i ? " open" : ""}`}>
              <button
                type="button"
                className="faq-question"
                onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                aria-expanded={openIndex === i}
              >
                {item.q}
                <span className="faq-chevron" aria-hidden="true">{openIndex === i ? "−" : "+"}</span>
              </button>
              {openIndex === i && (
                <div className="faq-answer">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="info-section">
        <h2>Stay safe</h2>
        <ul className="info-checklist">
          <li>Never pay a seller directly — use <strong>Buy Now</strong> escrow only.</li>
          <li>Keep all messages inside the app.</li>
          <li>Meet in public places for local pickups when possible.</li>
          <li>Report suspicious listings or users via {COMPANY.supportEmail}.</li>
          <li>Read our <Link to="/how-it-works">How Escrow Works</Link> guide before your first purchase.</li>
        </ul>
      </section>
    </InfoPageLayout>
  );
}
