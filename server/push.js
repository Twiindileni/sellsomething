const admin = require("firebase-admin");

let messaging = null;

function initPush() {
  if (messaging) return messaging;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) {
    console.warn("[push] FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(raw);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    messaging = admin.messaging();
    console.log("[push] Firebase Cloud Messaging ready");
    return messaging;
  } catch (err) {
    console.error("[push] Firebase init failed:", err.message);
    return null;
  }
}

async function sendPushToTokens(tokens, { title, body, url, type }) {
  const msg = initPush();
  if (!msg) return { sent: 0, skipped: true };

  const unique = [...new Set((tokens || []).filter(Boolean))];
  if (!unique.length) return { sent: 0 };

  const payload = {
    notification: { title, body },
    data: {
      url: url || "/dashboard",
      type: type || "general",
    },
    android: {
      priority: "high",
      notification: {
        channelId: "sellsomething_default",
        sound: "default",
        priority: "high",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
  };

  const batchSize = 500;
  let sent = 0;
  for (let i = 0; i < unique.length; i += batchSize) {
    const chunk = unique.slice(i, i + batchSize);
    const result = await msg.sendEachForMulticast({ ...payload, tokens: chunk });
    sent += result.successCount;

    result.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.warn("[push] token failed:", chunk[idx]?.slice(0, 12), resp.error?.message);
      }
    });
  }

  return { sent };
}

async function sendPushToUser(db, userId, notification) {
  if (!userId) return { sent: 0 };
  const { data, error } = await db
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId);
  if (error) {
    console.warn("[push] load tokens failed:", error.message);
    return { sent: 0 };
  }
  const tokens = (data || []).map((row) => row.token);
  return sendPushToTokens(tokens, notification);
}

function firePush(promise) {
  promise.catch((err) => console.warn("[push] send failed:", err.message));
}

module.exports = {
  initPush,
  sendPushToUser,
  sendPushToTokens,
  firePush,
};
