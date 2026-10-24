ALTER TABLE notification_preferences
  ADD COLUMN notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;
