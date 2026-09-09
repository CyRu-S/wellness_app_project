# Android push notifications

## Implementation status

The code is implemented, but remote delivery is **off by default** until the Expo/Firebase setup below is complete. An Expo export is a JavaScript bundle check, not an installable APK or a successful phone delivery test. Expo Go does not support remote push notifications; the web app keeps its in-app reminders and account preference controls.

Existing accounts, Swathi's plans, and other production data are not reset by this feature. New Flyway migrations V7/V8 add three tables and protect them with PostgreSQL row-level security. They are applied when the backend is next started against that database; this implementation was tested against an isolated H2 database, not by sending to real members.

The user confirmed working Android delivery on 8 September 2026. Admin delivery and the additional workflows below use that same native configuration; their physical-phone acceptance checks are listed below. Automated tests use an isolated database and mocked push provider, not real members.

## Admin and account notification workflows

Migration V9 adds persistent category preferences and an event kind; it does not delete or reset accounts or plans. Restart the backend to apply it, then reload the existing development app from Metro. These changes do not require another APK build.

| Recipient | Event | Preference |
| --- | --- | --- |
| Admin | New pending registration | Signup requests (on by default) |
| Admin | Assigned meal becomes overdue by one hour | Missed deadlines (on) |
| Admin | Member posts a meal or saves a movement session | Meal & movement check-ins (on) |
| Admin | Pending approvals and unresolved attention summary | Morning digest (off until enabled) |
| User | Meal reminder and coach nudge | Existing independent switches |
| User | Assigned/replaced meal plan, changed shared access, approval inbox notice | Plan, access & account updates (on) |

The morning digest is created once per day during 08:00–09:00 in the backend application timezone (Asia/Kolkata by default), with the first scheduler tick after 08:00. There is no historical catch-up. Approval does not bypass pending-account sign-in restrictions: a new applicant has no registered device yet, so the approval notice appears in their inbox after their first approved sign-in.

Admin **Settings → Reminders & notifications** now saves preferences to the database, includes phone enable/test controls, and links to **Notification inbox**. Tapping an admin push opens that inbox; tapping a row opens the relevant admin section. User plan/access updates appear in **Today → Reminders → Account updates**. Muting a category stops its pushes, not its existing inbox history. The inbox shows the latest 30 events.

### Test the admin extension

1. Keep the backend and Metro running. Reload the development app, sign out safely, and sign in as admin on the phone.
2. Open **Settings → Reminders & notifications**. Enable phone notifications if needed, then tap **Send a test notification** and background the app.
3. Tap the received notification to open the admin inbox. Use a separate approved test member/device or browser to post a meal or save a movement session; the admin should receive a new check-in notice.
4. Submit a test registration from another session and check the signup alert. Approving it before the queue sends cancels the stale signup push. Resolving an overdue meal similarly cancels its queued deadline alert.
5. Turn off a category and repeat its action: the inbox event remains, but no push is queued. Enable the morning digest to test it during the next morning window.
6. With a user signed in on another phone, assign a plan or change shared access from admin; check the user's account-update notification.

A single app installation receives notifications for its currently signed-in account only. Use two phones to receive admin and user pushes simultaneously. Tests must not alter Swathi's plans or records without agreement. Existing Android channels are reused, so admin alerts may appear under the coach-nudges channel in Android settings.

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
| `GOOGLE_SERVICES_JSON` | Optional file variable for CI/Git builds, or `./google-services.json` for CLI uploads from this workspace |

For CLI builds from this workspace, the repository-root `.easignore` now includes `frontend/google-services.json` in the build upload while `.gitignore` continues to keep it out of Git. Backend files, local environment files and private signing/service-account keys stay excluded. This Android client configuration is not the Firebase service-account private key. For builds started from Git/CI, where that untracked local file does not exist, use an EAS file environment variable instead. A valid EAS file-variable path takes precedence over the uploaded local file. Do not set the cloud variable to a Windows-only absolute path.

Configure preview/production environments separately when needed. The production/preview backend URL must use HTTPS; development builds allow local HTTP for Wi-Fi testing via `ALLOW_LOCAL_HTTP=true` in `eas.json`. Never enable that flag in production.

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

