import React, { useState } from "react";
import { updateOrderStatus } from "../services/api";
import {
  isEtaMissed,
  formatEta,
  etaDaysRemaining,
  formatTrackingTime,
  getSellerTrackingSteps,
  isOrderTrackingLive,
  minDeliveryEtaInput,
} from "../utils/orderHelpers";

export default function SellerOrderTracking({ order, accessToken, onOrderUpdated }) {
  const [mode, setMode] = useState(null); // "start" | "update_eta" | "progress" | "handover" | null
  const [deliveryEta, setDeliveryEta] = useState("");
  const [deliveryEtaNote, setDeliveryEtaNote] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [handoverNote, setHandoverNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const etaMissed = isEtaMissed(order);
  const steps = getSellerTrackingSteps(order);
  const live = isOrderTrackingLive(order);
  const daysLeft = order.delivery_eta ? etaDaysRemaining(order.delivery_eta) : null;
  const isFinished = ["confirmed", "completed"].includes(order.status);
  const isProblem = ["disputed", "refunded"].includes(order.status);

  function resetForm() {
    setMode(null);
    setDeliveryEta("");
    setDeliveryEtaNote("");
    setProgressNote("");
    setHandoverNote("");
  }


  async function handleProgressUpdate() {
    if (!progressNote.trim()) {
      alert("Please enter an update for the buyer.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await updateOrderStatus(
        order.id,
        order.status,
        { action: "seller_progress_update", seller_status_note: progressNote.trim() },
        accessToken
      );
      onOrderUpdated(res.data);
      resetForm();
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Could not send update.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartDelivery() {
    if (!deliveryEta) {
      alert("Please set a delivery date and time.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await updateOrderStatus(
        order.id,
        "in_delivery",
        {
          delivery_eta: new Date(deliveryEta).toISOString(),
          delivery_eta_note: deliveryEtaNote.trim() || undefined,
        },
        accessToken
      );
      onOrderUpdated(res.data);
      resetForm();
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Could not start delivery.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateEta() {
    if (!deliveryEta) {
      alert("Please set a new delivery date.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await updateOrderStatus(
        order.id,
        order.status,
        {
          action: "update_delivery_eta",
          delivery_eta: new Date(deliveryEta).toISOString(),
          delivery_eta_note: deliveryEtaNote.trim() || undefined,
        },
        accessToken
      );
      onOrderUpdated(res.data);
      resetForm();
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Could not update ETA.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkDelivered() {
    setSubmitting(true);
    try {
      const res = await updateOrderStatus(
        order.id,
        "delivered",
        { seller_status_note: handoverNote.trim() || undefined },
        accessToken
      );
      onOrderUpdated(res.data);
      resetForm();
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Could not mark as handed over.");
    } finally {
      setSubmitting(false);
    }
  }

  function openStartDelivery() {
    setMode("start");
    setDeliveryEta("");
    setDeliveryEtaNote("");
  }

  function openUpdateEta() {
    setMode("update_eta");
    const raw = order.delivery_eta ? new Date(order.delivery_eta) : null;
    setDeliveryEta(raw && !Number.isNaN(raw.getTime()) ? raw.toISOString().slice(0, 16) : "");
    setDeliveryEtaNote(order.delivery_eta_note || "");
  }

  return (
    <div className={`seller-tracking-wrap buyer-tracking-wrap ${etaMissed ? "eta-missed" : ""} ${isProblem ? "is-problem" : ""}`}>
      <div className="buyer-tracking-layout">
        {/* Dispatch label */}
        <div className="tracking-label-card tracking-label-card--seller">
          <div className="tracking-label-tape" />
          <div className="tracking-label-brand">SellSomething · Dispatch</div>
          <div className="tracking-label-barcode">
            <div className="tracking-barcode-lines" aria-hidden="true" />
            <span className="tracking-label-id">{order.id?.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="tracking-label-row">
            <span className="tracking-label-key">SHIP TO</span>
            <span className="tracking-label-val">{order.buyer_email || "—"}</span>
          </div>
          <div className="tracking-label-row">
            <span className="tracking-label-key">ITEM</span>
            <span className="tracking-label-val">{order.product_title}</span>
          </div>
          <div className="tracking-label-row">
            <span className="tracking-label-key">PAYOUT</span>
            <span className="tracking-label-val">
              N$ {Number(order.amount).toLocaleString("en-NA", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Status panel */}
        <div className="tracking-panel tracking-panel--seller">
          <div className="tracking-panel-header">
            <div>
              <div className="tracking-panel-title">Delivery Status</div>
              <div className="tracking-panel-ref">Sale · {order.id?.slice(0, 13)}…</div>
            </div>
            {live && (
              <span className="tracking-live-badge">
                <span className="tracking-live-dot" /> Live
              </span>
            )}
          </div>

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
              <span className="tracking-eta-label">Your delivery commitment</span>
              <strong>{formatEta(order.delivery_eta)}</strong>
              {!etaMissed && daysLeft !== null && daysLeft >= 0 && (
                <span className="tracking-eta-sub">
                  {daysLeft === 0 ? "Due today — deliver or update ETA" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                </span>
              )}
              {etaMissed && (
                <span className="tracking-eta-sub tracking-eta-sub--missed">
                  Deadline missed — buyer can request a refund
                </span>
              )}
            </div>
          )}

          {etaMissed && !isProblem && (
            <div className="order-eta-breach-note seller-eta-breach">
              Update your ETA now or complete delivery. The buyer sees this delay on their tracker.
            </div>
          )}

          {order.status === "pending_payment" && (
            <div className="order-pending-note seller-status-note">
              Waiting for admin to confirm the buyer&apos;s payment. You&apos;ll be notified to ship once confirmed.
            </div>
          )}

          {/* Seller actions — updates sync to buyer tracker */}
          {order.status === "payment_received" && mode !== "start" && mode !== "progress" && (
            <div className="seller-action-row">
              <button type="button" className="order-confirm-btn" onClick={openStartDelivery}>
                Start Delivery — Set ETA
              </button>
              <button
                type="button"
                className="cat-btn"
                onClick={() => { setMode("progress"); setProgressNote(""); }}
              >
                Send Update to Buyer
              </button>
            </div>
          )}

          {mode === "progress" && (
            <div className="tracking-confirm-panel seller-action-panel">
              <h4 className="tracking-confirm-title">Update buyer&apos;s tracker</h4>
              <p className="tracking-confirm-sub">The buyer sees this message live on their tracking page.</p>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="e.g. Packed and ready, courier collecting tomorrow…"
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
              />
              <div className="order-card-actions">
                <button type="button" className="order-confirm-btn" onClick={handleProgressUpdate} disabled={submitting}>
                  {submitting ? "Sending…" : "Post Update"}
                </button>
                <button type="button" className="cat-btn" onClick={resetForm} disabled={submitting}>Cancel</button>
              </div>
            </div>
          )}

          {order.status === "payment_received" && mode === "start" && (
            <div className="tracking-confirm-panel seller-action-panel">
              <h4 className="tracking-confirm-title">Set delivery deadline</h4>
              <p className="tracking-confirm-sub">
                The buyer sees this on their live tracker. Missing it without updating allows a refund request.
              </p>
              <label className="form-label" htmlFor={`seller-eta-${order.id}`}>Deliver by</label>
              <input
                id={`seller-eta-${order.id}`}
                type="datetime-local"
                className="form-input"
                min={minDeliveryEtaInput()}
                value={deliveryEta}
                onChange={(e) => setDeliveryEta(e.target.value)}
              />
              <label className="form-label" htmlFor={`seller-eta-note-${order.id}`}>Note for buyer (optional)</label>
              <input
                id={`seller-eta-note-${order.id}`}
                type="text"
                className="form-input"
                placeholder="e.g. Windhoek courier, call on arrival"
                value={deliveryEtaNote}
                onChange={(e) => setDeliveryEtaNote(e.target.value)}
              />
              <div className="order-card-actions">
                <button type="button" className="order-confirm-btn" onClick={handleStartDelivery} disabled={submitting}>
                  {submitting ? "Saving…" : "Start Delivery"}
                </button>
                <button type="button" className="cat-btn" onClick={resetForm} disabled={submitting}>Cancel</button>
              </div>
            </div>
          )}

          {order.status === "in_delivery" && mode !== "update_eta" && mode !== "handover" && mode !== "progress" && (
            <div className="seller-action-row">
              <button
                type="button"
                className="cat-btn"
                onClick={() => { setMode("progress"); setProgressNote(""); }}
                disabled={submitting}
              >
                Send Update
              </button>
              <button type="button" className="cat-btn" onClick={openUpdateEta} disabled={submitting}>
                Update ETA
              </button>
              <button
                type="button"
                className="order-confirm-btn"
                onClick={() => { setMode("handover"); setHandoverNote(""); }}
                disabled={submitting}
              >
                Handed Over to Buyer
              </button>
            </div>
          )}

          {order.status === "in_delivery" && mode === "handover" && (
            <div className="tracking-confirm-panel seller-action-panel">
              <h4 className="tracking-confirm-title">Handed over to buyer</h4>
              <p className="tracking-confirm-sub">
                This tells the buyer you sent or handed them the item. Only the buyer can confirm they received it.
              </p>
              <label className="form-label" htmlFor={`handover-note-${order.id}`}>Note for buyer (optional)</label>
              <input
                id={`handover-note-${order.id}`}
                type="text"
                className="form-input"
                placeholder="e.g. Left with security, courier ref #123"
                value={handoverNote}
                onChange={(e) => setHandoverNote(e.target.value)}
              />
              <div className="order-card-actions">
                <button type="button" className="order-confirm-btn" onClick={handleMarkDelivered} disabled={submitting}>
                  {submitting ? "Saving…" : "Confirm Handover"}
                </button>
                <button type="button" className="cat-btn" onClick={resetForm} disabled={submitting}>Cancel</button>
              </div>
            </div>
          )}

          {order.status === "in_delivery" && mode === "update_eta" && (
            <div className="tracking-confirm-panel seller-action-panel">
              <h4 className="tracking-confirm-title">Update delivery ETA</h4>
              <p className="tracking-confirm-sub">Buyer is notified on their tracker when you save a new date.</p>
              <label className="form-label" htmlFor={`seller-update-eta-${order.id}`}>New deliver-by date</label>
              <input
                id={`seller-update-eta-${order.id}`}
                type="datetime-local"
                className="form-input"
                min={minDeliveryEtaInput()}
                value={deliveryEta}
                onChange={(e) => setDeliveryEta(e.target.value)}
              />
              <label className="form-label" htmlFor={`seller-update-note-${order.id}`}>Reason for update</label>
              <input
                id={`seller-update-note-${order.id}`}
                type="text"
                className="form-input"
                placeholder="e.g. Courier delayed — new agreed date"
                value={deliveryEtaNote}
                onChange={(e) => setDeliveryEtaNote(e.target.value)}
              />
              <div className="order-card-actions">
                <button type="button" className="order-confirm-btn" onClick={handleUpdateEta} disabled={submitting}>
                  {submitting ? "Saving…" : "Save New ETA"}
                </button>
                <button type="button" className="cat-btn" onClick={resetForm} disabled={submitting}>Cancel</button>
              </div>
            </div>
          )}

          {order.status === "delivered" && (
            <div className="order-pending-note seller-status-note">
              Handed over — waiting for the <strong>buyer</strong> to confirm receipt and rate. You cannot confirm for them.
            </div>
          )}

          {order.status === "confirmed" && (
            <div className="order-pending-note seller-status-note seller-status-note--success">
              Buyer confirmed! Payout of <strong>N$ {Number(order.amount).toLocaleString("en-NA")}</strong> processing within 24 hours.
            </div>
          )}

          {order.status === "completed" && (
            <div className="order-pending-note seller-status-note seller-status-note--success">
              Order complete — you have been paid.
            </div>
          )}

          {isFinished && order.buyer_rating && (
            <div className="tracking-rating-summary">
              <span className="tracking-rating-label">Buyer rated your sale</span>
              <span className="tracking-rating-stars">
                {"★".repeat(order.buyer_rating)}{"☆".repeat(5 - order.buyer_rating)}
              </span>
              {order.buyer_review && <p>{order.buyer_review}</p>}
            </div>
          )}

          {isProblem && (
            <div className="order-dispute-note">
              {order.status === "disputed" ? "Buyer requested a refund" : "Order refunded to buyer"}
              {order.dispute_reason && <><br /><em>{order.dispute_reason}</em></>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
