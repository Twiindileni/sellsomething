# Push notifications (messages & orders)

SellSomething sends push notifications when:
- Someone sends you a **message**
- An **order** is updated (payment confirmed, shipped, delivered, refund, etc.)

Notifications appear on the **lock screen** via Firebase Cloud Messaging (FCM).

---

## 1. Supabase

Run in SQL Editor:

```sql
-- see supabase/push_tokens_migration.sql
```

---

## 2. Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Add project** (or use existing).
2. Add an **Android app** with package name: `www.sellsomething.online`
3. Download **`google-services.json`** → place in `android/app/google-services.json`
4. Add an **iOS app** with your bundle ID → download **`GoogleService-Info.plist`** into the Xcode project.
5. **Project settings → Cloud Messaging** — note the server setup for FCM HTTP v1.
6. **Project settings → Service accounts → Generate new private key** — save the JSON file.

---

## 3. Server (Vercel / local)

Add to `server/.env`:

```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...", ... entire JSON on one line ...}
```

Paste the **full** service account JSON as a single line (or use your host’s secret manager).

Restart the API after adding this.

---

## 4. Android

1. Ensure `android/app/google-services.json` exists (from step 2).
2. Rebuild the app in Android Studio.
3. On first launch, tap **Allow notifications** when prompted.
4. Log in — the app registers the device token automatically.

---

## 5. iOS (Xcode)

1. Open `IOS/sellsomething/sellsomething.xcodeproj`.
2. Select the app target → **Signing & Capabilities** → **+ Capability** → **Push Notifications**.
3. Also add **Background Modes** → check **Remote notifications**.
4. Add **Firebase** via **File → Add Package Dependencies**:
   - URL: `https://github.com/firebase/firebase-ios-sdk`
   - Products: `FirebaseMessaging`, `FirebaseCore`
5. Add `GoogleService-Info.plist` to the target.
6. In `AppDelegate.swift`, after Firebase is added, replace the APNs hex token line with:

```swift
import FirebaseCore
import FirebaseMessaging

// in didFinishLaunching:
FirebaseApp.configure()
Messaging.messaging().delegate = PushNotificationManager.shared

// in didRegisterForRemoteNotificationsWithDeviceToken:
Messaging.messaging().apnsToken = deviceToken
Messaging.messaging().token { token, _ in
    if let token { PushNotificationManager.shared.setToken(token) }
}
```

7. Upload your **APNs key** (.p8) in Firebase → Project settings → Cloud Messaging → Apple app configuration.

---

## 6. Test

1. Install the app on a physical device (push does not work reliably on emulators).
2. Log in as User A on the phone.
3. From another account, send User A a message or update an order.
4. Lock the phone — you should see a notification within a few seconds.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No permission prompt (Android 13+) | App settings → Notifications → allow |
| Token not registered | Log in again; check API `/api/push/register` in network tab |
| Server logs `[push] FIREBASE_SERVICE_ACCOUNT_JSON not set` | Add env var on Vercel and redeploy |
| iOS no notifications | Push capability + APNs key in Firebase + physical device |
