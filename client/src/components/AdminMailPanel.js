import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Mail, RefreshCw, Send, User } from "lucide-react";
import {
  getAdminMailStatus,
  getAdminMailPreview,
  getAdminMailLog,
  sendAdminMailTest,
  runAdminMailCampaign,
  getAdminUsers,
  sendAdminMailToUser,
} from "../services/api";
import { ADMIN_MAIL_TEMPLATES } from "../config/adminMailTemplates";

const SEGMENT_ORDER = ["stale_seller", "inactive_seller", "never_posted"];

export default function AdminMailPanel({ accessToken }) {
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState(null);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testSegment, setTestSegment] = useState("never_posted");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [users, setUsers] = useState([]);
  const [composeUserId, setComposeUserId] = useState("");
  const [composeEmail, setComposeEmail] = useState("");
  const [composeTemplate, setComposeTemplate] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const [composeResult, setComposeResult] = useState(null);

  const segmentLabel = (segment) => {
    if (segment === "manual") return status?.manualLabel || "Manual";
    return status?.segments?.[segment]?.label || segment;
  };

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [statusRes, previewRes, logRes, usersRes] = await Promise.all([
        getAdminMailStatus(accessToken),
        getAdminMailPreview(accessToken),
        getAdminMailLog(accessToken),
        getAdminUsers(accessToken).catch(() => ({ data: [] })),
      ]);
      setStatus(statusRes.data);
      setPreview(previewRes.data);
      setLog(logRes.data || []);
      setUsers((usersRes.data || []).filter((u) => u.email));
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load mail panel.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleTestSend() {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await sendAdminMailTest({ segment: testSegment }, accessToken);
      setTestResult({ ok: true, message: `Test sent to ${res.data.to}` });
    } catch (err) {
      setTestResult({ ok: false, message: err.response?.data?.error || err.message });
    } finally {
      setTestSending(false);
    }
  }

  async function handleDryRun() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await runAdminMailCampaign({ dryRun: true }, accessToken);
      setRunResult({ ok: true, data: res.data });
    } catch (err) {
      setRunResult({ ok: false, message: err.response?.data?.error || err.message });
    } finally {
      setRunning(false);
    }
  }

  async function handleRunCampaign() {
    const count = preview
      ? SEGMENT_ORDER.reduce((n, k) => n + (preview.segmentCounts?.[k] || 0), 0)
      : 0;
    if (!window.confirm(`Send re-engagement emails to up to ${count} users now? Each user is capped to once per 30 days.`)) {
      return;
    }
    setRunning(true);
    setRunResult(null);
    try {
      const res = await runAdminMailCampaign({ dryRun: false }, accessToken);
      setRunResult({ ok: true, data: res.data });
      await load();
    } catch (err) {
      setRunResult({ ok: false, message: err.response?.data?.error || err.message });
    } finally {
      setRunning(false);
    }
  }

  function handleComposeUserChange(userId) {
    setComposeUserId(userId);
    setComposeResult(null);
    if (userId) {
      const user = users.find((u) => u.id === userId);
      setComposeEmail(user?.email || "");
    }
  }

  function handleComposeTemplateChange(templateId) {
    setComposeTemplate(templateId);
    setComposeResult(null);
    if (!templateId) return;
    const tpl = ADMIN_MAIL_TEMPLATES.find((t) => t.id === templateId);
    if (tpl) {
      setComposeSubject(tpl.subject);
      setComposeMessage(tpl.message);
    }
  }

  async function handleSendToUser(e) {
    e.preventDefault();
    if (!composeUserId && !composeEmail.trim()) {
      setComposeResult({ ok: false, message: "Pick a user or enter an email address." });
      return;
    }
    if (!composeSubject.trim() || !composeMessage.trim()) {
      setComposeResult({ ok: false, message: "Subject and message are required." });
      return;
    }

    const recipient = composeUserId
      ? users.find((u) => u.id === composeUserId)
      : { email: composeEmail.trim() };
    const label = recipient?.full_name || recipient?.email || composeEmail.trim();
    if (!window.confirm(`Send this email to ${label}?`)) return;

    setComposeSending(true);
    setComposeResult(null);
    try {
      const payload = {
        subject: composeSubject.trim(),
        message: composeMessage.trim(),
      };
      if (composeUserId) payload.user_id = composeUserId;
      else payload.email = composeEmail.trim();

      const res = await sendAdminMailToUser(payload, accessToken);
      setComposeResult({ ok: true, message: `Sent to ${res.data.to}` });
      setComposeTemplate("");
      setComposeSubject("");
      setComposeMessage("");
      await load();
    } catch (err) {
      setComposeResult({ ok: false, message: err.response?.data?.error || err.message });
    } finally {
      setComposeSending(false);
    }
  }

  if (loading && !status) {
    return <div className="loading-wrap"><div className="spinner" /> Loading mail…</div>;
  }

  return (
    <div className="admin-mail-panel">
      {error && (
        <div className="error-banner" style={{ marginBottom: "1rem" }}>
          <AlertTriangle size={18} strokeWidth={2} className="banner-icon" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="admin-mail-status-row">
        <div className={`admin-mail-status-pill ${status?.resendConfigured ? "ok" : "warn"}`}>
          {status?.resendConfigured ? (
            <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
          )}
          Resend {status?.resendConfigured ? "connected" : "not configured"}
        </div>
        <span className="admin-mail-meta">From: {status?.fromEmail || "—"}</span>
        <span className="admin-mail-meta">Cooldown: {status?.cooldownDays || 30} days per user</span>
        <span className="admin-mail-meta">Cron: 1st of month, 09:00 Namibia time</span>
        <button type="button" className="admin-refresh-btn" onClick={load} disabled={loading}>
          <RefreshCw size={14} strokeWidth={2} className="inline-icon" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {!status?.serviceRole && (
        <div className="error-banner" style={{ marginBottom: "1rem" }}>
          <AlertTriangle size={18} strokeWidth={2} className="banner-icon" aria-hidden="true" />
          Set SUPABASE_SERVICE_ROLE_KEY on the server for audience preview and campaigns.
        </div>
      )}

      <section className="admin-mail-section">
        <h3 className="admin-orders-section-title">
          <Mail size={18} strokeWidth={2} className="admin-section-icon" aria-hidden="true" />
          Audience preview
        </h3>
        <p className="admin-mail-hint">
          Users are grouped automatically. Each person receives at most one email per campaign and one every 30 days.
        </p>
        <div className="admin-mail-segments">
          {SEGMENT_ORDER.map((key) => {
            const meta = status?.segments?.[key];
            const count = preview?.segmentCounts?.[key] ?? 0;
            return (
              <div key={key} className="admin-mail-segment-card">
                <div className="admin-mail-segment-count">{count}</div>
                <div className="admin-mail-segment-label">{meta?.label || key}</div>
                <div className="admin-mail-segment-desc">{meta?.description}</div>
                {preview?.samples?.[key]?.length > 0 && (
                  <div className="admin-mail-samples">
                    {preview.samples[key].map((s) => (
                      <span key={s.email}>{s.name || s.email}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {preview?.skipped && (
          <p className="admin-mail-skipped">
            Skipped: {preview.skipped.cooldown} in cooldown · {preview.skipped.opted_out} opted out ·{" "}
            {preview.skipped.no_segment} no matching segment · {preview.skipped.no_email} no email
          </p>
        )}
      </section>

      <section className="admin-mail-section">
        <h3 className="admin-orders-section-title">
          <User size={18} strokeWidth={2} className="admin-section-icon" aria-hidden="true" />
          Send to a specific user
        </h3>
        <p className="admin-mail-hint">
          Choose a registered user or type any email. Manual sends are logged separately and do not count toward the 30-day campaign cooldown.
        </p>
        <form className="admin-mail-compose" onSubmit={handleSendToUser}>
          <div className="admin-mail-compose-row">
            <div className="form-group admin-mail-compose-field">
              <label className="form-label" htmlFor="mail-compose-user">User</label>
              <select
                id="mail-compose-user"
                className="form-input"
                value={composeUserId}
                onChange={(e) => handleComposeUserChange(e.target.value)}
              >
                <option value="">— Select user —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group admin-mail-compose-field">
              <label className="form-label" htmlFor="mail-compose-email">Or email address</label>
              <input
                id="mail-compose-email"
                type="email"
                className="form-input"
                placeholder="user@example.com"
                value={composeEmail}
                onChange={(e) => {
                  setComposeEmail(e.target.value);
                  setComposeUserId("");
                  setComposeResult(null);
                }}
                disabled={!!composeUserId}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mail-compose-template">Template</label>
            <select
              id="mail-compose-template"
              className="form-input"
              value={composeTemplate}
              onChange={(e) => handleComposeTemplateChange(e.target.value)}
            >
              <option value="">— Custom message —</option>
              {ADMIN_MAIL_TEMPLATES.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>{tpl.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mail-compose-subject">Subject</label>
            <input
              id="mail-compose-subject"
              type="text"
              className="form-input"
              placeholder="Your subject line"
              value={composeSubject}
              onChange={(e) => {
                setComposeSubject(e.target.value);
                setComposeTemplate("");
              }}
              maxLength={200}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mail-compose-message">Message</label>
            <textarea
              id="mail-compose-message"
              className="form-input admin-mail-compose-textarea"
              placeholder="Write your message. Line breaks are preserved."
              rows={6}
              value={composeMessage}
              onChange={(e) => {
                setComposeMessage(e.target.value);
                setComposeTemplate("");
              }}
            />
          </div>
          <div className="admin-mail-compose-actions">
            <button
              type="submit"
              className="submit-btn admin-mail-compose-send"
              disabled={composeSending || !status?.resendConfigured}
            >
              <Send size={14} strokeWidth={2} className="inline-icon" aria-hidden="true" />
              {composeSending ? "Sending…" : "Send email"}
            </button>
          </div>
          {composeResult && (
            <p className={composeResult.ok ? "admin-mail-ok" : "admin-mail-err"}>{composeResult.message}</p>
          )}
        </form>
      </section>

      <section className="admin-mail-section">
        <h3 className="admin-orders-section-title">Actions</h3>
        <div className="admin-mail-actions">
          <div className="admin-mail-test-box">
            <label className="form-label" htmlFor="mail-test-segment">Send test email to your admin address</label>
            <div className="admin-mail-test-row">
              <select
                id="mail-test-segment"
                className="form-input admin-mail-select"
                value={testSegment}
                onChange={(e) => setTestSegment(e.target.value)}
              >
                {SEGMENT_ORDER.map((k) => (
                  <option key={k} value={k}>{status?.segments?.[k]?.label || k}</option>
                ))}
              </select>
              <button
                type="button"
                className="admin-action-btn"
                onClick={handleTestSend}
                disabled={testSending || !status?.resendConfigured}
              >
                <Send size={14} strokeWidth={2} className="inline-icon" aria-hidden="true" />
                {testSending ? "Sending…" : "Send test"}
              </button>
            </div>
            {testResult && (
              <p className={testResult.ok ? "admin-mail-ok" : "admin-mail-err"}>{testResult.message}</p>
            )}
          </div>
          <div className="admin-mail-run-box">
            <button
              type="button"
              className="admin-action-btn"
              onClick={handleDryRun}
              disabled={running || !status?.resendConfigured}
            >
              Preview send (dry run)
            </button>
            <button
              type="button"
              className="submit-btn admin-mail-run-btn"
              onClick={handleRunCampaign}
              disabled={running || !status?.resendConfigured}
            >
              {running ? "Working…" : "Run campaign now"}
            </button>
          </div>
        </div>
        {runResult && (
          <div className={runResult.ok ? "success-banner" : "error-banner"} style={{ marginTop: "1rem" }}>
            {runResult.ok ? (
              <>
                <CheckCircle2 size={18} strokeWidth={2} className="banner-icon" aria-hidden="true" />
                {runResult.data.dryRun
                  ? `Dry run: would send ${runResult.data.preview?.wouldSend ?? 0} emails.`
                  : `Sent ${runResult.data.sent}, failed ${runResult.data.failed}.`}
              </>
            ) : (
              <>
                <AlertTriangle size={18} strokeWidth={2} className="banner-icon" aria-hidden="true" />
                {runResult.message}
              </>
            )}
          </div>
        )}
      </section>

      <section className="admin-mail-section">
        <h3 className="admin-orders-section-title">Recent sends</h3>
        {log.length === 0 ? (
          <p className="admin-user-empty">No campaign emails logged yet.</p>
        ) : (
          <div className="admin-mail-log-table-wrap">
            <table className="admin-mail-log-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Email</th>
                  <th>Segment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {log.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleString("en-NA")}</td>
                    <td>{row.email}</td>
                    <td>{segmentLabel(row.segment)}</td>
                    <td>
                      <span className={`admin-mail-log-status admin-mail-log-status--${row.status}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