- `notification_preferences`: one row per account, independent meal-reminder, coach-nudge, signup, deadline, digest, member-check-in and account-update preferences. Authenticated API only.
- `push_devices`: Expo token, owning user, random registration/session ID, enabled flag, last registration time. No raw Firebase service-account key or Expo server access token is stored here. Multiple phones per user are supported; token ownership changes on sign-in.
- `push_deliveries`: one row per notification/device, captured registration ID, kind, retry state, expiry, provider ticket/receipt, and a sanitized error code. Foreign keys link these tables to users and existing notification events.
- The reminder scheduler creates events from 30 minutes before the assigned meal until one hour after; missed meals become attention items. A rescheduled meal gets a new reminder key, and stale queued reminders are cancelled. A nudge expires after four hours; a test after five minutes.
- A worker checks the durable queue every five seconds when enabled. Batches are capped at 25 and locked transactionally to coordinate multiple backend instances. Failed transports and rate limits use bounded backoff (maximum five send attempts); expired jobs are cancelled. No old notification history is backfilled when a new phone registers.
- Expo receipts are checked after approximately 15 minutes and retried for up to 24 hours after message expiry. `DELIVERED` means Expo reported handoff to FCM, **not** that the user saw/read the notification. Unregistered tokens are disabled; permanent credential errors stop retries.
- Push is an at-least-once system. A timeout or process crash after provider acceptance but before the database commit can cause a duplicate. No claim of exactly-once delivery or guaranteed immediate display is made.
- Health details are fetched only from the authenticated API after opening the app. The lock screen uses a generic message.
- No automatic retention deletion is enabled for delivery history. Monitor table growth and choose a retention policy before large-scale production use.

Endpoints (all require an active user or admin JWT and use its identity, never a caller-supplied user ID):

| Method | Path | Purpose |
| --- | --- | --- |
| GET / PUT | `/api/notifications/preferences` | Read/save `mealReminders`, `coachNudges`, `signupAlerts`, `deadlineAlerts`, `dailyDigest`, `memberUpdates`, `accountUpdates`; response includes `pushAvailable` |
| GET | `/api/notifications` | Latest 30 events owned by the signed-in account |
| PATCH | `/api/notifications/{id}/read` | Mark an owned event read |
| PUT | `/api/notifications/devices` | Register `{token, registrationId}` |
| POST | `/api/notifications/devices/unregister` | Revoke only the matching owner and registration |
| POST | `/api/notifications/test` | Queue a generic test to the current user's registered phones |

## Troubleshooting

- **`Custom sound 'default' not found`:** the SDK 57 Android channel validator treats an explicit `sound: 'default'` as a custom resource filename. The app now omits the channel sound field, using Android's default instead. Reload JavaScript from Metro (`npx expo start --dev-client --lan --clear`); this fix does not require an APK rebuild or a custom sound file. Do not change the field to `null`, which means silent. If an existing channel is silent, choose its sound in Android Settings → Apps → Mr_Care → Notifications; the app preserves user channel settings.
- **Testing this fix:** keep the backend and Metro running, reload the development app, then open Swathi's Profile → Reminders & notifications → Send a test notification. Background the app and check the notification shade; tapping it should open Reminders. A generic test does not modify her diet plan or meal records. Wait at least one minute between test requests. If the test button is absent and the backend warning is shown, enable `app.push.enabled=true` and `app.schedulers.enabled=true` in the ignored `backend/application-local.properties` and restart the backend. Do not enable the flags in `backend/src/test/resources/application.properties`; that file controls automated tests, not the running app.
- **Expo Go message:** install the development APK; upgrading Expo Go is not sufficient.
- **Missing project ID:** set the same `EXPO_PUBLIC_EAS_PROJECT_ID` in local and EAS build environments, restart Metro, and rebuild if the native project changed.
- **Firebase not initialized / token request fails:** verify package name and the correct `google-services.json` were included in the build, then rebuild.
- **`Default FirebaseApp is not initialized` in an already-installed APK:** adding the Firebase file to the computer or reloading Metro cannot retrofit native Firebase resources into that APK. Keep the Android config at `frontend/google-services.json` for inclusion by the root `.easignore` (or use an EAS file variable), rebuild with `npx eas-cli@latest build --platform android --profile development`, and install the new APK. The app config validates the package and fails an Android worker early if the file is missing. A local `.env.local` entry alone is not an upload rule.
- **Backend warning despite true flags in the local properties file:** stop and restart the running backend from your IDE to reload the external properties. Keep the flags in `backend/application-local.properties`, not the test-resources file, then reopen the phone app. Environment/command-line overrides or a different backend URL can also explain a mismatch if the warning remains after restart.
- **Backend warning:** enable both push and scheduler flags, restart, and retry preference loading.
- **`InvalidCredentials` / `MismatchSenderId`:** check EAS FCM v1 credentials and that they belong to the Firebase project used in the Android app; rebuild/re-register after fixing app configuration.
- **`DeviceNotRegistered`:** install/open the app and enable notifications again. The worker disables invalid tokens automatically.
- **Queued but not received:** check worker flags, outbound HTTPS, queue status/error, notification permission/channel settings, and then receipts. A queued or accepted test is not proof of display.
- **Login timeout in development APK:** confirm the EAS development API URL uses the computer's current Wi-Fi address, the development HTTP flag was included at build time, and firewall access is allowed.

Official references: [Expo setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [FCM v1 credentials](https://docs.expo.dev/push-notifications/fcm-credentials/), [sending and receipts](https://docs.expo.dev/push-notifications/sending-notifications/), [SDK 57 notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).
