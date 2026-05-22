import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProductImages } from "../utils/productImages";
import { updateProduct } from "../services/api";

const CATEGORY_ICONS = {
  Electronics: "📱",
  Vehicles: "🚗",
  Furniture: "🛋️",
  Clothing: "👕",
  Property: "🏠",
  Agriculture: "🌾",
  Services: "🔧",
  Other: "📦",
};

function formatPrice(price) {
  return "N$\u00A0" + Number(price).toLocaleString("en-NA", { minimumFractionDigits: 0 });
}

export default function ProductCard({ product }) {
  const icon = CATEGORY_ICONS[product.category] || "📦";
  const images = getProductImages(product);
  const cover = images[0];

  const [likes, setLikes] = useState(product.likes || 0);
  const [liked, setLiked] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLike = async (e) => {
    e.preventDefault(); // Prevent navigating to detail page
    e.stopPropagation();
    
    if (!user) {
      alert("Please log in to like a product.");
      navigate("/login");
      return;
    }
    
    const newLiked = !liked;
    const newLikes = newLiked ? likes + 1 : likes - 1;
    
    // Optimistic UI update
    setLiked(newLiked);
    setLikes(newLikes);

    try {
      await updateProduct(product.id, { likes: newLikes });
    } catch (err) {
      // Revert on failure
      setLiked(!newLiked);
      setLikes(likes);
      console.error("Failed to update likes:", err);
    }
  };

  return (
    <Link to={`/listing/${product.id}`} className="product-card">
      {cover ? (
        <>
          <img src={cover} alt={product.title} className="card-img" />
          {images.length > 1 && (
            <span className="card-photo-count">{images.length} photos</span>
          )}
        </>
      ) : (
        <div className="card-img-placeholder">{icon}</div>
      )}
      <div className="card-body">
        <div className="card-header-flex">
          <span className="card-cat">{product.category}</span>
          <button 
            className={`like-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            {likes}
          </button>
        </div>
        <h3 className="card-title">{product.title}</h3>
        {product.description && (
          <p className="card-desc">{product.description}</p>
        )}
        <div className="card-footer">
          <span className="card-price">{formatPrice(product.price)}</span>
          {product.location && (
            <span className="card-location">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="7" r="3"/>
              </svg>
              {product.location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
