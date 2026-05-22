import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getProduct, updateProduct } from "../services/api";
import { getProductImages } from "../utils/productImages";
import ListingGallery from "../components/ListingGallery";
import { useAuth } from "../context/AuthContext";

const CATEGORY_ICONS = {
  Electronics: "📱", Vehicles: "🚗", Furniture: "🛋️",
  Clothing: "👕", Property: "🏠", Agriculture: "🌾",
  Services: "🔧", Other: "📦",
};

function formatPrice(price) {
  return "N$ " + Number(price).toLocaleString("en-NA", { minimumFractionDigits: 0 });
}

function timeAgo(dateStr) {
  if (!dateStr) return "Recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);

  const images = useMemo(() => getProductImages(product), [product]);

  useEffect(() => {
    if (product) {
      setLikes(product.likes || 0);
    }
  }, [product]);

  const handleLike = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert("Please log in to like a product.");
      navigate("/login");
      return;
    }

    const newLiked = !liked;
    const newLikes = newLiked ? likes + 1 : likes - 1;
    
    setLiked(newLiked);
    setLikes(newLikes);

    try {
      await updateProduct(product.id, { likes: newLikes });
    } catch (err) {
      setLiked(!newLiked);
      setLikes(likes);
      console.error("Failed to update likes:", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    getProduct(id)
      .then((res) => setProduct(res.data))
      .catch(() => setError("Listing not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="detail-page">
        <div className="loading-wrap"><div className="spinner" />Loading listing…</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="detail-page">
        <div className="error-wrap">{error || "Not found."}</div>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="contact-btn"
          style={{ display: "block", maxWidth: 200, margin: "1rem auto" }}
        >
          Back to listings
        </button>
      </div>
    );
  }

  const icon = CATEGORY_ICONS[product.category] || "📦";
  const hasImages = images.length > 0;

  return (
    <div className="detail-page">
      <Link to="/" className="detail-back">
        ← Back to listings
      </Link>

      <div className="detail-grid">
        <ListingGallery images={images} title={product.title} categoryIcon={icon} />

        <div className="detail-info">
          <div className="card-header-flex">
            <span className="detail-category">{product.category}</span>
            <button 
              className={`like-btn ${liked ? 'liked' : ''}`}
              onClick={handleLike}
              aria-label={liked ? "Unlike" : "Like"}
              style={{ fontSize: '1rem', padding: '0.5rem 0.8rem' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              {likes}
            </button>
          </div>
          <h1 className="detail-title">{product.title}</h1>
          <div className="detail-price">{formatPrice(product.price)}</div>

          {hasImages && images.length > 1 && (
            <p className="detail-photo-count">{images.length} photos</p>
          )}

          {product.description && (
            <p className="detail-desc">{product.description}</p>
          )}

          <div className="detail-meta">
            {product.location && (
              <div className="meta-row">
                <span className="meta-label">📍 Location</span>
                <span>{product.location}</span>
              </div>
            )}
            <div className="meta-row">
              <span className="meta-label">👤 Seller</span>
              <span>{product.seller}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">🕐 Posted</span>
              <span>{timeAgo(product.created_at)}</span>
            </div>
          </div>

          <a
            href={`mailto:${product.seller_email}?subject=Enquiry: ${product.title}`}
            className="contact-btn"
          >
            📧 Contact Seller
          </a>
        </div>
      </div>
    </div>
  );
}
