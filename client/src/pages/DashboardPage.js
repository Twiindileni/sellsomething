import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  getMyProducts, 
  getMyEmployees, 
  deleteProduct,
  markProductSold,
  getProducts, 
  updateProfile,
  requestSellerVerification,
  uploadProductImage, 
  getConversations, 
  sendMessage, 
  getMessageThread,
  getMyOrders,
  getMyBoosts,
} from "../services/api";
import ProductCard from "../components/ProductCard";
import BoostModal from "../components/BoostModal";
import { boostStatusForTarget, formatBoostExpiry } from "../utils/boostHelpers";
import { isEtaMissed, sellerNeedsAction } from "../utils/orderHelpers";
import {
  messageThreadKey,
  getMessageReadState,
  markThreadRead,
  countUnreadInThread,
} from "../utils/messageHelpers";
import BuyerOrderTracking from "../components/BuyerOrderTracking";
import SellerOrderTracking from "../components/SellerOrderTracking";
import { SuccessBanner, ErrorBanner } from "../components/StatusBanners";
import VerifiedBadge from "../components/VerifiedBadge";
import { MessageCircle, ShoppingCart, Star, User, Clock, Briefcase, Package, Heart, Settings, BadgeCheck, Mail, AlertTriangle } from "lucide-react";

const ID_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

function formatVerificationDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString("en-NA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VerificationPendingView({ profile, justSubmitted, confirmationEmail }) {
  const submittedAt = profile?.verification_requested_at;
  const emailLine = confirmationEmail || profile?.email;

  return (
    <div className="profile-verification-pending">
      <SuccessBanner className="profile-verification-sent-banner">
        <div className="profile-verification-sent-text">
          <strong>Email sent successfully.</strong>
          <span>
            Your ID and verification details were securely emailed to our team.
            We do not store your ID in the app.
          </span>
        </div>
      </SuccessBanner>

      <div className="profile-verification-pending-status">
        <span className="profile-verification-pending-pill">
          <Clock size={14} strokeWidth={2} aria-hidden="true" />
          Verification pending
        </span>
        {submittedAt && (
          <span className="profile-verification-pending-date">
            Submitted {formatVerificationDate(submittedAt)}
          </span>
        )}
      </div>

      <p className="profile-verification-pending-hint">
        {justSubmitted
          ? `Thank you! Our team will review your social profiles and ID within 1–2 business days.${
              emailLine
                ? ` A confirmation was sent to ${emailLine}.`
                : " A confirmation was sent to your registered email."
            }`
          : "Our team is reviewing your submission. You'll get a push notification when you're verified."}
      </p>

      <div className="profile-verification-pending-next">
        <Mail size={16} strokeWidth={2} aria-hidden="true" />
        <span>No further action needed — we'll email you if we need anything else.</span>
      </div>

      <VerificationSocialSummary profile={profile} />
    </div>
  );
}

function VerificationRejectedView({ profile }) {
  const declinedAt = profile?.verification_rejected_at;
  const reason = profile?.verification_rejection_reason;

  return (
    <div className="profile-verification-rejected">
      <ErrorBanner className="profile-verification-rejected-banner">
        <div className="profile-verification-rejected-text">
          <strong>Verification not approved</strong>
          <span>
            {reason || "Our team could not verify your submission. Please review the reason below and apply again."}
          </span>
        </div>
      </ErrorBanner>
      {declinedAt && (
        <p className="profile-verification-rejected-date">
          Declined {formatVerificationDate(declinedAt)}
        </p>
      )}
      <p className="profile-verification-rejected-hint">
        Fix the issue below and submit a new application. We&apos;ll review it again within 1–2 business days.
      </p>
    </div>
  );
}

