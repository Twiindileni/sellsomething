const SITE_URL = process.env.SITE_URL || "https://www.sellsomething.online";
function getFromEmail() {
  const raw = (process.env.RESEND_FROM_EMAIL || "Sell Something <admin@sellsomething.online>").trim();
  if (!raw.includes("@")) {
    return "Sell Something <admin@sellsomething.online>";
  }
  return raw;
}

function getReplyToEmail() {
  const raw = (process.env.RESEND_REPLY_TO || "admin@sellsomething.online").trim();
  return raw.includes("@") ? raw : "admin@sellsomething.online";
}

function getVerificationAdminEmail() {
  const raw = (process.env.VERIFICATION_ADMIN_EMAIL || process.env.RESEND_REPLY_TO || "admin@sellsomething.online").trim();
  return raw.includes("@") ? raw : "admin@sellsomething.online";
}

/** Inbox(es) that receive verification ID emails — comma-separated allowed */
function getVerificationAdminEmails() {
  return getVerificationAdminEmail()
    .split(",")
    .map((e) => e.trim().replace(/^["']|["']$/g, ""))
    .filter((e) => e.includes("@"));
}

function isResendConfigured() {
  return !!process.env.RESEND_API_KEY;
}

function emailLayout({ preview, bodyHtml, unsubscribeUrl }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;color:#1c1814;">
  <div style="display:none;max-height:0;overflow:hidden;">${preview}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:12px;border:1px solid #e8e0d4;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#172a3a,#0d1821);padding:24px 28px;">
          <div style="font-size:20px;font-weight:700;color:#fdfaf5;">Sell <span style="color:#d4500a;">Something</span></div>
        </td></tr>
        <tr><td style="padding:28px;line-height:1.65;font-size:15px;">${bodyHtml}</td></tr>
        <tr><td style="padding:0 28px 28px;">
          <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#d4500a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">Go to My Dashboard</a>
        </td></tr>
        <tr><td style="padding:16px 28px 24px;border-top:1px solid #eee8dc;font-size:12px;color:#8a7f72;line-height:1.5;">
          Sheka Investment CC · Windhoek, Namibia<br>
          <a href="${SITE_URL}/help" style="color:#8a7f72;">Help &amp; Support</a>
          ${unsubscribeUrl ? ` · <a href="${unsubscribeUrl}" style="color:#8a7f72;">Unsubscribe from reminders</a>` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildListUnsubscribeHeaders(unsubscribeUrl) {
  if (!unsubscribeUrl) return {};
  const replyTo = getReplyToEmail();
  return {
    "List-Unsubscribe": `<mailto:${replyTo}?subject=Unsubscribe%20reminders>, <${unsubscribeUrl}>`,
  };
}

async function sendViaResend({ to, subject, html, text, unsubscribeUrl, attachments }) {
  if (!isResendConfigured()) {
    throw new Error("RESEND_API_KEY is not configured on the server.");
  }

  const headers = buildListUnsubscribeHeaders(unsubscribeUrl);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getFromEmail(),
      reply_to: getReplyToEmail(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      ...(attachments?.length ? { attachments } : {}),
      ...(Object.keys(headers).length && !attachments?.length ? { headers } : {}),
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = payload?.message || payload?.error || `Resend HTTP ${res.status}`;
    throw new Error(msg);
  }
  return payload;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Resolve the account email from auth session and/or profile row */
function pickUserEmail(user, profile) {
  const candidates = [
    user?.email,
    profile?.email,
    user?.user_metadata?.email,
  ];
  for (const raw of candidates) {
    const email = (raw || "").trim();
    if (email.includes("@")) return email;
  }
  return null;
}

function socialLine(label, value) {
  if (!value?.trim()) return "";
  const v = escapeHtml(value.trim());
  const href = v.startsWith("http") ? v : null;
  return `<li><strong>${label}:</strong> ${href ? `<a href="${href}">${v}</a>` : v}</li>`;
}

async function sendVerificationRequestEmail({ profile, social, note, idFile }) {
  const name = profile.full_name || profile.email || "Unknown user";
  const subject = `[Verify] ${name} — seller verification request`;

  const socialList = [
    socialLine("Facebook", social.facebook),
    socialLine("Instagram", social.instagram),
    socialLine("TikTok", social.tiktok),
    socialLine("LinkedIn", social.linkedin),
  ].filter(Boolean).join("");

  const bodyHtml = `
    <p>A seller requested verification on <strong>Sell Something</strong>.</p>
    <p><strong>Name:</strong> ${escapeHtml(name)}<br>
    <strong>Email:</strong> ${escapeHtml(profile.email || "—")}<br>
    <strong>Phone:</strong> ${escapeHtml(profile.phone || "—")}<br>
    <strong>Profile ID:</strong> ${escapeHtml(profile.id)}</p>
    ${socialList ? `<p><strong>Social profiles</strong></p><ul>${socialList}</ul>` : ""}
    ${note ? `<p><strong>Note from seller:</strong><br>${escapeHtml(note)}</p>` : ""}
    <p>ID document is attached. It was <strong>not stored</strong> on our servers — review and delete this email after approval.</p>
    <p>Open <a href="${SITE_URL}/admin">Admin → Users</a> to approve or decline.</p>
  `;

  const text = [
    `Seller verification request: ${name}`,
    `Email: ${profile.email || "—"}`,
    `Phone: ${profile.phone || "—"}`,
    social.facebook ? `Facebook: ${social.facebook}` : null,
    social.instagram ? `Instagram: ${social.instagram}` : null,
    social.tiktok ? `TikTok: ${social.tiktok}` : null,
    social.linkedin ? `LinkedIn: ${social.linkedin}` : null,
    note ? `Note: ${note}` : null,
    "ID attached — not stored on servers.",
  ].filter(Boolean).join("\n");

  const ext = (idFile.mimetype === "image/png") ? "png" : (idFile.mimetype === "image/webp") ? "webp" : "jpg";
  const attachments = [{
    filename: `id-${profile.id.slice(0, 8)}.${ext}`,
    content: idFile.buffer.toString("base64"),
    content_type: idFile.mimetype || `image/${ext}`,
  }];

  const adminRecipients = getVerificationAdminEmails();
  if (!adminRecipients.length) {
    throw new Error("VERIFICATION_ADMIN_EMAIL is not configured.");
  }

  return sendViaResend({
    to: adminRecipients,
    subject,
    html: emailLayout({ preview: subject, bodyHtml, unsubscribeUrl: null }),
    text,
    attachments,
  });
}

async function sendVerificationConfirmationEmail({ profile, to }) {
  const recipient = (to || profile?.email || "").trim();
  if (!recipient.includes("@")) {
    throw new Error("No recipient email for verification confirmation.");
  }
  const name = profile?.full_name || recipient.split("@")[0] || "there";
  const subject = "We received your seller verification request";
  const bodyHtml = `
    <p>Hi <strong>${escapeHtml(name)}</strong>,</p>
    <p>Thanks for submitting your seller verification on Sell Something.</p>
    <p>Our team has your social profiles and ID by secure email. We do <strong>not</strong> store your ID in the app database.</p>
    <p>Review usually takes <strong>1–2 business days</strong>. You'll get a push notification when your profile is verified.</p>
    <p>This confirmation was sent to <strong>${escapeHtml(recipient)}</strong>. If you didn't submit this request, please reply to this email.</p>
  `;
  const text = `Hi ${name},\n\nWe received your seller verification request at ${recipient}. Review takes 1–2 business days.\n\n— Sell Something`;

  return sendViaResend({
    to: recipient,
    subject,
    html: emailLayout({ preview: subject, bodyHtml, unsubscribeUrl: null }),
    text,
  });
}

async function sendVerificationApprovedEmail({ profile, to }) {
  const recipient = (to || profile?.email || "").trim();
  if (!recipient.includes("@")) {
    throw new Error("No recipient email for verification approval.");
  }
  const name = profile?.full_name || recipient.split("@")[0] || "there";
  const subject = "You're now a verified seller on Sell Something";
  const bodyHtml = `
    <p>Hi <strong>${escapeHtml(name)}</strong>,</p>
    <p>Good news — your seller profile on <strong>Sell Something</strong> is now <strong>verified</strong>.</p>
    <p>Buyers will see the verified badge on your listings. Thank you for helping keep our marketplace trustworthy.</p>
    <p>Open your dashboard to manage your ads and sales.</p>
  `;
  const text = `Hi ${name},\n\nYour Sell Something seller profile is now verified. Buyers will see your verified badge on listings.\n\n— Sell Something`;

  return sendViaResend({
    to: recipient,
    subject,
    html: emailLayout({ preview: subject, bodyHtml, unsubscribeUrl: null }),
    text,
  });
}

async function sendVerificationRejectedEmail({ profile, to, reason }) {
  const recipient = (to || profile?.email || "").trim();
  if (!recipient.includes("@")) {
    throw new Error("No recipient email for verification decline.");
  }
  const name = profile?.full_name || recipient.split("@")[0] || "there";
  const reasonText = escapeHtml(reason || "We could not verify your submission at this time.");
  const subject = "Seller verification not approved — you can reapply";
  const bodyHtml = `
    <p>Hi <strong>${escapeHtml(name)}</strong>,</p>
    <p>Thank you for applying to become a verified seller on <strong>Sell Something</strong>.</p>
    <p>After review, we were <strong>unable to approve</strong> your verification this time.</p>
    <p><strong>Reason:</strong><br>${reasonText}</p>
    <p>You can fix the issue and <strong>submit a new application</strong> from Profile Settings in your dashboard.</p>
    <p>If you have questions, reply to this email and our team will help.</p>
  `;
  const text = `Hi ${name},\n\nYour seller verification was not approved.\n\nReason: ${reason || "See dashboard for details."}\n\nYou can reapply from Profile Settings in your dashboard.\n\n— Sell Something`;

  return sendViaResend({
    to: recipient,
    subject,
    html: emailLayout({ preview: subject, bodyHtml, unsubscribeUrl: null }),
    text,
  });
}

module.exports = {
  SITE_URL,
  getFromEmail,
  getReplyToEmail,
  getVerificationAdminEmail,
  getVerificationAdminEmails,
  isResendConfigured,
  emailLayout,
  sendViaResend,
  sendVerificationRequestEmail,
  sendVerificationConfirmationEmail,
  sendVerificationApprovedEmail,
  sendVerificationRejectedEmail,
  pickUserEmail,
};
