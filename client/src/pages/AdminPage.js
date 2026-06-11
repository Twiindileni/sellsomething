import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getAllOrders,
  adminUpdateOrderStatus,
  getAdminUsers,
  getAdminUserDetail,
} from "../services/api";
import { isEtaMissed, formatEta } from "../utils/orderHelpers";

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

// Actions only the admin performs — sellers/buyers handle delivery & confirmation
const ADMIN_ACTIONS = {
  pending_payment: [{ label: "Confirm Payment Received", next: "payment_received" }],
  confirmed: [{ label: "Release Payment to Seller", next: "completed" }],
  disputed: [
    { label: "Approve Refund", next: "refunded" },
    { label: "Resolve Dispute — Handed Over (buyer still confirms)", next: "delivered" },
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
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NA", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d) {
  if (!d) return "—";
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

  const [view, setView] = useState("orders"); // "orders" | "users"

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
  const [openThreads, setOpenThreads] = useState({});

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

  useEffect(() => {
    if (view === "users" && authReady && isAdmin && accessToken && users.length === 0) {
      loadUsers();
    }
  }, [view, authReady, isAdmin, accessToken, users.length, loadUsers]);

  useEffect(() => {
    if (selectedUserId) loadUserDetail(selectedUserId);
  }, [selectedUserId, loadUserDetail]);

  // Reset pagination when the order list is re-filtered
  useEffect(() => {
    setVisibleCount(20);
  }, [filterStatus, search, sortBy]);

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
      u.full_name?.toLowerCase().includes(q)
    );
  });

  function renderOrderCard(order) {
    const actions = ADMIN_ACTIONS[order.status] || [];
    const needsAttention = order.status === "pending_payment";
    const etaMissed = isEtaMissed(order);
    return (
      <div
        key={order.id}
        className={`admin-order-card ${order.status === "disputed" ? "disputed" : ""} ${needsAttention || etaMissed ? "needs-attention" : ""}`}
      >
        <div className="admin-order-top">
          <div className="admin-order-info">
            <div className="admin-order-product">{order.product_title || "Unknown Product"}</div>
            <div className="admin-order-meta">
              <span>Buyer: <strong>{order.buyer_email || "—"}</strong></span>
              <span>Seller: <strong>{order.seller_email || "—"}</strong></span>
              <span>{formatDate(order.created_at)}</span>
            </div>
            <div className="admin-order-meta" style={{ fontSize: "0.8rem", opacity: 0.7 }}>
              ID: {order.id}
            </div>
            {order.dispute_reason && (
              <div className="admin-dispute-reason">Dispute: {order.dispute_reason}</div>
            )}
            {order.payment_reference && (
              <div className="admin-order-ref">Payment ref: {order.payment_reference}</div>
            )}
            {order.payment_method && (
              <div className="admin-order-ref">Method: {order.payment_method}</div>
            )}
            {order.delivery_eta && (
              <div className={`admin-order-ref ${etaMissed ? "order-eta-missed" : ""}`}>
                Delivery ETA: {formatEta(order.delivery_eta)}
                {etaMissed && " — MISSED"}
              </div>
            )}
            {order.buyer_rating && (
              <div className="admin-order-ref">
                Buyer rating: {"★".repeat(order.buyer_rating)}{"☆".repeat(5 - order.buyer_rating)}
                {order.buyer_review && <> — "{order.buyer_review}"</>}
              </div>
            )}
          </div>
          <div className="admin-order-right">
            <div className="admin-order-amount">{formatPrice(order.amount)}</div>
            <StatusBadge status={order.status} />
          </div>
        </div>

        {needsAttention && (
          <div className="order-pending-note">
            Buyer and seller are waiting for you to confirm this payment was received.
          </div>
        )}

        {actions.length > 0 && (
          <div className="admin-order-actions">
            {actions.map((action) => (
              <button
                key={action.next}
                type="button"
                className="admin-action-btn"
                onClick={() => handleAction(order.id, action.next)}
                disabled={actionLoading[order.id]}
              >
                {actionLoading[order.id] ? "Updating…" : action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="dashboard-page">
        <div className="loading-wrap"><div className="spinner" /> Loading admin…</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-sub">
            Confirm buyer payments, release seller payouts, handle disputes, and review users.
            {stats.pending > 0 && (
              <strong style={{ color: "var(--accent)", marginLeft: "0.5rem" }}>
                {stats.pending} order{stats.pending !== 1 ? "s" : ""} awaiting payment confirmation
              </strong>
            )}
          </p>
        </div>
        <button
          className="admin-refresh-btn"
          onClick={() => {
            if (view === "orders") loadOrders();
            else if (selectedUserId) loadUserDetail(selectedUserId);
            else loadUsers();
          }}
          disabled={loadingOrders || usersLoading || userDetailLoading}
        >
          {loadingOrders || usersLoading || userDetailLoading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* View switcher */}
      <div className="admin-view-tabs">
        <button
          type="button"
          className={`admin-filter-tab ${view === "orders" ? "active" : ""}`}
          onClick={() => setView("orders")}
        >
          📦 Orders
          {stats.pending > 0 && <span className="dashboard-tab-badge">{stats.pending}</span>}
        </button>
        <button
          type="button"
          className={`admin-filter-tab ${view === "users" ? "active" : ""}`}
          onClick={() => { setView("users"); setSelectedUserId(null); setUserDetail(null); }}
        >
          👥 Users
        </button>
      </div>

      {/* ════════ ORDERS VIEW ════════ */}
      {view === "orders" && (
        <>
          <div className="admin-stats">
            <div className="admin-stat-card">
              <div className="admin-stat-num">{stats.total}</div>
              <div className="admin-stat-label">Total Orders</div>
            </div>
            <div className="admin-stat-card warn">
              <div className="admin-stat-num">{stats.pending}</div>
              <div className="admin-stat-label">Awaiting Payment</div>
            </div>
            <div className="admin-stat-card danger">
              <div className="admin-stat-num">{stats.etaMissed}</div>
              <div className="admin-stat-label">ETA Missed</div>
            </div>
            <div className="admin-stat-card info">
              <div className="admin-stat-num">{stats.escrow}</div>
              <div className="admin-stat-label">In Escrow</div>
            </div>
            <div className="admin-stat-card danger">
              <div className="admin-stat-num">{stats.disputes}</div>
              <div className="admin-stat-label">Disputes</div>
            </div>
            <div className="admin-stat-card success">
              <div className="admin-stat-num">{stats.completed}</div>
              <div className="admin-stat-label">Completed</div>
            </div>
            <div className="admin-stat-card escrow-total">
              <div className="admin-stat-num">{formatPrice(stats.totalEscrowAmount)}</div>
              <div className="admin-stat-label">Held in Escrow</div>
            </div>
          </div>

          <div className="admin-filters">
            <div className="admin-search-row">
              <input
                type="text"
                className="admin-search"
                placeholder="Search product, email, or order ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="admin-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort orders"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="amount_desc">Amount: high → low</option>
                <option value="amount_asc">Amount: low → high</option>
              </select>
            </div>
            <div className="admin-filter-tabs">
              {["all", "pending_payment", "payment_received", "in_delivery", "delivered", "confirmed", "disputed", "completed", "refunded"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`admin-filter-tab ${filterStatus === s ? "active" : ""}`}
                  onClick={() => setFilterStatus(s)}
                >
                  {s === "all" ? "All" : STATUS_LABELS[s]?.label || s}
                  {s === "pending_payment" && stats.pending > 0 && (
                    <span className="dashboard-tab-badge">{stats.pending}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {loadingOrders ? (
            <div className="loading-wrap"><div className="spinner" /> Loading orders…</div>
          ) : sorted.length === 0 ? (
            <div className="dashboard-empty">
              <p>
                {orders.length === 0 && !error
                  ? "No orders in the system yet. When a buyer places an order, it will appear here."
                  : `No orders match your filter${filterStatus !== "all" ? ` ("${filterStatus}")` : ""}.`}
              </p>
            </div>
          ) : (
            <>
              {actionRequired.length > 0 && (
                <section className="admin-orders-section">
                  <h3 className="admin-orders-section-title attention">
                    ⚠️ Action required ({actionRequired.length})
                  </h3>
                  <div className="admin-orders-list">
                    {actionRequired.map((order) => renderOrderCard(order))}
                  </div>
                </section>
              )}

              {otherOrders.length > 0 && (
                <section className="admin-orders-section">
                  {actionRequired.length > 0 && (
                    <h3 className="admin-orders-section-title">
                      All other orders ({otherOrders.length})
                    </h3>
                  )}
                  <div className="admin-orders-list">
                    {visibleOthers.map((order) => renderOrderCard(order))}
                  </div>
                  {otherOrders.length > visibleCount && (
                    <button
                      type="button"
                      className="admin-load-more-btn"
                      onClick={() => setVisibleCount((c) => c + 20)}
                    >
                      Show more ({otherOrders.length - visibleCount} remaining)
                    </button>
                  )}
                </section>
              )}
            </>
          )}
        </>
      )}

      {/* ════════ USERS VIEW ════════ */}
      {view === "users" && !selectedUserId && (
        <>
          <div className="admin-filters">
            <input
              type="text"
              className="admin-search"
              placeholder="Search by name or email…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          {usersError && <div className="error-banner">{usersError}</div>}

          {usersLoading ? (
            <div className="loading-wrap"><div className="spinner" /> Loading users…</div>
          ) : filteredUsers.length === 0 ? (
            <div className="dashboard-empty">
              <p>{users.length === 0 ? "No registered users yet." : "No users match your search."}</p>
            </div>
          ) : (
            <div className="admin-user-list">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="admin-user-card"
                  onClick={() => setSelectedUserId(u.id)}
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="admin-user-avatar" />
                  ) : (
                    <div className="admin-user-avatar admin-user-avatar-placeholder">👤</div>
                  )}
                  <div className="admin-user-info">
                    <div className="admin-user-name">
                      {u.full_name || "(no name)"}
                      {u.is_admin && <span className="admin-user-admin-badge">ADMIN</span>}
                    </div>
                    <div className="admin-user-email">{u.email}</div>
                    <div className="admin-user-joined">Joined {formatDate(u.created_at)}</div>
                  </div>
                  <div className="admin-user-counts">
                    <span title="Listings">📦 {u.counts.listings}</span>
                    <span title="Purchases">🛒 {u.counts.purchases}</span>
                    <span title="Sales">💼 {u.counts.sales}</span>
                    <span title="Messages">💬 {u.counts.messages}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════ USER DETAIL VIEW ════════ */}
      {view === "users" && selectedUserId && (
        <>
          <button
            type="button"
            className="admin-back-btn"
            onClick={() => { setSelectedUserId(null); setUserDetail(null); }}
          >
            ← All users
          </button>

          {userDetailLoading ? (
            <div className="loading-wrap"><div className="spinner" /> Loading user…</div>
          ) : !userDetail ? (
            <div className="dashboard-empty"><p>Could not load this user.</p></div>
          ) : (
            <>
              <div className="admin-user-detail-header">
                {userDetail.profile.avatar_url ? (
                  <img src={userDetail.profile.avatar_url} alt="" className="admin-user-avatar admin-user-avatar-lg" />
                ) : (
                  <div className="admin-user-avatar admin-user-avatar-lg admin-user-avatar-placeholder">👤</div>
                )}
                <div>
                  <h2 className="admin-user-detail-name">
                    {userDetail.profile.full_name || "(no name)"}
                    {userDetail.profile.is_admin && <span className="admin-user-admin-badge">ADMIN</span>}
                  </h2>
                  <div className="admin-user-email">{userDetail.profile.email}</div>
                  <div className="admin-user-joined">Joined {formatDate(userDetail.profile.created_at)}</div>
                </div>
              </div>

              <div className="admin-stats">
                <div className="admin-stat-card">
                  <div className="admin-stat-num">{userDetail.listings.length}</div>
                  <div className="admin-stat-label">Listings</div>
                </div>
                <div className="admin-stat-card info">
                  <div className="admin-stat-num">{userDetail.purchases.length}</div>
                  <div className="admin-stat-label">Purchases</div>
                </div>
                <div className="admin-stat-card success">
                  <div className="admin-stat-num">{userDetail.sales.length}</div>
                  <div className="admin-stat-label">Sales</div>
                </div>
                <div className="admin-stat-card warn">
                  <div className="admin-stat-num">{userDetail.conversations.length}</div>
                  <div className="admin-stat-label">Conversations</div>
                </div>
              </div>

              {/* Purchases */}
              <section className="admin-user-section">
                <h3 className="admin-user-section-title">🛒 Purchases (as buyer)</h3>
                {userDetail.purchases.length === 0 ? (
                  <p className="admin-user-empty">No purchases.</p>
                ) : (
                  userDetail.purchases.map((o) => <MiniOrderRow key={o.id} order={o} />)
                )}
              </section>

              {/* Sales */}
              <section className="admin-user-section">
                <h3 className="admin-user-section-title">💼 Sales (as seller)</h3>
                {userDetail.sales.length === 0 ? (
                  <p className="admin-user-empty">No sales.</p>
                ) : (
                  userDetail.sales.map((o) => <MiniOrderRow key={o.id} order={o} />)
                )}
              </section>

              {/* Listings */}
              <section className="admin-user-section">
                <h3 className="admin-user-section-title">📦 Listings</h3>
                {userDetail.listings.length === 0 ? (
                  <p className="admin-user-empty">No listings.</p>
                ) : (
                  userDetail.listings.map((p) => (
                    <div key={p.id} className="admin-mini-order">
                      <div className="admin-mini-order-main">
                        <span className="admin-mini-order-title">{p.title}</span>
                        <span className="admin-mini-order-sub">
                          {p.category} · {p.location || "—"} · posted {formatDate(p.created_at)}
                        </span>
                      </div>
                      <div className="admin-mini-order-right">
                        <span className="admin-mini-order-amount">{formatPrice(p.price)}</span>
                      </div>
                    </div>
                  ))
                )}
              </section>

              {/* Conversations */}
              <section className="admin-user-section">
                <h3 className="admin-user-section-title">💬 Conversations</h3>
                {userDetail.messagesAvailable === false && (
                  <div className="error-banner" style={{ marginBottom: "1rem" }}>
                    Full message access requires SUPABASE_SERVICE_ROLE_KEY on the server.
                  </div>
                )}
                {userDetail.conversations.length === 0 ? (
                  <p className="admin-user-empty">No conversations.</p>
                ) : (
                  userDetail.conversations.map((t, idx) => {
                    const contextId = t.employee?.id || t.product?.id || idx;
                    const key = `${contextId}_${t.otherUser.id}`;
                    const contextLabel = t.employee
                      ? `${t.employee.name} (${t.employee.profession})`
                      : t.product?.title;
                    const isOpen = !!openThreads[key];
                    const flagged = t.messages.some((m) => isSuspicious(m.content));
                    return (
                      <div key={key} className={`admin-chat-thread ${flagged ? "flagged" : ""}`}>
                        <button
                          type="button"
                          className="admin-chat-thread-header"
                          onClick={() => setOpenThreads((prev) => ({ ...prev, [key]: !isOpen }))}
                        >
                          <div className="admin-chat-thread-title">
                            <strong>{t.otherUser.full_name || t.otherUser.email || "Unknown user"}</strong>
                            <span className="admin-mini-order-sub"> · about "{contextLabel}"</span>
                            {flagged && <span className="admin-chat-flag">⚠️ possible off-platform deal</span>}
                          </div>
                          <span className="admin-chat-thread-count">
                            {t.messages.length} message{t.messages.length !== 1 ? "s" : ""} {isOpen ? "▲" : "▼"}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="admin-chat-messages">
                            {t.messages.map((m) => {
                              const fromThisUser = m.sender_id === userDetail.profile.id;
                              const suspicious = isSuspicious(m.content);
                              return (
                                <div
                                  key={m.id}
                                  className={`admin-chat-msg ${fromThisUser ? "from-user" : "from-other"} ${suspicious ? "suspicious" : ""}`}
                                >
                                  <div className="admin-chat-msg-meta">
                                    {fromThisUser
                                      ? (userDetail.profile.full_name || userDetail.profile.email)
                                      : (t.otherUser.full_name || t.otherUser.email)}
                                    {" · "}{formatDateTime(m.created_at)}
                                    {suspicious && " · ⚠️"}
                                  </div>
                                  <div className="admin-chat-msg-content">{m.content}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
