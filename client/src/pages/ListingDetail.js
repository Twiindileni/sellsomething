import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getProduct, updateProduct, sendMessage, getMessageThread } from "../services/api";
import { getProductImages } from "../utils/productImages";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import BuyNowModal from "../components/BuyNowModal";
import LoginPromptModal from "../components/LoginPromptModal";
import SellerNameLine from "../components/SellerNameLine";
import {
  Smartphone, CarFront, Sofa, Shirt, Home, Tractor, Wrench, Package,
  Heart, MapPin, User, Clock, ShieldCheck, MessageCircle, ChevronLeft,
  ChevronRight, Star, Truck, RotateCcw, Lock, BadgeCheck
} from "lucide-react";
import "./ListingDetail.css";
import SEO from "../components/SEO";

const CATEGORY_ICONS = {
  Electronics: Smartphone, Vehicles: CarFront, Furniture: Sofa,
  Clothing: Shirt, Property: Home, Agriculture: Tractor,
  Services: Wrench, Other: Package,
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
  const { user, session } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImg, setActiveImg] = useState(0);

  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(() => {
    try {
      const saved = localStorage.getItem("favorites");
      const list = saved ? JSON.parse(saved) : [];
      return list.includes(id);
    } catch { return false; }
  });

  const [sellerId, setSellerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showBuyNow, setShowBuyNow] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const images = useMemo(() => getProductImages(product), [product]);

  useEffect(() => { if (product) setLikes(product.likes || 0); }, [product]);

  useEffect(() => {
    if (product?.seller_id) { setSellerId(product.seller_id); return; }
    if (product?.seller_email) {
      supabase.from("profiles").select("id").eq("email", product.seller_email).maybeSingle()
        .then(({ data }) => { if (data) setSellerId(data.id); });
    }
  }, [product]);

  useEffect(() => {
    if (!showChat || !user || !sellerId) return;
    let active = true;
    const loadThread = async () => {
      try {
        const res = await getMessageThread({ productId: product.id, otherUserId: sellerId }, session?.access_token);
        if (active) setMessages(res.data);
      } catch { }
    };
    loadThread();
    const interval = setInterval(loadThread, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [showChat, sellerId, product?.id, user, session]);

  const handleLike = async (e) => {
    e.preventDefault();
    if (!user) { alert("Please log in to save a listing."); navigate("/login"); return; }
    const newLiked = !liked;
    const newLikes = newLiked ? likes + 1 : likes - 1;
    setLiked(newLiked); setLikes(newLikes);
    try {
      const saved = localStorage.getItem("favorites");
      let list = saved ? JSON.parse(saved) : [];
      if (newLiked) { if (!list.includes(product.id)) list.push(product.id); }
      else { list = list.filter(item => item !== product.id); }
      localStorage.setItem("favorites", JSON.stringify(list));
      await updateProduct(product.id, { likes: newLikes });
    } catch { setLiked(!newLiked); setLikes(likes); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !sellerId || !session?.access_token) return;
    setSending(true);
    try {
      const res = await sendMessage({ receiver_id: sellerId, product_id: product.id, content: newMessage.trim() }, session.access_token);
      setMessages(prev => [...prev, res.data]);
      setNewMessage("");
    } catch (err) {
      alert("Failed to send: " + (err.response?.data?.error || err.message));
    } finally { setSending(false); }
  };

  useEffect(() => {
    setLoading(true);
    getProduct(id)
      .then((res) => setProduct(res.data))
      .catch(() => setError("Listing not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="pdp-page"><div className="loading-wrap"><div className="spinner" />Loading listing…</div></div>
  );
  if (error || !product) return (
    <div className="pdp-page">
      <div className="error-wrap">{error || "Not found."}</div>
      <button type="button" onClick={() => navigate("/")} className="pdp-back-link" style={{ marginTop: "1.5rem" }}>← Back to listings</button>
    </div>
  );

  const IconComponent = CATEGORY_ICONS[product.category] || Package;
  const isSold = !!product.is_sold;
  const isOwnListing = user?.email === product.seller_email;
  const placeholderImg = null;

  const prevImg = () => setActiveImg(i => (i - 1 + images.length) % images.length);
  const nextImg = () => setActiveImg(i => (i + 1) % images.length);

  return (
    <div className="pdp-page">
      <SEO
        title={`${product.title} for sale in Namibia`}
        description={`${product.description ? product.description.slice(0, 150) : product.title} — N$ ${Number(product.price).toLocaleString()}. Buy safely with escrow on SellSomething Namibia.`}
        image={images[0] || undefined}
        url={`/listing/${product.id}`}
        type="product"
      />
      {/* Breadcrumb */}
      <nav className="pdp-breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to={`/?category=${encodeURIComponent(product.category)}`}>{product.category}</Link>
        <span>/</span>
        <span className="pdp-breadcrumb-current">{product.title}</span>
      </nav>

      <div className="pdp-grid">
        {/* ── LEFT: Gallery ── */}
        <div className="pdp-gallery-col">
          <div className="pdp-main-img-wrap">
            {isSold && <div className="pdp-sold-ribbon">SOLD</div>}
            {images.length > 0 ? (
              <img
                key={activeImg}
                src={images[activeImg]}
                alt={product.title}
                className="pdp-main-img"
              />
            ) : (
              <div className="pdp-img-placeholder">
                <IconComponent size={80} strokeWidth={1} color="#c8b8a8" />
              </div>
            )}
            {images.length > 1 && (
              <>
                <button type="button" className="pdp-arrow pdp-arrow-left" onClick={prevImg} aria-label="Previous">
                  <ChevronLeft size={22} />
                </button>
                <button type="button" className="pdp-arrow pdp-arrow-right" onClick={nextImg} aria-label="Next">
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="pdp-thumbs">
              {images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  className={`pdp-thumb ${i === activeImg ? "active" : ""}`}
                  onClick={() => setActiveImg(i)}
                >
                  <img src={src} alt={`View ${i + 1}`} />
                </button>
              ))}
            </div>
          )}

          {/* Dots */}
          {images.length > 1 && (
            <div className="pdp-dots">
              {images.map((_, i) => (
                <button key={i} type="button" className={`pdp-dot ${i === activeImg ? "active" : ""}`} onClick={() => setActiveImg(i)} />
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Product Info ── */}
        <div className="pdp-info-col">
          {/* Badge row */}
          <div className="pdp-badge-row">
            <span className="pdp-category-badge">
              <IconComponent size={12} style={{ marginRight: 4 }} />{product.category}
            </span>
            <span className="pdp-time-badge">
              <Clock size={12} style={{ marginRight: 4 }} />{timeAgo(product.created_at)}
            </span>
          </div>

          <h1 className="pdp-title">{product.title}</h1>

          {/* Likes row */}
          <div className="pdp-likes-row">
            <div className="pdp-stars">
              {[1,2,3,4,5].map(s => <Star key={s} size={16} fill={s <= 4 ? "#f59e0b" : "none"} stroke="#f59e0b" />)}
              <span className="pdp-likes-count">({likes} saves)</span>
            </div>
          </div>

          <div className="pdp-price">{formatPrice(product.price)}</div>

          {product.location && (
            <div className="pdp-location">
              <MapPin size={15} />
              <span>{product.location}</span>
            </div>
          )}

          <div className="pdp-divider" />

          {/* Description */}
          {product.description && (
            <div className="pdp-section">
              <h3 className="pdp-section-title">About this product</h3>
              <p className="pdp-desc">{product.description}</p>
            </div>
          )}

          <div className="pdp-divider" />

          {/* Trust features */}
          <div className="pdp-features">
            <div className="pdp-feature-item">
              <ShieldCheck size={20} className="pdp-feature-icon" />
              <div>
                <strong>Escrow Protected</strong>
                <p>Money held safely until you confirm delivery</p>
              </div>
            </div>
            <div className="pdp-feature-item">
              <RotateCcw size={20} className="pdp-feature-icon" />
              <div>
                <strong>Full Refund Guarantee</strong>
                <p>Item not as described? Get your money back</p>
              </div>
            </div>
            <div className="pdp-feature-item">
              <Truck size={20} className="pdp-feature-icon" />
              <div>
                <strong>Delivery Tracking</strong>
                <p>Live delivery updates from the seller</p>
              </div>
            </div>
          </div>

          <div className="pdp-divider" />

          {/* Seller card */}
          <div className="pdp-seller-card">
            <div className="pdp-seller-avatar">
              <User size={22} />
            </div>
            <div className="pdp-seller-info">
              <span className="pdp-seller-label">Listed by</span>
              <span className="pdp-seller-name"><SellerNameLine product={product} badgeSize={15} /></span>
            </div>
          </div>

          {/* Sold banner */}
          {isSold && (
            <div className="pdp-sold-notice">
              This item has been sold and is no longer available.
              {isOwnListing && <span> You can relist from your Dashboard.</span>}
            </div>
          )}

          {/* Action buttons */}
          {!isOwnListing && !isSold ? (
            <div className="pdp-actions">
              <button type="button" className="pdp-btn-primary" onClick={() => setShowBuyNow(true)}>
                <Lock size={18} /> Buy Now with Escrow
              </button>
              <button type="button" className="pdp-btn-secondary" onClick={() => user ? setShowChat(true) : setShowLoginPrompt(true)}>
                <MessageCircle size={18} /> Message Seller
              </button>
              <button type="button" className={`pdp-btn-save ${liked ? "saved" : ""}`} onClick={handleLike} aria-label={liked ? "Unsave" : "Save"}>
                <Heart size={18} fill={liked ? "currentColor" : "none"} />
                {liked ? "Saved" : "Save"}
              </button>
            </div>
          ) : isOwnListing ? (
            <div className="pdp-own-notice">
              <BadgeCheck size={18} /> This is your listing
            </div>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      {showLoginPrompt && (
        <LoginPromptModal
          icon={<MessageCircle size={32} strokeWidth={1.5} color="var(--accent)" />}
          title="Message the seller"
          message="Log in to message this seller safely inside Sell Something."
          onClose={() => setShowLoginPrompt(false)}
        />
      )}
      {showBuyNow && product && (
        <BuyNowModal product={product} sellerId={sellerId} onClose={() => setShowBuyNow(false)} />
      )}

      {/* Chat Drawer */}
      {showChat && sellerId && (
        <div className="chat-drawer-overlay" onClick={() => setShowChat(false)}>
          <div className="chat-drawer" onClick={e => e.stopPropagation()}>
            <div className="chat-header">
              <div className="chat-header-title">
                <span className="chat-header-name">Chat with {product.seller}</span>
                <span className="chat-header-listing">{product.title}</span>
              </div>
              <button type="button" className="lightbox-close" onClick={() => setShowChat(false)} style={{ width: 36, height: 36 }}>×</button>
            </div>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--muted)", marginTop: "2rem" }}>
                  <MessageCircle size={16} strokeWidth={2} className="inline-icon" />
                  Start the conversation below.
                </div>
              ) : messages.map(m => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`chat-msg-bubble ${isMe ? "sent" : "received"}`}>
                    {m.content}
                    <span className="chat-msg-time">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={sending}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
              />
              <button type="submit" className="chat-send-btn" disabled={sending || !newMessage.trim()}>Send</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
