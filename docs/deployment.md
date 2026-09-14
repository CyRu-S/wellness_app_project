# Direct-download Android APK deployment

This project distributes an installable APK through a GitHub Release; it does not require Google Play or a purchased domain. Google OAuth has been removed. The Railway service domain is sufficient for the API. Firebase/FCM configuration is still required for Android push notifications.

Do not publish the previous APK: it was built before the latest authentication and notification changes. Build a new APK after the backend deploys successfully.

## Backend: Railway

Connect the repository's `main` branch and set the service root directory to `/backend`. Build with `mvn -B -DskipTests clean package` and start with `java -XX:MaxRAMPercentage=50.0 -jar target/*.jar`. Generate a public HTTPS service domain.

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
| `PUSH_ENABLED` | `true` after Expo/FCM credentials are configured |

The first startup of an empty database also needs `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD`; remove the initial password variable once the admin is created. `GOOGLE_CLIENT_IDS` and Google OAuth credentials are no longer needed. Keep all secret values out of Git, Expo environment variables, screenshots, and chat.

The current Railway service is `mr-care-api-production.up.railway.app`; the mobile API URL must be `https://mr-care-api-production.up.railway.app/api`. Confirm the service is healthy and Flyway migrations have completed before building the app.

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
