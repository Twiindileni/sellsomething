import React, { useState } from "react";
import { TERMS_TEXT } from "../content/legal";

export default function TermsModal({ onClose, onAccept, alreadyAccepted }) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  function handleScroll(e) {
    const el = e.target;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (nearBottom) setScrolledToBottom(true);
  }

  return (
    <div className="terms-overlay" role="dialog" aria-modal="true" aria-label="Terms and Conditions">
      <div className="terms-modal">
        <div className="terms-modal-header">
          <h2 className="terms-modal-title">📋 Terms &amp; Conditions</h2>
          <button
            type="button"
            className="terms-modal-close"
            onClick={onClose}
            aria-label="Close terms"
          >
            ×
          </button>
        </div>

        <div className="terms-scroll-body" onScroll={handleScroll}>
          <pre className="terms-text">{TERMS_TEXT}</pre>
        </div>

        {!scrolledToBottom && (
          <p className="terms-scroll-hint">↓ Scroll down to read all terms before accepting</p>
        )}

        <div className="terms-modal-footer">
          <button
            type="button"
            className="terms-decline-btn"
            onClick={onClose}
          >
            Decline
          </button>
          <button
            type="button"
            className="terms-accept-btn"
            onClick={onAccept}
            disabled={!scrolledToBottom && !alreadyAccepted}
          >
            ✅ I Accept the Terms &amp; Conditions
          </button>
        </div>
      </div>
    </div>
  );
}
