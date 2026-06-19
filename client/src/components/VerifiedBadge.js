import React from "react";
import { BadgeCheck } from "lucide-react";

/** Shown on listings and profiles when admin has verified the seller */
export default function VerifiedBadge({ size = 14, className = "", compact = false }) {
  return (
    <span
      className={`verified-badge${compact ? " verified-badge--compact" : ""}${className ? ` ${className}` : ""}`}
      title="Verified seller on Sell Something"
    >
      <BadgeCheck size={size} strokeWidth={2.25} aria-hidden="true" />
      {!compact && <span>Verified</span>}
    </span>
  );
}
