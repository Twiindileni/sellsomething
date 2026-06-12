import React, { useState } from "react";
import { BOOST_PLANS } from "../config/site";
import { PAYMENT } from "../config/payment";
import { createBoost } from "../services/api";

function formatPrice(amount) {
  return "N$ " + Number(amount).toLocaleString("en-NA", { minimumFractionDigits: 0 });
}

export default function BoostModal({ target, targetType, accessToken, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [planDays, setPlanDays] = useState(BOOST_PLANS[0].days);
  const [payMethod, setPayMethod] = useState("mobile");
  const [payRef, setPayRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const plan = BOOST_PLANS.find((p) => p.days === planDays) || BOOST_PLANS[0];
  const title = targetType === "product" ? target.title : target.name;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await createBoost(
        {
          target_type: targetType,
          product_id: targetType === "product" ? target.id : undefined,
          employee_id: targetType === "employee" ? target.id : undefined,
          target_title: title,
          duration_days: plan.days,
          amount: plan.fee,
          payment_method: payMethod,
          payment_reference: payRef.trim() || null,
        },
        accessToken
      );
      setDone(true);
      setStep(3);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not submit boost request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="buynow-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="buynow-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="buynow-close" onClick={onClose} aria-label="Close">×</button>

        {step === 1 && (
          <>
            <div className="buynow-header">
              <div className="buynow-shield">⭐</div>
              <h2 className="buynow-title">Boost to Sponsored</h2>
              <p className="buynow-subtitle">
                Pin <strong>{title}</strong> to the top with a <strong>Sponsored</strong> badge
              </p>
            </div>
            <div className="buynow-steps-list">
              <div className="buynow-step-item">
                <span className="buynow-step-num">1</span>
                <div>
                  <strong>Choose how long</strong>
                  <p>Your {targetType === "product" ? "listing" : "service"} stays pinned while active.</p>
                </div>
              </div>
              <div className="buynow-step-item">
                <span className="buynow-step-num">2</span>
                <div>
                  <strong>Pay the boost fee</strong>
                  <p>Same payment channels as Buy Now — Pay to Cell, EasyWallet, Blue Wallet, or FNB.</p>
                </div>
              </div>
              <div className="buynow-step-item">
                <span className="buynow-step-num">3</span>
                <div>
                  <strong>Admin activates</strong>
                  <p>We confirm your payment and turn on sponsored placement for your chosen period.</p>
                </div>
              </div>
            </div>
            <div className="boost-plan-picker">
              {BOOST_PLANS.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  className={`boost-plan-option${planDays === p.days ? " active" : ""}`}
                  onClick={() => setPlanDays(p.days)}
                >
                  <strong>{p.label}</strong>
                  <span>{formatPrice(p.fee)}</span>
                </button>
              ))}
            </div>
            <button type="button" className="buynow-primary-btn" onClick={() => setStep(2)}>
              Continue — Pay {formatPrice(plan.fee)} →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="buynow-header">
              <div className="buynow-shield">💳</div>
              <h2 className="buynow-title">Pay Boost Fee</h2>
              <p className="buynow-subtitle">
                Send <strong>{formatPrice(plan.fee)}</strong> for <strong>{plan.label}</strong> sponsored placement
              </p>
            </div>
            <div className="buynow-payment-tabs">
              <button
                type="button"
                className={`buynow-pay-tab ${payMethod === "mobile" ? "active" : ""}`}
                onClick={() => setPayMethod("mobile")}
              >
                📱 Mobile Payment
              </button>
              <button
                type="button"
                className={`buynow-pay-tab ${payMethod === "bank" ? "active" : ""}`}
                onClick={() => setPayMethod("bank")}
              >
                🏦 Bank Transfer
              </button>
            </div>
            {payMethod === "mobile" ? (
              <div className="buynow-payment-details">
                <div className="buynow-pay-row">
                  <span className="buynow-pay-label">Cell Number</span>
                  <span className="buynow-pay-value highlight">{PAYMENT.cellNumber}</span>
                </div>
                <div className="buynow-pay-row">
                  <span className="buynow-pay-label">Methods</span>
                  <span className="buynow-pay-value">{PAYMENT.mobileMethods.join(" · ")}</span>
                </div>
                <div className="buynow-pay-row">
                  <span className="buynow-pay-label">Amount</span>
                  <span className="buynow-pay-value highlight">{formatPrice(plan.fee)}</span>
                </div>
              </div>
            ) : (
              <div className="buynow-payment-details">
                <div className="buynow-pay-row">
                  <span className="buynow-pay-label">Bank</span>
                  <span className="buynow-pay-value">{PAYMENT.bank}</span>
                </div>
                <div className="buynow-pay-row">
                  <span className="buynow-pay-label">Account</span>
                  <span className="buynow-pay-value highlight">{PAYMENT.bankAccount}</span>
                </div>
                <div className="buynow-pay-row">
                  <span className="buynow-pay-label">Amount</span>
                  <span className="buynow-pay-value highlight">{formatPrice(plan.fee)}</span>
                </div>
              </div>
            )}
            <div className="buynow-ref-group">
              <label className="buynow-ref-label" htmlFor="boost-ref">
                Payment reference (recommended)
              </label>
              <input
                id="boost-ref"
                type="text"
                className="form-input"
                placeholder={`e.g. Boost - ${title}`}
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
              />
            </div>
            {error && <div className="error-banner" style={{ marginBottom: "1rem" }}>⚠️ {error}</div>}
            <div style={{ display: "flex", gap: "1rem" }}>
              <button type="button" className="buynow-back-btn" onClick={() => setStep(1)}>← Back</button>
              <button
                type="button"
                className="buynow-primary-btn"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ flex: 1 }}
              >
                {submitting ? "Submitting…" : "✅ I Have Paid — Request Boost"}
              </button>
            </div>
          </>
        )}

        {step === 3 && done && (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⭐</div>
            <h2 className="buynow-title">Boost request sent!</h2>
            <p className="buynow-subtitle" style={{ marginBottom: "1.5rem" }}>
              Admin will confirm your payment and activate sponsored placement for {plan.label}.
            </p>
            <button type="button" className="buynow-primary-btn" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
