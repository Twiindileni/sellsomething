const { emailLayout, sendViaResend, SITE_URL } = require("./email");

const STALE_LISTING_DAYS = 30;
const NEVER_POSTED_DAYS = 14;
const INACTIVE_LOGIN_DAYS = 30;
const EMAIL_COOLDOWN_DAYS = 30;

const SEGMENTS = {
  stale_seller: {
    label: "Stale listing",
    description: "Has ads 30+ days old — remind to mark sold or refresh",
    priority: 3,
    subject: (name) => `${name}, was your item sold?`,
    preview: "Your listing may need an update on Sell Something.",
    body: (name, { listingTitle, listingAgeDays }) => `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your ad <strong>"${listingTitle}"</strong> has been live for about <strong>${listingAgeDays} days</strong>.</p>
      <p>If your item sold, please mark it sold or remove the listing. If it's still available, consider updating the price or photos — fresh ads get more interest from buyers across Namibia.</p>
      <p>Thanks for selling on Sell Something.</p>
    `,
  },
  inactive_seller: {
    label: "Inactive seller",
    description: "Has ads but hasn't signed in for 30+ days",
    priority: 2,
    subject: (name) => `${name}, buyers may still see your ads`,
    preview: "Log in to manage your Sell Something listings.",
    body: (name, { listingCount }) => `
      <p>Hi <strong>${name}</strong>,</p>
      <p>It's been a while since you logged in. You still have <strong>${listingCount}</strong> active listing${listingCount === 1 ? "" : "s"} on Sell Something.</p>
      <p>Log in to reply to buyers, update delivery details, or remove ads for items you've already sold.</p>
    `,
  },
  never_posted: {
    label: "Never posted",
    description: "Registered 14+ days ago with no listings",
    priority: 1,
    subject: (name) => `${name}, ready to post your first ad?`,
    preview: "Reach buyers across Namibia on Sell Something.",
    body: (name) => `
      <p>Hi <strong>${name}</strong>,</p>
      <p>You joined Sell Something a little while ago but haven't posted an ad yet.</p>
      <p>Listing costs <strong>N$25</strong> and puts your item in front of buyers nationwide — with escrow protection so everyone can trade with confidence.</p>
      <p>Post your first ad today — it only takes a few minutes.</p>
    `,
  },
};

function daysAgo(dateStr) {
  if (!dateStr) return Infinity;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function displayName(profile) {
  return (profile.full_name || profile.email?.split("@")[0] || "there").trim() || "there";
}

function canEmailUser(profile, authUser) {
  if (!profile.email || profile.is_admin) return false;
  if (profile.marketing_emails_enabled === false) return false;
  if (profile.last_reengagement_email_at) {
    if (daysAgo(profile.last_reengagement_email_at) < EMAIL_COOLDOWN_DAYS) return false;
  }
  if (authUser && !authUser.email_confirmed_at) return false;
  return true;
}

function pickSegment(profile, { products, lastSignInAt }) {
  const userProducts = products.filter(
    (p) =>
      p.seller_id === profile.id
      || (p.seller_email || "").toLowerCase() === (profile.email || "").toLowerCase()
  );

  const listingCount = userProducts.length;
  const oldestListing = userProducts.reduce((oldest, p) => {
    if (!p.created_at) return oldest;
    if (!oldest || new Date(p.created_at) < new Date(oldest.created_at)) return p;
    return oldest;
  }, null);

  const registeredDays = daysAgo(profile.created_at);
  const loginInactive = lastSignInAt ? daysAgo(lastSignInAt) >= INACTIVE_LOGIN_DAYS : registeredDays >= INACTIVE_LOGIN_DAYS;

  if (listingCount > 0 && oldestListing && daysAgo(oldestListing.created_at) >= STALE_LISTING_DAYS) {
    return {
      segment: "stale_seller",
      context: {
        listingTitle: oldestListing.title || "your listing",
        listingAgeDays: daysAgo(oldestListing.created_at),
      },
    };
  }

  if (listingCount > 0 && loginInactive) {
    return { segment: "inactive_seller", context: { listingCount } };
  }

  if (listingCount === 0 && registeredDays >= NEVER_POSTED_DAYS) {
    return { segment: "never_posted", context: {} };
  }

  return null;
}

async function listAllAuthUsers(supabaseAdmin) {
  const users = [];
  let page = 1;
  while (page <= 50) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < 200) break;
    page += 1;
  }
  return users;
}

