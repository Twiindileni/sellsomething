import React, { useState } from "react";

const TERMS_TEXT = `SELL SOMETHING — TERMS & CONDITIONS
Last updated: June 2026

Welcome to Sell Something, Namibia's online marketplace. By creating an account or posting an ad, you agree to these terms. Please read them carefully.

1. THE PLATFORM
Sell Something is a marketplace that connects buyers and sellers across Namibia. We do not own any listed items and are not a party to transactions between users.

2. ELIGIBILITY
You must be at least 18 years old to use this platform. By registering, you confirm you are legally able to enter into binding agreements in Namibia.

3. AD POSTING FEE (N$25 per ad)
- Every product listing costs N$25 (twenty-five Namibian dollars) to post.
- This fee is due upon ad submission and must be paid before your ad goes live.
- The fee covers listing promotion, platform maintenance, and buyer-protection services.
- Fees are non-refundable once an ad is published, even if the item does not sell.

4. ESCROW & BUYER PROTECTION
To prevent fraud and protect both buyers and sellers:
a) When a buyer agrees to purchase an item, they send the full payment amount to the Sell Something app account (EasyWallet or bank transfer).
b) The money is held securely in escrow until delivery is confirmed.
c) Once the buyer confirms they have received the item and are satisfied, the money is released to the seller (within 24 hours via EasyWallet).
d) If the buyer is not satisfied or the item was not delivered within the agreed timeframe, they may raise a dispute and request a full refund.
e) Admin will review disputes and make a fair decision. All decisions are final.

5. SELLER RESPONSIBILITIES
- List only items you own and have the right to sell.
- Provide accurate descriptions and photos.
- Deliver items promptly after payment is confirmed (in escrow).
- Communicate with buyers only through Sell Something in-app messages.
- Do NOT share phone numbers, WhatsApp, or other off-platform contact details to bypass the app.
- Do NOT ask buyers to pay outside the platform — this voids buyer protection and may result in account suspension.

6. BUYER RESPONSIBILITIES
- Contact sellers through in-app messages only — do not arrange off-platform deals.
- Make payments only through the official Sell Something payment channel (Buy Now / escrow).
- Confirm delivery honestly — false confirmation to release funds is fraud.
- Raise disputes within 7 days of the expected delivery date.

7. PROHIBITED ITEMS
You may not list: stolen goods, weapons, drugs, counterfeit items, live animals, or any item illegal under Namibian law. Violations will result in immediate account suspension and reporting to authorities.

8. ACCOUNT SUSPENSION
We reserve the right to suspend or delete accounts that violate these terms, conduct fraudulent activity, or receive multiple verified complaints.

9. LIMITATION OF LIABILITY
Sell Something is not liable for any loss arising from transactions between users, delivery failures, or item quality disputes beyond what is covered by our escrow refund policy.

10. CONTACT
For any questions or disputes, contact us via the in-app messaging system or at support@sellsomething.na`;

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
