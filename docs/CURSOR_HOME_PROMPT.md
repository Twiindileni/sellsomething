# Cursor home prompt — mobile app update

Copy everything in the block below into a new Cursor chat on your home PC after cloning the repo.

---

```
Read AGENTS.md and git log -5 first. I continued SellSomething work on my work PC — repo is pushed to https://github.com/Twiindileni/sellsomething.git (main). Clone or pull, then update Android + iOS native wrappers so they work with all new web features on production https://www.sellsomething.online.

## Context: mobile apps are WebView shells
- Android: `android/` → `MainActivity.kt` loads `https://www.sellsomething.online`
- iOS: `IOS/sellsomething/` → SwiftUI `WebView` + `ContentView.swift`
- Most features are in the website — apps mainly need correct URL, file upload (ID verification), push, OAuth deep links.

## Web features shipped (already on main — verify after Vercel deploy)
### Seller verification
- Dashboard → Profile Settings: social links + ID photo (10MB max), consent, submit
- Admin gets `[Verify]` email with ID attachment + socials → `VERIFICATION_ADMIN_EMAIL`
- Seller gets confirmation at their login email; approved/declined emails too
- Dashboard states: pending banner, verified badge, declined + reapply
- Admin → Users: Verify seller | Decline with preset reasons (ID unclear, fake, social inactive, etc.)
- Key files: `client/src/pages/DashboardPage.js`, `client/src/pages/AdminPage.js`, `server/index.js`, `server/email.js`, `server/verificationReasons.js`

### Other trust/marketplace features on main
- Verified badge on listings (`VerifiedBadge.js`, `SellerNameLine.js`)
- Mark listing sold / relist (`is_sold` on products)
- Seller payout method on delivery (`seller_payout_migration.sql`, `SellerOrderTracking.js`)
- Admin mail panel + templates (`AdminMailPanel.js`, `server/reengagement.js`)
- Escrow order tracking (buyer/seller/admin) — unchanged flow

## Supabase migrations to confirm ran (SQL Editor, in order if missing)
1. seller_trust_migration.sql
2. verification_social_migration.sql
3. verification_rejection_migration.sql
4. seller_payout_migration.sql
5. email_campaign_migration.sql (if using admin mail campaigns)

## Vercel / server env (production)
Set on Vercel for API:
- RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_REPLY_TO
- VERIFICATION_ADMIN_EMAIL=admin@sellsomething.online (or comma-separated inboxes)
- SUPABASE_SERVICE_ROLE_KEY
- SITE_URL=https://www.sellsomething.online

## Your tasks for Android + iOS

### 1) iOS — fix production URL (currently wrong!)
`ContentView.swift` defaults to `http://localhost:3000` and preset says `https://sellsomething.com` (wrong).
- Default URL: `https://www.sellsomething.online`
- Fix preset button to `https://www.sellsomething.online`
- Keep dev preset for local testing only

### 2) iOS — ID photo upload in WebView (critical for verification)
WKWebView needs file picker support for `<input type="file" capture="environment">`.
Implement `WKUIDelegate` / `runOpenPanelWith` (or iOS 18+ equivalent) so sellers can take/upload ID from the app.
Add Info.plist keys if needed:
- NSCameraUsageDescription
- NSPhotoLibraryUsageDescription

### 3) Android — verify file upload still works
`MainActivity.kt` already has `onShowFileChooser` — test verification submit from the app.
Confirm camera/gallery intent works for 10MB images.

### 4) Both — push notifications
Ensure push still registers after login (existing `PushBridge` / `PushNotificationManager`).
Test: verification approved/declined should ideally notify (web push if configured).

### 5) Both — deep links
Android already handles `www.sellsomething.online` and `/auth/callback`.
Confirm iOS associated domains / universal links if OAuth is used in-app.

### 6) Version bump + build
- Bump app version/build number
- Android: assemble release APK/AAB
- iOS: archive for TestFlight/App Store

### 7) Smoke test on device
- Register/login
- Dashboard → Profile Settings → submit verification (ID + social)
- Admin decline → seller sees reason + can resubmit
- Admin approve → verified badge on listings
- Buy/sell escrow flow still works

Do not re-explain escrow from scratch. Make minimal focused diffs. Match existing Kotlin/Swift style. Update AGENTS.md mobile section when done.
```

## Quick start at home

```bash
git clone https://github.com/Twiindileni/sellsomething.git
cd sellsomething
npm run install:all
```

Local env: copy `server/.env.example` → `server/.env` and `client/.env.example` → `client/.env` (never commit real keys).
