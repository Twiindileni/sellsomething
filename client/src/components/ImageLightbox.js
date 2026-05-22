import React, { useEffect, useCallback, useState } from "react";

/**
 * Full-screen image viewer.
 * @param {string[]} images - URLs to display (supports multiple for future gallery)
 * @param {number} initialIndex - Which image to show first
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {string} [caption] - Shown under the image (e.g. listing title)
 */
export default function ImageLightbox({
  images = [],
  initialIndex = 0,
  isOpen,
  onClose,
  caption = "",
}) {
  const [index, setIndex] = useState(initialIndex);
  const hasMultiple = images.length > 1;
  const current = images[index];

  useEffect(() => {
    if (isOpen) setIndex(initialIndex);
  }, [isOpen, initialIndex]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
      if (hasMultiple && e.key === "ArrowLeft") goPrev();
      if (hasMultiple && e.key === "ArrowRight") goNext();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose, hasMultiple, goPrev, goNext]);

  if (!isOpen || !current) return null;

  return (
    <div
      className="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={caption ? `Full size: ${caption}` : "Full size image"}
      onClick={onClose}
    >
      <div className="lightbox-toolbar">
        {hasMultiple && (
          <span className="lightbox-counter">
            {index + 1} / {images.length}
          </span>
        )}
        <button
          type="button"
          className="lightbox-close"
          onClick={onClose}
          aria-label="Close full size view"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {hasMultiple && (
        <button
          type="button"
          className="lightbox-nav lightbox-nav-prev"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          aria-label="Previous image"
        >
          ‹
        </button>
      )}

      <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
        <img
          src={current}
          alt={caption || "Listing photo"}
          className="lightbox-img"
        />
        {caption && <p className="lightbox-caption">{caption}</p>}
      </div>

      {hasMultiple && (
        <button
          type="button"
          className="lightbox-nav lightbox-nav-next"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          aria-label="Next image"
        >
          ›
        </button>
      )}
    </div>
  );
}
