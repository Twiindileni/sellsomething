import React from "react";
import { Star } from "lucide-react";

export default function StarRating({ value, max = 5, size = 16, className = "" }) {
  const rating = Math.max(0, Math.min(max, Number(value) || 0));

  return (
    <span className={`star-rating ${className}`.trim()} aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rating ? "star-rating-filled" : "star-rating-empty"}
          fill={i < rating ? "currentColor" : "none"}
          strokeWidth={i < rating ? 0 : 1.75}
        />
      ))}
    </span>
  );
}
