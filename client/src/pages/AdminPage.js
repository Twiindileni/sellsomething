import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Briefcase,
  Mail,
  MessageCircle,
  Package,
  ShoppingCart,
  Smartphone,
  Star,
  Users,
  User,
  Bell,
  RotateCcw,
  LayoutTemplate
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getAllOrders,
  adminUpdateOrderStatus,
  getAdminUsers,
  getAdminUserDetail,
  getAdminBoosts,
  adminUpdateBoostStatus,
  adminSetUserVerification,
} from "../services/api";
import { BOOST_PLANS } from "../config/site";
import { sellerPayoutMethodLabel } from "../config/payment";
import { isEtaMissed, formatEta } from "../utils/orderHelpers";
import StarRating from "../components/StarRating";
import VerifiedBadge from "../components/VerifiedBadge";
import AdminMailPanel from "../components/AdminMailPanel";
import AdminNotificationPanel from "../components/AdminNotificationPanel";
import AdminPopupsPanel from "../components/AdminPopupsPanel";
import "./AdminDashboard.css";
import { VERIFICATION_REJECTION_REASONS } from "../config/verificationRejectionReasons";

function socialHref(value) {
  const v = (value || "").trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return null;
}

function AdminVerificationDetails({ profile }) {
  const items = [
    { label: "Facebook", value: profile?.verification_social_facebook },
    { label: "Instagram", value: profile?.verification_social_instagram },
    { label: "TikTok", value: profile?.verification_social_tiktok },
    { label: "LinkedIn", value: profile?.verification_social_linkedin },
  ].filter((i) => i.value);

  if (!profile?.verification_requested_at && !items.length) return null;

  return (
    <div className="admin-verification-details">
      <h4 className="admin-verification-details-title">Verification submission</h4>
      {profile?.verification_requested_at && (
        <p className="admin-order-ref">
          Submitted {formatDate(profile.verification_requested_at)} · ID photo in admin email (not in database)
        </p>
      )}
      {items.length > 0 && (
        <ul className="admin-verification-social-list">
          {items.map((item) => {
            const href = socialHref(item.value);
            return (
              <li key={item.label}>
                <strong>{item.label}:</strong>{" "}
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer">{item.value}</a>
                ) : (
                  item.value
                )}
              </li>
            );
          })}
        </ul>
      )}
      {profile?.verification_note && (
        <p className="admin-verification-note">
          <strong>Seller note:</strong> {profile.verification_note}
        </p>
      )}
    </div>
  );
}

