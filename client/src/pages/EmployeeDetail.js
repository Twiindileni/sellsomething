import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getEmployee, getEmployeeReviews, createEmployeeReview } from "../services/api";
import ListingGallery from "../components/ListingGallery";
import { useAuth } from "../context/AuthContext";
import "./EmployeeDetail.css";

const PROFESSION_ICONS = {
  Nanny: "👶", Gardener: "🌿", IT: "💻", Painter: "🎨",
  Builder: "🔨", Plumber: "🚰", Electrician: "⚡", Cleaner: "🧹", Other: "💼"
};

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [employee, setEmployee] = useState(null);
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

  const icon = PROFESSION_ICONS[employee.profession] || "💼";

  return (
    <div className="employee-detail-page">
      <Link to="/professionals" className="employee-detail-back">
        ← Back to Directory
      </Link>

      <div className="employee-detail-grid">
        <ListingGallery images={employee.images || []} title={employee.name} categoryIcon={icon} />

        <div className="employee-detail-info">
          <div className="employee-detail-header-flex">
            <span className="employee-detail-category">{employee.profession}</span>
            <div className="employee-rating-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--sand)', padding: '0.3rem 0.8rem', borderRadius: '100px', fontWeight: 'bold' }}>
              <span style={{ color: "#f59e0b" }}>★</span>
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
                <span className="employee-meta-label">Location</span>
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

          <a
            href={`mailto:${employee.contact_email}?subject=Enquiry from SellSomething: ${employee.profession} services`}
            className="employee-contact-btn"
          >
            📧 Contact {employee.name.split(' ')[0]}
          </a>
        </div>
      </div>

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
                    <span className="review-stars">
                      {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                    </span>
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
                ✍️ Write a Review
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
