import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getProduct, updateProduct, sendMessage, getMessageThread } from "../services/api";
import { getProductImages } from "../utils/productImages";
import ListingGallery from "../components/ListingGallery";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import BuyNowModal from "../components/BuyNowModal";
import LoginPromptModal from "../components/LoginPromptModal";
import SellerNameLine from "../components/SellerNameLine";
import { 
  Smartphone, CarFront, Sofa, Shirt, Home, Tractor, Wrench, Package, 
  Heart, MapPin, User, Clock, ShieldCheck, MessageCircle, Lock 
} from "lucide-react";
import "./ListingDetail.css";

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

  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(() => {
    try {
      const saved = localStorage.getItem("favorites");
      const list = saved ? JSON.parse(saved) : [];
      return list.includes(id);
    } catch {
      return false;
    }
  });

  const [sellerId, setSellerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showBuyNow, setShowBuyNow] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const images = useMemo(() => getProductImages(product), [product]);

  useEffect(() => {
    if (product) {
      setLikes(product.likes || 0);
    }
  }, [product]);

  // Resolve seller profile id from listing data
  useEffect(() => {
    if (product?.seller_id) {
      setSellerId(product.seller_id);
      return;
    }
    if (product?.seller_email) {
      supabase
        .from("profiles")
        .select("id")
        .eq("email", product.seller_email)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setSellerId(data.id);
        });
    }
  }, [product]);

  // Poll conversation thread
  useEffect(() => {
    if (!showChat || !user || !sellerId) return;

    let active = true;

    const loadThread = async () => {
      try {
        const res = await getMessageThread(
          { productId: product.id, otherUserId: sellerId },
          session?.access_token
        );
        if (active) setMessages(res.data);
      } catch (err) {
        console.error("Failed to load thread:", err);
      }
    };

    loadThread();
    const interval = setInterval(loadThread, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [showChat, sellerId, product?.id, user, session]);

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
      setLiked(!newLiked);
      setLikes(likes);
      console.error("Failed to update likes:", err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !sellerId || !session?.access_token) return;

    setSending(true);
    try {
      const res = await sendMessage({
        receiver_id: sellerId,
        product_id: product.id,
        content: newMessage.trim(),
      }, session.access_token);

      setMessages(prev => [...prev, res.data]);
      setNewMessage("");
    } catch (err) {
      alert("Failed to send message: " + (err.response?.data?.error || err.message));
    } finally {
      setSending(false);
    }
  };

  const handleMessageClick = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setShowChat(true);
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

  const IconComponent = CATEGORY_ICONS[product.category] || Package;
  const hasImages = images.length > 0;
  const isSold = !!product.is_sold;
  const isOwnListing = user?.email === product.seller_email;

  return (
    <div className="detail-page modern-detail-page">
      {/* Floating Top Nav */}
      <div className="floating-top-nav">
        <button className="floating-icon-btn back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <button 
          className={`floating-icon-btn like-btn ${liked ? 'liked' : ''}`}
          onClick={handleLike}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart size={20} strokeWidth={2.5} fill={liked ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="modern-detail-grid">
        {/* Left/Top Column: Image Gallery */}
        <div className="modern-gallery-container">
          <ListingGallery images={images} title={product.title} categoryIcon={<IconComponent size={80} strokeWidth={1} color="currentColor" />} />
        </div>

        {/* Right/Bottom Column: Product Info Card */}
        <div className="modern-detail-info bottom-sheet-card">
          <div className="modern-info-scrollable">
            
            <div className="card-top-meta">
              <span className="modern-category-badge">
                <IconComponent size={14} style={{marginRight: 4}}/> {product.category}
              </span>
              <span className="time-ago-badge">{timeAgo(product.created_at)}</span>
            </div>

            <h1 className="modern-detail-title">{product.title}</h1>
            <div className="modern-detail-price">{formatPrice(product.price)}</div>

            <div className="section-divider"></div>

            <h3 className="section-heading">About this product</h3>
            {product.description ? (
              <p className="modern-detail-desc">{product.description}</p>
            ) : (
              <p className="modern-detail-desc" style={{color: '#888'}}>No description provided.</p>
            )}

            <h3 className="section-heading">Listing details</h3>
            <div className="modern-meta-grid">
              {product.location && (
                <div className="modern-meta-item">
                  <MapPin size={18} className="meta-icon"/>
                  <div className="meta-text">
                    <span className="meta-label">Location</span>
                    <span className="meta-value">{product.location}</span>
                  </div>
                </div>
              )}
              {hasImages && images.length > 1 && (
                <div className="modern-meta-item">
                  <Package size={18} className="meta-icon"/>
                  <div className="meta-text">
                    <span className="meta-label">Photos</span>
                    <span className="meta-value">{images.length} included</span>
                  </div>
                </div>
              )}
            </div>

            {/* Seller Profile Card */}
            <div className="seller-profile-card">
              <div className="seller-avatar">
                <User size={24} color="var(--accent)" />
              </div>
              <div className="seller-info">
                <span className="seller-label">Seller</span>
                <span className="seller-name"><SellerNameLine product={product} badgeSize={16} /></span>
              </div>
            </div>

            {/* Escrow Trust Badge */}
            <div className="trust-badge-premium">
              <ShieldCheck size={28} className="trust-icon" />
              <div className="trust-content">
                <strong>Escrow Protected</strong>
                <p>Your money is held safely until you confirm delivery. Full refund if the item is not as described.</p>
              </div>
            </div>

            {isSold && (
              <div className="listing-sold-banner">
                This item has been marked as sold and is no longer available.
                {isOwnListing && (
                  <span> You can relist it from Dashboard.</span>
                )}
              </div>
            )}
          </div>

          {/* Sticky Action Footer (Desktop & Mobile) */}
          <div className="modern-action-bar">
            {!isOwnListing && !isSold ? (
              <>
                <button
                  type="button"
                  className="modern-btn modern-btn-primary"
                  onClick={() => setShowBuyNow(true)}
                >
                  <ShieldCheck size={20} strokeWidth={2.5} /> Buy Now
                </button>
                <button
                  type="button"
                  className="modern-btn modern-btn-secondary"
                  onClick={handleMessageClick}
                >
                  <MessageCircle size={20} strokeWidth={2.5} /> Message
                </button>
              </>
            ) : isOwnListing ? (
              <div className="action-bar-notice">This is your listing</div>
            ) : null}
          </div>
        </div>
      </div>

      {showLoginPrompt && (
        <LoginPromptModal
          icon={<MessageCircle size={32} strokeWidth={1.5} color="var(--accent)" />}
          title="Message the seller"
          highlight={product?.seller ? `Chat with ${product.seller}` : undefined}
          message="Log in to message this seller safely inside Sell Something. We keep a record of every conversation to help if something goes wrong."
          onClose={() => setShowLoginPrompt(false)}
        />
      )}

      {/* Buy Now Modal */}
      {showBuyNow && product && (
        <BuyNowModal
          product={product}
          sellerId={sellerId}
          onClose={() => setShowBuyNow(false)}
        />
      )}

      {/* Chat Drawer Overlay */}
      {showChat && sellerId && (
        <div className="chat-drawer-overlay" onClick={() => setShowChat(false)}>
          <div className="chat-drawer" onClick={e => e.stopPropagation()}>
            <div className="chat-header">
              <div className="chat-header-title">
                <span className="chat-header-name">Chat with {product.seller}</span>
                <a href={`/listing/${product.id}`} className="chat-header-listing" onClick={e => e.preventDefault()}>{product.title}</a>
              </div>
              <button 
                type="button" 
                className="lightbox-close" 
                onClick={() => setShowChat(false)}
                style={{ width: 36, height: 36 }}
              >
                ×
              </button>
            </div>
            
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: '2rem' }}>
                  <MessageCircle size={16} strokeWidth={2} className="inline-icon" aria-hidden="true" />
                  Start the conversation by typing a message below.
                </div>
              ) : (
                messages.map(m => {
                  const isMe = m.sender_id === user?.id;
                  return (
                    <div 
                      key={m.id} 
                      className={`chat-msg-bubble ${isMe ? 'sent' : 'received'}`}
                    >
                      {m.content}
                      <span className="chat-msg-time">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={sending}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <button 
                type="submit" 
                className="chat-send-btn" 
                disabled={sending || !newMessage.trim()}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