const STATUS_LABELS = {
  pending_payment: { label: "Awaiting Payment", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  payment_received: { label: "Payment Received", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  in_delivery: { label: "In Delivery", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  delivered: { label: "Delivered", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  confirmed: { label: "Buyer Confirmed", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  disputed: { label: "Disputed", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  refunded: { label: "Refunded", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  completed: { label: "Completed", color: "#2E7D52", bg: "rgba(46,125,82,0.12)" },
};

// Actions only the admin performs sellers/buyers handle delivery & confirmation
const ADMIN_ACTIONS = {
  pending_payment: [{ label: "Confirm Payment Received", next: "payment_received" }],
  confirmed: [{ label: "Release Payment to Seller", next: "completed" }],
  disputed: [
    { label: "Approve Refund", next: "refunded" },
    { label: "Resolve Dispute Handed Over (buyer still confirms)", next: "delivered" },
  ],
};

// Patterns that suggest an off-platform deal attempt in chat
const SUSPICIOUS_PATTERNS = [
  /\+?\d[\d\s().-]{6,}\d/, // phone-like number
  /whats\s?app/i,
  /\bcall\s+me\b/i,
  /\bphone\b/i,
  /\bcash\b/i,
  /\beft\b/i,
  /\bbank\s+transfer\b/i,
  /\boutside\s+(the\s+)?(app|platform)\b/i,
  /\bdirect(ly)?\b.*\bpay\b|\bpay\b.*\bdirect(ly)?\b/i,
];

function isSuspicious(text) {
  return SUSPICIOUS_PATTERNS.some((re) => re.test(text || ""));
}

function formatPrice(p) {
  return "N$ " + Number(p).toLocaleString("en-NA", { minimumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-NA", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-NA", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || { label: status, color: "var(--muted)", bg: "var(--smoke)" };
  return (
    <span className="order-status-badge" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function MiniOrderRow({ order }) {
  return (
    <div className="admin-mini-order">
      <div className="admin-mini-order-main">
        <span className="admin-mini-order-title">{order.product_title || "Unknown Product"}</span>
        <span className="admin-mini-order-sub">
          {formatDate(order.created_at)} · {order.buyer_email} → {order.seller_email}
        </span>
      </div>
      <div className="admin-mini-order-right">
        <span className="admin-mini-order-amount">{formatPrice(order.amount)}</span>
        <StatusBadge status={order.status} />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, session, profile, loading: authLoading, profileLoading } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState("orders"); // "orders" | "users" | "boosts"

  // Orders view state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [actionLoading, setActionLoading] = useState({});
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(20);

  // Users view state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [rejectReasonCode, setRejectReasonCode] = useState(VERIFICATION_REJECTION_REASONS[0].id);
  const [rejectReasonNote, setRejectReasonNote] = useState("");
  const [openThreads, setOpenThreads] = useState({});

  // Boosts view state
  const [boosts, setBoosts] = useState([]);
  const [boostsLoading, setBoostsLoading] = useState(false);
  const [boostsError, setBoostsError] = useState(null);
  const [boostDurations, setBoostDurations] = useState({});

  const isAdmin = profile?.is_admin === true;
  const authReady = !authLoading && !profileLoading;
  const accessToken = session?.access_token;

  useEffect(() => {
    if (authReady && user && !isAdmin) {
      navigate("/", { replace: true });
    }
  }, [authReady, user, isAdmin, navigate]);

  const loadOrders = useCallback(async () => {
    if (!accessToken) {
      setError("No active session. Please log in again.");
      return;
    }
    setLoadingOrders(true);
    setError(null);
    try {
      const res = await getAllOrders(accessToken);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load orders.");
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [accessToken]);

  const loadUsers = useCallback(async () => {
    if (!accessToken) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await getAdminUsers(accessToken);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setUsersError(err.response?.data?.error || err.message || "Failed to load users.");
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [accessToken]);

  const loadUserDetail = useCallback(async (userId) => {
    if (!accessToken) return;
    setUserDetailLoading(true);
    setUserDetail(null);
    setOpenThreads({});
    try {
      const res = await getAdminUserDetail(userId, accessToken);
      setUserDetail(res.data);
    } catch (err) {
      setUsersError(err.response?.data?.error || err.message || "Failed to load user.");
    } finally {
      setUserDetailLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (authReady && isAdmin && accessToken) {
      loadOrders();
    }
  }, [authReady, isAdmin, accessToken, loadOrders]);

  const loadBoosts = useCallback(async () => {
    if (!accessToken) return;
    setBoostsLoading(true);
    setBoostsError(null);
    try {
      const res = await getAdminBoosts(accessToken);
      const list = Array.isArray(res.data) ? res.data : [];
      setBoosts(list);
      const durations = {};
      list.forEach((b) => { durations[b.id] = b.duration_days; });
      setBoostDurations(durations);
    } catch (err) {
      setBoostsError(err.response?.data?.error || err.message || "Failed to load boosts.");
      setBoosts([]);
    } finally {
      setBoostsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (view === "users" && authReady && isAdmin && accessToken && users.length === 0) {
      loadUsers();
    }
  }, [view, authReady, isAdmin, accessToken, users.length, loadUsers]);

  useEffect(() => {
    if (view === "boosts" && authReady && isAdmin && accessToken) {
      loadBoosts();
    }
  }, [view, authReady, isAdmin, accessToken, loadBoosts]);

  useEffect(() => {
    if (selectedUserId) loadUserDetail(selectedUserId);
  }, [selectedUserId, loadUserDetail]);

  // Reset pagination when the order list is re-filtered
  useEffect(() => {
    setVisibleCount(20);
  }, [filterStatus, search, sortBy]);

  async function handleBoostAction(boostId, status) {
    setActionLoading((prev) => ({ ...prev, [boostId]: true }));
    try {
      await adminUpdateBoostStatus(
        boostId,
        { status, duration_days: boostDurations[boostId] },
        accessToken
      );
      await loadBoosts();
    } catch (err) {
      alert("Boost action failed: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading((prev) => ({ ...prev, [boostId]: false }));
    }
  }

  async function handleAction(orderId, newStatus) {
    setActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      await adminUpdateOrderStatus(orderId, newStatus, accessToken);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      alert("Action failed: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  }

  async function handleUserVerification(userId, verified) {
    const label = verified ? "Verify this seller?" : "Remove verified badge?";
    if (!window.confirm(label)) return;
    setVerificationLoading(true);
    try {
      const res = await adminSetUserVerification(userId, { verified }, accessToken);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...res.data } : u)));
      if (userDetail?.profile?.id === userId) {
        setUserDetail((prev) => ({
          ...prev,
          profile: { ...prev.profile, ...res.data },
        }));
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Could not update verification.");
    } finally {
      setVerificationLoading(false);
    }
  }

  async function handleDeclineVerification(userId) {
    if (!window.confirm("Decline this verification request? The seller will be emailed and can reapply.")) return;
    setVerificationLoading(true);
    try {
      const res = await adminSetUserVerification(userId, {
        reject: true,
        reason_code: rejectReasonCode,
        reason_note: rejectReasonNote.trim(),
      }, accessToken);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...res.data } : u)));
      if (userDetail?.profile?.id === userId) {
        setUserDetail((prev) => ({
          ...prev,
          profile: { ...prev.profile, ...res.data },
        }));
      }
      setRejectReasonNote("");
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Could not decline verification.");
    } finally {
      setVerificationLoading(false);
    }
  }

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending_payment").length,
    etaMissed: orders.filter((o) => isEtaMissed(o)).length,
    escrow: orders.filter((o) => ["payment_received", "in_delivery", "delivered"].includes(o.status)).length,
    disputes: orders.filter((o) => o.status === "disputed").length,
    completed: orders.filter((o) => o.status === "completed").length,
    totalEscrowAmount: orders
      .filter((o) => ["payment_received", "in_delivery", "delivered", "confirmed"].includes(o.status))
      .reduce((sum, o) => sum + Number(o.amount), 0),
  };

  const filtered = orders.filter((o) => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      o.product_title?.toLowerCase().includes(q) ||
      o.buyer_email?.toLowerCase().includes(q) ||
      o.seller_email?.toLowerCase().includes(q) ||
      o.id?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.created_at) - new Date(b.created_at);
      case "amount_desc":
        return Number(b.amount) - Number(a.amount);
      case "amount_asc":
        return Number(a.amount) - Number(b.amount);
      default: // newest
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  // Orders the admin must act on, pinned above everything else
  const needsAdminAction = (o) =>
    o.status === "pending_payment" || o.status === "disputed" || o.status === "confirmed" || isEtaMissed(o);

  const actionRequired = sorted.filter(needsAdminAction);
  const otherOrders = sorted.filter((o) => !needsAdminAction(o));
  const visibleOthers = otherOrders.slice(0, visibleCount);

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      !q ||
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  });

    function renderOrderRow(order) {
    const actions = ADMIN_ACTIONS[order.status] || [];
    const needsAttention = order.status === "pending_payment";
    const etaMissed = isEtaMissed(order);
    
    // Determine badge class
    let badgeClass = "neutral";
    if (order.status === "pending_payment") badgeClass = "pending";
    if (order.status === "payment_received" || order.status === "in_delivery") badgeClass = "active";
    if (order.status === "delivered" || order.status === "confirmed" || order.status === "completed") badgeClass = "success";
    if (order.status === "disputed") badgeClass = "danger";

    return (
      <tr key={order.id} className={needsAttention || etaMissed ? "needs-attention" : ""}>
        <td>#{order.id.slice(0, 8)}</td>
        <td>
          <div style={{ fontWeight: 700, color: '#2b3674' }}>{order.product_title || "Unknown"}</div>
          {order.shipping_location && <div style={{ fontSize: 12, color: '#a3aed1' }}>{order.shipping_location}</div>}
        </td>
        <td>
          <div style={{ fontSize: 13, fontWeight: 600 }}>B: {order.buyer_email || ""}</div>
          <div style={{ fontSize: 13, color: '#a3aed1' }}>S: {order.seller_email || ""}</div>
        </td>
        <td>{formatDate(order.created_at)}</td>
        <td style={{ fontWeight: 800 }}>{formatPrice(order.amount)}</td>
        <td>
          <span className={`admin-badge ${badgeClass}`}>
            {STATUS_LABELS[order.status]?.label || order.status}
          </span>
          {etaMissed && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>ETA Missed</div>}
        </td>
        <td>
          {actions.length > 0 ? (
            <select 
              className="admin-action-select"
              value=""
              onChange={(e) => {
                if(e.target.value) handleAction(order.id, e.target.value);
              }}
              disabled={actionLoading[order.id]}
            >
              <option value="">Action...</option>
              {actions.map(a => (
                <option key={a.next} value={a.next}>{a.label}</option>
              ))}
            </select>
          ) : (
            <span style={{color: '#a3aed1', fontSize: 12}}>No action</span>
          )}
        </td>
      </tr>
    );
  }

  function renderUserRow(u) {
    return (
      <tr key={u.id}>
        <td>
          <div className="admin-user-cell">
            <div className="admin-user-avatar">
              <User size={18} />
            </div>
            <div className="admin-user-details">
              <span className="admin-user-name">{u.full_name || "No Name"}</span>
              <span className="admin-user-sub">{u.email}</span>
            </div>
          </div>
        </td>
        <td>{u.phone || ""}</td>
        <td>{formatDate(u.created_at)}</td>
        <td>
          {u.is_verified_seller ? (
            <span className="admin-badge success">Verified</span>
          ) : u.verification_requested_at && !u.verification_rejected_at ? (
            <span className="admin-badge pending">Pending Req</span>
          ) : (
            <span className="admin-badge neutral">Unverified</span>
          )}
        </td>
        <td>
          <button className="admin-row-action" onClick={() => {
            setSelectedUserId(u.id);
          }}>
            View Details
          </button>
        </td>
      </tr>
    );
  }

  function renderBoostRow(b) {
    return (
      <tr key={b.id}>
        <td>#{b.id.slice(0, 8)}</td>
        <td>{b.product_title || b.product_id}</td>
        <td>{b.seller_email}</td>
        <td>{BOOST_PLANS[b.plan_id]?.label || b.plan_id}</td>
        <td>
          <span className={`admin-badge ${b.status === 'pending_payment' ? 'pending' : (b.status === 'active' ? 'success' : 'neutral')}`}>
            {b.status}
          </span>
        </td>
        <td>
          {b.status === "pending_payment" && (
            <button className="admin-row-action" onClick={() => handleBoostAction(b.id, "active")} disabled={actionLoading[b.id]}>
              {actionLoading[b.id] ? "..." : "Approve"}
            </button>
          )}
          {b.status === "active" && (
             <button className="admin-row-action" style={{background: '#ef4444'}} onClick={() => handleBoostAction(b.id, "ended")} disabled={actionLoading[b.id]}>
               End
             </button>
          )}
        </td>
      </tr>
    );
  }

  if (!authReady) {
    return (
      <div className="dashboard-page">
        <div className="loading-wrap"><div className="spinner" /> Loading admin...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="admin-dashboard-layout">
      
      {/* ── SIDEBAR ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">SellSomething</div>
        <nav className="admin-sidebar-nav">
          <button className={`admin-nav-item ${view === "orders" ? "active" : ""}`} onClick={() => setView("orders")}>
            <ShoppingCart size={20} /> Orders
            {stats.pending > 0 && <span className="admin-nav-badge">{stats.pending}</span>}
          </button>
          <button className={`admin-nav-item ${view === "users" ? "active" : ""}`} onClick={() => { setView("users"); setSelectedUserId(null); setUserDetail(null); }}>
            <Users size={20} /> Users
          </button>
          <button className={`admin-nav-item ${view === "boosts" ? "active" : ""}`} onClick={() => setView("boosts")}>
            <Star size={20} /> Boosts
            {boosts.filter(b => b.status === "pending_payment").length > 0 && (
              <span className="admin-nav-badge">{boosts.filter(b => b.status === "pending_payment").length}</span>
            )}
          </button>
          <button className={`admin-nav-item ${view === "mail" ? "active" : ""}`} onClick={() => setView("mail")}>
            <Mail size={20} /> Mail
          </button>
          <button className={`admin-nav-item ${view === "notifications" ? "active" : ""}`} onClick={() => setView("notifications")}>
            <Bell size={20} /> Push Notifications
          </button>
          <button className={`admin-nav-item ${view === "popups" ? "active" : ""}`} onClick={() => setView("popups")}>
            <LayoutTemplate size={20} /> Popups
          </button>
        </nav>
      </aside>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="admin-mobile-nav">
        <button className={`admin-mobile-nav-item ${view === "orders" ? "active" : ""}`} onClick={() => setView("orders")}>
          <ShoppingCart size={22} /> Orders
        </button>
        <button className={`admin-mobile-nav-item ${view === "users" ? "active" : ""}`} onClick={() => { setView("users"); setSelectedUserId(null); }}>
          <Users size={22} /> Users
        </button>
        <button className={`admin-mobile-nav-item ${view === "boosts" ? "active" : ""}`} onClick={() => setView("boosts")}>
          <Star size={22} /> Boosts
        </button>
        <button className={`admin-mobile-nav-item ${view === "mail" ? "active" : ""}`} onClick={() => setView("mail")}>
          <Mail size={22} /> Mail
        </button>
        <button className={`admin-mobile-nav-item ${view === "popups" ? "active" : ""}`} onClick={() => setView("popups")}>
          <LayoutTemplate size={22} /> Popups
        </button>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="admin-main">
        <div className="admin-topbar">
          <h1 className="admin-page-title">
            {view === "orders" && "Order Management"}
            {view === "users" && (selectedUserId ? "User Details" : "Users")}
            {view === "boosts" && "Boost Campaigns"}
            {view === "mail" && "Email Center"}
            {view === "notifications" && "Push Notifications"}
            {view === "popups" && "Campaign Popups"}
          </h1>
          <div className="admin-topbar-actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 10 }}>
              <div className="admin-user-avatar" style={{width: 32, height: 32, background: '#e0e5f2'}}><User size={16} /></div>
              <span style={{ fontWeight: 600, color: '#2b3674' }}>{profile?.full_name || 'Admin'}</span>
            </div>
            <button className="admin-btn-refresh" onClick={() => {
              if (view === "orders") loadOrders();
              else if (view === "boosts") loadBoosts();
              else if (selectedUserId) loadUserDetail(selectedUserId);
              else loadUsers();
            }}>
              Refresh
            </button>
          </div>
        </div>

        {/* ════════ ORDERS VIEW ════════ */}
        {view === "orders" && (
          <>
            <div className="admin-kpi-row">
              <div className="admin-kpi-card">
                <span className="admin-kpi-label">Total Orders</span>
                <span className="admin-kpi-value">{stats.total}</span>
              </div>
              <div className="admin-kpi-card warn">
                <span className="admin-kpi-label">Awaiting Payment</span>
                <span className="admin-kpi-value">{stats.pending}</span>
              </div>
              <div className="admin-kpi-card info">
                <span className="admin-kpi-label">In Escrow</span>
                <span className="admin-kpi-value">{stats.escrow}</span>
              </div>
              <div className="admin-kpi-card danger">
                <span className="admin-kpi-label">Disputes</span>
                <span className="admin-kpi-value">{stats.disputes}</span>
              </div>
              <div className="admin-kpi-card danger">
                <span className="admin-kpi-label">ETA Missed</span>
                <span className="admin-kpi-value">{stats.etaMissed}</span>
              </div>
              <div className="admin-kpi-card success">
                <span className="admin-kpi-label">Completed</span>
                <span className="admin-kpi-value">{stats.completed}</span>
              </div>
            </div>

            <div className="admin-table-panel">
              <div className="admin-table-header">
                <h3 className="admin-table-title">Recent Orders</h3>
                <div className="admin-table-filters">
                  <input
                    type="text"
                    placeholder="Search by ID, email, or product..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="admin-table-search"
                  />
                  <select
                    className="admin-table-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending_payment">Pending Payment</option>
                    <option value="payment_received">Payment Received</option>
                    <option value="in_delivery">In Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="confirmed">Buyer Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="disputed">Disputed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>
              <div className="admin-table-wrapper">
                {loadingOrders ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#a3aed1' }}>Loading...</div>
                ) : (
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Product</th>
                        <th>Participants</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionRequired.map(renderOrderRow)}
                      {visibleOthers.map(renderOrderRow)}
                      {sorted.length === 0 && (
                        <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>No orders found.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
              {visibleOthers.length < otherOrders.length && (
                <div style={{ padding: '1.5rem', textAlign: 'center', borderTop: '1px solid #f4f7fe' }}>
                  <button className="admin-btn-refresh" style={{ margin: '0 auto' }} onClick={() => setVisibleCount((c) => c + 20)}>
                    Load More
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════ USERS VIEW ════════ */}
        {view === "users" && !selectedUserId && (
          <div className="admin-table-panel">
            <div className="admin-table-header">
              <h3 className="admin-table-title">Platform Users</h3>
              <div className="admin-table-filters">
                <input
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="admin-table-search"
                />
              </div>
            </div>
            <div className="admin-table-wrapper">
              {usersLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#a3aed1' }}>Loading...</div>
              ) : (
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Phone</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(renderUserRow)}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No users found.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ════════ USER DETAILS VIEW ════════ */}
        {view === "users" && selectedUserId && userDetail && (
          <div className="admin-table-panel" style={{ padding: '2rem' }}>
            <button className="admin-btn-refresh" style={{ width: 'fit-content', marginBottom: '1.5rem' }} onClick={() => setSelectedUserId(null)}>
              Back to Users
            </button>
            <div className="admin-user-details-layout">
              <div className="admin-detail-card" style={{ marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <div className="admin-user-avatar" style={{ width: 80, height: 80 }}>
                  <User size={40} />
                </div>
                <div>
                  <h2 style={{ margin: '0 0 0.5rem', color: '#2b3674' }}>{userDetail.profile.full_name}</h2>
                  <div style={{ color: '#a3aed1', marginBottom: '1rem' }}>{userDetail.profile.email} · {userDetail.profile.phone}</div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {userDetail.profile.is_verified_seller ? (
                      <button className="admin-row-action" style={{ background: '#ef4444' }} onClick={() => handleUserVerification(selectedUserId, false)} disabled={verificationLoading}>
                        Remove Verification
                      </button>
                    ) : (
                      <button className="admin-row-action" style={{ background: '#10b981' }} onClick={() => handleUserVerification(selectedUserId, true)} disabled={verificationLoading}>
                        Approve Verification
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <AdminVerificationDetails profile={userDetail.profile} />

              <div className="admin-kpi-row" style={{ marginTop: '2rem' }}>
                <div className="admin-kpi-card">
                  <span className="admin-kpi-label">Listings</span>
                  <span className="admin-kpi-value">{userDetail.listings.length}</span>
                </div>
                <div className="admin-kpi-card info">
                  <span className="admin-kpi-label">Purchases</span>
                  <span className="admin-kpi-value">{userDetail.purchases.length}</span>
                </div>
                <div className="admin-kpi-card success">
                  <span className="admin-kpi-label">Sales</span>
                  <span className="admin-kpi-value">{userDetail.sales.length}</span>
                </div>
                <div className="admin-kpi-card warn">
                  <span className="admin-kpi-label">Conversations</span>
                  <span className="admin-kpi-value">{userDetail.conversations.length}</span>
                </div>
              </div>

              <section className="admin-user-section" style={{ marginTop: '2rem' }}>
                <h3 className="admin-user-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--charcoal)', marginBottom: '1rem', fontSize: '1.2rem' }}>
                  <ShoppingCart size={20} strokeWidth={2} /> Purchases (as buyer)
                </h3>
                {userDetail.purchases.length === 0 ? (
                  <p style={{ color: 'var(--muted)' }}>No purchases.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {userDetail.purchases.map((o) => <MiniOrderRow key={o.id} order={o} />)}
                  </div>
                )}
              </section>

              <section className="admin-user-section" style={{ marginTop: '2rem' }}>
                <h3 className="admin-user-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--charcoal)', marginBottom: '1rem', fontSize: '1.2rem' }}>
                  <Briefcase size={20} strokeWidth={2} /> Sales (as seller)
                </h3>
                {userDetail.sales.length === 0 ? (
                  <p style={{ color: 'var(--muted)' }}>No sales.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {userDetail.sales.map((o) => <MiniOrderRow key={o.id} order={o} />)}
                  </div>
                )}
              </section>

              <section className="admin-user-section" style={{ marginTop: '2rem' }}>
                <h3 className="admin-user-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--charcoal)', marginBottom: '1rem', fontSize: '1.2rem' }}>
                  <Package size={20} strokeWidth={2} /> Listings
                </h3>
                {userDetail.listings.length === 0 ? (
                  <p style={{ color: 'var(--muted)' }}>No listings.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {userDetail.listings.map((p) => (
                      <div key={p.id} className="admin-mini-order" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--smoke)', borderRadius: '12px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--charcoal)' }}>{p.title}</div>
                          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                            {p.category} · {p.location || ""} · posted {formatDate(p.created_at)}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--charcoal)' }}>{formatPrice(p.price)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="admin-user-section" style={{ marginTop: '2rem' }}>
                <h3 className="admin-user-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--charcoal)', marginBottom: '1rem', fontSize: '1.2rem' }}>
                  <MessageCircle size={20} strokeWidth={2} /> Conversations
                </h3>
                {userDetail.messagesAvailable === false && (
                  <div className="error-banner" style={{ marginBottom: "1rem", padding: '1rem', background: 'rgba(212,80,10,0.1)', color: 'var(--accent)', borderRadius: '8px' }}>
                    Full message access requires SUPABASE_SERVICE_ROLE_KEY on the server.
                  </div>
                )}
                {userDetail.conversations.length === 0 ? (
                  <p style={{ color: 'var(--muted)' }}>No conversations.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {userDetail.conversations.map((t, idx) => {
                      const contextId = t.employee?.id || t.product?.id || idx;
                      const key = `${contextId}_${t.otherUser.id}`;
                      const contextLabel = t.employee ? `${t.employee.name} (${t.employee.profession})` : t.product?.title;
                      const isOpen = !!openThreads[key];
                      const flagged = t.messages.some((m) => isSuspicious(m.content));
                      return (
                        <div key={key} className={`admin-chat-thread ${flagged ? "flagged" : ""}`} style={{ border: '1px solid var(--dune)', borderRadius: '12px', overflow: 'hidden' }}>
                          <button
                            type="button"
                            className="admin-chat-thread-header"
                            onClick={() => setOpenThreads((prev) => ({ ...prev, [key]: !isOpen }))}
                            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: flagged ? 'rgba(212,80,10,0.05)' : 'var(--smoke)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <div className="admin-chat-thread-title">
                              <strong style={{ color: 'var(--charcoal)' }}>{t.otherUser.full_name || t.otherUser.email || "Unknown user"}</strong>
                              <span style={{ color: 'var(--muted)', fontSize: 13 }}> · about "{contextLabel}"</span>
                              {flagged && (
                                <span style={{ color: 'var(--accent)', fontSize: 12, marginLeft: '8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <AlertTriangle size={12} strokeWidth={2} /> possible off-platform deal
                                </span>
                              )}
                            </div>
                            <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
                              {t.messages.length} message{t.messages.length !== 1 ? "s" : ""} {isOpen ? "▲" : "▼"}
                            </span>
                          </button>
                          {isOpen && (
                            <div className="admin-chat-messages" style={{ padding: '1rem', background: '#fff', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {t.messages.map((m) => {
                                const fromThisUser = m.sender_id === userDetail.profile.id;
                                const suspicious = isSuspicious(m.content);
                                return (
                                  <div
                                    key={m.id}
                                    style={{ 
                                      padding: '0.8rem', 
                                      borderRadius: '8px', 
                                      background: suspicious ? 'rgba(212,80,10,0.1)' : (fromThisUser ? 'var(--smoke)' : 'var(--white)'),
                                      alignSelf: fromThisUser ? 'flex-end' : 'flex-start',
                                      maxWidth: '80%',
                                      borderLeft: suspicious ? '3px solid var(--accent)' : (fromThisUser ? 'none' : '3px solid var(--earth)'),
                                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                    }}
                                  >
                                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      {fromThisUser ? (userDetail.profile.full_name || userDetail.profile.email) : (t.otherUser.full_name || t.otherUser.email)}
                                      {" · "}{formatDateTime(m.created_at)}
                                      {suspicious && <AlertTriangle size={12} color="var(--accent)" />}
                                    </div>
                                    <div style={{ color: 'var(--charcoal)', fontSize: 14 }}>{m.content}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* ════════ BOOSTS VIEW ════════ */}
        {view === "boosts" && (
          <div className="admin-table-panel">
            <div className="admin-table-header">
              <h3 className="admin-table-title">Boost Campaigns</h3>
            </div>
            <div className="admin-table-wrapper">
              {boostsLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#a3aed1' }}>Loading...</div>
              ) : (
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Boost ID</th>
                      <th>Product</th>
                      <th>Seller Email</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boosts.map(renderBoostRow)}
                    {boosts.length === 0 && (
                      <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>No boosts found.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ════════ MAIL VIEW ════════ */}
        {view === "mail" && (
          <div className="admin-table-panel" style={{ background: 'transparent', boxShadow: 'none' }}>
            <AdminMailPanel accessToken={accessToken} />
          </div>
        )}

        {/* ════════ NOTIFICATIONS VIEW ════════ */}
        {view === "notifications" && (
          <div className="admin-table-panel" style={{ background: 'transparent', boxShadow: 'none' }}>
            <AdminNotificationPanel accessToken={accessToken} />
          </div>
        )}

        {/* ════════ POPUPS VIEW ════════ */}
        {view === "popups" && <AdminPopupsPanel />}

      </main>
    </div>
  );
}