async function buildAudience(supabaseAdmin) {
  const [profilesRes, productsRes] = await Promise.all([
    supabaseAdmin.from("profiles").select(
      "id, full_name, email, is_admin, marketing_emails_enabled, last_reengagement_email_at, created_at"
    ),
    supabaseAdmin.from("products").select("id, title, seller_id, seller_email, created_at"),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  if (productsRes.error) throw productsRes.error;

  const products = productsRes.data || [];
  let authById = {};
  try {
    const authUsers = await listAllAuthUsers(supabaseAdmin);
    authById = Object.fromEntries(authUsers.map((u) => [u.id, u]));
  } catch (err) {
    console.warn("reengagement: auth user list unavailable:", err.message);
  }

  const segments = Object.fromEntries(
    Object.keys(SEGMENTS).map((k) => [k, []])
  );
  const skipped = { cooldown: 0, opted_out: 0, no_segment: 0, no_email: 0 };

  for (const profile of profilesRes.data || []) {
    if (!profile.email) {
      skipped.no_email += 1;
      continue;
    }
    if (profile.marketing_emails_enabled === false) {
      skipped.opted_out += 1;
      continue;
    }
    if (profile.last_reengagement_email_at && daysAgo(profile.last_reengagement_email_at) < EMAIL_COOLDOWN_DAYS) {
      skipped.cooldown += 1;
      continue;
    }

    const authUser = authById[profile.id];
    const lastSignInAt = authUser?.last_sign_in_at || null;
    const picked = pickSegment(profile, { products, lastSignInAt });
    if (!picked) {
      skipped.no_segment += 1;
      continue;
    }

    if (!canEmailUser(profile, authUser)) continue;

    segments[picked.segment].push({
      profile,
      context: picked.context,
      lastSignInAt,
    });
  }

  return { segments, skipped, products };
}

function buildMessage(segmentKey, profile, context) {
  const seg = SEGMENTS[segmentKey];
  const name = displayName(profile);
  const bodyHtml = seg.body(name, context);
  const unsubscribeUrl = `${SITE_URL}/dashboard?tab=settings`;
  const html = emailLayout({
    preview: seg.preview,
    bodyHtml,
    unsubscribeUrl,
  });
  const text = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    subject: seg.subject(name),
    html,
    text,
    unsubscribeUrl,
  };
}

async function runReengagementCampaign(supabaseAdmin, { dryRun = false, limit = null, segmentFilter = null } = {}) {
  if (!supabaseAdmin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for email campaigns.");
  }

  const { segments, skipped } = await buildAudience(supabaseAdmin);

  const queue = [];
  for (const [segmentKey, users] of Object.entries(segments)) {
    if (segmentFilter && segmentFilter !== segmentKey) continue;
    for (const entry of users) {
      queue.push({ segmentKey, ...entry });
    }
  }

  queue.sort((a, b) => (SEGMENTS[b.segmentKey]?.priority || 0) - (SEGMENTS[a.segmentKey]?.priority || 0));

  const seen = new Set();
  const toSend = [];
  for (const item of queue) {
    if (seen.has(item.profile.id)) continue;
    seen.add(item.profile.id);
    toSend.push(item);
    if (limit && toSend.length >= limit) break;
  }

  const results = { sent: 0, failed: 0, dryRun, details: [] };

  if (dryRun) {
    return {
      ...results,
      preview: {
        segments: Object.fromEntries(
          Object.entries(segments).map(([k, v]) => [k, v.length])
        ),
        skipped,
        wouldSend: toSend.length,
        recipients: toSend.map((x) => ({
          email: x.profile.email,
          name: displayName(x.profile),
          segment: x.segmentKey,
        })),
      },
    };
  }

  for (const item of toSend) {
    const { profile, context, segmentKey } = item;
    const { subject, html, text, unsubscribeUrl } = buildMessage(segmentKey, profile, context);
    let resendId = null;
    let status = "sent";
    let errorMessage = null;

    try {
      const res = await sendViaResend({ to: profile.email, subject, html, text, unsubscribeUrl });
      resendId = res.id || null;
      results.sent += 1;

      await supabaseAdmin
        .from("profiles")
        .update({ last_reengagement_email_at: new Date().toISOString() })
        .eq("id", profile.id);
    } catch (err) {
      status = "failed";
      errorMessage = err.message;
      results.failed += 1;
    }

    await supabaseAdmin.from("email_campaign_log").insert({
      user_id: profile.id,
      email: profile.email,
      segment: segmentKey,
      subject,
      resend_id: resendId,
      status,
      error_message: errorMessage,
    });

    results.details.push({
      email: profile.email,
      segment: segmentKey,
      status,
      error: errorMessage,
    });
  }

  return {
    ...results,
    skipped,
    segmentCounts: Object.fromEntries(
      Object.entries(segments).map(([k, v]) => [k, v.length])
    ),
  };
}

async function sendTestEmail(to, segmentKey = "never_posted") {
  const key = segmentKey in SEGMENTS ? segmentKey : "never_posted";
  const context = {
    listingTitle: "Sample iPhone 13",
    listingAgeDays: 45,
    listingCount: 2,
  };
  const { subject, html, text, unsubscribeUrl } = buildMessage(key, {
    full_name: "Admin",
    email: to,
  }, context);

  const res = await sendViaResend({
    to,
    subject: `[Test] ${subject}`,
    html,
    text,
    unsubscribeUrl,
  });
  return res;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCustomMessage({ name, subject, message }) {
  const paragraphs = String(message)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");

  const bodyHtml = `
    <p>Hi <strong>${escapeHtml(name)}</strong>,</p>
    ${paragraphs}
  `;
  const unsubscribeUrl = `${SITE_URL}/dashboard?tab=settings`;
  const html = emailLayout({
    preview: subject,
    bodyHtml,
    unsubscribeUrl,
  });
  const text = `Hi ${name},\n\n${String(message).trim()}`;
  return { subject, html, text, unsubscribeUrl };
}

async function resolveRecipient(supabaseAdmin, { userId, email }) {
  const db = supabaseAdmin;
  if (!db) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");

  if (userId) {
    const { data, error } = await db
      .from("profiles")
      .select("id, full_name, email, is_admin")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data?.email) throw new Error("User not found or has no email.");
    return data;
  }

  const trimmed = (email || "").trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    throw new Error("A valid user or email address is required.");
  }

  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, email, is_admin")
    .ilike("email", trimmed)
    .maybeSingle();
  if (error) throw error;

  if (data?.email) return data;

  return {
    id: null,
    full_name: trimmed.split("@")[0],
    email: trimmed,
    is_admin: false,
  };
}