function VerificationSocialSummary({ profile }) {
  const items = [
    { label: "Facebook", value: profile?.verification_social_facebook },
    { label: "Instagram", value: profile?.verification_social_instagram },
    { label: "TikTok", value: profile?.verification_social_tiktok },
    { label: "LinkedIn", value: profile?.verification_social_linkedin },
  ].filter((i) => i.value);

  if (!items.length && !profile?.verification_note) return null;

  return (
    <div className="profile-verification-submitted">
      <p className="profile-verification-submitted-title">Submitted for review:</p>
      <ul className="profile-verification-social-list">
        {items.map((item) => (
          <li key={item.label}>
            <strong>{item.label}:</strong> {item.value}
          </li>
        ))}
      </ul>
      {profile?.verification_note && (
        <p className="profile-verification-submitted-note">
          <strong>Note:</strong> {profile.verification_note}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, session, profile, signOut, refreshProfile, mergeProfile } = useAuth();
  const accessToken = session?.access_token;
  
  const [activeTab, setActiveTab] = useState("listings");
  
  // Tab 1: Listings state
  const [listings, setListings] = useState([]);
  const [services, setServices] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [myBoosts, setMyBoosts] = useState([]);
  const [boostTarget, setBoostTarget] = useState(null);
  const [boostTargetType, setBoostTargetType] = useState(null);
  
  // Tab 2: Favorites state
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  // Tab 3: Messages state
  const [conversations, setConversations] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Tab 4: My Purchases (buyer orders)
  const [myPurchases, setMyPurchases] = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  // Tab 5: My Sales (seller orders)
  const [mySales, setMySales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);

  // Tab 6: Profile Settings state
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState(null);
  const [verifySocialFacebook, setVerifySocialFacebook] = useState("");
  const [verifySocialInstagram, setVerifySocialInstagram] = useState("");
  const [verifySocialTiktok, setVerifySocialTiktok] = useState("");
  const [verifySocialLinkedin, setVerifySocialLinkedin] = useState("");
  const [verifyNote, setVerifyNote] = useState("");
  const [verifyIdPhoto, setVerifyIdPhoto] = useState(null);
  const [verifyConsent, setVerifyConsent] = useState(false);
  const [verificationJustSubmitted, setVerificationJustSubmitted] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState(null);

  const isVerifiedSeller = !!profile?.is_verified_seller;
  const verificationPending =
    !isVerifiedSeller
    && (!!profile?.verification_requested_at || verificationJustSubmitted);
  const verificationRejected =
    !isVerifiedSeller
    && !verificationPending
    && !!profile?.verification_rejected_at;

  const [globalError, setGlobalError] = useState(null);
  const [readRevision, setReadRevision] = useState(0);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  // Initialize Settings Tab state
  useEffect(() => {
    if (profile) {
      setProfileName(profile.full_name || "");
      setProfilePhone(profile.phone || "");
      setAvatarUrl(profile.avatar_url || "");
    } else if (user) {
      setProfileName(user.user_metadata?.full_name || "");
    }
  }, [profile, user]);

  useEffect(() => {
    if (profile?.is_verified_seller) {
      setVerificationJustSubmitted(false);
    }
  }, [profile?.is_verified_seller]);

  useEffect(() => {
    if (activeTab === "settings" && user?.id) {
      refreshProfile();
    }
  }, [activeTab, user?.id, refreshProfile]);

  useEffect(() => {
    const onFocus = () => {
      if (user?.id) refreshProfile();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?.id, refreshProfile]);

  // Load Tab 1: Listings & Services
  const loadListings = useCallback(async () => {
    if (!user?.email || !user?.id) return;
    setListingsLoading(true);
    try {
      const [prodRes, empRes] = await Promise.all([
        getMyProducts(user.email),
        getMyEmployees(user.id),
      ]);
      setListings(prodRes.data || []);
      setServices(empRes.data || []);

      if (accessToken) {
        try {
          const boostRes = await getMyBoosts(accessToken);
          setMyBoosts(boostRes.data || []);
        } catch {
          setMyBoosts([]);
        }
      }
    } catch (err) {
      setGlobalError("Failed to load listings data.");
    } finally {
      setListingsLoading(false);
    }
  }, [user, accessToken]);

  function openBoostModal(targetType, target) {
    setBoostTargetType(targetType);
    setBoostTarget(target);
  }

  function renderBoostBar(targetType, target) {
    const status = boostStatusForTarget(myBoosts, targetType, target.id);
    if (status.type === "active") {
      return (
        <p className="dashboard-boost-status dashboard-boost-status--active">
          <Star size={14} strokeWidth={2} className="inline-icon" aria-hidden="true" />
          Sponsored until {formatBoostExpiry(target.boost_ends_at || status.boost?.ends_at)}
        </p>
      );
    }
    if (status.type === "pending") {
      return (
        <p className="dashboard-boost-status dashboard-boost-status--pending">
          <Clock size={14} strokeWidth={2} className="inline-icon" aria-hidden="true" />
          Boost pending admin approval
        </p>
      );
    }
    return (
      <button
        type="button"
        className="dashboard-boost-btn"
        onClick={() => openBoostModal(targetType, target)}
      >
        <Star size={14} strokeWidth={2} className="inline-icon" aria-hidden="true" />
        Boost — pin to top
      </button>
    );
  }

  // Load Tab 2: Favorites
  const loadFavorites = useCallback(async () => {
    const saved = localStorage.getItem("favorites");
    const favIds = saved ? JSON.parse(saved) : [];
    if (favIds.length === 0) {
      setFavorites([]);
      return;
    }
    setFavoritesLoading(true);
    try {
      const res = await getProducts();
      const allProds = res.data || [];
      const filtered = allProds.filter(p => favIds.includes(p.id));
      setFavorites(filtered);
    } catch (err) {
      setGlobalError("Failed to load favorite items.");
    } finally {
      setFavoritesLoading(false);
    }
  }, []);

  // Load conversations (silent = background poll for notification badges)
  const loadConversations = useCallback(async (silent = false) => {
    if (!accessToken) return;
    if (!silent) setMessagesLoading(true);
    try {
      const res = await getConversations(accessToken);
      setConversations(res.data || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  }, [accessToken]);

  // Poll active thread messages
  useEffect(() => {
    if (activeTab !== "messages" || !activeThread || !accessToken) return;

    let active = true;

    const loadThread = async () => {
      try {
        const res = await getMessageThread(
          {
            productId: activeThread.product?.id,
            employeeId: activeThread.employee?.id,
            otherUserId: activeThread.otherUser.id,
          },
          accessToken
        );
        if (active) {
          setThreadMessages(res.data || []);
          if (user?.id && activeThread.threadKey) {
            markThreadRead(user.id, activeThread.threadKey);
            setReadRevision((r) => r + 1);
          }
        }
      } catch (err) {
        console.error("Failed to load message thread:", err);
      }
    };

    loadThread();
    const interval = setInterval(loadThread, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeThread, activeTab, accessToken, user?.id]);

  // Load Tab 4: My Purchases (as buyer)
  // silent = background poll: update data without showing the spinner,
  // so open order forms aren't unmounted mid-edit.
  const loadPurchases = useCallback(async (silent = false) => {
    if (!accessToken) return;
    if (!silent) setPurchasesLoading(true);
    try {
      const res = await getMyOrders("buyer", accessToken);
      setMyPurchases(res.data || []);
    } catch (err) {
      console.error("Failed to load purchases:", err);
    } finally {
      if (!silent) setPurchasesLoading(false);
    }
  }, [accessToken]);

  // Load Tab 5: My Sales (as seller)
  const loadSales = useCallback(async (silent = false) => {
    if (!accessToken) return;
    if (!silent) setSalesLoading(true);
    try {
      const res = await getMyOrders("seller", accessToken);
      setMySales(res.data || []);
    } catch (err) {
      console.error("Failed to load sales:", err);
    } finally {
      if (!silent) setSalesLoading(false);
    }
  }, [accessToken]);

  // Load orders + inbox on mount so tab badges stay up to date
  useEffect(() => {
    if (!accessToken) return;
    loadPurchases();
    loadSales();
    loadConversations(true);
  }, [accessToken, loadPurchases, loadSales, loadConversations]);

  // Poll inbox in the background for new message notifications
  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(() => loadConversations(true), 8000);
    return () => clearInterval(interval);
  }, [accessToken, loadConversations]);

  // Auto-refresh orders so tracking stays live (silent: no spinner, no remount)
  useEffect(() => {
    if (!accessToken) return;
    if (activeTab !== "purchases" && activeTab !== "sales") return;
    const interval = setInterval(() => {
      if (activeTab === "purchases") loadPurchases(true);
      if (activeTab === "sales") loadSales(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [activeTab, accessToken, loadPurchases, loadSales]);

  // Trigger loads based on active tab
  useEffect(() => {
    if (activeTab === "listings") loadListings();
    if (activeTab === "favorites") loadFavorites();
    if (activeTab === "messages") loadConversations();
  }, [activeTab, loadListings, loadFavorites, loadConversations]);

  const purchaseActionCount = myPurchases.filter(
    (o) => o.status === "delivered" || isEtaMissed(o)
  ).length;
  const salesActionCount = mySales.filter((o) => sellerNeedsAction(o)).length;

  const handleDeleteListing = async (productId) => {
    if (!window.confirm("Delete this listing permanently?")) return;
    try {
      await deleteProduct(productId);
      setListings((prev) => prev.filter((item) => item.id !== productId));
    } catch (err) {
      alert("Failed to delete listing: " + (err.response?.data?.error || err.message));
    }
  };

  const handleMarkListingSold = async (productId, sold) => {
    if (!accessToken) return;
    const label = sold ? "mark this listing as sold?" : "relist this item?";
    if (!window.confirm(`Are you sure you want to ${label}`)) return;
    try {
      const res = await markProductSold(productId, sold, accessToken);
      setListings((prev) => prev.map((item) => (item.id === productId ? res.data : item)));
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Could not update listing.");
    }
  };

  const handleRequestVerification = async (e) => {
    e?.preventDefault();
    if (!accessToken) return;
    if (!profilePhone.trim()) {
      setVerificationMessage({ ok: false, text: "Save your cellphone number first, then submit verification." });
      return;
    }
    const hasSocial = [verifySocialFacebook, verifySocialInstagram, verifySocialTiktok, verifySocialLinkedin]
      .some((s) => s.trim());
    if (!hasSocial) {
      setVerificationMessage({ ok: false, text: "Add at least one social media profile." });
      return;
    }
    if (!verifyIdPhoto) {
      setVerificationMessage({ ok: false, text: "Please upload or take a photo of your ID." });
      return;
    }
    if (verifyIdPhoto.size > ID_PHOTO_MAX_BYTES) {
      setVerificationMessage({ ok: false, text: "ID photo must be 10MB or smaller." });
      return;
    }
    if (!verifyConsent) {
      setVerificationMessage({ ok: false, text: "Please confirm consent to use your ID for verification only." });
      return;
    }
    setVerificationLoading(true);
    setVerificationMessage(null);
    try {
      const res = await requestSellerVerification({
        idPhoto: verifyIdPhoto,
        social_facebook: verifySocialFacebook.trim(),
        social_instagram: verifySocialInstagram.trim(),
        social_tiktok: verifySocialTiktok.trim(),
        social_linkedin: verifySocialLinkedin.trim(),
        verification_note: verifyNote.trim(),
      }, accessToken);
      setVerificationJustSubmitted(true);
      if (res.data?.userEmail) {
        setConfirmationEmail(res.data.userEmail);
      }
      if (res.data?.profile) {
        mergeProfile(res.data.profile);
      }
      await refreshProfile();
      setVerifyIdPhoto(null);
      setVerifyConsent(false);
      setVerifySocialFacebook("");
      setVerifySocialInstagram("");
      setVerifySocialTiktok("");
      setVerifySocialLinkedin("");
      setVerifyNote("");
      setVerificationMessage(null);
    } catch (err) {
      setVerificationMessage({
        ok: false,
        text: err.response?.data?.error || err.message || "Could not submit request.",
      });
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!profileName.trim() || !accessToken) return;
    setUpdatingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      await updateProfile({
        full_name: profileName.trim(),
        avatar_url: avatarUrl,
        phone: profilePhone.trim() || null,
      }, accessToken);
      setProfileSuccess(true);
      await refreshProfile();
    } catch (err) {
      setProfileError(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    setUpdatingProfile(true);
    setProfileError(null);
    try {
      const res = await uploadProductImage(file, accessToken);
      setAvatarUrl(res.data.url);
    } catch (err) {
      setProfileError(err.response?.data?.error || "Avatar upload failed.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeThread || !accessToken) return;

    setSendingReply(true);
    try {
      const res = await sendMessage({
        receiver_id: activeThread.otherUser.id,
        ...(activeThread.employee?.id
          ? { employee_id: activeThread.employee.id }
          : { product_id: activeThread.product.id }),
        content: replyText.trim(),
      }, accessToken);

      setThreadMessages((prev) => [...prev, res.data]);
      setReplyText("");
      if (user?.id && activeThread.threadKey) {
        markThreadRead(user.id, activeThread.threadKey);
        setReadRevision((r) => r + 1);
      }
    } catch (err) {
      alert("Failed to send message: " + (err.response?.data?.error || err.message));
    } finally {
      setSendingReply(false);
    }
  };

  const messageReadState = useMemo(
    () => (user?.id ? getMessageReadState(user.id) : {}),
    [user?.id, readRevision]
  );

  // Group conversations into threads
  const getThreadList = () => {
    const threadsMap = {};
    conversations.forEach((m) => {
      const otherUser = m.sender_id === user.id ? m.receiver : m.sender;
      const thread = {
        product: m.product || null,
        employee: m.employee || null,
        otherUser,
      };
      const threadKey = messageThreadKey(thread);
      if (!threadsMap[threadKey]) {
        threadsMap[threadKey] = {
          ...thread,
          threadKey,
          messages: [],
          latestMessage: m,
        };
      }
      threadsMap[threadKey].messages.push(m);
    });

    return Object.values(threadsMap)
      .map((t) => ({
        ...t,
        unreadCount: countUnreadInThread(t.messages, user?.id, t.threadKey, messageReadState),
      }))
      .sort(
        (a, b) => new Date(b.latestMessage.created_at) - new Date(a.latestMessage.created_at)
      );
  };

  const threads = getThreadList();
  const unreadMessageCount = threads.filter((t) => t.unreadCount > 0).length;

  const openThread = (thread) => {
    if (user?.id && thread.threadKey) {
      markThreadRead(user.id, thread.threadKey);
      setReadRevision((r) => r + 1);
    }
    setActiveThread(thread);
  };

  return (
    <div className="dashboard-page">
      {/* Profile summary header */}
      <div className="dashboard-header">
        <div className="dashboard-user">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="dashboard-avatar" style={{ objectFit: 'cover' }} />
          ) : (
            <div className="dashboard-avatar" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
          <div>
            <h1 className="dashboard-title">My Dashboard</h1>
            <p className="dashboard-sub">
              Welcome back, <strong>{displayName}</strong>
              {isVerifiedSeller && (
                <span className="dashboard-header-verified">
                  {" "}
                  <VerifiedBadge size={14} />
                </span>
              )}
            </p>
            {isVerifiedSeller && (
              <p className="dashboard-verification-banner dashboard-verification-banner--verified">
                <BadgeCheck size={16} strokeWidth={2} aria-hidden="true" />
                You are a verified seller — buyers see your badge on your listings.
              </p>
            )}
            {verificationPending && (
              <p className="dashboard-verification-banner dashboard-verification-banner--pending">
                <Clock size={16} strokeWidth={2} aria-hidden="true" />
                Verification pending — our team is reviewing your submission.
              </p>
            )}
            {verificationRejected && (
              <p className="dashboard-verification-banner dashboard-verification-banner--rejected">
                <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
                Verification declined — you can reapply in Profile Settings.
              </p>
            )}
            <p className="dashboard-email">{user?.email}</p>
          </div>
        </div>
        <div className="dashboard-actions">
          <Link to="/sell" className="submit-btn dashboard-post-btn">
            + Post New Ad
          </Link>
          <button
            type="button"
            className="dashboard-logout-btn"
            onClick={async () => {
              try {
                await signOut();
              } finally {
                navigate("/");
              }
            }}
          >
            Log Out
          </button>
        </div>
      </div>

      {globalError && <ErrorBanner>{globalError}</ErrorBanner>}

      {/* Tabs — 3-column card grid */}
      <div className="dashboard-tabs">
        <button
          type="button"
          className={`dashboard-tab-btn ${activeTab === "listings" ? "active" : ""}`}
          onClick={() => setActiveTab("listings")}
        >
          <Package size={22} strokeWidth={1.75} className="dashboard-tab-icon" aria-hidden="true" />
          <span className="dashboard-tab-label">My Ads &amp; Services</span>
        </button>
        <button
          type="button"
          className={`dashboard-tab-btn ${activeTab === "purchases" ? "active" : ""}`}
          onClick={() => setActiveTab("purchases")}
        >
          {purchaseActionCount > 0 && (
            <span className="dashboard-tab-badge">{purchaseActionCount}</span>
          )}
          <ShoppingCart size={22} strokeWidth={1.75} className="dashboard-tab-icon" aria-hidden="true" />
          <span className="dashboard-tab-label">My Purchases</span>
        </button>
        <button
          type="button"
          className={`dashboard-tab-btn ${activeTab === "sales" ? "active" : ""}`}
          onClick={() => setActiveTab("sales")}
        >
          {salesActionCount > 0 && (
            <span className="dashboard-tab-badge">{salesActionCount}</span>
          )}
          <Briefcase size={22} strokeWidth={1.75} className="dashboard-tab-icon" aria-hidden="true" />
          <span className="dashboard-tab-label">My Sales</span>
        </button>
        <button
          type="button"
          className={`dashboard-tab-btn ${activeTab === "messages" ? "active" : ""}`}
          onClick={() => setActiveTab("messages")}
        >
          {unreadMessageCount > 0 && (
            <span className="dashboard-tab-badge">{unreadMessageCount}</span>
          )}
          <MessageCircle size={22} strokeWidth={1.75} className="dashboard-tab-icon" aria-hidden="true" />
          <span className="dashboard-tab-label">Inbox Messages</span>
        </button>
        <button
          type="button"
          className={`dashboard-tab-btn ${activeTab === "favorites" ? "active" : ""}`}
          onClick={() => setActiveTab("favorites")}
        >
          <Heart size={22} strokeWidth={1.75} className="dashboard-tab-icon" aria-hidden="true" />
          <span className="dashboard-tab-label">Saved Items</span>
        </button>
        <button
          type="button"
          className={`dashboard-tab-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <Settings size={22} strokeWidth={1.75} className="dashboard-tab-icon" aria-hidden="true" />
          <span className="dashboard-tab-label">Profile Settings</span>
        </button>
      </div>

      {/* Tab Panels */}

      {/* My Purchases Tab (Buyer) */}
      {activeTab === "purchases" && (
        <section className="dashboard-section">
          <h2 className="dashboard-section-title">
            <ShoppingCart size={20} strokeWidth={2} className="tab-icon" aria-hidden="true" />
            My Purchases
          </h2>
          <p style={{ color: "var(--muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            Track your order live as the seller updates progress. Confirm &amp; rate only when you have received the item.
          </p>
          {purchasesLoading ? (
            <div className="loading-wrap"><div className="spinner" /> Loading purchases…</div>
          ) : myPurchases.length === 0 ? (
            <div className="dashboard-empty">
              <p>You have no purchases yet.</p>
              <Link to="/" className="submit-btn" style={{ marginTop: "1rem", display: "inline-block", width: "auto" }}>
                Browse Listings
              </Link>
            </div>
          ) : (
            <div className="buyer-tracking-list">
              {myPurchases.map((order) => (
                <BuyerOrderTracking
                  key={order.id}
                  order={order}
                  accessToken={accessToken}
                  onOrderUpdated={(updated) =>
                    setMyPurchases((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* My Sales Tab (Seller) */}
      {activeTab === "sales" && (
        <section className="dashboard-section">
          <h2 className="dashboard-section-title">
            <Briefcase size={20} strokeWidth={2} className="tab-icon" aria-hidden="true" />
            My Sales
          </h2>
          <p style={{ color: "var(--muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            Manage deliveries on the live tracker — the buyer sees your updates in real time.
          </p>
          {salesLoading ? (
            <div className="loading-wrap"><div className="spinner" /> Loading sales…</div>
          ) : mySales.length === 0 ? (
            <div className="dashboard-empty">
              <p>No orders for your listings yet.</p>
            </div>
          ) : (
            <div className="buyer-tracking-list">
              {mySales.map((order) => (
                <SellerOrderTracking
                  key={order.id}
                  order={order}
                  accessToken={accessToken}
                  onOrderUpdated={(updated) =>
                    setMySales((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Listings Tab — compact overview (no full card grids) */}
      {activeTab === "listings" && (
        <section className="dashboard-section dashboard-listings-panel">
          {listingsLoading ? (
            <div className="loading-wrap">
              <div className="spinner" />
              <p className="dashboard-muted">Loading…</p>
            </div>
          ) : services.length === 0 && listings.length === 0 ? (
            <div className="dashboard-empty dashboard-listings-empty">
              <p>You haven&apos;t posted anything yet.</p>
              <div className="dashboard-listings-actions">
                <Link to="/sell" className="submit-btn">Post an ad</Link>
                <Link to="/sell?type=service" className="dashboard-outline-btn">Offer a service</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="dashboard-listings-actions dashboard-listings-actions--top">
                <Link to="/sell" className="dashboard-outline-btn">+ Post ad</Link>
                <Link to="/sell?type=service" className="dashboard-outline-btn">+ Offer service</Link>
              </div>
              <ul className="dashboard-listings-list">
                {services.map((employee) => (
                  <li key={`emp-${employee.id}`} className="dashboard-listing-row">
                    <div className="dashboard-listing-row-main">
                      <span className="dashboard-listing-type">Service</span>
                      <Link to={`/professionals/${employee.id}`} className="dashboard-listing-title">
                        {employee.name}
                      </Link>
                      <span className="dashboard-listing-meta">{employee.profession}</span>
                    </div>
                    <div className="dashboard-listing-row-actions">
                      {renderBoostBar("employee", employee)}
                    </div>
                  </li>
                ))}
                {listings.map((product) => (
                  <li key={`prod-${product.id}`} className={`dashboard-listing-row${product.is_sold ? " dashboard-listing-row--sold" : ""}`}>
                    <div className="dashboard-listing-row-main">
                      <span className="dashboard-listing-type">{product.is_sold ? "Sold" : "Ad"}</span>
                      <Link to={`/listing/${product.id}`} className="dashboard-listing-title">
                        {product.title}
                      </Link>
                      <span className="dashboard-listing-meta">
                        N$&nbsp;{Number(product.price).toLocaleString("en-NA", { minimumFractionDigits: 0 })}
                        {product.is_sold && " · Hidden from browse"}
                      </span>
                    </div>
                    <div className="dashboard-listing-row-actions">
                      {renderBoostBar("product", product)}
                      {!product.is_sold ? (
                        <button
                          type="button"
                          className="dashboard-listing-sold-btn"
                          onClick={() => handleMarkListingSold(product.id, true)}
                        >
                          Mark sold
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="cat-btn dashboard-listing-relist-btn"
                          onClick={() => handleMarkListingSold(product.id, false)}
                        >
                          Relist
                        </button>
                      )}
                      <button
                        type="button"
                        className="dashboard-listing-delete"
                        onClick={() => handleDeleteListing(product.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {/* Saved Items Tab */}
      {activeTab === "favorites" && (
        <section className="dashboard-section">
          <h2 className="dashboard-section-title">My Saved Listings</h2>
          {favoritesLoading ? (
            <div className="loading-wrap">
              <div className="spinner" />
              <p className="dashboard-muted">Loading saved items…</p>
            </div>
          ) : favorites.length === 0 ? (
            <div className="dashboard-empty">
              <p>You haven't saved any listings yet. Click the heart icon on any ad to bookmark it!</p>
              <Link to="/" className="submit-btn" style={{ marginTop: '1rem', display: 'inline-block', width: 'auto' }}>
                Browse Ads
              </Link>
            </div>
          ) : (
            <div className="products-grid">
              {favorites.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Messages Tab */}
      {activeTab === "messages" && (
        <section className="dashboard-section">
          <div className="inbox-layout">
            {/* Sidebar list of conversations */}
            <div className={`inbox-sidebar ${activeThread ? 'hidden-mobile' : ''}`}>
              <div className="inbox-sidebar-header">
                Conversations
                {unreadMessageCount > 0 && (
                  <span className="inbox-unread-pill">{unreadMessageCount} new</span>
                )}
              </div>
              {messagesLoading && threads.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <div className="spinner" style={{ width: 30, height: 30 }} />
                </div>
              ) : threads.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                  No messages yet.
                </div>
              ) : (
                threads.map(t => {
                  const threadId = t.employee?.id || t.product?.id;
                  const isActive = activeThread
                    && (activeThread.employee?.id || activeThread.product?.id) === threadId
                    && activeThread.otherUser.id === t.otherUser.id;
                  const contextLabel = t.employee
                    ? `${t.employee.name} · ${t.employee.profession}`
                    : t.product?.title;
                  return (
                    <button
                      key={`${threadId}_${t.otherUser.id}`}
                      className={`thread-item ${isActive ? "active" : ""} ${t.unreadCount > 0 ? "has-unread" : ""}`}
                      onClick={() => openThread(t)}
                    >
                      {t.otherUser.avatar_url ? (
                        <img src={t.otherUser.avatar_url} alt="" className="thread-avatar" />
                      ) : (
                        <div className="thread-avatar admin-user-avatar-placeholder">
                          <User size={20} strokeWidth={1.75} aria-hidden="true" />
                        </div>
                      )}
                      <div className="thread-info">
                        <div className="thread-name-row">
                          <div className="thread-name">{t.otherUser.full_name}</div>
                          {t.unreadCount > 0 && (
                            <span className="thread-unread-badge">{t.unreadCount}</span>
                          )}
                        </div>
                        <div className="thread-listing">{contextLabel}</div>
                        <div className="thread-snippet">{t.latestMessage.content}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Current message thread details */}
            <div className={`chat-area ${!activeThread ? 'hidden-mobile' : ''}`}>
              {activeThread ? (
                <>
                  <div className="chat-header">
                    <button 
                      type="button" 
                      onClick={() => setActiveThread(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold', marginRight: '1rem' }}
                      className="nav-mobile-only"
                    >
                      ← Back
                    </button>
                    <div className="chat-header-title">
                      <span className="chat-header-name">{activeThread.otherUser.full_name}</span>
                      {activeThread.employee ? (
                        <a href={`/professionals/${activeThread.employee.id}`} className="chat-header-listing">
                          {activeThread.employee.name} · {activeThread.employee.profession}
                        </a>
                      ) : (
                        <a href={`/listing/${activeThread.product.id}`} className="chat-header-listing">
                          {activeThread.product.title} - N$ {Number(activeThread.product.price).toLocaleString()}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="chat-messages">
                    {threadMessages.map(m => {
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
                    })}
                  </div>

                  <form onSubmit={handleSendReply} className="chat-input-bar">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Type a reply..."
                      disabled={sendingReply}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply(e);
                        }
                      }}
                    />
                    <button 
                      type="submit" 
                      className="chat-send-btn"
                      disabled={sendingReply || !replyText.trim()}
                    >
                      Send
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
                  <span className="icon-block">
                    <MessageCircle size={48} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <p>Select a conversation from the sidebar to view chat logs.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <section className="dashboard-section">
          <div className="profile-card">
            <h2 className="dashboard-section-title" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              Edit My Profile
            </h2>
            
            {profileSuccess && <SuccessBanner>Profile updated successfully!</SuccessBanner>}
            {profileError && <ErrorBanner>{profileError}</ErrorBanner>}

            <form onSubmit={handleProfileUpdate}>
              {/* Avatar section */}
              <div className="profile-avatar-upload">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar Preview" className="profile-avatar-preview" />
                ) : (
                  <div className="profile-avatar-placeholder">
                    <User size={40} strokeWidth={1.5} aria-hidden="true" />
                  </div>
                )}
                
                <label className="cat-btn" style={{ cursor: 'pointer', display: 'inline-block' }}>
                  Choose Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                    disabled={updatingProfile}
                  />
                </label>
              </div>

              {/* Name field */}
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name-input">Full Display Name</label>
                <input
                  id="profile-name-input"
                  type="text"
                  className="form-input"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="e.g. Maria Kalipi"
                  required
                  disabled={updatingProfile}
                />
              </div>

              {/* Cellphone */}
              <div className="form-group">
                <label className="form-label" htmlFor="profile-phone-input">Cellphone Number</label>
                <input
                  id="profile-phone-input"
                  type="tel"
                  className="form-input"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="e.g. +264 81 123 4567"
                  disabled={updatingProfile}
                />
                <span className="register-help-text" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                  Required for verified seller badge and admin contact about orders.
                </span>
              </div>

              {/* Readonly email info */}
              <div className="form-group">
                <label className="form-label" htmlFor="profile-email-input">Registered Email</label>
                <input
                  id="profile-email-input"
                  type="email"
                  className="form-input"
                  value={user?.email || ""}
                  disabled
                  readOnly
                />
                <span className="register-help-text" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Email addresses cannot be modified.
                </span>
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={updatingProfile || !profileName.trim()}
                style={{ marginTop: '1.5rem' }}
              >
                {updatingProfile ? "Saving changes…" : "Save Changes"}
              </button>
            </form>

            <div className="profile-verification-box">
              <div className="profile-verification-head">
                <BadgeCheck size={20} strokeWidth={2} aria-hidden="true" />
                <h3 className="profile-verification-title">Verified seller</h3>
              </div>
              {isVerifiedSeller ? (
                <p className="profile-verification-status profile-verification-status--ok">
                  <VerifiedBadge size={16} /> Your profile is verified. Buyers see this on your listings.
                </p>
              ) : verificationPending ? (
                <VerificationPendingView
                  profile={profile}
                  justSubmitted={verificationJustSubmitted}
                  confirmationEmail={confirmationEmail}
                />
              ) : (
                <>
                  {verificationRejected && (
                    <VerificationRejectedView profile={profile} />
                  )}
                  <form className="profile-verification-form" onSubmit={handleRequestVerification}>
                  <p className="profile-verification-hint">
                    {verificationRejected
                      ? "Submit a new verification request with updated details."
                      : "Get a trusted badge on your ads. We review your social profiles and ID by email — your ID is not stored on our servers."}
                  </p>
                  {!verificationRejected && (
                  <p className="profile-verification-hint profile-verification-hint--step">
                    Step 1: Save your phone number above, then complete the form below.
                  </p>
                  )}
                  <div className="profile-verification-social-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="verify-fb">Facebook</label>
                      <input id="verify-fb" type="text" className="form-input" placeholder="Profile URL or name"
                        value={verifySocialFacebook} onChange={(e) => setVerifySocialFacebook(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="verify-ig">Instagram</label>
                      <input id="verify-ig" type="text" className="form-input" placeholder="@username or URL"
                        value={verifySocialInstagram} onChange={(e) => setVerifySocialInstagram(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="verify-tt">TikTok</label>
                      <input id="verify-tt" type="text" className="form-input" placeholder="@username"
                        value={verifySocialTiktok} onChange={(e) => setVerifySocialTiktok(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="verify-li">LinkedIn</label>
                      <input id="verify-li" type="text" className="form-input" placeholder="Profile URL"
                        value={verifySocialLinkedin} onChange={(e) => setVerifySocialLinkedin(e.target.value)} />
                    </div>
                  </div>
                  <p className="register-help-text">At least one social profile is required.</p>
                  <div className="form-group">
                    <label className="form-label" htmlFor="verify-note">Note for our team (optional)</label>
                    <input id="verify-note" type="text" className="form-input" placeholder="e.g. I sell as @myshop on Instagram"
                      value={verifyNote} onChange={(e) => setVerifyNote(e.target.value)} maxLength={500} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="verify-id">ID document photo</label>
                    <input
                      id="verify-id"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      className="form-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file && file.size > ID_PHOTO_MAX_BYTES) {
                          setVerificationMessage({ ok: false, text: "ID photo must be 10MB or smaller." });
                          e.target.value = "";
                          setVerifyIdPhoto(null);
                          return;
                        }
                        setVerificationMessage(null);
                        setVerifyIdPhoto(file);
                      }}
                    />
                    <span className="register-help-text">
                      Take a clear photo of your Namibian ID or passport. Max 10MB. Sent securely to our team by email only.
                    </span>
                    {verifyIdPhoto && (
                      <span className="profile-verification-file-name">{verifyIdPhoto.name}</span>
                    )}
                  </div>
                  <label className="profile-verification-consent">
                    <input
                      type="checkbox"
                      checked={verifyConsent}
                      onChange={(e) => setVerifyConsent(e.target.checked)}
                    />
                    <span>
                      I consent to Sell Something using my ID photo solely to verify my identity.
                      It will not be stored in the app database.
                    </span>
                  </label>
                  <button
                    type="submit"
                    className="submit-btn profile-verification-submit"
                    disabled={verificationLoading || updatingProfile}
                  >
                    {verificationLoading ? "Submitting…" : verificationRejected ? "Resubmit for verification" : "Submit for verification"}
                  </button>
                  {verificationMessage && !verificationMessage.ok && (
                    <p className="admin-mail-err">{verificationMessage.text}</p>
                  )}
                </form>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {boostTarget && boostTargetType && (
        <BoostModal
          target={boostTarget}
          targetType={boostTargetType}
          accessToken={accessToken}
          onClose={() => {
            setBoostTarget(null);
            setBoostTargetType(null);
          }}
          onSuccess={loadListings}
        />
      )}
    </div>
  );
}
