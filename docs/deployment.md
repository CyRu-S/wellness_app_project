# Direct-download Android APK deployment

This project distributes an installable APK through a GitHub Release; it does not require Google Play or a purchased domain. Google OAuth has been removed. The Railway service domain is sufficient for the API. Firebase/FCM configuration is still required for Android push notifications.

Do not publish the previous APK: it was built before the latest authentication and notification changes. Build a new APK after the backend deploys successfully.

## Backend: Railway

Connect the repository's `main` branch and set the service root directory to `/backend`. Build with `mvn -B -DskipTests clean package` and use the start command in `backend/railway.toml` (192 MB heap with bounded native memory for a 512 MB service). Generate a public HTTPS service domain.

Required Railway variables:

| Variable | Value |
| --- | --- |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Production PostgreSQL credentials |
| `JWT_SECRET` | Unique Base64 encoding of at least 32 random bytes |
| `MAIL_PROVIDER` | `brevo` |
| `MAIL_ENABLED` | `true` |
| `MAIL_FROM` | Verified sender address in Brevo |
| `BREVO_API_KEY` | Secret Brevo API key |
| `APP_TIME_ZONE` | `Asia/Kolkata` |
| `DEMO_SEED_ENABLED` | `false` |
| `SCHEDULERS_ENABLED` | `true` |
| `HYDRATION_DEADLINE` | `20:00` by default, in `APP_TIME_ZONE` |
| `PUSH_ENABLED` | `true` after Expo/FCM credentials are configured |

The first startup of an empty database also needs `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD`; remove the initial password variable once the admin is created. `GOOGLE_CLIENT_IDS` and Google OAuth credentials are no longer needed. Keep all secret values out of Git, Expo environment variables, screenshots, and chat.

The previously documented Railway service is `mr-care-api-production.up.railway.app`; the mobile API URL must be `https://mr-care-api-production.up.railway.app/api`. Verify the current service domain in Railway; the documented domain returned Railway HTTP 404 during the October 7, 2026 check. Confirm `/api/health` returns HTTP 200 and the service is healthy and Flyway migrations have completed before building the app.

## Android APK: EAS preview

In the Expo project, set these for the **preview** environment used by `frontend/eas.json`:

| Variable | Value |
| --- | --- |
| `EXPO_PUBLIC_MOBILE_API_URL` | `https://mr-care-api-production.up.railway.app/api` |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Existing Expo project UUID, if not supplied by app config |
| `GOOGLE_SERVICES_JSON` | Firebase Android app configuration as an EAS file variable, or include the local Git-ignored `frontend/google-services.json` in a CLI build |

`EXPO_PUBLIC_*` values are embedded in the APK and are not secret. No OAuth client IDs are needed. `GOOGLE_SERVICES_JSON` is Firebase app configuration, not a Google OAuth key or a service-account private key.

From `frontend`, run `npm install`, then `npx eas-cli@latest build --platform android --profile preview`. The build produces an APK. Download it from Expo and attach it to a new or updated GitHub Release only after the installed APK's sign-in, persistent session, verification/reset email, and push delivery are confirmed. Do not replace a known-good release with an unverified build.

## Push delivery

Keep the Android package name `com.wellnessapp.mobile` consistent across Expo and Firebase. Upload the FCM v1 service-account credential to Expo Android push credentials, separately from `google-services.json`. Set `PUSH_ENABLED=true` and `SCHEDULERS_ENABLED=true` on Railway. If Expo push access-token security is enabled, set `EXPO_ACCESS_TOKEN` in Railway. See [Android push notifications](android-push-notifications.md) for setup and diagnostics.

Railway's displayed trial credit is not a promise of perpetual free hosting. Check current usage and plan limits before distributing the APK broadly.

## Page refresh and presence

Tabs load their data when opened and use the existing encrypted, account-scoped local cache. Pull down on a data screen to fetch that page again; a failed explicit refresh shows an error and retains the displayed data. Attention, Members, and Approvals have separate reads. Members are online while an authenticated foreground heartbeat has arrived within two minutes; heartbeat and inbox sync run every 45 seconds and stop in the background.

Meal Attention items begin after the assigned meal time (without the former one-hour delay). Hydration is evaluated against the member's daily water goal after `HYDRATION_DEADLINE`, with a 2000 ml fallback for missing goals. The scheduler evaluates today's and yesterday's local dates, resolves completed items, and deduplicates deadline notifications. Enable the scheduler and configure Expo/FCM plus deadline-alert preferences for device push delivery.

The admin workspace and member directory use writable transactions because they materialize daily meal rows. Marking the workspace read-only can fail on PostgreSQL even when H2 tests pass. Railway health checks use the public `/api/health` route, which is available only after application startup and database migration completion.