async function sendManualEmail(supabaseAdmin, { userId, email, subject, message }) {
  if (!subject?.trim()) throw new Error("Subject is required.");
  if (!message?.trim()) throw new Error("Message is required.");

  const profile = await resolveRecipient(supabaseAdmin, { userId, email });
  const name = displayName(profile);
  const mail = buildCustomMessage({
    name,
    subject: subject.trim(),
    message: message.trim(),
  });

  let resendId = null;
  let status = "sent";
  let errorMessage = null;

  try {
    const res = await sendViaResend({
      to: profile.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      unsubscribeUrl: mail.unsubscribeUrl,
    });
    resendId = res.id || null;
  } catch (err) {
    status = "failed";
    errorMessage = err.message;
    throw err;
  } finally {
    if (supabaseAdmin) {
      await supabaseAdmin.from("email_campaign_log").insert({
        user_id: profile.id,
        email: profile.email,
        segment: "manual",
        subject: mail.subject,
        resend_id: resendId,
        status,
        error_message: errorMessage,
      });
    }
  }

  return { ok: true, to: profile.email, name, resendId };
}

module.exports = {
  SEGMENTS,
  STALE_LISTING_DAYS,
  NEVER_POSTED_DAYS,
  INACTIVE_LOGIN_DAYS,
  EMAIL_COOLDOWN_DAYS,
  buildAudience,
  runReengagementCampaign,
  sendTestEmail,
  sendManualEmail,
  buildMessage,
};
