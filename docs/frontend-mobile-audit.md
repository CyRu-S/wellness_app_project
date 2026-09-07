# Phone frontend audit — September 2026

## Findings and fixes

- Native layout: the installed React Native 0.86.3 does not export `StyleSheet.absoluteFillObject`. Replaced every frontend use with `StyleSheet.absoluteFill`. This repairs the navbar selection pill, hydration fill, crop border, camera scrim, shared-image loading overlay, and member photo overlays. Web had retained the old export, hiding this bug during web-only testing.
- Immediate feedback: water, meal posts, timer sessions, profile pictures, preferences, and measurements update local Redux state while their requests run. Failed requests restore previous data and expose error/retry controls. In-flight mutations are guarded against duplicate taps.
- Stale responses: reads begun before profile, meal, water, activity, admin workspace, or water-goal writes cannot overwrite the newer local state. Shared-member requests are also matched to their request IDs so switching profiles cannot display a late response for somebody else.
- Save latency: water and activity saves finish on the write response, without waiting for a second history/dashboard request. Admin plan/approval saves refresh separately after confirmation; access assignment uses the server's PUT response directly.
- Request load: identical simultaneous GETs share one request, isolated by authorization and invalidated by writes. Daily data polls every 10 seconds; slower-changing metadata polls every 30 seconds. Profile fetches start alongside other reads rather than after them. Detail polling stops when unfocused or backgrounded and does not overlap its previous poll.
- Photos: native profile photos are JPEGs limited to a 640px long edge; meal photos use 1600px. No camera-sized base64 copy is kept in JS. Temporary native image references are released. Native content URIs are preserved, cache-version parameters do not overwrite the server's photo key, and bearer tokens are only attached to this API's images.
- Forms and camera: keyboard-aware scroll containers, scrollable meal confirmation on short screens, camera teardown when unfocused, and navigation away from the submitted capture screen. Draft names and measurements survive failed saves.

Native photo processing uses the [SDK 57 ImageManipulator API](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/), which is included in Expo Go.

## Verification

- Frontend lint and regression tests, including mocked delayed/rejected network responses, stale-read races, native layout contracts, image preparation, and authorization-safe URL handling.
- Expo Doctor: 21 checks pass; Expo dependency compatibility check passes.
- Production bundle exports for Android, iOS, and web. Exports are build artifacts in ignored `frontend/dist-mobile-audit/`, not native device runtime tests.
- No member accounts, plans, logs, or database schema were reset by this frontend audit.

## Important limits

- A physical phone/emulator was not available to the agent. Bundle compilation and mocked native contract tests do not establish visual correctness or native photo upload success on the user's device.
- This is foreground synchronization, not an offline outbox. Unsent retry details live in memory, not durable storage across process termination. Do not force-close the app while saving.
- Meal retries retain the backend idempotency key. Water/activity endpoints do not support such keys: a lost response can mean the server saved the request. Retry asks for confirmation; inspect refreshed totals/history first. Automatic replay is deliberately not used. Exactly-once retries require backend idempotency support.
- Existing deferred features were not invented in this pass: product management, server-persisted admin contact/club settings, and external Google/meal-analysis configuration remain separate work. The admin profile editor still changes session-local values, not database contact/club fields.
- Existing dependency audit reports 18 moderate advisories. No forced major-version dependency changes were made to bypass SDK compatibility.

## Physical phone acceptance check

1. Start the backend and Metro as described in the root README. Keep phone and computer on the same reachable Wi-Fi, and ensure the frontend API override matches the computer's current LAN IP.
2. Fully reload Expo Go after this update (a native module dependency and Redux state shapes changed).
3. Switch every admin/member tab: the selected pill should be visible and content must remain above the system gesture area.
4. Add water: count and fill should move immediately, with saving feedback. Repeated taps while saving must not create extra glasses.
5. Save a profile photo, leave and return to Profile, then reload. Check that the server-confirmed image remains and that the admin sees it after refresh.
6. Finish a timer and post a planned meal: local history/dashboard should update before the request finishes. Verify the resulting records in the admin journal after refresh.
7. Test failed requests using a disposable account and a disconnected network. Verify rollback, retained draft/retry information, and enabled retry controls; restore connectivity and check for an already-saved record before retrying water/activity.
8. Repeat on a narrow display with larger system text and with the keyboard open. Check meal confirmation, profile forms, and bottom navigation.
