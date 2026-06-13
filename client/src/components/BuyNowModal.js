import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrder } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { PAYMENT } from "../config/payment";

const REFUND_WINDOW_DAYS = 7;

function formatPrice(price) {
  return "N$ " + Number(price).toLocaleString("en-NA", { minimumFractionDigits: 2 });
}

export default function BuyNowModal({ product, sellerId, onClose }) {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=info, 2=payment instructions, 3=confirm
  const [payMethod, setPayMethod] = useState("mobile");
  const [payRef, setPayRef] = useState("");
  const [shippingLocation, setShippingLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [orderId, setOrderId] = useState(null);

  if (!user) {
    return (
      <div className="buynow-overlay" onClick={onClose}>
        <div className="buynow-modal" onClick={(e) => e.stopPropagation()}>
          <button className="buynow-close" onClick={onClose}>×</button>
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
            <h2 style={{ fontFamily: "var(--ff-head)", marginBottom: "1rem" }}>Login Required</h2>
            <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
              You need to be logged in to make a purchase.
            </p>
            <button className="buynow-primary-btn" onClick={() => navigate("/login")}>
              Log In / Sign Up
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function handlePlaceOrder() {
    setError(null);
    if (!shippingLocation.trim()) {
      setError("Please enter where the item should be delivered.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createOrder({
        product_id: product.id,
        seller_id: sellerId,
        seller_email: product.seller_email,
        product_title: product.title,
        amount: product.price,
        payment_method: payMethod,
        payment_reference: payRef.trim() || null,
        shipping_location: shippingLocation.trim(),
      }, session?.access_token);
      setOrderId(res.data?.id);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to place order. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="buynow-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="buynow-modal" onClick={(e) => e.stopPropagation()}>
        <button className="buynow-close" onClick={onClose} aria-label="Close">×</button>

        {/* Step 1 — Escrow explanation */}
        {step === 1 && (
          <>
            <div className="buynow-header">
              <div className="buynow-shield">🛡️</div>
              <h2 className="buynow-title">Buy with Escrow Protection</h2>
              <p className="buynow-subtitle">Your money is held safely until you confirm delivery</p>
            </div>

            <div className="buynow-product-row">
              <div>
                <div className="buynow-product-title">{product.title}</div>
                <div className="buynow-product-seller">Sold by: {product.seller}</div>
              </div>
              <div className="buynow-product-price">{formatPrice(product.price)}</div>
            </div>

            <div className="buynow-steps-list">
              <div className="buynow-step-item">
                <span className="buynow-step-num">1</span>
                <div>
                  <strong>You pay to our secure app account</strong>
                  <p>Send {formatPrice(product.price)} to our mobile number (Pay to Cell, EasyWallet, or Blue Wallet) or FNB bank account.</p>
                </div>
              </div>
              <div className="buynow-step-item">
                <span className="buynow-step-num">2</span>
                <div>
                  <strong>We confirm your payment &amp; notify the seller</strong>
                  <p>Your money is held safely. The seller is told to deliver the item.</p>
                </div>
              </div>
              <div className="buynow-step-item">
                <span className="buynow-step-num">3</span>
                <div>
                  <strong>Seller delivers by their promised date</strong>
                  <p>The seller must set a delivery ETA. If they miss it, you can request a full refund.</p>
                </div>
              </div>
              <div className="buynow-step-item">
                <span className="buynow-step-num">4</span>
                <div>
                  <strong>You confirm you are happy</strong>
                  <p>Only after you confirm receipt and satisfaction does the seller get paid. No confirmation — no payout.</p>
                </div>
              </div>
              <div className="buynow-step-item">
                <span className="buynow-step-num refund">↩</span>
                <div>
                  <strong>Not happy? Get a refund</strong>
                  <p>If the item is wrong, damaged, or not delivered within {REFUND_WINDOW_DAYS} days — raise a dispute for a full refund.</p>
                </div>
              </div>
            </div>

            <button className="buynow-primary-btn" onClick={() => setStep(2)}>
              Continue — View Payment Details →
            </button>
          </>
        )}

        {/* Step 2 — Payment instructions */}
        {step === 2 && (
          <>
            <div className="buynow-header">
              <div className="buynow-shield">💳</div>
              <h2 className="buynow-title">Send Payment</h2>
              <p className="buynow-subtitle">
                Send exactly <strong>{formatPrice(product.price)}</strong> to one of the accounts below
              </p>
            </div>

            <div className="buynow-payment-tabs">
              <button
                className={`buynow-pay-tab ${payMethod === "mobile" ? "active" : ""}`}
                onClick={() => setPayMethod("mobile")}
              >
                📱 Mobile Payment
              </button>
              <button
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
                  <span className="buynow-pay-label">Accepted methods</span>
                  <span className="buynow-pay-value">{PAYMENT.mobileMethods.join(" · ")}</span>
                </div>
                <div className="buynow-pay-row">
                  <span className="buynow-pay-label">Account Name</span>
                  <span className="buynow-pay-value">{PAYMENT.bankName}</span>
                </div>
                <div className="buynow-pay-row">
                  <span className="buynow-pay-label">Amount</span>
                  <span className="buynow-pay-value highlight">{formatPrice(product.price)}</span>
                </div>
                <div className="buynow-pay-note">
                  ⚠️ Use your name + listing title as the payment reference so we can match it.
                </div>
              </div>
            ) : (
              <div className="buynow-payment-details">
                <div className="buynow-pay-row">
                  <span className="buynow-pay-label">Bank</span>
                  <span className="buynow-pay-value">{PAYMENT.bank}</span>
                </div>
                <div className="buynow-pay-row">
                  <span className="buynow-pay-label">Account Name</span>
                  <span className="buynow-pay-value">{PAYMENT.bankName}</span>
                </div>
                <div className="buynow-pay-row">
                  <span className="buynow-pay-label">Account Number</span>
                  <span className="buynow-pay-value highlight">
                    {PAYMENT.bankAccount || "Contact support for bank details"}
                  </span>
                </div>
                <div className="buynow-pay-row">
                  <span className="buynow-pay-label">Amount</span>
                  <span className="buynow-pay-value highlight">{formatPrice(product.price)}</span>
                </div>
                <div className="buynow-pay-note">
                  ⚠️ Use your name + listing title as the payment reference so we can match it.
                </div>
              </div>
            )}

            <div className="buynow-ref-row">
              <div className="buynow-ref-group">
                <label className="buynow-ref-label" htmlFor="pay-ref">
                  Payment Reference (optional)
                </label>
                <input
                  id="pay-ref"
                  type="text"
                  className="form-input"
                  placeholder="e.g. John Shilongo - iPhone 13"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                />
              </div>
              <div className="buynow-ref-group">
                <label className="buynow-ref-label" htmlFor="ship-to">
                  Delivery Location <span className="buynow-required">*</span>
                </label>
                <input
                  id="ship-to"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Windhoek, Klein Windhoek, 12 Independence Ave"
                  value={shippingLocation}
                  onChange={(e) => setShippingLocation(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <div className="error-banner" style={{ marginBottom: "1rem" }}>⚠️ {error}</div>}

            <div style={{ display: "flex", gap: "1rem" }}>
              <button className="buynow-back-btn" onClick={() => setStep(1)}>← Back</button>
              <button
                className="buynow-primary-btn"
                onClick={handlePlaceOrder}
                disabled={submitting}
                style={{ flex: 1 }}
              >
                {submitting ? "Placing order…" : "✅ I Have Paid — Place My Order"}
              </button>
            </div>
          </>
        )}

        {/* Step 3 — Confirmation */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
            <h2 className="buynow-title">Order Placed!</h2>
            <p style={{ color: "var(--muted)", margin: "1rem 0 1.5rem", lineHeight: 1.7 }}>
              Your order is now <strong>pending payment confirmation</strong>.<br />
              Once we verify your payment, the seller will be notified to deliver your item.<br /><br />
              Track your order status in <strong>My Purchases</strong> on your dashboard.
            </p>
            <div className="buynow-order-id">Order ID: {orderId}</div>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", justifyContent: "center" }}>
              <button className="buynow-back-btn" onClick={onClose}>Close</button>
              <button
                className="buynow-primary-btn"
                onClick={() => { onClose(); navigate("/dashboard"); }}
              >
                Go to My Purchases →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
