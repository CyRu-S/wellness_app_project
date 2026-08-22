# Arjun Nutrition

Arjun Nutrition is a React Native and Spring Boot wellness app for daily nutrition, movement, hydration, plan adherence, and admin-managed member sharing. The repository contains an Expo mobile client, a JWT-secured REST API, PostgreSQL/Flyway persistence, and separate user/admin experiences.

## Run locally

Prerequisites: Node.js 20+, Java 21, Maven 3.9+ and Docker.

Start PostgreSQL and the API:

```powershell
docker compose up -d
cd backend
mvn spring-boot:run
```

In another terminal, start the app:

```powershell
cd frontend
npm install
npm start
```

For Android emulators, the default API URL is `http://10.0.2.2:8080/api`. For a physical phone, set `EXPO_PUBLIC_API_URL` to your computer's LAN address before starting Expo:

```powershell
$env:EXPO_PUBLIC_API_URL='http://192.168.1.10:8080/api'
npm start -- --clear
```

The phone and computer must be on the same network, and the backend port must be reachable through the computer's firewall.

To enable live meal-photo analysis, configure the API and mobile endpoint before starting both services:

```powershell
$env:GEMINI_API_KEY='your-key'
$env:EXPO_PUBLIC_MEAL_ANALYSIS_URL='http://YOUR_LAN_IP:8080/api/meals/analyze'
```

Without these values, camera capture still works and the result screen clearly identifies nutrition values as a demo estimate.

Demo accounts (both use `password`):

- Member: `user@wellnest.app`
- Admin: `admin@wellnest.app`

By default those two accounts use instant, test-only local data. Access assignments made by the demo admin persist on the device and appear in the demo member's Shared tab.

To test the real backend permissions with the same credentials, start the seeded backend and set:

```powershell
$env:EXPO_PUBLIC_USE_API_DEMO_ACCOUNTS='true'
$env:EXPO_PUBLIC_API_URL='http://192.168.1.10:8080/api'
npm start -- --clear
```

Set `EXPO_PUBLIC_DISABLE_DEMO_FALLBACK=true` for a production-style client build. Production authorization is always enforced by the backend; demo access is only a local UI test mode.

For an end-to-end photo permission check, sign in once as `kavya.menon@example.com` with `password` and post a meal. Then sign in as the admin, grant Aarav access to Kavya, and return to `user@wellnest.app`; Kavya's post will be available from Shared.

Backend configuration:

- `DEMO_SEED_ENABLED` enables the five test members (defaults to `true` for local development).
- `APP_TIME_ZONE` controls today's data boundary (defaults to `Asia/Kolkata`).
- `MEDIA_DIRECTORY` controls protected meal-photo storage (defaults to `./data/media`).
- Meal photos are limited to JPEG, PNG, or WebP and 10 MB.

## Project layout

- `frontend/` - Expo React Native app
- `backend/` - Spring Boot API
- `docs/` - API, schema and workflow notes
- `docker-compose.yml` - local PostgreSQL
