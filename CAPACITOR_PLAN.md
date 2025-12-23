# Mobile App Implementation Plan (Capacitor)

This document outlines the strategy for converting the **GambleGang** Next.js web application into native iOS and Android apps using **Capacitor**.

## 1. Architecture Strategy: Hosted App Wrapper

**Recommendation:** Use Capacitor in "Hosted Mode" (Wrapper) rather than "Bundled Mode".

**Why?**
*   **Server Actions Support:** Your app uses Next.js Server Actions (`"use server"`) for AI logic and Database interactions. These **do not work** in a static bundle (`next export`) which is required for a purely offline-first Capacitor app.
*   **Middleware & i18n:** You use `next-intl` middleware for routing. Static exports struggle with dynamic middleware.
*   **Instant Updates:** In Hosted Mode, changes deployed to your web host (Firebase Hosting) are instantly reflected in the app without requiring an App Store update (unless you change native code).

**Implication:**
*   The app will require an internet connection to load (just like the website).
*   Capacitor will act as a native container pointing to `https://gamblegang-926e3.web.app`.

---

## 2. Prerequisites

Ensure you have the following development tools installed:
*   **Node.js** (Already installed)
*   **Xcode** (For iOS build - Mac only)
    *   Install via Mac App Store.
    *   Install Command Line Tools: `xcode-select --install`
    *   Install CocoaPods: `sudo gem install cocoapods`
*   **Android Studio** (For Android build)
    *   Install Android SDK & Virtual Devices.

---

## 3. Installation & Setup

### Step 3.1: Install Dependencies
Install the core Capacitor packages + the CLI.
```bash
npm install @capacitor/core
npm install -D @capacitor/cli
```

### Step 3.2: Initialize Capacitor
Initialize the config.
```bash
npx cap init GambleGang com.oneup4real.gamblegang
```

### Step 3.3: Install Native Platforms
```bash
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
```

---

## 4. Configuration (`capacitor.config.ts`)

Configure Capacitor to point to your hosted environment while allowing local development.

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oneup4real.gamblegang',
  appName: 'GambleGang',
  webDir: 'out', // Fallback
  server: {
    // 1. For Production Builds (App Store):
    url: 'https://gamblegang-926e3.web.app',
    
    // 2. Cleartext traffic allowed (needed for Android local dev sometimes)
    cleartext: true,
    
    // 3. Native Navigation handling
    allowNavigation: [
      'gamblegang-926e3.web.app', 
      '*.firebaseapp.com',
      '*.google.com' // Auth redirects
    ]
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
```

---

## 5. Implementation Steps

### Step 5.1: Authentication Adjustments
Firebase Auth `signInWithPopup` and `signInWithRedirect` can be tricky in a WebView.
*   **Action:** Install `@capacitor-firebase/authentication` to use Native Google Sign-In, improving UX and reliability.
*   **Fallback:** If not using native plugin, Google Sign-In web flow works but may require specific `Cross-Origin-Opener-Policy` headers (already present in your `next.config.ts`).

### Step 5.2: Mobile UI Refinements
The current responsive design is excellent, but native apps need specific tweaks:
*   **Safe Areas:** Ensure `padding-top` and `padding-bottom` respect the Notch and Home Indicator using CSS environment variables:
    ```css
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    ```
*   **Disable Selection:** Prevent text selection on UI elements (long press usually selects text).
    ```css
    * { -webkit-user-select: none; user-select: none; }
    input, textarea { -webkit-user-select: text; user-select: text; }
    ```
*   **Remove Tap Highlight:**
    ```css
    -webkit-tap-highlight-color: transparent;
    ```

### Step 5.3: Camera & File Uploads
Your app currently uses an `<input type="file">`.
*   **Works mostly out-of-box:** On iOS/Android, this opens the native File/Camera picker.
*   **Upgrade:** Use `@capacitor/camera` for a more integrated experience (direct Camera launch vs Gallery choice).

### Step 5.4: Push Notifications
To enable real native push notifications (not just Web Push):
1.  Install `@capacitor/push-notifications`.
2.  Configure Firebase Cloud Messaging (FCM) credentials in Xcode/Android Studio.
3.  Update your `notification-service.ts` to register the device token from the Capacitor plugin instead of the Web Service Worker.

---

## 6. Build Workflow

### For iOS:
1.  `npm run build` (Ensures web assets are fresh, though Hosted Mode relies on server).
2.  `npx cap sync ios` (Updates native plugins).
3.  `npx cap open ios` (Opens Xcode).
4.  In Xcode: Select Team, capabilities (Push, Background), and Build/Run.

### For Android:
1.  `npx cap sync android`
2.  `npx cap open android`
3.  In Android Studio: Build APK/Bundle.

---

## 7. App Store Submission

### Apple App Store
*   **Guideline 4.2:** "Your app should include features, content, and UI that elevate it beyond a repackaged website."
*   **Mitigation:** Ensure you implement Native Haptics (vibrations on bets), Native Push Notifications, and a smooth navigation experience. Do not just frame the website; make it feel like an app (which your design already does well).

### Google Play Store
*   Easier approval process.
*   Ensure the "Network Error" screen is graceful if the user launches the app offline.

---

## Future Phase: Bundle Mode (Refactor)
If you require fully offline support later:
1.  Refactor all "Server Actions" to dedicated API Routes (Cloud Functions).
2.  Use standard fetch requests from Client Components.
3.  Switch Next.js to `output: 'export'`.
4.  Bundle the static HTML/JS into the app.
