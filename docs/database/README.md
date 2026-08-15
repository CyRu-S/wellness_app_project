# Database

PostgreSQL is the source of truth. Flyway owns schema changes; add future changes as incremental migrations in `backend/src/main/resources/db/migration` and do not edit an applied migration.

The initial migration creates users, profiles, plans, meal schedules, products, hydration/activity logs, notifications and missed-event tracking. Demo data is inserted safely on the first application start.

