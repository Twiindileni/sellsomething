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
    <div className="detail-page">
      <Link to="/" className="detail-back">
        ← Back to listings
      </Link>

      <div className="detail-grid">
        <ListingGallery images={images} title={product.title} categoryIcon={<IconComponent size={80} strokeWidth={1} color="currentColor" />} />

        <div className="detail-info">
          <div className="card-header-flex">
            <span className="detail-category">{product.category}</span>
            <button 
              className={`like-btn ${liked ? 'liked' : ''}`}
              onClick={handleLike}
              aria-label={liked ? "Unlike" : "Like"}
              style={{ fontSize: '1rem', padding: '0.5rem 0.8rem' }}
            >
              <Heart size={18} strokeWidth={2.5} />
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
                <span className="meta-label"><MapPin size={14} style={{marginRight: '6px', position: 'relative', top: '2px'}}/> Location</span>
                <span>{product.location}</span>
              </div>
            )}
            <div className="meta-row">
              <span className="meta-label"><User size={14} style={{marginRight: '6px', position: 'relative', top: '2px'}}/> Seller</span>
              <SellerNameLine product={product} badgeSize={14} />
            </div>
            <div className="meta-row">
              <span className="meta-label"><Clock size={14} style={{marginRight: '6px', position: 'relative', top: '2px'}}/> Posted</span>
              <span>{timeAgo(product.created_at)}</span>
            </div>
          </div>

          {isSold && (
            <div className="listing-sold-banner">
              This item has been marked as sold and is no longer available for purchase.
              {isOwnListing && (
                <span> You can relist it from Dashboard → My Ads &amp; Services.</span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {/* Buy Now — Escrow Protected (only show if not seller's own listing) */}
            {!isOwnListing && !isSold && (
              <button
                type="button"
                className="contact-btn buynow-hero-btn"
                style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                onClick={() => setShowBuyNow(true)}
              >
                <ShieldCheck size={18} strokeWidth={2.5} /> Buy Now — Escrow Protected
              </button>
            )}

            {!isOwnListing && !isSold && (
              <button
                type="button"
                className="contact-btn"
                style={{ margin: 0, background: 'var(--white)', border: '1.5px solid var(--accent)', color: 'var(--accent)', boxShadow: 'none', display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                onClick={handleMessageClick}
              >
                <MessageCircle size={18} strokeWidth={2.5} /> Message Seller
              </button>
            )}
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
              All buyer–seller communication stays in-app so we can help if something goes wrong.
            </p>

            {/* Escrow info badge */}
            <div className="escrow-info-badge">
              <span><Lock size={20} strokeWidth={2} style={{ color: "var(--accent)", marginTop: "2px" }} /></span>
              <span>All purchases are <strong>escrow-protected</strong>. Your money is held safely until you confirm delivery. Full refund if the item is not as described or not delivered.</span>
            </div>
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
