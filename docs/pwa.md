# iPhone PWA

The PWA uses the existing application through Expo Web. Android keeps its original API, storage and Expo notification implementations. The added `.web.js` / `.web.jsx` files and the service worker apply only to web builds. Browser push delivery is disabled on the backend by default; existing devices default to the EXPO provider in database migration V15.

## Build and host

From `frontend`, install the existing dependencies with `npm ci`, then build:

```powershell
$env:EXPO_PUBLIC_WEB_API_URL = 'https://YOUR-BACKEND-HOST/api'
npm run build:web
npm run verify:pwa
```

The build loads Expo's production dotenv files and rejects a missing, local or HTTP backend address before exporting. Set the explicit public HTTPS URL ending in `/api`; a same-origin proxy can use `https://YOUR-PWA-HOST/api`. Local development continues to use `npm run web`. The build also verifies its exported manifest, icons, precache files, routing metadata and configured API. `verify:pwa` repeats the artifact checks without rebuilding.

Upload **frontend/dist** to an HTTPS static host at the domain root. This build does not publish the website or create an Android build. The web API URL is separate from the Android API URL. All production API and image URLs must use HTTPS.

Serve `/service-worker.js` as JavaScript with `Cache-Control: no-cache` and `Service-Worker-Allowed: /`; serve `/manifest.webmanifest` as `application/manifest+json`. Serve `index.html` without long-term caching, and rewrite application navigation routes to it. Keep actual static files and `/api` outside this rewrite. The export includes `_headers` and `_redirects` for hosts that support these files; configure equivalent rules on other hosts.

Set backend `CORS_ALLOWED_ORIGINS` to the exact HTTPS website origin (no trailing slash), e.g. `https://care.example.com`. This setting controls browser requests; native Android networking does not use browser CORS. For local browser development, include the existing localhost origins as comma-separated entries if needed.

Public app files are versioned and cached for offline launch. Private page data and the session use encrypted IndexedDB storage and are cleared on logout. Cached pages remain available offline; login, uploads, writes, refreshes and fresh server data require connectivity. Updates present a Update button. Browser storage can be evicted by the OS, so offline availability is not guaranteed forever.

## Enable browser notifications

Generate a VAPID key pair locally once:

```powershell
node frontend/scripts/generate-vapid-keys.mjs
```

Put the printed public/private keys in backend deployment secrets, never in Git or frontend environment variables. Retain the pair for subsequent deployments. Configure:

```text
PUSH_ENABLED=true
SCHEDULERS_ENABLED=true
WEB_PUSH_ENABLED=true
WEB_PUSH_PUBLIC_KEY=<generated public key>
WEB_PUSH_PRIVATE_KEY=<generated private key>
WEB_PUSH_SUBJECT=mailto:<your support email>
```

`PUSH_ENABLED` and scheduler settings are the existing notification delivery gates. Web subscriptions use their own authenticated endpoints and ownership leases; the existing Expo transport remains in use for Android devices. The browser fetches only the public VAPID key. Notifications contain generic reminders; opening them loads the authenticated notification inbox. Expired subscriptions are disabled, and logout revokes the current browser subscription. Denied permission must be changed in device/browser settings.

On iPhone/iPad, users need **iOS/iPadOS 16.4 or later**. Open the HTTPS site in Safari, choose Share > Add to Home Screen, launch its icon, sign in, then tap **Enable web notifications** in notification settings. Permission is requested only from that tap. A normal browser tab on iOS shows installation guidance instead. See [Apple WebKit's Web Push documentation](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Release check on a real iPhone

1. Install from Safari and confirm the standalone app, icons and normal login/navigation.
2. Visit a page, disconnect, and confirm offline launch and cached reads. Reconnect and pull to refresh.
3. Enable notifications and send a test from notification settings. Check delivery with the installed app closed and confirm tapping opens the inbox.
4. Log out, then verify subsequent notifications are not delivered to that account on this device. Sign in as another account and repeat the test.
5. Deploy an updated web export and confirm the Update prompt installs it.
6. As admin, refresh Members and Attention, decline a request, and remove shared access; confirm cancel does nothing and accepting completes the action. As member, verify the success buttons after email verification and password reset navigate correctly.
7. Upload an iPhone camera/library photo, enter nutrition manually, and verify the saved photo and meal. Focus form fields and check the keyboard, input zoom and bottom navigation in portrait and landscape.

Automated tests cover storage, user-gesture permission, subscription ownership/logout, provider separation, dead subscriptions and the service worker. Physical iOS delivery still requires the deployed HTTPS site and configured backend; local exports cannot verify Apple's push delivery or OS behavior.
