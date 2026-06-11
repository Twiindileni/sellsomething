import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createEmployee, uploadProductImages } from "../services/api";
import "./RegisterEmployee.css";

const CATEGORIES = [
  "Nanny",
  "Gardener",
  "IT",
  "Painter",
  "Builder",
  "Plumber",
  "Electrician",
  "Cleaner",
  "Other"
];

export default function RegisterEmployee() {
  const navigate = useNavigate();
  const { user, session, profile } = useAuth();
  
  const [formData, setFormData] = useState({
    name: profile?.full_name || user?.user_metadata?.full_name || "",
    profession: "Other",
    description: "",
    references_text: "",
    contact_email: user?.email || "",
    location: ""
  });
  
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 4) {
      alert("You can only upload up to 4 images.");
      return;
    }
    setImages(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.description || !formData.contact_email) {
      setError("Please fill out all required fields.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      let imageUrls = [];
      if (images.length > 0) {
        if (!session?.access_token) throw new Error("Not logged in");
        const uploadRes = await uploadProductImages(images, session.access_token);
        imageUrls = uploadRes.data.urls || [];
      }

      const payload = {
        ...formData,
        user_id: user.id,
      };
      
      // Inject uploaded images into the payload
      imageUrls.forEach((url, i) => {
        payload[`image${i === 0 ? '' : i + 1}`] = url;
      });

      const res = await createEmployee(payload);
      navigate(`/professionals/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Registration failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-header">
        <h1>Offer Your Services</h1>
        <p>Create a professional profile so clients can find and review you.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form className="register-form" onSubmit={handleSubmit}>
        <div className="register-form-group">
          <label className="register-form-label">Your Name / Business Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="register-form-input"
            placeholder="e.g. John Doe's Plumbing"
          />
        </div>

        <div className="register-form-group">
          <label className="register-form-label">Profession / Category *</label>
          <select 
            name="profession" 
            value={formData.profession} 
            onChange={handleChange} 
            required
            className="register-form-select"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="register-form-group">
          <label className="register-form-label">What You Do (Description) *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            className="register-form-textarea"
            placeholder="Describe your skills, experience, and what you offer..."
          />
        </div>

        <div className="register-form-group">
          <label className="register-form-label">References & Credentials</label>
          <textarea
            name="references_text"
            value={formData.references_text}
            onChange={handleChange}
            className="register-form-textarea"
            style={{ minHeight: '80px' }}
            placeholder="List references, certifications, or past client testimonials..."
          />
        </div>

        <div className="register-form-row">
          <div className="register-form-group">
            <label className="register-form-label">Contact Email *</label>
            <input
              type="email"
              name="contact_email"
              value={formData.contact_email}
              onChange={handleChange}
              className="register-form-input"
              required
            />
          </div>
          <div className="register-form-group">
            <label className="register-form-label">Location / Service Area</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="register-form-input"
              placeholder="e.g. Windhoek, Khomas"
            />
          </div>
        </div>

        <div className="register-form-group">
          <label className="register-form-label">Portfolio / Profile Images (Max 4)</label>
          <input
            type="file"
            accept="image/jpeg, image/png, image/webp"
            multiple
            onChange={handleImageChange}
            className="register-file-input"
          />
          <p className="register-help-text">Showcase your past work or upload a professional headshot.</p>
        </div>

        <div className="register-actions">
          <button type="button" className="register-cancel-btn" onClick={() => navigate("/professionals")} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="register-submit-btn" disabled={submitting}>
            {submitting ? "Publishing Profile..." : "Publish Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
