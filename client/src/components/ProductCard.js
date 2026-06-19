import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProductImages } from "../utils/productImages";
import { updateProduct } from "../services/api";
import { isCurrentlyBoosted } from "../utils/boostHelpers";
import SellerNameLine, { sellerDisplayName } from "./SellerNameLine";
import { 
  Smartphone, CarFront, Sofa, Shirt, Home, Tractor, Wrench, Package, 
  Heart, Trash2, MapPin 
} from "lucide-react";

const CATEGORY_ICONS = {
  Electronics: Smartphone,
  Vehicles: CarFront,
  Furniture: Sofa,
  Clothing: Shirt,
  Property: Home,
  Agriculture: Tractor,
  Services: Wrench,
  Other: Package,
};

function formatPrice(price) {
  return "N$\u00A0" + Number(price).toLocaleString("en-NA", { minimumFractionDigits: 0 });
}

export default function ProductCard({ product, onDelete }) {
  const IconComponent = CATEGORY_ICONS[product.category] || Package;
  const images = getProductImages(product);
  const cover = images[0];

  const [likes, setLikes] = useState(product.likes || 0);
  const [liked, setLiked] = useState(() => {
    try {
      const saved = localStorage.getItem("favorites");
      const list = saved ? JSON.parse(saved) : [];
      return list.includes(product.id);
    } catch {
      return false;
    }
  });

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
      const saved = localStorage.getItem("favorites");
      let list = saved ? JSON.parse(saved) : [];
      if (newLiked) {
        if (!list.includes(product.id)) list.push(product.id);
      } else {
        list = list.filter(item => item !== product.id);
      }
      localStorage.setItem("favorites", JSON.stringify(list));

      await updateProduct(product.id, { likes: newLikes });
    } catch (err) {
      // Revert on failure
      setLiked(!newLiked);
      setLikes(likes);
      console.error("Failed to update likes:", err);
    }
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this listing?")) {
      onDelete(product.id);
    }
  };

  const sponsored = isCurrentlyBoosted(product);

  return (
    <Link to={`/listing/${product.id}`} className={`product-card${sponsored ? " product-card--sponsored" : ""}${product.is_sold ? " product-card--sold" : ""}`}>
      {cover ? (
        <>
          <img src={cover} alt={product.title} className="card-img" />
          {product.is_sold && <span className="sold-badge">Sold</span>}
          {sponsored && !product.is_sold && <span className="sponsored-badge">Sponsored</span>}
          {images.length > 1 && (
            <span className="card-photo-count">{images.length} photos</span>
          )}
        </>
      ) : (
        <div className="card-img-placeholder">
          {sponsored && <span className="sponsored-badge">Sponsored</span>}
          <IconComponent size={64} strokeWidth={1.5} color="currentColor" />
        </div>
      )}
      <div className="card-body">
        <div className="card-header-flex">
          <span className="card-cat">{product.category}</span>
          <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
            <button 
              className={`like-btn ${liked ? 'liked' : ''}`}
              onClick={handleLike}
              aria-label={liked ? "Unlike" : "Like"}
            >
              <Heart size={14} strokeWidth={2.5} />
              {likes}
            </button>
            {onDelete && (
              <button 
                className="delete-btn"
                onClick={handleDelete}
                aria-label="Delete listing"
              >
                <Trash2 size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
        <h3 className="card-title">{product.title}</h3>
        {sellerDisplayName(product) && (
          <SellerNameLine product={product} badgeSize={12} className="card-seller-row" />
        )}
        {product.description && (
          <p className="card-desc">{product.description}</p>
        )}
        <div className="card-footer">
          <span className="card-price">{formatPrice(product.price)}</span>
          {product.location && (
            <span className="card-location">
              <MapPin size={12} strokeWidth={2.5} />
              {product.location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
