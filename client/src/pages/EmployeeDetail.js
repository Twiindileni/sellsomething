import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  getEmployee,
  getEmployeeReviews,
  createEmployeeReview,
  sendMessage,
  getMessageThread,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import LoginPromptModal from "../components/LoginPromptModal";
import StarRating from "../components/StarRating";
import "./EmployeeDetail.css";
import "./ListingDetail.css"; // Reuse the modern product view styles
import { 
  Baby, Leaf, Laptop, Paintbrush, Hammer, Droplets, Zap, Sparkles, Briefcase, 
  MapPin, MessageCircle, Star, PenLine, ChevronLeft, ChevronRight, ShieldCheck, Clock
} from "lucide-react";

const PROFESSION_ICONS = {
  Nanny: Baby, Gardener: Leaf, IT: Laptop, Painter: Paintbrush,
  Builder: Hammer, Plumber: Droplets, Electrician: Zap, Cleaner: Sparkles, Other: Briefcase
};

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, session } = useAuth();
  
  const [employee, setEmployee] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  
  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [relationship, setRelationship] = useState("Hired them before");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [providerId, setProviderId] = useState(null);
  const [resolvingProvider, setResolvingProvider] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getEmployee(id), getEmployeeReviews(id)])
      .then(([empRes, revRes]) => {
        setEmployee(empRes.data);
        setReviews(revRes.data);
      })
      .catch(() => setError("Professional not found."))
      .finally(() => setLoading(false));
  }, [id]);

  // Resolve provider account
  useEffect(() => {
    if (!employee) {
      setProviderId(null);
      return;
    }
    if (employee.user_id) {
      setProviderId(employee.user_id);
      return;
    }
    if (!employee.contact_email) {
      setProviderId(null);
      return;
    }
    let active = true;
    setResolvingProvider(true);
    supabase
      .from("profiles")
      .select("id")
      .eq("email", employee.contact_email)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.id) setProviderId(data.id);
      })
      .finally(() => {
        if (active) setResolvingProvider(false);
      });
    return () => { active = false; };
  }, [employee]);

  const isOwnProfile = Boolean(
    user?.id && providerId && user.id === providerId
  ) || Boolean(
    user?.email && employee?.contact_email
    && user.email.toLowerCase() === employee.contact_email.toLowerCase()
  );

  useEffect(() => {
    if (!showChat || !user || !providerId || !employee?.id) return;
    let active = true;
    getMessageThread(employee.id, user.id, "employee")
      .then((res) => {
        if (active) setMessages(res.data);
      })
      .catch(console.error);

    const channel = supabase
      .channel("employee_messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "employee_id=eq." + employee.id }, (payload) => {
        if (
          (payload.new.sender_id === user.id && payload.new.receiver_id === providerId) ||
          (payload.new.sender_id === providerId && payload.new.receiver_id === user.id)
        ) {
          setMessages((prev) => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [showChat, user, providerId, employee]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !providerId) return;
    setSending(true);
    try {
      await sendMessage({
        receiver_id: providerId,
        employee_id: employee.id,
        content: newMessage,
      });
      setNewMessage("");
    } catch (err) {
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleMessageClick = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    if (!providerId) {
      alert("This service profile cannot receive messages yet.");
      return;
    }
    setShowChat(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please log in to leave a review.");
      navigate("/login");
      return;
    }
    if (!comment.trim()) {
      setReviewError("Please write a comment.");
      return;
    }
    setSubmittingReview(true);
    setReviewError("");
    const reviewer_name = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
    try {
      const res = await createEmployeeReview(id, { reviewer_name, rating, comment, reviewer_id: user.id, relationship });
      setReviews([res.data, ...reviews]);
      setComment(""); setRating(5); setRelationship("Hired them before"); setShowReviewForm(false);
      setEmployee(prev => ({ ...prev, review_count: prev.review_count + 1, rating: ((prev.rating * prev.review_count) + rating) / (prev.review_count + 1) }));
    } catch (err) {
      setReviewError(err.response?.data?.error || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div className="pdp-page"><div className="loading-wrap"><div className="spinner" />Loading profile.</div></div>;
  if (error || !employee) return <div className="pdp-page"><div className="error-wrap">{error || "Not found."}</div><button type="button" onClick={() => navigate("/professionals")} className="pdp-btn-outline" style={{ display: "block", maxWidth: 200, margin: "1rem auto" }}>Back to Directory</button></div>;

  const IconComponent = PROFESSION_ICONS[employee.profession] || Briefcase;
  const images = employee.images || [];
  const prevImg = () => setActiveImg(i => (i - 1 + images.length) % images.length);
  const nextImg = () => setActiveImg(i => (i + 1) % images.length);

  return (
    <div className="pdp-page">
      <nav className="pdp-breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/professionals">Services</Link>
        <span>/</span>
        <span className="pdp-breadcrumb-current">{employee.profession}</span>
      </nav>

      <div className="pdp-grid">
        {/* ── LEFT: Gallery ── */}
        <div className="pdp-gallery-col">
          <div className="pdp-main-img-wrap" style={{ borderRadius: '24px', overflow: 'hidden' }}>
            {images.length > 0 ? (
              <img key={activeImg} src={images[activeImg]} alt={employee.name} className="pdp-main-img" style={{ objectFit: 'cover', width: '100%', height: '100%', aspectRatio: '1/1' }} />
            ) : (
              <div className="pdp-img-placeholder" style={{ aspectRatio: '1/1' }}>
                <IconComponent size={80} strokeWidth={1} color="#c8b8a8" />
              </div>
            )}
            {images.length > 1 && (
              <>
                <button type="button" className="pdp-arrow pdp-arrow-left" onClick={prevImg} aria-label="Previous"><ChevronLeft size={22} /></button>
                <button type="button" className="pdp-arrow pdp-arrow-right" onClick={nextImg} aria-label="Next"><ChevronRight size={22} /></button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="pdp-thumbs">
              {images.map((src, i) => (
                <button key={i} type="button" className={"pdp-thumb " + (i === activeImg ? "active" : "")} onClick={() => setActiveImg(i)}>
                  <img src={src} alt={"View " + (i + 1)} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Profile Info ── */}
        <div className="pdp-info-col">
          <div className="pdp-badge-row">
            <span className="pdp-category-badge"><IconComponent size={12} style={{ marginRight: 4 }} />{employee.profession}</span>
            <span className="pdp-time-badge"><Clock size={12} style={{ marginRight: 4 }} />Since {new Date(employee.created_at).toLocaleDateString()}</span>
          </div>

          <h1 className="pdp-title">{employee.name}</h1>

          <div className="pdp-likes-row">
            <div className="pdp-stars">
              {[1,2,3,4,5].map(s => <Star key={s} size={16} fill={s <= Math.round(employee.rating) ? "#f59e0b" : "none"} stroke="#f59e0b" />)}
              <span className="pdp-likes-count">({employee.review_count} reviews)</span>
            </div>
          </div>

          {employee.location && (
            <div className="pdp-location" style={{ marginTop: '0.5rem' }}>
              <MapPin size={15} />
              <span>{employee.location}</span>
            </div>
          )}

          <div className="pdp-divider" />

          {employee.description && (
            <div className="pdp-section">
              <h3 className="pdp-section-title">About</h3>
              <p className="pdp-desc">{employee.description}</p>
            </div>
          )}

          {employee.references_text && (
            <>
              <div className="pdp-divider" />
              <div className="pdp-section">
                <h3 className="pdp-section-title">References & Credentials</h3>
                <p className="pdp-desc" style={{ fontStyle: 'italic', background: 'var(--smoke)', padding: '1rem', borderRadius: '12px' }}>
                  "{employee.references_text}"
                </p>
              </div>
            </>
          )}

          <div className="pdp-divider" />

          <div className="pdp-features">
            <div className="pdp-feature-item">
              <ShieldCheck size={20} className="pdp-feature-icon" />
              <div>
                <strong>Verified Profile</strong>
                <p>Secure communication through SellSomething</p>
              </div>
            </div>
          </div>

          {isOwnProfile ? (
            <div style={{ background: 'var(--smoke)', padding: '1rem', borderRadius: '12px', color: 'var(--charcoal)', marginTop: '2rem' }}>
              <strong>This is your profile.</strong> Clients will contact you via Dashboard Messages.
            </div>
          ) : (
            <div className="pdp-actions">
              <button type="button" className="pdp-btn-buy" onClick={handleMessageClick} disabled={resolvingProvider}>
                <MessageCircle size={18} /> Message {employee.name.split(' ')[0]}
              </button>
            </div>
          )}
        </div>
      </div>

      {showLoginPrompt && <LoginPromptModal message="Log in to message this professional." onClose={() => setShowLoginPrompt(false)} />}

      {showChat && providerId && (
        <div className="chat-drawer-overlay" onClick={() => setShowChat(false)}>
          <div className="chat-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="chat-header">
              <div className="chat-header-title">
                <span className="chat-header-name">Chat with {employee.name}</span>
                <span className="chat-header-listing">{employee.profession} services</span>
              </div>
              <button type="button" className="lightbox-close" onClick={() => setShowChat(false)} style={{ width: 36, height: 36 }}>x</button>
            </div>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--muted)", marginTop: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <MessageCircle size={32} strokeWidth={1.5} />
                  <span>Ask about availability, pricing, or their experience.</span>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={"chat-msg-bubble " + (isMe ? "sent" : "received")}>
                      {m.content}
                      <span className="chat-msg-time">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  );
                })
              )}
            </div>
            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." disabled={sending} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }} />
              <button type="submit" className="chat-send-btn" disabled={sending || !newMessage.trim()}>Send</button>
            </form>
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="reviews-section" style={{ marginTop: '3rem' }}>
        <h2 className="reviews-section-title">Reviews ({employee.review_count})</h2>
        <div className="reviews-layout">
          <div className="reviews-list">
            {reviews.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>No reviews yet. Be the first to leave one!</p>
            ) : (
              reviews.map(rev => (
                <div key={rev.id} className="review-card">
                  <div className="review-header">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="review-author">{rev.reviewer_name}</span>
                      {rev.relationship && <span className="review-relationship-badge">{rev.relationship}</span>}
                    </div>
                    <StarRating value={rev.rating} size={16} className="review-stars" />
                  </div>
                  <p className="review-comment">{rev.comment}</p>
                </div>
              ))
            )}
          </div>
          <div className="review-form-box">
            {!showReviewForm ? (
              <button type="button" className="review-submit-btn" onClick={() => { if (!user) { alert("Please log in to leave a review."); navigate("/login"); } else { setShowReviewForm(true); } }}>
                Write a Review
              </button>
            ) : (
              <form onSubmit={handleSubmitReview} className="review-form">
                <h3 className="review-form-title" style={{ margin: 0 }}>Leave a Review</h3>
                <div className="review-form-group">
                  <label className="review-form-label">Rating</label>
                  <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="review-form-input">
                    <option value="5">5 Excellent</option>
                    <option value="4">4 Good</option>
                    <option value="3">3 Average</option>
                    <option value="2">2 Poor</option>
                    <option value="1">1 Terrible</option>
                  </select>
                </div>
                <div className="review-form-group">
                  <label className="review-form-label">Have you hired them?</label>
                  <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className="review-form-input">
                    <option>Hired them before</option>
                    <option>Contacted for quote</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="review-form-group">
                  <label className="review-form-label">Comment</label>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="review-form-textarea" placeholder="Share your experience..." required rows="4" />
                </div>
                <button type="submit" className="review-submit-btn" disabled={submittingReview}>
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
                {reviewError && <div className="error-banner" style={{ marginTop: '1rem' }}>{reviewError}</div>}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
