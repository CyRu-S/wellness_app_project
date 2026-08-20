# Arjun Nutrition

Arjun Nutrition is a React Native + Spring Boot wellness app for daily nutrition, movement, hydration and plan adherence. The repository contains a polished Expo mobile client, a JWT-secured REST API, PostgreSQL/Flyway persistence and separate user/admin experiences.

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

For Android emulators, the default API URL is `http://10.0.2.2:8080/api`. For a physical phone set `EXPO_PUBLIC_API_URL` to your computer's LAN address before starting Expo.

To enable live meal-photo analysis, configure the API and mobile endpoint before starting both services:

```powershell
$env:GEMINI_API_KEY='your-key'
$env:EXPO_PUBLIC_MEAL_ANALYSIS_URL='http://YOUR_LAN_IP:8080/api/meals/analyze'
```

Without these values, camera capture still works and the result screen clearly identifies nutrition values as a demo estimate.

Demo accounts (both use `password`):

- Member: `user@wellnest.app`
- Admin: `admin@wellnest.app`

The current client uses seeded local preview state so every screen is immediately explorable. API modules in `frontend/src/services/api` already match the backend contract and are the handoff point for the next integration milestone.

## Project layout

- `frontend/` — Expo React Native app
- `backend/` — Spring Boot API
- `docs/` — API, schema and workflow notes
- `docker-compose.yml` — local PostgreSQL
