# Mr_Care production deployment

This guide deploys the Spring Boot API on Railway and publishes the Android app through EAS and Google Play. Production mobile builds use the native application, not Expo Go.

## 1. Production prerequisites

- A Supabase PostgreSQL production project and its session-pooler JDBC credentials.
- A Railway account connected to the GitHub repository.
- An Expo/EAS account that owns project `071d37f0-59b8-478e-a6e7-dc22b79abd8b`.
- A Google Play Developer account.
- Google OAuth Web and Android clients. The Android client must use package `com.wellnessapp.mobile` and the production signing SHA-1.
- A Gmail sender with two-step verification and a 16-character Google App Password.
- A public privacy-policy page and an account-deletion request flow before a public Google Play release.

Never copy `backend/application-local.properties` into a deployment or mobile build. Configure backend secrets only as Railway variables. Values prefixed `EXPO_PUBLIC_` are compiled into the app and must never contain secrets.

## 2. Deploy the backend on Railway

1. Create a Railway project and choose **Deploy from GitHub repo**.
2. Select this repository and create one service named `mr-care-api`.
3. In service **Settings**, set **Root Directory** to `/backend`.
4. If Railway does not discover it automatically, set **Config as Code** to `/backend/railway.toml`.
5. Add these variables in the service **Variables** tab:

| Variable | Value |
| --- | --- |
| `DB_URL` | Supabase session-pooler JDBC URL ending with `?sslmode=require` |
| `DB_USER` | Supabase database/pooler user |
| `DB_PASSWORD` | Supabase database password |
| `JWT_SECRET` | New Base64 value generated from at least 32 cryptographically random bytes |
| `GOOGLE_CLIENT_IDS` | Google Web OAuth client ID used as the ID-token audience |
| `SMTP_USERNAME` | Gmail sender address |
| `SMTP_APP_PASSWORD` | Google App Password without spaces |
| `SMTP_FROM` | Same Gmail sender address |
| `SMTP_ENABLED` | `true` |
| `ADMIN_EMAIL` | Initial administrator email |
| `ADMIN_INITIAL_PASSWORD` | Strong initial password; remove this variable after the first successful startup |
| `APP_TIME_ZONE` | `Asia/Kolkata` |
| `DEMO_SEED_ENABLED` | `false` |
| `SCHEDULERS_ENABLED` | `true` |
| `PUSH_ENABLED` | `false` until Expo push credentials are ready |
| `GEMINI_API_KEY` | Optional meal-analysis key |
| `GEMINI_MODEL` | Optional supported model name |

6. Deploy and inspect the logs. Flyway applies pending migrations automatically.
7. In **Settings → Networking**, generate a public HTTPS domain. The mobile API value is this domain followed by `/api`, for example `https://mr-care-api.example.up.railway.app/api`.

Do not use a sleeping/serverless configuration for scheduled reminders. The Spring process must remain running for its scheduler and push-delivery worker.

## 3. Finish Google OAuth production configuration

1. In Google Cloud Console, keep the Web OAuth client for the ID-token audience.
2. Create or update the Android OAuth client with package `com.wellnessapp.mobile`.
3. Add the EAS upload-certificate SHA-1. After Play App Signing is enabled, also add the Play app-signing SHA-1, normally as another Android OAuth client for the same package.
4. Publish the OAuth consent screen when it is ready for non-test users.
5. Never put the Web client secret in the mobile app. This login flow needs the client ID only.

## 4. Configure EAS production values

In the Expo project dashboard, open **Project settings → Environment variables** and create these values for the `production` environment:

| Variable | Visibility/value |
| --- | --- |
| `EXPO_PUBLIC_MOBILE_API_URL` | Plain text; Railway HTTPS URL ending in `/api` |
| `EXPO_PUBLIC_API_TIMEOUT_MS` | Plain text; `20000` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Plain text; Web OAuth client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Plain text; Android OAuth client ID |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Plain text; existing EAS project UUID |
| `GOOGLE_SERVICES_JSON` | File variable; Firebase Android application configuration, not a service-account key |

The production profile is HTTPS-only. Do not set `ALLOW_LOCAL_HTTP` in the production environment.

## 5. Build the Android App Bundle

From `frontend`:

```powershell
npm install
npm install --global eas-cli
eas login
eas whoami
npm run build:android:store
```

EAS manages the Android signing key and automatically increments the remote version code. Save access to the Expo account and signing credentials securely. The output is an Android App Bundle (`.aab`) for Google Play; it is not directly installable like an APK.

## 6. Prepare Google Play Console

1. Create the app with package `com.wellnessapp.mobile`. This identifier cannot be changed after publishing.
2. Complete the store listing: app name, descriptions, icon, feature graphic, phone screenshots, category, and support contact.
3. Add a public, non-editable privacy-policy URL. Explain account/profile data, photos, nutrition, weight/body metrics, activities, notifications, Google login, retention, deletion, and every third-party processor used.
4. Complete **Data safety** accurately for personal information, authentication data, photos, health/fitness data, and device/push identifiers.
5. Complete the **Health apps declaration**, including Activity and Fitness plus Nutrition and Weight Management as applicable.
6. Complete content rating, target audience, ads, and app-access declarations. Because most screens require authentication and admin approval, provide Play reviewers with active review credentials and concise navigation instructions.
7. Provide both an in-app account-deletion path and a public web deletion-request page before production submission.

## 7. Upload, test, and release

For the first release, either upload the EAS `.aab` manually in Play Console or configure the Google service-account key under EAS Android credentials and run:

```powershell
npm run submit:android:store
```

The repository submit profile deliberately creates a draft on the internal track. Review it in Play Console before rolling it out. If the Play developer account is a personal account created after 13 November 2023, complete the required closed test with at least 12 continuously opted-in testers for 14 days before applying for production access.

After approval, promote the tested release to **Production**, choose a staged rollout percentage, and monitor crashes, ANRs, backend logs, SMTP failures, and push receipts before expanding to all users.

## 8. Enable production push notifications

1. Upload the Firebase Cloud Messaging V1 service-account credential to the EAS project's Android push credentials. This is different from `google-services.json`.
2. Enable Expo push access-token security and put the resulting token only in Railway as `EXPO_ACCESS_TOKEN`.
3. Change Railway `PUSH_ENABLED` to `true` and redeploy.
4. Keep `SCHEDULERS_ENABLED=true` and use an always-running Railway service.

See `docs/android-push-notifications.md` for the delivery and operational checklist.
