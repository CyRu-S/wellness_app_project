# API contract

Base URL: `http://localhost:8080/api`. Protected endpoints require `Authorization: Bearer <token>`. Only ACTIVE accounts can use protected APIs; admin routes require ADMIN.

## Authentication

- `POST /auth/register`: JSON registration, or multipart `profile` JSON text plus optional `image`. Returns 201 with status PENDING and no token.
- `POST /auth/login`: email/password; pending or suspended account receives 403.
- `POST /auth/google`: verifies a Google ID token. New users receive `PROFILE_REQUIRED`; existing approved users receive a JWT.
- `POST /auth/google/register`: verified Google ID token plus profile details, with optional multipart `image`. Creates the pending member after first-time profile completion.
- `POST /auth/forgot-password`: accepts an email and sends a reset OTP when the account exists; the response does not reveal account existence.
- `POST /auth/reset-password`: accepts email, six-digit OTP, and a new password; consumes the OTP and revokes older JWTs.

## Member data

- `GET /profile`, `PATCH /profile`, `PATCH /profile/body-metrics`
- `GET /profile/photo`, `PUT /profile/photo`
- `GET /dashboard`, `GET /plans/today`, `GET /meals/today`
- `POST /meals/analyze`: multipart image, optional configured analysis service
- `GET /meal-posts`, `POST /meal-posts`: multipart metadata JSON text and image
- `GET /meal-posts/{id}/image`: owner/admin/granted viewer only
- `POST /water`: amountMl
- `GET /activities`, `POST /activities`: activity, durationSeconds, optional distanceKm
- `GET /notifications`
- `GET /notifications/preferences` and `PUT /notifications/preferences` — account meal-reminder/coach-nudge preferences
- `PUT /notifications/devices` and `POST /notifications/devices/unregister` — Android push registration, authenticated owner/session scoped
- `POST /notifications/test` — queue a self-test (one per minute); active members only

Push request shapes, credential setup, and delivery semantics are documented in [Android push notifications](../android-push-notifications.md).
- `GET /shared-members`, `GET /shared-members/{memberId}/today`

## Admin workspace

- `GET /admin/workspace`: summary, pending approvals, member rows and adherence series, plans, attention, meal insights
- `PATCH /admin/users/{id}/approval`: decision APPROVE or DECLINE
- `GET /admin/users/{id}/journal`: profile, today's shared snapshot and recent history
- `GET /admin/users/{id}/profile-photo`
- `PATCH /admin/users/{id}/water-goal`: waterGoalMl
- `GET /admin/plans/members/{memberId}`, `PUT /admin/plans/members/{memberId}`: recurring planName and items (type/name/time/calories/protein/ingredients)
- `GET /admin/member-access`, `PUT /admin/member-access/{viewerId}`: memberIds
- `POST /admin/attention/{id}/nudge`, `PATCH /admin/attention/{id}/resolve`

The generated OpenAPI UI at `http://localhost:8080/swagger-ui.html` is authoritative for validation fields and additional catalog/report endpoints. All dates follow the configured application timezone; timestamps use ISO-8601.
