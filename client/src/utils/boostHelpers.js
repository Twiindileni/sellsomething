export function isCurrentlyBoosted(item) {
  if (!item?.is_boosted || !item?.boost_ends_at) return false;
  return new Date(item.boost_ends_at) > new Date();
}

export function formatBoostExpiry(endsAt) {
  if (!endsAt) return "";
  return new Date(endsAt).toLocaleDateString("en-NA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function boostStatusForTarget(boosts, targetType, targetId) {
  const list = (boosts || []).filter((b) => {
    if (targetType === "product") return b.product_id === targetId;
    return b.employee_id === targetId;
  });
  const pending = list.find((b) => b.status === "pending_payment");
  if (pending) return { type: "pending", boost: pending };
  const active = list.find(
    (b) => b.status === "active" && b.ends_at && new Date(b.ends_at) > new Date()
  );
  if (active) return { type: "active", boost: active };
  return { type: "none" };
}
