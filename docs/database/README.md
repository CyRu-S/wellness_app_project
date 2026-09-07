# Database

PostgreSQL is the source of truth. Flyway validates and applies migrations at API startup; never edit an applied migration.

## Application tables

| Table | Persisted data |
| --- | --- |
| users | Identity, password hash, ADMIN/USER role, PENDING/ACTIVE/SUSPENDED status, last seen |
| user_profiles | Age, height, weight, optional body fat, goal/preferences, water target, profile photo metadata |
| plans | Per-member recurring plan, dates and active status |
| plan_items | Ordered meal templates, time, type, calories, protein and ingredients |
| meals / meal_items | Date-specific assigned slots, logged status/nutrition and ingredients |
| meal_posts | Member photo logs, nutrition, timestamp, planned slot and idempotency key |
| media_objects | Protected image bytes, addressed by a generated media key |
| water_logs | Member hydration amount and time |
| activity_sessions | Movement type, elapsed seconds, optional distance and time |
| member_access_grants | Admin-managed viewer-to-member authorization |
| notification_events | Persisted reminders and coach nudges |
| notification_preferences | Per-user meal reminder and coach nudge opt-outs |
| push_devices | User-owned Expo tokens and revocable registration sessions |
| push_deliveries | Durable per-event/device queue, expiry, retries and Expo receipt status |
| missed_events | Schedule-driven attention entries and resolution |
| products | Product catalog; empty unless populated |

V1–V4 establish the original schema, sharing, photos and profile fields. V5 adds age, recurring template nutrition, daily-meal uniqueness, image bytes and deduplication keys. V6 is a Java Flyway migration enabling PostgreSQL row-level security on all 14 application tables. No anonymous/public policies are granted. The backend uses its private PostgreSQL connection and enforces user permissions itself. H2 skips the PostgreSQL-only RLS step.

The legacy waist column is retained for migration compatibility, but profile APIs and screens use age.

Use the Supabase session pooler on port 5432 with SSL. Credentials belong only in a private environment or ignored local configuration, never the Expo client. Startup seeds only a missing admin; demo data exists solely in test sources.

The application day uses APP_TIME_ZONE (default Asia/Kolkata). Plans create today's unconsumed slots idempotently; replacing a plan preserves already-posted meals. Meal-post/photo retention is 21 days; consumed meal rows remain for history-based adherence.

The maintenance script creates an ignored JSON backup before any reset/verification cleanup. Cleanup checks retained member/account/plan/photo data inside a transaction. Keep backups private: they contain personal data and password hashes.
