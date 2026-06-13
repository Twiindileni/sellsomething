# Sell Something — Android App

WebView wrapper around **https://www.sellsomething.online** (same approach as the iOS app in `IOS/`).

## Features

- Loads the live website with full login, listings, escrow, messaging, and boosts
- Supabase auth sessions persist (DOM storage enabled)
- Pull-to-refresh
- Image upload works (post ads with photos)
- Hardware back button navigates web history
- Offline screen with retry
- `mailto:` / `tel:` / WhatsApp links open the right apps
- Brand colors (orange `#D4500A`, charcoal status bar)
- Deep links: tapping a `sellsomething.online` link can open in the app

## Requirements

- Android Studio (latest stable)
- Android SDK 34
- Min Android version: 8.0 (API 26)

## Run it

1. Open **Android Studio** → *Open* → select this `android/` folder
2. Let Gradle sync finish (first sync downloads dependencies)
3. Pick a device/emulator → **Run ▶**

## Build a release APK / AAB

1. **Build → Generate Signed Bundle / APK**
2. Create a keystore (keep it safe — you need the same one for every update)
3. Choose **Android App Bundle (.aab)** for the Play Store, or **APK** for direct installs

## Play Store notes

- Package id: `online.sellsomething.app`
- The app label is **Sell Something**
- For Google login inside the app, make sure the OAuth flow works in WebView;
  if Google blocks it ("disallowed_useragent"), users can still log in with
  email/password, or we can switch auth to Chrome Custom Tabs later.

## Changing the website URL

Edit `SITE_URL` in
`app/src/main/java/online/sellsomething/app/MainActivity.kt`.
