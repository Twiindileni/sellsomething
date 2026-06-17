import React from "react";
import VerifiedBadge from "./VerifiedBadge";

export function sellerDisplayName(product) {
  if (!product) return null;
  return (
    product.seller_display_name
    || product.seller
    || (product.seller_email ? product.seller_email.split("@")[0] : null)
  );
}

/** Seller name with optional verified badge — use on cards and listing detail */
export default function SellerNameLine({ product, badgeSize = 13, className = "" }) {
  const name = sellerDisplayName(product);
  if (!name) return null;

  return (
    <div className={`seller-name-line${className ? ` ${className}` : ""}`}>
      <span className="seller-name-line__name">{name}</span>
      {product.seller_verified && <VerifiedBadge compact size={badgeSize} />}
    </div>
  );
}
