import React from "react";
import "./SkeletonCard.css";

export default function SkeletonCard() {
  return (
    <div className="product-card skeleton-card">
      <div className="skeleton-img"></div>
      <div className="card-body">
        <div className="skeleton-cat"></div>
        <div className="skeleton-title"></div>
        <div className="skeleton-seller"></div>
        <div className="card-footer" style={{ marginTop: "auto" }}>
          <div className="skeleton-price"></div>
          <div className="skeleton-location"></div>
        </div>
      </div>
    </div>
  );
}
