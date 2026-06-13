import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  getMyProducts, 
  getMyEmployees, 
  deleteProduct, 
  getProducts, 
  updateProfile, 
  uploadProductImage, 
  getConversations, 
  sendMessage, 
  getMessageThread,
  getMyOrders,
  getMyBoosts,
} from "../services/api";
import ProductCard from "../components/ProductCard";
import EmployeeCard from "../components/EmployeeCard";
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
import "../pages/EmployeeDirectory.css";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, session, profile, signOut, refreshProfile } = useAuth();
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
          ⭐ Sponsored until {formatBoostExpiry(target.boost_ends_at || status.boost?.ends_at)}
        </p>
      );
    }
    if (status.type === "pending") {
      return (
        <p className="dashboard-boost-status dashboard-boost-status--pending">
          ⏳ Boost pending admin approval
        </p>
      );
    }
    return (
      <button
        type="button"
        className="dashboard-boost-btn"
        onClick={() => openBoostModal(targetType, target)}
      >
        ⭐ Boost — pin to top
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
    try {
      await deleteProduct(productId);
      setListings((prev) => prev.filter((item) => item.id !== productId));
    } catch (err) {
      alert("Failed to delete listing: " + (err.response?.data?.error || err.message));
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
            </p>
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

      {globalError && <div className="error-banner">⚠️ {globalError}</div>}

      {/* Tabs list navigation */}
      <div className="dashboard-tabs">
        <button
          className={`dashboard-tab-btn ${activeTab === "listings" ? "active" : ""}`}
          onClick={() => setActiveTab("listings")}
        >
          My Ads &amp; Services
        </button>
        <button
          className={`dashboard-tab-btn ${activeTab === "purchases" ? "active" : ""}`}
          onClick={() => setActiveTab("purchases")}
        >
          🛒 My Purchases
          {purchaseActionCount > 0 && (
            <span className="dashboard-tab-badge">{purchaseActionCount}</span>
          )}
        </button>
        <button
          className={`dashboard-tab-btn ${activeTab === "sales" ? "active" : ""}`}
          onClick={() => setActiveTab("sales")}
        >
          💼 My Sales
          {salesActionCount > 0 && (
            <span className="dashboard-tab-badge">{salesActionCount}</span>
          )}
        </button>
        <button
          className={`dashboard-tab-btn ${activeTab === "favorites" ? "active" : ""}`}
          onClick={() => setActiveTab("favorites")}
        >
          Saved Items
        </button>
        <button
          className={`dashboard-tab-btn ${activeTab === "messages" ? "active" : ""}`}
          onClick={() => setActiveTab("messages")}
        >
          💬 Inbox Messages
          {unreadMessageCount > 0 && (
            <span className="dashboard-tab-badge">{unreadMessageCount}</span>
          )}
        </button>
        <button
          className={`dashboard-tab-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          Profile Settings
        </button>
      </div>

      {/* Tab Panels */}

      {/* My Purchases Tab (Buyer) */}
      {activeTab === "purchases" && (
        <section className="dashboard-section">
          <h2 className="dashboard-section-title">🛒 My Purchases</h2>
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
          <h2 className="dashboard-section-title">💼 My Sales</h2>
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

      {/* Listings Tab */}
      {activeTab === "listings" && (

        <>
          {listingsLoading ? (
            <div className="loading-wrap">
              <div className="spinner" />
              <p className="dashboard-muted">Loading listings…</p>
            </div>
          ) : (
            <>
              <section className="dashboard-section">
                <h2 className="dashboard-section-title">My Services</h2>
                {services.length === 0 ? (
                  <div className="dashboard-empty">
                    <p>You haven't listed any professional services yet.</p>
                    <Link to="/sell?type=service" className="submit-btn" style={{ marginTop: "1rem", display: "inline-block", width: "auto" }}>
                      Offer a service
                    </Link>
                  </div>
                ) : (
                  <div className="directory-grid" style={{ marginTop: 0 }}>
                    {services.map((employee) => (
                      <div key={employee.id} className="dashboard-boost-wrap">
                        <EmployeeCard employee={employee} />
                        {renderBoostBar("employee", employee)}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="dashboard-section" style={{ marginTop: '3rem' }}>
                <h2 className="dashboard-section-title">My Listings (Ads)</h2>
                {listings.length === 0 ? (
                  <div className="dashboard-empty">
                    <p>You haven't posted any ads yet.</p>
                    <Link to="/sell" className="submit-btn" style={{ marginTop: '1rem', display: 'inline-block', width: 'auto' }}>
                      Post your first ad
                    </Link>
                  </div>
                ) : (
                  <div className="products-grid">
                    {listings.map((product) => (
                      <div key={product.id} className="dashboard-boost-wrap">
                        <ProductCard
                          product={product}
                          onDelete={handleDeleteListing}
                        />
                        {renderBoostBar("product", product)}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
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
                        <div className="thread-avatar" style={{ background: 'var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>👤</div>
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
                  <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</span>
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
            
            {profileSuccess && <div className="success-banner">✅ Profile updated successfully!</div>}
            {profileError && <div className="error-banner">⚠️ {profileError}</div>}

            <form onSubmit={handleProfileUpdate}>
              {/* Avatar section */}
              <div className="profile-avatar-upload">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar Preview" className="profile-avatar-preview" />
                ) : (
                  <div className="profile-avatar-placeholder">👤</div>
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
                  So our admin team can reach you about orders and listings.
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
