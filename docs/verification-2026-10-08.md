# Admin and member workflow verification — October 8, 2026

Verification was performed locally before publishing. Tests used isolated databases; no existing production member records were changed during these checks. The user subsequently authorized pushing the fixes to `backend` and merging into `main`.

## Timeout findings and fixes

The preview EAS environment contains `EXPO_PUBLIC_MOBILE_API_URL=https://mr-care-api-production.up.railway.app/api`. Its `/api/health` endpoint returned HTTP 200 in a read-only check. This establishes basic connectivity, not successful authenticated production workflows.

The old Members, Attention, and Home GET handlers synchronously refreshed reminders for every active member. That operation held member locks across the entire loop. Home and Members also built detailed journals and queried profiles, plans, hydration, posts, and streaks individually per member. Database latency and simultaneous page/notification requests could therefore multiply the work considerably. These are identified timeout risks; the failing installed APK was not available for capturing a device trace.

The GET handlers now read stored data without generating reminders. Member profiles, plans, post counts, water totals, streak dates, and attention status use batch reads. The reminder worker processes each member in its own transaction, and completed daily schedules do not acquire another write lock. Date and expiry indexes are added by migration V16.

The measured SQL statement counts remain constant between 1 and 30 members, with no entity inserts, updates, or deletes during the read:

| Endpoint | 1 member | 30 members |
| --- | ---: | ---: |
| GET `/api/admin/members` | 13 | 13 |
| GET `/api/admin/workspace` | 20 | 20 |
| GET `/api/admin/attention` | 4 | 4 |

## Screen behavior

Admin data loads when the screen receives navigation focus and when the user pulls to refresh. Page polling, duplicate detail/dashboard reads, and full workspace reloads after each save or received notification have been removed. Successful approval, plan, nudge, and resolution saves update local state. Presence and inbox badges retain their foreground heartbeat because they support online status and notifications.

Members, Attention, Approvals, and Products use their own endpoints. Products previously always rendered an empty list; the catalogue now renders saved active products, with loading, empty, and failure states. Diet plan rows open the relevant member. Approval loading failures and failed attention actions provide feedback.

Nutrition capture prepares the photo and immediately opens manual serving values for every meal and product. It makes no AI request. The existing AI implementation remains available for future work. Health preferences reflect server data arriving after the form mounts without replacing edits already made by the member.

