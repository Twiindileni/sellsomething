import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createProduct,
  createEmployee,
  getCategories,
  updateProduct,
  uploadProductImages,
} from "../services/api";
import { MAX_PRODUCT_IMAGES } from "../utils/productImages";
import TermsModal from "../components/TermsModal";

const AD_FEE = 25;

const LOCATIONS = [
  "Windhoek", "Walvis Bay", "Swakopmund", "Oshakati", "Rundu",
  "Katima Mulilo", "Keetmanshoop", "Lüderitz", "Otjiwarongo",
  "Grootfontein", "Gobabis", "Rehoboth", "Mariental", "Other",
];

const SERVICE_CATEGORIES = [
  "Nanny", "Gardener", "IT", "Painter", "Builder",
  "Plumber", "Electrician", "Cleaner", "Other",
];

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function SellPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session, profile } = useAuth();
  const [listingType, setListingType] = useState(
    searchParams.get("type") === "service" ? "service" : "item"
  );
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState(null);
  const [imageItems, setImageItems] = useState([]);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [feeAccepted, setFeeAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    location: "",
    seller: "",
    seller_email: "",
    profession: "Other",
    references_text: "",
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
      title: prev.title || profile?.full_name || user.user_metadata?.full_name || "",
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

  function validateAgreements() {
    if (!feeAccepted) {
      setError("Please acknowledge the N$25 ad posting fee.");
      return false;
    }
    if (!termsAccepted) {
      setError("Please accept the Terms & Conditions.");
      return false;
    }
    if (!session?.access_token) {
      setError("Please log in to post.");
      return false;
    }
    return true;
  }

  async function uploadImages() {
    if (imageItems.length === 0) return [];
    const files = imageItems.map((i) => i.file);
    const uploadRes = await uploadProductImages(files, session.access_token);
    return uploadRes.data?.urls || [];
  }

  async function handleSubmitItem(e) {
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
    if (!validateAgreements()) return;

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
        fee_acknowledged: true,
      };

      const res = await createProduct(payload, session.access_token);
      const productId = res.data?.id;
      if (!productId) throw new Error("Server did not return a listing id.");

      let notice = null;
      if (imageItems.length > 0) {
        try {
          const urls = await uploadImages();
          if (urls.length > 0) {
            await updateProduct(productId, { images: urls, image: urls[0] });
          }
        } catch (imgErr) {
          notice = imgErr.response?.data?.error || imgErr.message || "Photos could not be uploaded.";
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
          : err.response?.data?.error || err.message || "Failed to post listing. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitService(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSuccessMsg("");

    const serviceName = form.title?.trim() || "";
    const serviceDescription = form.description?.trim() || "";
    const missing = [];
    if (!serviceName) missing.push("your name / business name");
    if (!form.profession) missing.push("profession");
    if (!serviceDescription) missing.push("description");
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(", ")}.`);
      return;
    }
    if (!validateAgreements()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: serviceName,
        profession: form.profession,
        description: serviceDescription,
        references_text: form.references_text.trim(),
        location: form.location,
        contact_email: user?.email || form.seller_email || "",
      };

      if (imageItems.length > 0) {
        payload.images = await uploadImages();
      }

      const res = await createEmployee(payload, session.access_token);
      const serviceId = res.data?.id;
      if (!serviceId) throw new Error("Server did not return a service id.");

      setSuccess(true);
      setSuccessMsg("Service profile published! Redirecting…");
      setTimeout(() => navigate(`/professionals/${serviceId}`), 1200);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to publish service.");
    } finally {
      setSubmitting(false);
    }
  }

  const slotsLeft = MAX_PRODUCT_IMAGES - imageItems.length;
  const priceNum = parseFloat(form.price) || 0;
  const totalWithFee = priceNum + AD_FEE;
  const isService = listingType === "service";

  const photosBlock = (
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
          </label>
        )}
      </div>
    </div>
  );

  const agreementsBlock = (
    <div className="sell-agreements">
      <label className="sell-agree-row">
        <input
          type="checkbox"
          className="terms-checkbox"
          id="fee-agree"
          checked={feeAccepted}
          onChange={(e) => setFeeAccepted(e.target.checked)}
          disabled={submitting}
        />
        <span className="terms-agree-label">
          I understand that posting costs <strong>N$25</strong>. This fee will be billed to my registered payment method or deducted from my first sale.
        </span>
      </label>

      <label className="sell-agree-row">
        <input
          type="checkbox"
          className="terms-checkbox"
          id="terms-sell"
          checked={termsAccepted}
          onChange={(e) => {
            if (e.target.checked && !termsAccepted) {
              setShowTermsModal(true);
            } else {
              setTermsAccepted(false);
            }
          }}
          disabled={submitting}
        />
        <span className="terms-agree-label">
          I have read and agree to the{" "}
          <button type="button" className="terms-link-btn" onClick={() => setShowTermsModal(true)}>
            Terms &amp; Conditions
          </button>
          {isService
            ? ", including the in-app messaging policy."
            : ", including the escrow payment policy that protects both buyers and sellers."}
        </span>
      </label>

      {termsAccepted && <div className="terms-accepted-badge">✅ Terms accepted</div>}
    </div>
  );

  return (
    <div className="sell-page">
      {showTermsModal && (
        <TermsModal
          alreadyAccepted={termsAccepted}
          onClose={() => setShowTermsModal(false)}
          onAccept={() => {
            setTermsAccepted(true);
            setShowTermsModal(false);
          }}
        />
      )}

      <div className="sell-header">
        <h1 className="sell-title">Post an Ad</h1>
        <p className="sell-sub">
          {isService
            ? "List your professional service so clients can find and contact you."
            : "Fill in the details below to list your item for sale."}
        </p>
      </div>

      <div className="sell-type-tabs">
        <button
          type="button"
          className={`sell-type-tab ${!isService ? "active" : ""}`}
          onClick={() => { setListingType("item"); setError(null); }}
        >
          📦 Sell an Item
        </button>
        <button
          type="button"
          className={`sell-type-tab ${isService ? "active" : ""}`}
          onClick={() => { setListingType("service"); setError(null); }}
        >
          🔧 Offer a Service
        </button>
      </div>

      {success && <div className="success-banner">✅ {successMsg}</div>}
      {error && <div className="error-banner">⚠️ {error}</div>}

      {!isService ? (
        <form onSubmit={handleSubmitItem}>
          {photosBlock}

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
                {categories.filter((c) => c !== "Services").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <select className="form-select" name="location" value={form.location} onChange={handleChange} disabled={submitting}>
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

          {priceNum > 0 && (
            <div className="fee-summary-box">
              <div className="fee-summary-title">💰 Pricing Summary</div>
              <div className="fee-summary-row">
                <span>Your listing price</span>
                <span>N$ {priceNum.toLocaleString("en-NA", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="fee-summary-row fee-row">
                <span>Ad posting fee</span>
                <span>+ N$ {AD_FEE.toFixed(2)}</span>
              </div>
              <div className="fee-summary-row fee-total-row">
                <span>Buyer pays</span>
                <span>N$ {totalWithFee.toLocaleString("en-NA", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

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
            <span className="register-help-text" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              Buyers will reach you via in-app messages on this listing.
            </span>
          </div>

          {agreementsBlock}

          <button type="submit" className="submit-btn" disabled={submitting || !feeAccepted || !termsAccepted}>
            {submitting ? "Posting…" : "Post My Ad →"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmitService}>
          {photosBlock}

          <div className="form-group">
            <label className="form-label">Your Name / Business Name *</label>
            <input
              className="form-input"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. John's Plumbing"
              maxLength={100}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Profession / Category *</label>
              <select
                className="form-select"
                name="profession"
                value={form.profession}
                onChange={handleChange}
                disabled={submitting}
              >
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Service Area</label>
              <select className="form-select" name="location" value={form.location} onChange={handleChange} disabled={submitting}>
                <option value="">All Namibia</option>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">What You Offer (Description) *</label>
            <textarea
              className="form-textarea"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe your skills, experience, and what clients can expect…"
              maxLength={1000}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">References &amp; Credentials</label>
            <textarea
              className="form-textarea"
              name="references_text"
              value={form.references_text}
              onChange={handleChange}
              placeholder="Certifications, past clients, years of experience…"
              maxLength={500}
              disabled={submitting}
              style={{ minHeight: "80px" }}
            />
          </div>

          <p className="register-help-text" style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
            Clients will find your profile under <strong>Find Services</strong> and contact you via in-app messages.
          </p>

          {agreementsBlock}

          <button type="submit" className="submit-btn" disabled={submitting || !feeAccepted || !termsAccepted}>
            {submitting ? "Publishing…" : "Publish Service Profile →"}
          </button>
        </form>
      )}
    </div>
  );
}
