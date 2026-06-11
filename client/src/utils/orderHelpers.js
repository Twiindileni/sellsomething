const TERMINAL_STATUSES = ["delivered", "confirmed", "completed", "refunded", "disputed"];

export function isEtaMissed(order) {
  if (!order?.delivery_eta) return false;
  if (TERMINAL_STATUSES.includes(order.status)) return false;
  if (!["payment_received", "in_delivery"].includes(order.status)) return false;
  return new Date() > new Date(order.delivery_eta);
}

export function formatEta(eta) {
  if (!eta) return null;
  return new Date(eta).toLocaleString("en-NA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function etaDaysRemaining(eta) {
  if (!eta) return null;
  const diff = new Date(eta) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function minDeliveryEtaInput() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 16);
}

export function formatTrackingTime(date) {
  if (!date) return null;
  return new Date(date).toLocaleString("en-NA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function currentStepIndex(status) {
  switch (status) {
    case "pending_payment": return 1;
    case "payment_received": return 2;
    case "in_delivery": return 2;
    case "delivered": return 3;
    case "confirmed":
    case "completed": return 4;
    default: return 0;
  }
}

export function getBuyerTrackingSteps(order) {
  const current = currentStepIndex(order?.status);
  const isActive = !["refunded", "disputed", "completed"].includes(order?.status);

  const steps = [
    {
      id: "placed",
      label: "Order Placed",
      sub: "Your purchase is protected by escrow",
      time: order.created_at,
      icon: "📋",
    },
    {
      id: "payment",
      label: "Payment Confirmed",
      sub: "Funds held safely until you confirm receipt",
      time: order.payment_received_at || (current > 1 ? order.updated_at : null),
      icon: "💳",
    },
    {
      id: "delivery",
      label: order.status === "in_delivery" ? "In Delivery" : "Seller Preparing / Shipping",
      sub:
        order.seller_latest_update ||
        order.delivery_eta_note ||
        (order.delivery_eta ? `Expected by ${formatEta(order.delivery_eta)}` : "Seller will set a delivery date"),
      time: order.seller_latest_update_at || order.in_delivery_at || (order.status === "in_delivery" ? order.updated_at : null),
      icon: "🚚",
      eta: order.delivery_eta,
    },
    {
      id: "delivered",
      label: order.status === "delivered" ? "Handed Over — Your Turn" : "Awaiting Handover",
      sub:
        order.status === "delivered"
          ? "Seller says item is with you — only you can confirm receipt"
          : "Seller will mark when they've sent or handed over the item",
      time: order.delivered_at || (order.status === "delivered" ? order.updated_at : null),
      icon: "📦",
    },
    {
      id: "received",
      label: "Well Received & Rated",
      sub: order.buyer_rating
        ? `You rated this ${order.buyer_rating} out of 5 stars`
        : "Confirm & rate the product to release payment",
      time: order.buyer_confirmed_at || order.rated_at,
      icon: "✅",
    },
  ];

  return steps.map((step, index) => {
    let state = "upcoming";
    if (index < current) state = "done";
    else if (index === current) state = "current";
    if (order.status === "confirmed" || order.status === "completed") {
      state = "done";
    }
    return { ...step, state, isActive };
  });
}

export function isOrderTrackingLive(order) {
  return ["pending_payment", "payment_received", "in_delivery", "delivered"].includes(order?.status);
}

export function getSellerTrackingSteps(order) {
  const current = currentStepIndex(order?.status);

  const steps = [
    {
      id: "placed",
      label: "Order Received",
      sub: `Buyer: ${order.buyer_email || "—"}`,
      time: order.created_at,
      icon: "📋",
    },
    {
      id: "payment",
      label: "Payment in Escrow",
      sub:
        order.status === "pending_payment"
          ? "Waiting for admin to verify buyer payment"
          : "Buyer payment confirmed — funds held safely",
      time: order.payment_received_at || (current > 1 ? order.updated_at : null),
      icon: "💳",
    },
    {
      id: "delivery",
      label: order.status === "in_delivery" ? "You Are Delivering" : "Prepare & Ship",
      sub:
        order.delivery_eta_note ||
        (order.delivery_eta
          ? `Commit: deliver by ${formatEta(order.delivery_eta)}`
          : "Set a delivery ETA when you start shipping"),
      time: order.in_delivery_at || (order.status === "in_delivery" ? order.updated_at : null),
      icon: "🚚",
      eta: order.delivery_eta,
    },
    {
      id: "delivered",
      label: "Marked Delivered",
      sub:
        order.status === "delivered"
          ? "Buyer must confirm receipt & rate the product"
          : "Mark delivered once the buyer has the item",
      time: order.delivered_at || (order.status === "delivered" ? order.updated_at : null),
      icon: "📦",
    },
    {
      id: "received",
      label: "Buyer Confirmed & Rated",
      sub: order.buyer_rating
        ? `Buyer rated ${order.buyer_rating}/5 — payout processing`
        : "You get paid only after buyer confirms",
      time: order.buyer_confirmed_at || order.rated_at,
      icon: "✅",
    },
  ];

  return steps.map((step, index) => {
    let state = "upcoming";
    if (index < current) state = "done";
    else if (index === current) state = "current";
    if (order.status === "confirmed" || order.status === "completed") {
      state = "done";
    }
    if (order.status === "disputed" || order.status === "refunded") {
      state = index <= current ? (index === current ? "current" : "done") : "upcoming";
    }
    return { ...step, state };
  });
}

export function sellerNeedsAction(order) {
  if (isEtaMissed(order)) return true;
  return ["payment_received", "in_delivery"].includes(order?.status);
}
