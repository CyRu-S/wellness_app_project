# API contract

Base URL: `http://localhost:8080/api`. Protected endpoints require `Authorization: Bearer <token>`. Only ACTIVE accounts can use protected APIs; admin routes require ADMIN.

## Authentication

- `POST /auth/register`: JSON registration, or multipart `profile` JSON text plus optional `image`. Returns 201 with status PENDING and no token; emails a verification code.
- `POST /auth/verify-email`: accepts email and six-digit OTP; verified members then wait for administrator approval.
- `POST /auth/resend-verification`: accepts email; returns a generic response regardless of account existence.
- `POST /auth/login`: email/password; unverified, pending, or suspended account cannot sign in.
- `POST /auth/forgot-password`: accepts an email and sends a reset OTP when the account exists; the response does not reveal account existence.
- `POST /auth/reset-password`: accepts email, six-digit OTP, and a new password; consumes the OTP and revokes older JWTs.

## Member data

- `GET /profile`, `PATCH /profile`, `PATCH /profile/body-metrics`
- `GET /profile/photo`, `PUT /profile/photo`
- `GET /dashboard`, `GET /plans/today`, `GET /meals/today`
- `POST /meals/analyze`: multipart image and category; Gemini photo-based serving estimates and nutrition totals (ESTIMATED_PORTION), requires backend `GEMINI_API_KEY`. Herbalife products bypass AI.
- `GET /meal-posts`, `POST /meal-posts`: multipart metadata JSON text and image. Assigned meals supply their `plannedMealId`. Outside-food posts omit it (or use null) and set `mealType` to `Outside food`; they use the same authenticated `/meals/analyze` Gemini flow with category `Outside food`. Active members may post outside food without an assigned plan. The server timestamps the post and does not create or complete a recurring plan slot. Nutrition contributes to daily totals, but outside posts do not count toward assigned-plan completion. Today's timelines place them by posting time between the planned schedule slots; history retains the photo after the day ends.
- `GET /meal-posts/{id}/image`: owner/admin/granted viewer only
- `POST /water`: amountMl
- `GET /activities`, `POST /activities`: activity, durationSeconds, optional distanceKm
- `GET /notifications`
- `GET /notifications/preferences` and `PUT /notifications/preferences` — account meal-reminder/coach-nudge preferences
- `PUT /notifications/devices` and `POST /notifications/devices/unregister` — Android push registration, authenticated owner/session scoped
- `POST /notifications/test` — queue a self-test (one per minute); active members only

Push request shapes, credential setup, and delivery semantics are documented in [Android push notifications](../android-push-notifications.md).
- `GET /shared-members`, `GET /shared-members/{memberId}/today`
- `GET /shared-members/{memberId}/attention`: the same unresolved attention items, titles, categories, urgency and nudge cooldowns as the admin view, limited to a member assigned to the signed-in coach.
- `POST /shared-members/{memberId}/attention/{attentionId}/nudge`: nudge the selected overdue item using the admin message and one shared 30-minute lock per recipient across all categories, admins, coaches and club hydration reminders. The first sender wins, including simultaneous requests. Returns `sent`, `lastSentAt` and `availableAt`. At expiry, only unfinished items are available again; completed/resolved items cannot be nudged. Resolving alerts remains admin-only. Unassigned/revoked access or an item belonging to another member returns 404.

## Admin workspace

Daily plan reads reconcile cached meals against the current admin plan: unposted orphan/obsolete slots are removed, while already-posted slots remain for that local day only. Removing or reclassifying a plan item does not cause it to recur tomorrow. Healthy habits remain tasks rather than appearing as meal slots. Plan editing and meal posting use the same member lock.

- `GET /admin/workspace`: summary, pending approvals, member rows and adherence series, plans, attention, meal insights
- `GET /admin/members`: lightweight member list if the full workspace report is temporarily unavailable
- `GET /admin/approvals`: lightweight verified pending-approval list for the same fallback
- `PATCH /admin/users/{id}/approval`: decision APPROVE or DECLINE
- `GET /admin/users/{id}/journal`: profile, today's shared snapshot and recent history
- `GET /admin/users/{id}/profile-photo`
- `PATCH /admin/users/{id}/water-goal`: waterGoalMl
- `GET /admin/plans/members/{memberId}`, `PUT /admin/plans/members/{memberId}`: recurring planName and items (type/name/time/calories/protein/ingredients)
- `GET /admin/member-access`, `PUT /admin/member-access/{viewerId}`: memberIds
- `POST /admin/attention/{id}/nudge`, `PATCH /admin/attention/{id}/resolve`

The admin nudge POST returns the same timing result as shared access. Visible nudge screens refresh only their attention data every five seconds while focused and active, with a server-enforced lock on every send. The client displays the server expiry and removes completed items on synchronization.

The generated OpenAPI UI at `http://localhost:8080/swagger-ui.html` is authoritative for validation fields and additional catalog/report endpoints. All dates follow the configured application timezone; timestamps use ISO-8601.
