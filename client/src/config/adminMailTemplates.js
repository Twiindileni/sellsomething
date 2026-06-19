/** Default subject + body for Admin → Mail → Send to a specific user */

export const ADMIN_MAIL_TEMPLATES = [
  {
    id: "welcome",
    label: "Welcome to Sell Something",
    subject: "Welcome to Sell Something",
    message: `Thanks for joining Sell Something — Namibia's marketplace with escrow protection.

You can browse listings, message sellers, and post your own ads for N$25. If you have any questions, reply to this email or visit your dashboard on the site.

Happy trading!`,
  },
  {
    id: "payment_received",
    label: "Payment received (buyer)",
    subject: "Your payment has been confirmed",
    message: `We've confirmed your payment for your recent order on Sell Something.

The seller has been notified and will arrange delivery. You can track progress anytime from Dashboard → My Purchases.

If anything looks wrong, reply to this email and we'll help.`,
  },
  {
    id: "seller_dispatch",
    label: "Seller — please dispatch order",
    subject: "Action needed: dispatch your order",
    message: `A buyer has paid for an item you're selling on Sell Something.

Please log in, open Dashboard → My Sales, and update the delivery status (ETA and progress notes). Buyers see live updates on their tracker.

If you've already handed over the item, mark it as delivered there.`,
  },
  {
    id: "buyer_confirm",
    label: "Buyer — confirm receipt",
    subject: "Please confirm you received your item",
    message: `Your order on Sell Something shows as delivered.

When you're happy with the item, open Dashboard → My Purchases and confirm receipt with a quick rating. That releases the seller's payout from escrow.

If there's a problem, use the refund option on the order page or reply here.`,
  },
  {
    id: "update_listing",
    label: "Update or remove listing",
    subject: "Is your listing still available?",
    message: `We noticed one of your ads may be out of date on Sell Something.

If the item sold, please mark it sold or remove the listing. If it's still available, consider refreshing the photos or price — updated ads get more interest from buyers across Namibia.

You can manage your ads from Dashboard → My Ads & Services.`,
  },
  {
    id: "first_listing",
    label: "Encourage first listing",
    subject: "Ready to post your first ad?",
    message: `You signed up for Sell Something but haven't posted a listing yet.

Posting costs N$25 and puts your item in front of buyers nationwide, with escrow so both sides can trade with confidence. It only takes a few minutes.

Log in and tap Sell to get started.`,
  },
  {
    id: "boost",
    label: "Boost listing offer",
    subject: "Get more views on your listing",
    message: `Your ad on Sell Something could reach more buyers with a sponsored boost.

Boosted listings appear higher in search and category pages for a set period. Open your listing from Dashboard → My Ads & Services to see boost options.

Reply if you'd like help choosing a plan.`,
  },
  {
    id: "support",
    label: "Support — we're on it",
    subject: "Re: your Sell Something enquiry",
    message: `Thanks for getting in touch with Sell Something.

We're looking into your message and will follow up shortly. If you have order numbers, screenshots, or extra details, feel free to reply to this email.

We appreciate your patience.`,
  },
  {
    id: "refund",
    label: "Refund processed",
    subject: "Your refund has been processed",
    message: `We've processed your refund request on Sell Something.

Funds should reflect according to your bank or mobile money provider's usual timing. If you don't see them within a few business days, reply with your order reference and we'll check.

Thank you for using Sell Something.`,
  },
  {
    id: "payout",
    label: "Seller payout sent",
    subject: "Your seller payout has been released",
    message: `Good news — the buyer confirmed receipt and we've released your payout for this order on Sell Something.

Payment should arrive per your agreed method. Check Dashboard → My Sales for order details.

Thanks for selling with us.`,
  },
];