Preview/production Android workers reject missing, insecure, private, or malformed API addresses. The validated URL is also placed in the app configuration. Expo Go retains local LAN discovery. Local `.env.local` is excluded from build uploads; EAS uses the environment selected by the build profile, as described in [Expo's environment documentation](https://docs.expo.dev/eas/environment-variables/usage/).

A read that reaches its timeout is no longer repeated for another full timeout. Failed mutations are never automatically replayed.

## Workflow coverage

`ApiEndToEndTests` starts an actual HTTP server against an isolated H2 database. Each request uses a separate database transaction; email delivery is mocked and external push delivery is disabled. The workflow checks admin functionality first, then member functionality and their effect on admin data. Existing integration and frontend regression tests cover additional invalid-input, access, concurrency, retention, and push-provider cases.

| Workflow | Verified behavior |
| --- | --- |
| Admin home and reports | Authenticated workspace/dashboard/missed-items reads; empty and populated totals; adherence charts across days; member post and water totals |
| Registration and approvals | Pending registration, email verification, sign-in restrictions, verified approvals list, approve/decline, repeated-decision rejection, member list updates |
| Plans | Assign/read/list/edit recurring meal plans, preserve posted history, prevent duplicated daily meals, reflect coach name, notify on subsequent saves |
| Member details | Journal, today snapshot, hydration goal, protected profile photos, retained meal history |
| Shared access | Assign/list/replace/revoke grants; shared member summaries, today detail, protected media and rejected unauthorized access |
| Attention | Scheduled meal/hydration deadlines, nudge status, bulk nudge handling, resolution, completed-meal resolution, notification deduplication |
| Products | Active catalogue endpoint and frontend fetching/rendering |
| Member home and timeline | Empty starting totals, daily plan/meals, posted-meal completion and nutrition, hydration and activity updates |
| Meal posting | Multipart upload, decimal manual nutrition, replay-safe request IDs, history, protected image download, retention |
| Activity | Save activity, history, elapsed timer calculations, optimistic updates and rollback |
| Profile and settings | Name, dietary preferences, admin club/contact details, profile photo upload/download, weekly body-metric lock, notification preferences |
| Notifications | Inbox, persisted read status across HTTP requests, ownership checks, registration/unregistration, preference filters, queue/receipt/error handling, account-switch safeguards |
| Recovery and sessions | Password recovery/reset, invalidation of old JWTs, login using the new password, persisted session/cache isolation and sign-out behavior |

Notification read status now saves inside a transaction. Reading the admin inbox filters today's entries without deleting records as part of the request; scheduler cleanup retains its existing daily behavior.

## Resource changes

The APK upload excludes `.codex-work`, repository documentation, root scripts, and frontend tests in addition to the existing backend, dependency, environment, and credential exclusions. The Railway jar excludes development tools, local configuration, and model weights. Existing bounded JVM memory settings remain in `backend/railway.toml`.

Daily maintenance removes verification codes and push delivery records only after they have been expired for seven days. Member history and notification inbox records are preserved. The existing 21-day meal-photo retention continues. Cleanup is tested against an isolated database; it was not run against production.

Expo packages were updated within SDK 57 to compatible patches. Expo Doctor passes all 21 checks. Compatible npm audit fixes removed the critical advisory; 23 upstream advisories remain (8 moderate, 15 high). Breaking dependency downgrades suggested by forced audit remediation were not applied.

No Railway billing, volume size, or runtime memory measurements were available. Query count, archive scope, retention behavior, and packaged contents were verified; reduced production costs have not been measured.

## Completed checks

| Check | Result |
| --- | --- |
| `mvn -B verify` | 86 tests passed; production jar packaged |
| `npm run lint` | No errors or warnings |
| `npm test` | 112 tests passed after the notification badge fix |
| `npx expo-doctor` | 21/21 checks passed |
| Preview-configured `npx expo export --platform all --output-dir .expo-export-check` | Android/iOS Hermes bundles and web export passed |
| Preview API configuration and Railway health | Correct HTTPS URL; health returned 200 |
| `git diff --check` | Passed |

## Final PWA / iOS review

The production PWA was built locally with `EXPO_PUBLIC_WEB_API_URL=https://mr-care-api-production.up.railway.app/api`. Its 46 precache files exist; standalone manifest scope/start/id, all PNG icon dimensions (including the 180px Apple touch icon), HTML install tags, viewport settings, generated service-worker cache version, navigation rewrite and worker headers were checked. The web bundle contains the configured HTTPS API. Building with the existing local HTTP dotenv address is rejected before Expo exports files.

Fixed React Native Web's no-op alerts by introducing a platform alert adapter. Web approval declines and shared-access removal now execute after confirmation; email verification, password reset and health-preference success callbacks can navigate after dismissal. Validation and refresh failures display browser alerts. Native builds continue to use React Native Alert.

Admin and shared-member screens now use the existing web touch refresh wrapper instead of relying on native RefreshControl. Admin web keyboard layout no longer applies Android height handling. Input CSS enforces at least 16px even over inline styles to prevent iPhone input-focus zoom. Meal uploads resize browser photos to at most 1600px and JPEG quality 0.8 before upload; undecodable photos report a recoverable error. Installed-app detection handles Apple's `navigator.standalone` and iPad desktop identification. Changed VAPID keys replace an incompatible subscription even when its old bytes match a prefix of the new key.

Regression tests cover these fixes alongside the existing encrypted storage/logout, user-gesture permission, subscription ownership, offline service-worker shell and pending notification tap tests. After the subsequent notification badge fix, final frontend tests passed 112/112, lint passed without warnings, and Android/iOS/web exports and the production PWA build/artifact checks passed again. All 86 backend tests were rerun successfully and the production jar was packaged.

## Member notification badge

The member home bell previously rendered a red dot unconditionally. It now counts actual unread inbox events. Opening the member notification screen acknowledges the loaded notification IDs in one authenticated `PATCH /api/notifications/read` request, limited to 30 IDs. The backend performs one scoped update in a transaction; invalid or foreign IDs roll back the complete batch. Repeating a valid acknowledgement is safe, and messages outside the loaded snapshot remain unread.

The frontend updates read flags only after server confirmation, preserves acknowledged read flags through stale overlapping GET responses, and displays a retry option if saving fails. The focus handler applies only while the member inbox is open. Read flags use the existing persisted notification snapshot, and fresh server reads return the saved status. New unread events restore the dot.

Added frontend checks for conditional bell rendering, focus acknowledgement, duplicate prevention, newer notifications, stale responses and failed-save retry. Extended the real HTTP workflow test to verify read persistence, authentication, input limits, idempotence, account isolation and atomic rollback. Deploy this backend change before distributing the updated app/PWA.

No hosted PWA address or connected browser/iPhone was available. Actual host headers, production website CORS, Safari layout/keyboard/camera, Home Screen installation, cold-start notification taps and Apple's push delivery have **not** been tested on a device. Artifact and mocked browser API checks cannot establish those results. The real iPhone release sequence and hosting/push configuration are in [pwa.md](pwa.md).

## Remaining installed-build verification

No Android device/emulator or browser connection was available. The APK was not built or installed during this task. Native camera/library permission behavior, actual FCM notification delivery/background taps, email-provider delivery, and authenticated production workflows therefore remain unverified. Bundle export is not an installed APK test, and H2 integration tests do not reproduce every PostgreSQL or Railway condition.

After publishing, wait for the backend deployment to complete and confirm V16 completes and `SCHEDULERS_ENABLED=true`. Attention and reminders are generated on the scheduler's next minute tick rather than during GET requests. Then build and install the new preview APK and verify admin and member flows on the device, including denied permissions, background notifications, app restart, poor connectivity, and account switching. A fresh APK against the unchanged backend will still use the old expensive server read path.
