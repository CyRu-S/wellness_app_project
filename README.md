# Mr_Care

Expo SDK 57 (React Native 0.86.3 / React 19.2.3) client with a Spring Boot API and Supabase PostgreSQL persistence.

## Run locally

Prerequisites: Node.js 22.13+, Java 21 or later, and Maven 3.9+.

The configured Supabase connection is in the Git-ignored `backend/application-local.properties`. Do not commit this file, database backups, passwords, or API keys. A fresh checkout needs these settings supplied privately:

```properties
spring.datasource.url=jdbc:postgresql://YOUR_SESSION_POOLER:5432/postgres?sslmode=require
spring.datasource.username=YOUR_DATABASE_USER
spring.datasource.password=YOUR_DATABASE_PASSWORD
app.jwt.secret=YOUR_BASE64_ENCODED_RANDOM_SECRET
```

Alternatively set `DB_URL`, `DB_USER`, `DB_PASSWORD`, and `JWT_SECRET` in the backend environment when no local override file is present. Use a strong unique JWT secret before deployment. Docker/PostgreSQL is optional for isolated local development; it is not needed for the configured Supabase database.

Start the API:

```powershell
cd backend
mvn spring-boot:run
```

DevTools is included as an optional runtime dependency and excluded from the packaged production jar. Restart an already-running backend once after installing dependencies. VS Code Java auto-build is enabled in this workspace; accept the Java extension's Maven reload prompt. DevTools watches compiled classes, not source edits alone. If needed, run `mvn compile` from another backend terminal while `mvn spring-boot:run` is active.

Start the client in another terminal:

```powershell
cd frontend
npm install
npx expo start --go --clear
```

Use an SDK 57-compatible Expo Go client from [expo.dev/go](https://expo.dev/go). Stop any SDK 54 Metro server before starting the upgraded project. The migration follows [Expo's SDK upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/). Native photo uploads use Expo File objects for compatibility with the new fetch implementation.

Web defaults to `http://localhost:8080/api`; Android emulators use `http://10.0.2.2:8080/api`. Use `EXPO_PUBLIC_WEB_API_URL` and `EXPO_PUBLIC_MOBILE_API_URL` when web and a physical phone need different addresses; the mobile value must use the computer's LAN address (see `frontend/.env.example`). `EXPO_PUBLIC_API_URL` remains the shared fallback. Both devices must be on the same network and port 8080 must be reachable. Restart Expo after changing environment settings.

## Persisted workflows

- Registration, including Google registration, creates a pending member. Admin approval is required before member sign-in/access.
- Existing admin credentials are preserved. Startup creates only the admin if absent; it never resets records or creates sample members.
- New members start with no plan, meal logs, activity, sharing grants, or reminders. Consumed hydration and nutrition start at zero.
- Admins assign recurring meal schedules, calories/protein/ingredients, water targets, and shared access. Today's slots are generated from that schedule.
- Meal photos, profile images, water logs, and timer sessions are stored in PostgreSQL. Image access requires the owner's, authorized viewer's, or admin's JWT.
- Admin journals show posted food photos followed by movement. Adherence and meal-rhythm graphs use saved records, with explicit empty states.
- Water, meal logs, activity sessions, and profile edits update locally while saving, with rollback/retry feedback on failure. Permission changes still require server confirmation.
- Foreground activity data refreshes approximately every 10 seconds; profile/access/plan metadata refreshes every 30 seconds. Duplicate in-flight reads are shared and hidden detail screens stop polling. This is polling, not a push/WebSocket service.
- Reminders and attention entries come from actual assigned schedules, not demo data.
- Meal-photo journal retention is 21 days. Retention removes old posts/photos; consumed meal records remain for adherence reporting. Profile photos do not expire.

## Optional integrations

Meal-image analysis needs backend `GEMINI_API_KEY` and a supported `GEMINI_MODEL`. Without configuration, the client allows manual nutrition entry; it does not invent image-analysis results.

Google sign-in needs backend `GOOGLE_CLIENT_IDS` plus the matching client settings `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. Gmail password recovery needs `SMTP_USERNAME`, `SMTP_APP_PASSWORD`, `SMTP_FROM`, and `SMTP_ENABLED=true`. Follow [the authentication setup guide](docs/authentication-setup.md) for credential placement and the end-to-end checklist.

## Verification

```powershell
cd backend
mvn test
mvn -DskipTests package
cd ../frontend
npm run lint
npm test
npx expo-doctor
npx expo export --platform all --output-dir dist
```

Backend tests use isolated H2 databases and test-only fixtures, never the Supabase database.

`backend/scripts/smoke_test.py` checks a running API and creates uniquely named Integration Check accounts. It requires `WELLNESS_ADMIN_PASSWORD` and accepts `WELLNESS_ADMIN_EMAIL` plus `WELLNESS_API_URL` (default localhost:8080/api). With PostgreSQL environment variables configured, `database_admin.py inspect` reports table/account counts. `database_admin.py cleanup-verification` backs up application tables and removes only those explicitly marked test accounts, verifying other accounts and their records are unchanged. Backups are private and Git-ignored. Do not run `reset-members` against a database whose member data must be retained.

See [database notes](docs/database/README.md), [API contracts](docs/api-contracts/README.md), and [workflows](docs/workflows/README.md). OpenAPI is available at `http://localhost:8080/swagger-ui.html`.

For a production Railway backend, EAS Android App Bundle, and Google Play release, follow the [deployment guide](docs/deployment.md).

See the [phone frontend audit](docs/frontend-mobile-audit.md) for the SDK migration fixes, verification, remaining limitations, and physical-device checklist.

Android push notifications are implemented but disabled until Expo/Firebase credentials are configured. Follow the [Android push setup guide](docs/android-push-notifications.md) to build the Android development app, enable backend delivery, and test reminders and coach nudges. Expo Go continues to support the in-app reminder list, not remote push delivery.

## Contributors

- [Arpan Dutta (@CyRu-S)](https://github.com/CyRu-S)
- [A.V.S Swathi Sree (@sreeswathi418-ops)](https://github.com/sreeswathi418-ops)
