import React, { useState } from "react";
import ImageLightbox from "./ImageLightbox";
import { ZoomIn } from "lucide-react";

export default function ListingGallery({ images, title, categoryIcon }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!images?.length) {
    return (
      <div className="detail-img-wrap">
        <span style={{ fontSize: "5rem" }}>{categoryIcon}</span>
      </div>
    );
  }

  const active = images[activeIndex] || images[0];

  function openLightbox(index) {
    setActiveIndex(index);
    setLightboxOpen(true);
  }

  return (
    <div className="listing-gallery">
      <button
        type="button"
        className="detail-img-wrap detail-img-clickable listing-gallery-main"
        onClick={() => openLightbox(activeIndex)}
        aria-label={`View full size photos of ${title}`}
      >
        <img src={active} alt={title} className="detail-img" />
        {images.length > 1 && (
          <span className="listing-gallery-badge">{activeIndex + 1} / {images.length}</span>
        )}
        <span className="detail-img-zoom-hint" aria-hidden="true">
          <ZoomIn size={20} strokeWidth={2} style={{marginRight: "6px"}} />
          Tap to view full size
        </span>
      </button>

      {images.length > 1 && (
        <div className="listing-gallery-thumbs" role="list" aria-label="Product photos">
          {images.map((url, i) => (
            <button
              key={url + i}
              type="button"
              role="listitem"
              className={`listing-gallery-thumb ${i === activeIndex ? "active" : ""}`}
              onClick={() => setActiveIndex(i)}
              aria-label={`Show photo ${i + 1} of ${images.length}`}
              aria-current={i === activeIndex}
            >
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      )}

      <ImageLightbox
        images={images}
        initialIndex={activeIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        caption={title}
      />
    </div>
  );
}
