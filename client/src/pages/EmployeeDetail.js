import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  getEmployee,
  getEmployeeReviews,
  createEmployeeReview,
  sendMessage,
  getMessageThread,
} from "../services/api";
import ListingGallery from "../components/ListingGallery";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import LoginPromptModal from "../components/LoginPromptModal";
import StarRating from "../components/StarRating";
import "./EmployeeDetail.css";
import { 
  Baby, Leaf, Laptop, Paintbrush, Hammer, Droplets, Zap, Sparkles, Briefcase, 
  MapPin, MessageCircle, Star, PenLine 
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

  // Resolve provider account (older service listings may lack user_id)
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

    const loadThread = async () => {
      try {
        const res = await getMessageThread(
          { employeeId: employee.id, otherUserId: providerId },
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
  }, [showChat, providerId, employee?.id, user, session?.access_token]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !providerId || !employee?.id || !session?.access_token) return;

    setSending(true);
    try {
      const res = await sendMessage({
        receiver_id: providerId,
        employee_id: employee.id,
        content: newMessage.trim(),
      }, session.access_token);

      setMessages((prev) => [...prev, res.data]);
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
      const res = await createEmployeeReview(id, {
        reviewer_name,
        rating,
        comment,
        reviewer_id: user.id,
        relationship
      });
      setReviews([res.data, ...reviews]);
      setComment("");
      setRating(5);
      setRelationship("Hired them before");
      setShowReviewForm(false);
      
      setEmployee(prev => ({
        ...prev,
        review_count: prev.review_count + 1,
        rating: ((prev.rating * prev.review_count) + rating) / (prev.review_count + 1)
      }));
    } catch (err) {
      setReviewError(err.response?.data?.error || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="employee-detail-page">
        <div className="loading-wrap"><div className="spinner" />Loading profile…</div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="employee-detail-page">
        <div className="error-wrap">{error || "Not found."}</div>
        <button type="button" onClick={() => navigate("/professionals")} className="submit-btn" style={{ display: "block", maxWidth: 200, margin: "1rem auto" }}>
          Back to Directory
        </button>
      </div>
    );
  }

  const IconComponent = PROFESSION_ICONS[employee.profession] || Briefcase;

  return (
    <div className="employee-detail-page">
      <Link to="/professionals" className="employee-detail-back">
        ← Back to Directory
      </Link>

      <div className="employee-detail-grid">
        <ListingGallery images={employee.images || []} title={employee.name} categoryIcon={<IconComponent size={80} strokeWidth={1} color="currentColor" />} />

        <div className="employee-detail-info">
          <div className="employee-detail-header-flex">
            <span className="employee-detail-category">{employee.profession}</span>
            <div className="employee-rating-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--sand)', padding: '0.3rem 0.8rem', borderRadius: '100px', fontWeight: 'bold' }}>
              <Star size={16} fill="#f59e0b" color="#f59e0b" style={{ position: "relative", top: "1px" }} />
              {employee.rating > 0 ? Number(employee.rating).toFixed(1) : "New"} 
              <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 'normal' }}>
                ({employee.review_count} reviews)
              </span>
            </div>
          </div>
          
          <h1 className="employee-detail-title">{employee.name}</h1>
          
          <div className="employee-detail-meta">
            {employee.location && (
              <div className="employee-meta-row">
                <span className="employee-meta-label"><MapPin size={14} style={{marginRight: '6px', position: 'relative', top: '2px'}}/> Location</span>
                <span>{employee.location}</span>
              </div>
            )}
            <div className="employee-meta-row">
              <span className="employee-meta-label">Member Since</span>
              <span>{new Date(employee.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="employee-detail-section">
            <h3>About</h3>
            <p className="employee-detail-desc">{employee.description}</p>
          </div>

          {employee.references_text && (
            <div className="employee-references-box employee-detail-section">
              <h3>References & Credentials</h3>
              <p className="employee-detail-desc" style={{ fontStyle: 'italic' }}>"{employee.references_text}"</p>
            </div>
          )}

          {isOwnProfile ? (
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.5, padding: "1rem", background: "var(--sand)", borderRadius: "var(--radius-sm)" }}>
              This is your service profile. Clients will contact you via <strong>Dashboard → Messages</strong>.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                type="button"
                className="employee-contact-btn"
                onClick={handleMessageClick}
                disabled={resolvingProvider}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                {resolvingProvider
                  ? "Loading…"
                  : <><MessageCircle size={18} strokeWidth={2.5} /> Message {employee.name.split(" ")[0]}</>}
              </button>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>
                All communication stays in-app so we can help if something goes wrong.
              </p>
            </div>
          )}
        </div>
      </div>

      {showLoginPrompt && employee && (
        <LoginPromptModal
          icon={<MessageCircle size={32} strokeWidth={1.5} color="var(--accent)" />}
          title="Message this professional"
          highlight={`Chat with ${employee.name}`}
          message="Log in to contact service providers safely inside Sell Something. All conversations stay in-app for your protection."
          onClose={() => setShowLoginPrompt(false)}
        />
      )}

      {showChat && providerId && (
        <div className="chat-drawer-overlay" onClick={() => setShowChat(false)}>
          <div className="chat-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="chat-header">
              <div className="chat-header-title">
                <span className="chat-header-name">Chat with {employee.name}</span>
                <span className="chat-header-listing">{employee.profession} services</span>
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
                <div style={{ textAlign: "center", color: "var(--muted)", marginTop: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <MessageCircle size={32} strokeWidth={1.5} />
                  <span>Ask about availability, pricing, or their experience.</span>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender_id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={`chat-msg-bubble ${isMe ? "sent" : "received"}`}
                    >
                      {m.content}
                      <span className="chat-msg-time">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
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

      {/* Reviews Section */}
      <div className="reviews-section">
        <h2 className="reviews-section-title">
          Reviews ({employee.review_count})
        </h2>

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
                      {rev.relationship && (
                        <span className="review-relationship-badge">
                          {rev.relationship}
                        </span>
                      )}
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
              <button
                type="button"
                className="review-submit-btn"
                onClick={() => {
                  if (!user) {
                    alert("Please log in to leave a review.");
                    navigate("/login");
                  } else {
                    setShowReviewForm(true);
                  }
                }}
              >
                <PenLine size={18} strokeWidth={2.5} /> Write a Review
              </button>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 className="review-form-title" style={{ margin: 0 }}>Leave a Review</h3>
                  <button 
                    type="button" 
                    onClick={() => setShowReviewForm(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                  >
                    Cancel
                  </button>
                </div>
                <form onSubmit={handleSubmitReview}>
                  <div className="review-form-group">
                    <label className="review-form-label">Rating</label>
                    <select 
                      value={rating} 
                      onChange={e => setRating(Number(e.target.value))} 
                      className="review-form-input"
                    >
                      <option value={5}>5 - Excellent</option>
                      <option value={4}>4 - Good</option>
                      <option value={3}>3 - Average</option>
                      <option value={2}>2 - Poor</option>
                      <option value={1}>1 - Terrible</option>
                    </select>
                  </div>
                  <div className="review-form-group">
                    <label className="review-form-label">Have you hired them?</label>
                    <select 
                      value={relationship} 
                      onChange={e => setRelationship(e.target.value)} 
                      className="review-form-input"
                    >
                      <option value="Hired them before">Yes, I employed/hired them before</option>
                      <option value="Received inquiry / quote">No, but we discussed/inquired about services</option>
                      <option value="Co-worker / Partner">We worked together / co-workers</option>
                      <option value="Personal reference / Other">Personal reference / Other</option>
                    </select>
                  </div>
                  <div className="review-form-group">
                    <label className="review-form-label">Comment</label>
                    <textarea 
                      value={comment} 
                      onChange={e => setComment(e.target.value)} 
                      placeholder="Share your experience working with this professional..."
                      className="review-form-textarea"
                      required
                    />
                  </div>
                  {reviewError && <p style={{ color: 'red', fontSize: '0.9rem', marginBottom: '1rem' }}>{reviewError}</p>}
                  <button type="submit" className="review-submit-btn" disabled={submittingReview}>
                    {submittingReview ? "Submitting..." : "Post Review"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
