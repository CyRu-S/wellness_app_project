# Performance and reminder changes — 25 October 2026

## Water reminder

- Removed the admin hydration popup. Sending, confirmed success, cooldown and errors appear inside the existing button.
- The button shows “Reminder sent” only after the server confirms that at least one reminder was saved. A timeout does not claim success or replay the POST.
- Added a server-backed countdown. The server skips recipients already covered by any admin/shared nudge, and makes the button available when a recipient's 30-minute cooldown expires. Other administrators restore the same cooldown when opening Home; status refreshes every 30 seconds.
- Migration V20 stores the timestamp on the member and backfills existing notification timestamps. Clearing an inbox or restarting the API cannot reset the lock. Existing row locks prevent simultaneous coaches/admins from sending duplicates.
- Club reminders commit one recipient at a time instead of holding every member's lock for the entire batch. Previously saved reminders remain protected if a later recipient fails; checking status and retrying cannot resend to those recipients within 30 minutes.
- Push delivery remains in the existing durable background queue. A confirmed reminder means it was saved/queued, not that the operating system has confirmed displaying it.

## Less repeated work

- Removed the extra leaderboard request from the admin overview; its existing workspace response already includes the standings.
- Removed duplicate admin attention polling. Shared nudge polling runs every 30 seconds instead of 5 seconds, and page, presence and nudge requests pause in hidden PWA tabs/background apps.
- Simultaneous GETs share work, including network-only nudge reads. Refreshing one page no longer discards unrelated requests in progress. Explicit refresh still supersedes older data for that page.
- Existing account-scoped API caching remains enabled; memory entries are bounded to 100 and token hashes to two accounts. Native disk data remains encrypted. Authentication/permission checks never use cached success after a rejected server response.
- When a stale read-only response is available during a network failure, return it after the first failure instead of repeating the failed GET. Writes are never automatically retried.
- JWT authentication verifies the signature once and reads the current account once per request. Suspension, verification, role and token-version checks remain live database checks.
- Browsers can cache CORS preflight permission checks for 30 minutes, avoiding repeated OPTIONS round trips. Actual API requests still authenticate and authorize normally.
- Reminder cleanup checks meal completion in one batched query instead of loading each overdue meal separately.

## Lower allocations and transfer size

- Admin history uses scalar projections instead of loading complete meal, plan, post and user entities. The same attention calculation is reused within a workspace request.
- At most two food-analysis requests allocate image/base64 payloads at once; excess requests receive a clear busy response before the image bytes are copied. No additional paid calls or retries were added.
- JSON responses of at least 2 KB support gzip. Already compressed photos are excluded. Spring Security's private/no-store response policy is retained. Configuration follows [Spring Boot's compression support](https://docs.spring.io/spring-boot/3.5/how-to/webserver.html#howto.webserver.enable-response-compression).
- Auth, member and admin navigation load as separate production web chunks. The offline service worker still precaches public chunks; this reduces initial JavaScript evaluation, not the total eventual offline download. Existing production minification and lazy tabs remain enabled.
- Member search defers list filtering while keeping text input responsive. It is a local search, so no network debounce is needed.
- Encrypted state snapshots are assembled after the existing debounce instead of rebuilding a snapshot for every intermediate Redux action. The hydration clock only renders its button, not the dashboard charts each second.

## Measured checks

| Check | Before | After |
| --- | ---: | ---: |
| Admin members SQL queries, 1 / 30 members | 14 / 14 | 13 / 13 |
| Admin workspace SQL queries, 1 / 30 members | 31 / 31 | 27 / 27 |
| Admin attention SQL queries, 1 / 30 members | 5 / 5 | 4 / 4 |
| Dedicated shared nudge polling | 12 checks/min | 2 checks/min |
| Main web entry script, uncompressed | 2,479,684 bytes | about 1,748,000 bytes |
| Sample 15-member directory response | 5,523 bytes | 422 gzip bytes |

These are controlled fixture/build measurements. They do not establish production latency, Railway resident memory, billing savings or a guarantee against all timeouts. The history projection regression test also verifies zero managed entity loads for the report query.

Validation: 117 backend tests with Maven verification/package; 163 frontend tests; lint; production web export and PWA asset checks. Regression coverage includes concurrent club/admin/shared sends, exact cooldown expiry, inbox clearing, rejected access, stale status responses, timeout feedback, GET deduplication and bounded image allocations.

The production build's onboarding → get started → sign-in path was checked in the connected browser without console errors. No live member notifications, password resets or paid analysis requests were sent during verification. An authenticated Lighthouse audit was not run: the connected browser has no Lighthouse capability or authenticated app session. [Google's authenticated audit guidance](https://github.com/GoogleChrome/lighthouse/blob/main/docs/authenticated-pages.md) describes the separate browser audit needed for those screens; no Lighthouse score is claimed here.

## Cleanup and remaining limits

Removed the unused Ollama client/bean, its smoke test and provider-only tests, start/stop scripts, local-AI compose files, obsolete setup guide, duplicate private leaderboard implementation, obsolete notification query helpers, and the empty root npm lockfile. Five nutrition-normalization tests were retained against the normalizer used by Gemini. All declared frontend packages were checked against their imports/build configuration; needed Expo/native packages were retained.

Automatic safety review rejected recursive deletion of old ignored local build/model folders, so those folders remain. They are excluded from deployment and APK uploads. Private configuration, signing files, database backups, current native build files and current dependencies were preserved.

The dependency audit still reports five high findings through Expo's tooling dependency graph (node-forge and zod, including parent packages). An automatic “fix” proposes an incompatible Expo downgrade. These findings are not resolved by this change; no claim of complete security is made. See [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) and [zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

OpenAPI is disabled by default. Set `API_DOCS_ENABLED=true` when needed for development. The Gemini key remains backend-only in Railway's `GEMINI_API_KEY`; this change does not copy local secrets into a deployment.

Deploy the backend before the PWA so V20 and the hydration status endpoint exist first. Review Railway memory/CPU/restarts and database latency after rollout before changing the existing 192 MB heap or database pool. No production monitoring access was available to quantify RAM or cost savings.
