import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createProduct, getCategories, updateProduct, uploadProductImages } from "../services/api";
import { MAX_PRODUCT_IMAGES } from "../utils/productImages";

const LOCATIONS = [
  "Windhoek", "Walvis Bay", "Swakopmund", "Oshakati", "Rundu",
  "Katima Mulilo", "Keetmanshoop", "Lüderitz", "Otjiwarongo",
  "Grootfontein", "Gobabis", "Rehoboth", "Mariental", "Other",
];

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function SellPage() {
  const navigate = useNavigate();
  const { user, session, profile } = useAuth();
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState(null);
  const [imageItems, setImageItems] = useState([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    location: "",
    seller: "",
    seller_email: "",
  });

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      seller: profile?.full_name || user.user_metadata?.full_name || prev.seller,
      seller_email: user.email || prev.seller_email,
    }));
  }, [user, profile]);

  useEffect(() => {
    return () => {
      imageItems.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, [imageItems]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleImagesChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    if (!session?.access_token) {
      setError("Please log in to upload photos.");
      return;
    }

    const slotsLeft = MAX_PRODUCT_IMAGES - imageItems.length;
    if (slotsLeft <= 0) {
      setError(`You can add up to ${MAX_PRODUCT_IMAGES} photos.`);
      return;
    }

    const toAdd = [];
    for (const file of files.slice(0, slotsLeft)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Use JPEG, PNG, WebP, or GIF images only.");
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Each image must be smaller than 5 MB.");
        continue;
      }
      toAdd.push({ file, preview: URL.createObjectURL(file), id: `${Date.now()}-${Math.random()}` });
    }

    if (toAdd.length > 0) {
      setImageItems((prev) => [...prev, ...toAdd]);
      setError(null);
    }
  }

  function removeImage(id) {
    setImageItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== id);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSuccessMsg("");

    if (!form.title || !form.price || !form.category || !form.seller || !form.seller_email) {
      setError("Please fill in all required fields.");
      return;
    }
    if (isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0) {
      setError("Please enter a valid price.");
      return;
    }
    if (imageItems.length > 0 && !session?.access_token) {
      setError("Please log in to upload photos with your listing.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        category: form.category,
        location: form.location,
        seller: form.seller.trim(),
        seller_email: form.seller_email.trim(),
        images: [],
        image: null,
      };

      const res = await createProduct(payload);
      const productId = res.data?.id;

      if (!productId) {
        throw new Error("Server did not return a listing id.");
      }

      let notice = null;
      if (imageItems.length > 0 && session?.access_token) {
        try {
          const files = imageItems.map((i) => i.file);
          const uploadRes = await uploadProductImages(files, session.access_token);
          const urls = uploadRes.data?.urls || [];
          if (urls.length > 0) {
            await updateProduct(productId, { images: urls, image: urls[0] });
          }
        } catch (imgErr) {
          notice =
            imgErr.response?.data?.error ||
            imgErr.message ||
            "Photos could not be uploaded.";
        }
      }

      setSuccess(true);
      setSuccessMsg(
        notice
          ? `Listing posted! (Photos skipped: ${notice})`
          : "Listing posted! Redirecting…"
      );
      setTimeout(() => navigate(`/listing/${productId}`), notice ? 2500 : 1200);
    } catch (err) {
      const msg =
        err.code === "ECONNABORTED"
          ? "Request timed out. Restart the app with: npm run dev"
          : err.response?.data?.error ||
            err.message ||
            "Failed to post listing. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const slotsLeft = MAX_PRODUCT_IMAGES - imageItems.length;

  return (
    <div className="sell-page">
      <div className="sell-header">
        <h1 className="sell-title">Post an Ad</h1>
        <p className="sell-sub">Fill in the details below to list your item for sale.</p>
      </div>

      {success && (
        <div className="success-banner">
          ✅ {successMsg}
        </div>
      )}
      {error && (
        <div className="error-banner">⚠️ {error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">
            Photos <span className="form-label-hint">(up to {MAX_PRODUCT_IMAGES})</span>
          </label>
          <div className="image-upload-multi">
            {imageItems.length > 0 && (
              <div className="image-preview-grid">
                {imageItems.map((item) => (
                  <div key={item.id} className="image-preview-tile">
                    <img src={item.preview} alt="" className="image-preview" />
                    <button
                      type="button"
                      className="image-remove-btn"
                      onClick={() => removeImage(item.id)}
                      disabled={submitting}
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {slotsLeft > 0 && (
              <label className="image-upload-label image-upload-add">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleImagesChange}
                  className="image-upload-input"
                  disabled={submitting}
                />
                <span className="image-upload-icon">📷</span>
                <span>
                  {imageItems.length === 0
                    ? "Add photos (max 5 MB each)"
                    : `Add ${slotsLeft} more photo${slotsLeft > 1 ? "s" : ""}`}
                </span>
                {!user && (
                  <span className="image-upload-hint">Log in to upload photos</span>
                )}
              </label>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            className="form-input"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. iPhone 13 Pro Max 256GB"
            maxLength={100}
            disabled={submitting}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="form-select"
              name="category"
              value={form.category}
              onChange={handleChange}
              disabled={submitting}
            >
              <option value="">Select…</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <select
              className="form-select"
              name="location"
              value={form.location}
              onChange={handleChange}
              disabled={submitting}
            >
              <option value="">Select…</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Price (N$) *</label>
          <div className="price-wrap">
            <span className="price-prefix">N$</span>
            <input
              className="form-input"
              name="price"
              value={form.price}
              onChange={handleChange}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe the condition, features, and any other details buyers should know…"
            maxLength={1000}
            disabled={submitting}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Your Name *</label>
            <input
              className="form-input"
              name="seller"
              value={form.seller}
              onChange={handleChange}
              placeholder="Full name"
              disabled={submitting}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              className="form-input"
              name="seller_email"
              value={form.seller_email}
              onChange={handleChange}
              type="email"
              placeholder="your@email.com"
              readOnly={!!user}
              disabled={submitting}
            />
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? "Posting…" : "Post My Ad →"}
        </button>
      </form>
    </div>
  );
}
