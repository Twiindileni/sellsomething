import { registerPushToken, unregisterPushToken } from "./api";

/** Detect platform lazily — bridge is injected after page load in Android. */
function detectPlatform() {
  if (typeof window === "undefined") return null;
  if (window.SellSomethingPush) return "android";
  if (window.webkit?.messageHandlers?.sellSomethingPush) return "ios";
  return null;
}

/** True when running inside the SellSomething native app shell. */
export function isNativeApp() {
  return detectPlatform() !== null;
}

function readAndroidToken() {
  try {
    const t = window.SellSomethingPush?.getToken?.();
    return t && t !== "null" && t !== "undefined" ? t : null;
  } catch {
    return null;
  }
}

export function getNativePushToken() {
  const platform = detectPlatform();
  if (platform === "android") return readAndroidToken();
  // iOS / web — token is injected into window by the native shell
  return window.__SELLSOMETHING_FCM_TOKEN__ || null;
}

let registerTimer = null;

/**
 * Register the device FCM token with our API.
 * Retries every 1.5 s for up to 15 s while the Android bridge
 * is still initialising and the token is not yet available.
 */
export function schedulePushRegistration(accessToken) {
  if (!accessToken) return;

  clearTimeout(registerTimer);

  const attempt = async (triesLeft) => {
    const platform = detectPlatform();
    if (!platform) {
      // Not running in the native app — nothing to register
      return;
    }

    const token = getNativePushToken();
    if (token) {
      try {
        const result = await registerPushToken({ token, platform }, accessToken);
        console.log("[push] token registered:", result?.data?.id);
      } catch (err) {
        console.warn("[push] registration failed:", err.response?.data?.error || err.message);
      }
      return;
    }

    if (triesLeft > 0) {
      registerTimer = setTimeout(() => attempt(triesLeft - 1), 1500);
    } else {
      console.warn("[push] token not available after retries");
    }
  };

  // Also listen for the custom event fired by the Android/iOS bridge
  const onToken = () => {
    clearTimeout(registerTimer);
    attempt(0);
  };
  window.addEventListener("sellsomething-push-token", onToken, { once: true });

  // Start trying immediately (10 retries = ~15 s window)
  attempt(10);
}

export async function clearPushRegistration(accessToken) {
  clearTimeout(registerTimer);
  if (!accessToken) return;
  const token = getNativePushToken();
  if (!token) return;
  try {
    await unregisterPushToken({ token }, accessToken);
  } catch {
    // ignore on logout
  }
}
