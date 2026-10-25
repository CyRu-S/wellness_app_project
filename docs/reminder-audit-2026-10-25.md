# Reminder audit and local changes — 25 October 2026

Status: implementation and validation notes for the reminder, feedback, live leaderboard, refresh and weekly adherence updates. Deployment health and physical-device delivery timing require separate verification after release.

## Production evidence

A read-only production database audit at 18:56 IST found no overdue ready-to-send queue backlog. Recent Android push tickets nevertheless show an approximately 75–80 second gap between their scheduled time and Expo accepting the send. The estimate comes from recent first-attempt receipt records before their first receipt check; older rows do not store exact submission timestamps.

There were also 24 historical browser deliveries marked `WebPushUnavailable` in the preceding three-day window, alongside successful browser deliveries. A configured production backend and an unconfigured local backend sharing the database could explain this: the old native-enabled worker claimed both transports and permanently failed browser rows when its web transport was unavailable. The records establish the failures, not which backend instance produced them.

The existing `DELIVERED` status represents successful provider handling, not proof that a person saw a notification. Expo receipts likewise confirm FCM/APNs handoff, not handset display: [Expo delivery guidance](https://docs.expo.dev/push-notifications/sending-notifications/).

No live test messages were sent and no production data was changed during the audit.

## Requested notification timing

- One meal reminder is targeted for five minutes before its scheduled time, while the meal is unposted.
- One overdue notification is queued at the scheduled time if the meal remains unposted. Repeated scheduler runs do not create another notification for the same item.
- Both queued notices are checked again before delivery. Posting, completing, removing or rescheduling the item cancels obsolete notices.
- The same timing applies to assigned daily habits, using their completion state.
- A delayed scheduler can recover a missed pre-reminder while the item is still upcoming, rather than losing it after a narrow 60-second window. Overdue notices expire 30 minutes after the due time; old missed meals do not produce a next-day burst.
- Manual nudges retain their separate shared 30-minute cooldown. New nudge deliveries also expire after 30 minutes rather than waiting up to a day on an offline device.

## Delay fixes

- Reminder generation, push sending and receipt/maintenance work use separate bounded schedulers. A long push request no longer occupies the only thread available to generate scheduled reminders. Spring Boot's default scheduler is single-threaded: [Spring scheduling documentation](https://docs.spring.io/spring-boot/3.4/reference/features/task-execution-and-scheduling.html).
- Expo and browser sending run independently. Expo retains batches of up to 25; browser batches are bounded to five so one slow browser endpoint cannot monopolize a 25-request transaction.
- Each sender claims only its own transport with `FOR UPDATE SKIP LOCKED`. Only delivery rows are locked; related accounts and devices are fetched afterward without write locks. This avoids introducing a lock inversion with member updates.
- An instance without working browser credentials leaves browser deliveries untouched for a configured instance.
- Notification preferences are fetched once per batch, replacing repeated per-device preference/sound lookups.
- PWA registration and delivery no longer depend on the native `PUSH_ENABLED` flag. They use `WEB_PUSH_ENABLED`, valid web credentials and enabled scheduling.
- Browser push explicitly uses high urgency. Android push already used high priority. Provider/device restrictions can still delay physical arrival: [Web Push urgency standard](https://www.rfc-editor.org/rfc/rfc8030.html).

Migration V21 adds nullable `queued_at`, `last_attempt_at` and `accepted_at` timestamps. New delivery records will distinguish generation delays, queue delays and provider acceptance; historical rows remain null rather than receiving invented timestamps. Batch logs include provider, count and scheduled lag, without user names, tokens, endpoints or notification contents.

## Checks

Validation passed after the weekly adherence follow-up: 139 backend tests and packaging, 181 frontend tests, frontend lint and production PWA verification. Android/iOS/web exports passed for the preceding refresh changes; the subsequent frontend change only updates the adherence heading. Notification destination coverage confirms member overdue notices open the timeline and admin overdue notices open admin alerts. Weekly tests cover partial/capped water, due versus future items, weighted seven-day totals, saved historical goals, removed/duplicate habits, local midnight and legacy history flags. Admin read-query counts remain constant from 1 to 30 members (members 18/18, workspace 32/32), with no GET writes.

Backend regression coverage includes the five-minute boundary, exact due time, duplicate suppression, posting before/after the deadline, habit completion, delayed scheduler recovery, stale notice expiry, separate transports, missing credentials, browser-only configuration, high urgency and scheduler isolation. The tests use H2 and mocked transports, not production recipients.

Frontend checks cover top-banner success/error/timeout messages, automatic dismissal, confirmation callbacks, account switching, native camera feedback and preserving the existing meal/photo behavior. Real phone arrival times still require checking devices after an explicitly approved deployment; server receipts cannot establish that timing by themselves.

## Leaderboard follow-up

Leaderboard reads now bypass the five-minute API response cache and carry HTTP `no-store`. Successful meal/habit completions retain their immediate refresh; profile photo/name saves now trigger it too. The initial five-second polling implementation has been replaced by authenticated server-sent change signals. Focused visible pages fetch after successful writes, on focus/resume, or on an explicit pull. Older reads cannot overwrite a newer refresh.

Rows now include versioned photo URLs from the existing batch profile lookup. Both admin and member leaderboards render authenticated photos with an initials fallback. The dedicated photo endpoint allows signed-in active accounts to see active leaderboard members' photos without granting access to admin endpoints or private profile information. Regression tests cover immediate scoring after actual meal/habit submissions, photo authorization, cache bypass, stale read ordering, foreground/background refresh and both photo views.

## Event-based refresh and pull gesture

- A shared authenticated SSE connection carries only revision numbers, with no member details or credentials in URLs. Server changes are coalesced for 250ms. Account data still comes from authorized page endpoints.
- The stream is bounded to 512 clients and five per account, rotates after five minutes, and removes disconnected clients. One worker sends change signals and 20-second connection heartbeats. Heartbeats do not trigger data reads. The client reconnects with backoff and compares revisions so reconnecting an unchanged stream does not fetch data again. Backgrounding/sign-out closes the connection.
- Current signal distribution is in-process, suitable for a single backend instance. Multiple replicas or writes through another backend require a shared event relay before claiming cross-instance delivery.
- Relevant successful REST writes signal after controller/service transactions finish. Scheduled notification creation signals after transaction commit. Failed writes, analysis, GETs and presence do not invalidate page data.
- Removed periodic page/nudge/status GETs. The existing presence heartbeat remains for online status; it no longer polls notifications. Notification badge reads use changes/focus instead.
- The 30-minute shared nudge lock, club hydration cooldown, and local visual countdowns are preserved. Removing network polling does not shorten or reset the cooldown.
- PWA pulls can start on tappable cards; dragging suppresses the card click. Horizontal gestures, mid-page scrolling, text inputs and cancelled gestures do not refresh. The gesture captures its move before nested handlers consume it.
- An explicit pull during a running page read waits and fetches fresh data afterward. A live change during a read queues one follow-up read instead of being lost.
- Regression tests cover native Android user/admin RefreshControl callbacks and PWA touch gestures. A real-HTTP H2 integration test connects two authenticated clients and verifies both receive a committed change. No phone was connected for a physical gesture check.

Implementation references: [Spring MVC streaming and disconnects](https://docs.spring.io/spring-framework/reference/6.2/web/webmvc/mvc-ann-async.html), [React Native networking](https://reactnative.dev/docs/network). The installed React Native XMLHttpRequest implementation also confirms incremental text events are enabled when progress listeners are attached.

## Weekly adherence update

Weekly adherence now includes planned meals, assigned healthy habits and daily water goals across the current local date and preceding six dates. Each meal/habit earns one point; water earns up to one point per day as intake divided by that day's goal. Extra water cannot offset missed meals or habits. The weekly percentage uses total earned points divided by total eligible targets, rounded once to a whole percentage. It does not average rounded daily bars.

Today's meal/habit targets become eligible when due or completed early. Untouched water becomes due at the configured hydration deadline (20:00 by default); logged water starts contributing proportional credit earlier. Past tracked days include all their targets. No water penalties are invented before a known active/tracked day. Exercise sessions and outside-food posts are excluded from this metric. Admin member rows, the seven-day chart and the club's average adherence use the updated scores; meal-specific report rates remain meal-only.

Migration V22 stores daily water goals and habit targets/completed evidence. Approval, plan edits, habit completion, first water logging and the existing reminder scheduler capture the current day under the member lock. Past snapshots survive later goal/plan edits. Completed habits removed today remain evidence for today; uncompleted removed habits stop counting for today, and neither recurs tomorrow. Historical meal links are detached before removing a template so daily evidence remains intact. Admin GETs stay read-only; weekly report inputs use five fixed-count batch queries with no per-member query growth.

Earlier historical habit assignments/water goals were not fully archived. For a past day without a snapshot, the service uses saved meals/completions/intake and the current plan/goal where needed; `adherenceEstimatedHistory` flags that limitation. It cannot reconstruct deleted historical assignments or former water goals with certainty. Daily snapshots provide exact retained targets going forward.

At the user's request, no calculation explanation or historical-target note is added to the graph. It shows the percentage and chart only.

## Release review

The credential-pattern scan found no matches in the 77 added/modified source and documentation files. Local backend properties, frontend environment files, Firebase configuration and work logs remain ignored and excluded from the commit.

The release-time npm audit still reports five high-severity dependency findings affecting `expo`, `@expo/cli`, `@expo/code-signing-certificates`, `node-forge` and `zod`, with no critical findings. These existing dependency-chain advisories remain unresolved; passing regression tests is not a claim that all security issues have been eliminated.
