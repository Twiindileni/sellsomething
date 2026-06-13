import React, { useState } from "react";
import { updateOrderStatus } from "../services/api";
import {
  isEtaMissed,
  formatEta,
  etaDaysRemaining,
  formatTrackingTime,
  getBuyerTrackingSteps,
  isOrderTrackingLive,
} from "../utils/orderHelpers";

function StarRating({ value, onChange }) {
  return (
    <div className="tracking-star-rating" role="group" aria-label="Rate this product">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`tracking-star ${star <= value ? "filled" : ""}`}
          onClick={() => onChange(star)}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function BuyerOrderTracking({ order, accessToken, onOrderUpdated }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const etaMissed = isEtaMissed(order);
  const steps = getBuyerTrackingSteps(order);
  const live = isOrderTrackingLive(order);
  const daysLeft = order.delivery_eta ? etaDaysRemaining(order.delivery_eta) : null;
  const canConfirm = order.status === "delivered";
  const isFinished = ["confirmed", "completed"].includes(order.status);
  const isProblem = ["disputed", "refunded"].includes(order.status);

  async function handleConfirmReceived() {
    if (!confirmChecked) {
      alert("Please confirm you received the item and are happy with it.");
      return;
    }
    if (!rating) {
      alert("Please rate the product before confirming.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await updateOrderStatus(
        order.id,
        "confirmed",
        {
          buyer_satisfaction_note: review.trim() || undefined,
          buyer_rating: rating,
          buyer_review: review.trim() || undefined,
        },
        accessToken
      );
      onOrderUpdated(res.data);
      setShowConfirm(false);
      setConfirmChecked(false);
      setReview("");
      setRating(5);
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Could not confirm delivery.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDispute() {
    if (!disputeReason.trim()) {
      alert("Please explain why you need a refund.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await updateOrderStatus(
        order.id,
        "disputed",
        { dispute_reason: disputeReason.trim() },
        accessToken
      );
      onOrderUpdated(res.data);
      setShowDispute(false);
      setDisputeReason("");
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Could not submit refund request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`buyer-tracking-wrap ${etaMissed ? "eta-missed" : ""} ${isProblem ? "is-problem" : ""}`}>
      <div className="buyer-tracking-layout">
        {/* Shipping label card */}
        <div className="tracking-label-card">
          <div className="tracking-label-tape" />
          <div className="tracking-label-brand">SellSomething</div>
          <div className="tracking-label-barcode">
            <div className="tracking-barcode-lines" aria-hidden="true" />
            <span className="tracking-label-id">{order.id?.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="tracking-label-row">
            <span className="tracking-label-key">ITEM</span>
            <span className="tracking-label-val">{order.product_title}</span>
          </div>
          <div className="tracking-label-row">
            <span className="tracking-label-key">AMOUNT</span>
            <span className="tracking-label-val">
              N$ {Number(order.amount).toLocaleString("en-NA", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="tracking-label-row">
            <span className="tracking-label-key">SELLER</span>
            <span className="tracking-label-val">{order.seller_email || "—"}</span>
          </div>
          {order.shipping_location && (
            <div className="tracking-label-row">
              <span className="tracking-label-key">SHIP TO</span>
              <span className="tracking-label-val">{order.shipping_location}</span>
            </div>
          )}
        </div>

        {/* Live tracking panel */}
        <div className="tracking-panel">
          <div className="tracking-panel-header">
            <div>
              <div className="tracking-panel-title">Live Tracking Status</div>
              <div className="tracking-panel-ref">Order · {order.id?.slice(0, 13)}…</div>
            </div>
            {live && (
              <span className="tracking-live-badge">
                <span className="tracking-live-dot" /> Live
              </span>
            )}
          </div>

          {order.seller_latest_update && !isFinished && !isProblem && (
            <div className="tracking-seller-update">
              <span className="tracking-seller-update-label">Latest from seller</span>
              <p>{order.seller_latest_update}</p>
              {order.seller_latest_update_at && (
                <span className="tracking-seller-update-time">
                  {formatTrackingTime(order.seller_latest_update_at)}
                </span>
              )}
            </div>
          )}

          <div className="tracking-timeline">
            {steps.map((step) => (
              <div key={step.id} className={`tracking-step tracking-step--${step.state}`}>
                <div className="tracking-step-marker">
                  {step.state === "done" ? (
                    <span className="tracking-step-check">✓</span>
                  ) : (
                    <span className="tracking-step-icon">{step.icon}</span>
                  )}
                </div>
                <div className="tracking-step-body">
                  <div className="tracking-step-label">{step.label}</div>
                  <div className="tracking-step-sub">{step.sub}</div>
                  {step.time && step.state !== "upcoming" && (
                    <div className="tracking-step-time">{formatTrackingTime(step.time)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {order.delivery_eta && !isFinished && !isProblem && (
            <div className={`tracking-eta-box ${etaMissed ? "tracking-eta-box--missed" : ""}`}>
              <span className="tracking-eta-label">Estimated delivery</span>
              <strong>{formatEta(order.delivery_eta)}</strong>
              {!etaMissed && daysLeft !== null && daysLeft >= 0 && (
                <span className="tracking-eta-sub">
                  {daysLeft === 0 ? "Due today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
                </span>
              )}
              {etaMissed && <span className="tracking-eta-sub tracking-eta-sub--missed">Deadline missed — refund available</span>}
            </div>
          )}

          {isProblem && (
            <div className="order-dispute-note">
              {order.status === "disputed" ? "Refund requested" : "Order refunded"}
              {order.dispute_reason && <><br /><em>{order.dispute_reason}</em></>}
            </div>
          )}

          {isFinished && order.buyer_rating && (
            <div className="tracking-rating-summary">
              <span className="tracking-rating-stars">{"★".repeat(order.buyer_rating)}{"☆".repeat(5 - order.buyer_rating)}</span>
              {order.buyer_review && <p>{order.buyer_review}</p>}
            </div>
          )}

          {canConfirm && !showConfirm && (
            <>
              <div className="order-pending-note buyer-confirm-only-note">
                Only you can confirm receipt. The seller cannot confirm for you. Check the item before confirming.
              </div>
              <button type="button" className="order-confirm-btn tracking-confirm-cta" onClick={() => setShowConfirm(true)}>
                I Received It — Confirm &amp; Rate
              </button>
            </>
          )}

          {canConfirm && showConfirm && (
            <div className="tracking-confirm-panel">
              <h4 className="tracking-confirm-title">Confirm &amp; rate your purchase</h4>
              <p className="tracking-confirm-sub">
                Payment is only released to the seller after you confirm. Rate the product honestly to help other buyers.
              </p>
              <label className="form-label">Your rating</label>
              <StarRating value={rating} onChange={setRating} />
              <label className="form-label" htmlFor={`review-${order.id}`}>Review (optional)</label>
              <textarea
                id={`review-${order.id}`}
                className="form-textarea"
                rows={2}
                placeholder="How was the product? Condition, packaging, seller communication…"
                value={review}
                onChange={(e) => setReview(e.target.value)}
              />
              <label className="order-satisfaction-check">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                />
                <span>I received this item and I am happy with it. Release escrow payment to the seller.</span>
              </label>
              <div className="order-card-actions">
                <button
                  type="button"
                  className="order-confirm-btn"
                  disabled={!confirmChecked || submitting}
                  onClick={handleConfirmReceived}
                >
                  {submitting ? "Submitting…" : "Submit — Well Received"}
                </button>
                <button type="button" className="cat-btn" onClick={() => setShowConfirm(false)} disabled={submitting}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!isFinished && !isProblem && (etaMissed || ["payment_received", "in_delivery", "delivered"].includes(order.status)) && (
            <div className="tracking-refund-row">
              {!showDispute ? (
                <button
                  type="button"
                  className={`order-dispute-btn ${etaMissed ? "order-dispute-urgent" : ""}`}
                  onClick={() => setShowDispute(true)}
                >
                  {etaMissed ? "Request Refund — Deadline Missed" : "Report Problem / Request Refund"}
                </button>
              ) : (
                <div className="dispute-form">
                  <label className="form-label">Why do you need a refund?</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder={etaMissed ? "Seller did not deliver on time…" : "Describe the issue…"}
                  />
                  <div className="order-card-actions">
                    <button type="button" className="order-dispute-btn" onClick={handleDispute} disabled={submitting}>
                      Submit Refund Request
                    </button>
                    <button type="button" className="cat-btn" onClick={() => setShowDispute(false)} disabled={submitting}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
