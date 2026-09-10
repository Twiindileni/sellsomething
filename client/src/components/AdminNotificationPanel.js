import React, { useState, useEffect } from "react";
import { AlertTriangle, Bell, Send, CheckCircle2 } from "lucide-react";
import { getAdminUsers, sendAdminNotification } from "../services/api";
import { ADMIN_PUSH_TEMPLATES } from "../config/adminPushTemplates";

export default function AdminNotificationPanel({ accessToken }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const [audience, setAudience] = useState("all");
  const [userId, setUserId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/dashboard");
  const [sendPush, setSendPush] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (accessToken) {
      getAdminUsers(accessToken)
        .then(res => setUsers(res.data || []))
        .catch(err => console.error("Failed to load users for notifications:", err))
        .finally(() => setLoadingUsers(false));
    }
  }, [accessToken]);

  function handleTemplateChange(e) {
    const tid = e.target.value;
    setTemplateId(tid);
    if (!tid) return;
    
    const tpl = ADMIN_PUSH_TEMPLATES.find(t => t.id === tid);
    if (tpl) {
      setTitle(tpl.title);
      setBody(tpl.body);
      if (tpl.url) setUrl(tpl.url);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setResult({ ok: false, message: "Title and message body are required." });
      return;
    }
    if (audience === "user" && !userId) {
      setResult({ ok: false, message: "Please select a user." });
      return;
    }
    if (!sendPush && !sendEmail) {
      setResult({ ok: false, message: "Please select at least one delivery method (Push or Email)." });
      return;
    }

    const confirmMsg = audience === "all" 
      ? `Are you sure you want to send this to ALL users?`
      : `Send this notification to the selected user?`;
      
    if (!window.confirm(confirmMsg)) return;

    setSending(true);
    setResult(null);

    try {
      const payload = {
        audience,
        user_id: audience === "user" ? userId : null,
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || "/dashboard",
        push: sendPush,
        email: sendEmail,
      };

      await sendAdminNotification(payload, accessToken);
      setResult({ ok: true, message: "Notification sent successfully!" });
      setTitle("");
      setBody("");
      setUrl("/dashboard");
      setTemplateId("");
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error || err.message || "Failed to send notification" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="admin-mail-panel">
      <section className="admin-mail-section">
        <h3 className="admin-orders-section-title">
          <Bell size={18} strokeWidth={2} className="admin-section-icon" aria-hidden="true" />
          Send Notification
        </h3>
        <p className="admin-mail-hint">
          Send push notifications directly to users' phones, or display in app alerts.
        </p>

        <form className="admin-mail-compose" onSubmit={handleSend}>
          <div className="form-group">
            <label className="form-label">Audience</label>
            <select
              className="form-input"
              value={audience}
              onChange={(e) => {
                setAudience(e.target.value);
                setResult(null);
              }}
            >
              <option value="all">Broadcast to ALL users</option>
              <option value="user">Specific User</option>
            </select>
          </div>

          {audience === "user" && (
            <div className="form-group">
              <label className="form-label">Select User</label>
              <select
                className="form-input"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loadingUsers}
              >
                <option value=""> Select user </option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Use a Template</label>
            <select
              className="form-input"
              value={templateId}
              onChange={handleTemplateChange}
            >
              <option value=""> Custom Message </option>
              {ADMIN_PUSH_TEMPLATES.map(tpl => (
                <option key={tpl.id} value={tpl.id}>{tpl.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notification Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Big Weekend Sale!"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTemplateId(""); }}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Message Body</label>
            <textarea
              className="form-input admin-mail-compose-textarea"
              placeholder="Keep it short and engaging..."
              rows={3}
              value={body}
              onChange={(e) => { setBody(e.target.value); setTemplateId(""); }}
              maxLength={250}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Action URL (When clicked)</label>
            <input
              type="text"
              className="form-input"
              placeholder="/dashboard or a specific product link"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ display: "flex", gap: "2rem", margin: "1rem 0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={sendPush} 
                onChange={(e) => setSendPush(e.target.checked)} 
              />
              Send Push Notification & In-App Alert
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={sendEmail} 
                onChange={(e) => setSendEmail(e.target.checked)} 
              />
              Send Email Backup
            </label>
          </div>

          <div className="admin-mail-compose-actions">
            <button
              type="submit"
              className="submit-btn admin-mail-compose-send"
              disabled={sending}
            >
              <Send size={14} strokeWidth={2} className="inline-icon" aria-hidden="true" />
              {sending ? "Sending..." : "Send Notification"}
            </button>
          </div>

          {result && (
            <div className={result.ok ? "success-banner" : "error-banner"} style={{ marginTop: "1rem" }}>
              {result.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              {result.message}
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
