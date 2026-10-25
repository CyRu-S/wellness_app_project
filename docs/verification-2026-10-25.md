# Pre-deployment review — 25 October 2026

## Changes checked

Gemini 3.1 Flash-Lite food-photo analysis, fixed Herbalife calories, direct photo-only check-ins for unlisted Herbalife products, Expo SDK 58 compatibility, and shared/admin recipient-wide 30-minute nudge locks.

## Manual safety review

- Gemini credentials are read only by the backend. The request uses a fixed Google HTTPS host and the API-key header, with a validated model identifier. Photos and provider error bodies are not logged or returned. Token logs contain numerical usage only; member account/history data is not sent to Gemini.
- JWT authentication checks enabled/account status and token version. Anonymous live requests to photo analysis, admin attention, protected meal images and the local-properties URL returned 401; health returned 200. Media reads enforce member ownership or an active shared-access grant. Shared nudge reads/actions enforce the same grant.
- AI uploads now require a supported MIME type and matching image signature, with the existing 10 MB limit. Requests have connection/read timeouts, four concurrent provider calls, a 768-token output limit and no automatic provider retries. Per-account limits are six calls/minute and 60/UTC day per backend instance. These in-memory counters reset on restart; they do not guarantee a billing cap across instances.
- The backend enforces product calories from the assigned category/name, ignoring arbitrary client nutrition for products. Unlisted products use required numeric zeros internally and display no nutrition. They do not call Gemini.
- Repository and build-artifact scans check the exact local Gemini key and common private-key/token patterns without printing secrets. Local configuration is Git-ignored. Real credentials must never be added to the committed example file or any Expo public environment variable.

## Validation

- Backend: 118 tests passed; deployment JAR packaged successfully.
- Frontend: 144 tests passed, including direct product-photo submission, duplicate-submit protection, fixed decimal calories and preserved food review. ESLint passed.
- Expo Doctor: 20/20 checks passed. Android, iOS and web bundles exported successfully.
- Nudge tests cover simultaneous admin/coach sends, a single winning recipient lock, exact cooldown expiry, completed-item suppression and shared-access isolation.

No browser connection was available for the final visual smoke check. An installed Android APK was not built/tested in this environment, which has no Android SDK. The automated checks and manual API/source review do not constitute a full penetration test.

## Remaining dependency findings

`npm audit` reports five high-severity entries through Expo CLI's `node-forge`/code-signing and `zod` dependency chains. Repository imports and exported application bundles were checked for these tools. These are build/development-tool dependencies; the app does not import these validation/signature APIs.

- [node-forge signature advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv): installed 1.4.0; no patched release is listed. The latest registry release at review time was also 1.4.0.
- [Zod resource-consumption advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5): installed 3.25.76 through Expo CLI and ESLint. The published fix is in 4.6.6+. Forcing the dependency across a major version without upstream compatibility validation was not performed.

The audit's automatic downgrade to Expo 44 was not applied. These findings remain open and should be addressed by compatible upstream tooling releases; they are not reported as resolved by this review.

## Deployment configuration

Deploy code through `backend`, then merge into `main`. Set `GEMINI_API_KEY` in Railway's **backend service → Variables**, then redeploy. The model defaults to `gemini-3.1-flash-lite`. For local development, use `app.gemini.api-key=YOUR_KEY` in ignored `backend/application-local.properties`; replace the complete `${GEMINI_API_KEY:}` placeholder if pasting directly. Leave the tracked `.example` file secret-free.

## Follow-up: browser camera, plan reconciliation and outside food

- Browser/PWA capture now offers separate camera and library buttons, a live camera preview, readiness gating, recoverable startup errors and permission-denial fallback. HTTPS or localhost is required for browser camera access. No connected browser or physical camera was available for a hardware smoke test; component tests cover preview/capture/denial/unavailable contexts.
- Daily meal reads reconcile against the current admin plan under the member lock. Unposted orphan or obsolete slots are removed; posted daily evidence is retained and never generates tomorrow's slots. The fast-path check reads template IDs only to avoid caching template fields before acquiring the lock. Posting shares that lock with plan edits. Test fixtures now attach recurring meals to actual admin plan items.
- A read-only check of the reported account confirmed that its stale unposted Sleep snack was removed by the application and its existing posted check-in was retained. The legitimate Sleep healthy habit remains assigned independently.
- Log offers an Outside food photo flow. Category `Outside food` is accepted by the authenticated analysis endpoint and invokes the same backend Gemini client/key. Posts have no planned-meal link, are timestamped by the server, appear between planned slots by posting time and retain the Outside food label. Their nutrition contributes to totals; they do not complete assigned slots or recur tomorrow. Outside food is allowed for active members without an assigned plan. History/evidence is preserved.
- Final follow-up validation: 124 backend tests, 154 frontend tests and ESLint passed. Android, iOS and web exports succeeded; the backend deployment JAR built successfully. Gemini tests are mocked and do not spend API quota. The earlier dependency audit findings remain open.
