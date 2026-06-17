import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import InfoPageLayout from "../components/InfoPageLayout";
import { COMPANY } from "../config/site";
import { PAYMENT } from "../config/payment";

const BUYER_STEPS = [
  { n: "1", title: "Find what you want", text: "Browse listings or services. Message the seller in-app to ask questions." },
  { n: "2", title: "Buy Now with escrow", text: "Click Buy Now and pay the full amount to Sell Something — not the seller directly." },
  { n: "3", title: "Track your order", text: "Follow live delivery updates in My Dashboard. The seller shares ETA and progress." },
  { n: "4", title: "Confirm & rate", text: "When your item arrives, confirm receipt and leave an honest rating. Only then is payment released." },
  { n: "5", title: "Dispute if needed", text: "If delivery is late or the item isn't as described, request a refund from your order page." },
];

const SELLER_STEPS = [
  { n: "1", title: "Post your ad", text: `List your item for ${COMPANY.adFee}. Add clear photos and an honest description.` },
  { n: "2", title: "Chat in-app", text: "Answer buyer questions through Sell Something messages — keep everything on-platform." },
  { n: "3", title: "Dispatch & update", text: "Once payment is confirmed in escrow, deliver the item and keep the buyer updated on ETA." },
  { n: "4", title: "Get paid", text: "After the buyer confirms receipt, admin releases your payout (typically within 24 hours)." },
];

export default function HowItWorksPage() {
  return (
    <InfoPageLayout
      title="How Escrow Works"
      subtitle="Your money stays safe until you're happy with your purchase."
    >
      <section className="info-section">
        <div className="escrow-explainer">
          <div className="escrow-flow">
            <div className="escrow-step-box buyer">Buyer pays</div>
            <span className="escrow-arrow">→</span>
            <div className="escrow-step-box hold">Sell Something holds funds</div>
            <span className="escrow-arrow">→</span>
            <div className="escrow-step-box seller">Seller delivers</div>
            <span className="escrow-arrow">→</span>
            <div className="escrow-step-box confirm">Buyer confirms</div>
            <span className="escrow-arrow">→</span>
            <div className="escrow-step-box payout">Seller paid</div>
          </div>
          <p className="info-prose" style={{ marginTop: "1.25rem" }}>
            This is what sets {COMPANY.brand} apart from Facebook groups and informal classifieds.
            Your payment never goes straight to a stranger.
          </p>
        </div>
      </section>

      <section className="info-section">
        <h2>For buyers</h2>
        <ol className="steps-list">
          {BUYER_STEPS.map((s) => (
            <li key={s.n} className="steps-list-item">
              <span className="steps-num">{s.n}</span>
              <div>
                <strong>{s.title}</strong>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="info-section">
        <h2>For sellers</h2>
        <ol className="steps-list">
          {SELLER_STEPS.map((s) => (
            <li key={s.n} className="steps-list-item">
              <span className="steps-num">{s.n}</span>
              <div>
                <strong>{s.title}</strong>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="info-section">
        <h2>Official payment channels</h2>
        <p className="info-prose">Only pay through these channels when using Buy Now:</p>
        <ul className="info-checklist">
          <li>Mobile ({PAYMENT.mobileMethods.join(", ")}): <strong>{PAYMENT.cellNumber}</strong></li>
          <li>Bank: <strong>{PAYMENT.bank}</strong> — {PAYMENT.bankName}{PAYMENT.bankAccount ? ` · Acc ${PAYMENT.bankAccount}` : ""}</li>
        </ul>
        <p className="info-prose warn">
          <AlertTriangle size={18} strokeWidth={2} className="banner-icon" aria-hidden="true" />
          Never send money to a seller&apos;s personal account. That voids buyer protection.
        </p>
      </section>

      <section className="info-section">
        <p className="info-prose">
          More questions? See <Link to="/help">Help &amp; Support</Link> or{" "}
          <Link to="/about">About Us</Link> for company registration details.
        </p>
      </section>
    </InfoPageLayout>
  );
}
