# Android push notifications

## Implementation status

The code is implemented, but remote delivery is **off by default** until the Expo/Firebase setup below is complete. An Expo export is a JavaScript bundle check, not an installable APK or a successful phone delivery test. Expo Go does not support remote push notifications; the web app keeps its in-app reminders and account preference controls.

Existing accounts, Swathi's plans, and other production data are not reset by this feature. New Flyway migrations V7/V8 add three tables and protect them with PostgreSQL row-level security. They are applied when the backend is next started against that database; this implementation was tested against an isolated H2 database, not by sending to real members.

Verified on 7 September 2026: 37 backend tests (including 11 push integration tests), 38 frontend tests, ESLint without warnings, Expo Doctor 21/21, compatible Expo dependencies, and Android/iOS/web JavaScript exports. An APK build and end-to-end delivery on a physical phone remain pending the credentials and setup below.

## 1. Connect an Expo project

From `frontend`:

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
```

Use your own Expo account or organization. If EAS cannot automatically edit the dynamic `app.config.js`, copy the project UUID shown by EAS into `frontend/.env.local`:

```dotenv
EXPO_PUBLIC_EAS_PROJECT_ID=your-project-uuid
EXPO_OWNER=your-expo-account-or-organization
EXPO_PUBLIC_API_URL=http://YOUR-COMPUTER-WIFI-IP:8080/api
GOOGLE_SERVICES_JSON=./google-services.json
```

Keep your existing API URL if it already works on the phone. The same Expo project UUID must be used for builds, Metro, and push token registration. The ID and API URL are public configuration, not credentials. Do not put private keys or an Expo access token in any `EXPO_PUBLIC_*` variable.

## 2. Configure Firebase / FCM v1

1. Create or select a Firebase project. Add an Android app with package **`com.wellnessapp.mobile`**, matching `app.json`.
2. Download its Android app configuration, `google-services.json`, and place it at `frontend/google-services.json`. That path is ignored by Git.
3. Enable the Firebase Cloud Messaging HTTP v1 API for that project.
4. Follow Expo's FCM v1 guide to create/select a Google service account with the required Firebase Messaging permissions. Upload its JSON key to **EAS credentials**, not the app, Supabase, Git, or chat:

```powershell
npx eas-cli@latest credentials --platform android
```

Select the push-notification / FCM v1 service-account option. This private service-account JSON is **different from** the Android `google-services.json`. The backend sends to Expo; Expo holds the FCM credential and forwards to Google.

In the EAS project dashboard, configure the **development** environment with:

| Variable | Value / type |
| --- | --- |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | The same project UUID; plain text |
| `EXPO_OWNER` | Expo account/organization; plain text |
| `EXPO_PUBLIC_API_URL` | Your reachable backend `/api` URL; plain text |
| `GOOGLE_SERVICES_JSON` | File variable containing the Android app's `google-services.json` |

Use an EAS file environment variable because the local config file is intentionally not committed/uploaded with the repository. Configure preview/production environments separately when needed. The production/preview backend URL must use HTTPS; development builds allow local HTTP for Wi-Fi testing via `ALLOW_LOCAL_HTTP=true` in `eas.json`. Never enable that flag in production.

## 3. Build and install the Android app

From `frontend`:

```powershell
npx eas-cli@latest build --platform android --profile development
```

This creates a development APK. Install it from the EAS build link on your Android phone, then run:

```powershell
npx expo start --dev-client --lan --clear
```

Open **Mr_Care**, not Expo Go. The phone must reach both Metro and the backend during local development; use the same Wi-Fi and the existing phone-access firewall setup. The development client normally uses Metro. For a standalone test APK that runs without Metro, configure the **preview** environment with a public HTTPS API and build `--profile preview`.

Rebuild the native app after changing Firebase configuration or notification plugins. Normal JavaScript changes still use Fast Refresh in the development client.

## 4. Enable backend delivery

Set these in backend environment variables or the ignored `backend/application-local.properties`, then restart the backend once:

```properties
app.push.enabled=true
app.schedulers.enabled=true
```

Environment equivalents: `PUSH_ENABLED=true` and `SCHEDULERS_ENABLED=true`.

Recommended: enable Expo push access-token security for the EAS project and configure **only the backend** with `EXPO_ACCESS_TOKEN` (or `app.push.expo-access-token`). Never put this access token in the mobile app or a committed file. Without Expo access-token security, the provider accepts possession of a push token as authority to send to it.

Restarting applies the pending migrations. Back up the database before any production migration as usual. No account/plan deletion is part of these migrations.

The backend must keep running to create and send scheduled notifications. For real users, host it on an always-on service with HTTPS. Supabase storing events alone does not run Spring's scheduler. A development computer can send pushes with outbound internet while running, but a phone away from that Wi-Fi cannot fetch app data from the LAN API.

## 5. Verify on the phone

1. Sign in as an approved member. Open **Profile → Reminders & notifications**.
2. Tap **Enable phone notifications**, then allow the Android permission. If previously denied, use **Open Android settings** and return to the app.
3. The screen should say the phone is registered, without the backend-disabled warning.
4. Tap **Send a test notification**, then background the app. Check the notification shade. The test endpoint has a one-minute cooldown.
5. Tap the notification. It should open **Today → Reminders** for the same signed-in account. A notification from a different account is ignored by the in-app handler.
6. On an approved test member, assign a meal within the reminder window. One reminder should be queued per meal/scheduled time/device. Log the meal before delivery and verify the queued message is cancelled.
7. Create an overdue attention item and send an admin nudge. Check the user's notification and in-app reminder. Resolving the attention item before delivery cancels the queued nudge.
8. Turn meal reminders off while keeping coach nudges on; only meal pushes should stop. Preferences persist across sign-in and devices.
9. Sign out, then send a new nudge: that device registration should be disabled. Sign-out waits for the backend to disconnect a registered phone; if offline, it shows an error and retry instead of claiming disconnection succeeded.

Avoid using real members for test plans/nudges without their agreement. Native notification permission, sound/channel settings, Do Not Disturb, connectivity, Android force-stop, and battery restrictions affect actual display and timing. Already handed-off notifications cannot be recalled after logout or a preference change.

## Backend/data design

- `notification_preferences`: one row per user, independent meal-reminder and coach-nudge opt-outs. Authenticated API only.
- `push_devices`: Expo token, owning user, random registration/session ID, enabled flag, last registration time. No raw Firebase service-account key or Expo server access token is stored here. Multiple phones per user are supported; token ownership changes on sign-in.
- `push_deliveries`: one row per notification/device, captured registration ID, kind, retry state, expiry, provider ticket/receipt, and a sanitized error code. Foreign keys link these tables to users and existing notification events.
- The reminder scheduler creates events from 30 minutes before the assigned meal until one hour after; missed meals become attention items. A rescheduled meal gets a new reminder key, and stale queued reminders are cancelled. A nudge expires after four hours; a test after five minutes.
- A worker checks the durable queue every five seconds when enabled. Batches are capped at 25 and locked transactionally to coordinate multiple backend instances. Failed transports and rate limits use bounded backoff (maximum five send attempts); expired jobs are cancelled. No old notification history is backfilled when a new phone registers.
- Expo receipts are checked after approximately 15 minutes and retried for up to 24 hours after message expiry. `DELIVERED` means Expo reported handoff to FCM, **not** that the user saw/read the notification. Unregistered tokens are disabled; permanent credential errors stop retries.
- Push is an at-least-once system. A timeout or process crash after provider acceptance but before the database commit can cause a duplicate. No claim of exactly-once delivery or guaranteed immediate display is made.
- Health details are fetched only from the authenticated API after opening the app. The lock screen uses a generic message.
- No automatic retention deletion is enabled for delivery history. Monitor table growth and choose a retention policy before large-scale production use.

Endpoints (all require an active member JWT and use its identity, never a caller-supplied user ID):

| Method | Path | Purpose |
| --- | --- | --- |
| GET / PUT | `/api/notifications/preferences` | Read/save `{mealReminders, coachNudges}`; response includes `pushAvailable` |
| PUT | `/api/notifications/devices` | Register `{token, registrationId}` |
| POST | `/api/notifications/devices/unregister` | Revoke only the matching owner and registration |
| POST | `/api/notifications/test` | Queue a generic test to the current user's registered phones |

## Troubleshooting

- **Expo Go message:** install the development APK; upgrading Expo Go is not sufficient.
- **Missing project ID:** set the same `EXPO_PUBLIC_EAS_PROJECT_ID` in local and EAS build environments, restart Metro, and rebuild if the native project changed.
- **Firebase not initialized / token request fails:** verify package name and the correct `google-services.json` were included in the build, then rebuild.
- **Backend warning:** enable both push and scheduler flags, restart, and retry preference loading.
- **`InvalidCredentials` / `MismatchSenderId`:** check EAS FCM v1 credentials and that they belong to the Firebase project used in the Android app; rebuild/re-register after fixing app configuration.
- **`DeviceNotRegistered`:** install/open the app and enable notifications again. The worker disables invalid tokens automatically.
- **Queued but not received:** check worker flags, outbound HTTPS, queue status/error, notification permission/channel settings, and then receipts. A queued or accepted test is not proof of display.
- **Login timeout in development APK:** confirm the EAS development API URL uses the computer's current Wi-Fi address, the development HTTP flag was included at build time, and firewall access is allowed.

Official references: [Expo setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [FCM v1 credentials](https://docs.expo.dev/push-notifications/fcm-credentials/), [sending and receipts](https://docs.expo.dev/push-notifications/sending-notifications/), [SDK 57 notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).
