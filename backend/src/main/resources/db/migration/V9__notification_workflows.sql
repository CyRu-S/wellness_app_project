ALTER TABLE notification_preferences ADD COLUMN signup_alerts BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN deadline_alerts BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN daily_digest BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notification_preferences ADD COLUMN member_updates BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN account_updates BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE notification_events ADD COLUMN kind VARCHAR(16);
