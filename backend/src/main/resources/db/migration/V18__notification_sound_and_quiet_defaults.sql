ALTER TABLE notification_preferences
  ADD COLUMN custom_sound BOOLEAN NOT NULL DEFAULT TRUE;

-- Routine member check-ins stay in the inbox but do not push by default.
ALTER TABLE notification_preferences
  ALTER COLUMN member_updates SET DEFAULT FALSE;

-- The removed test control must not leave disposable test alerts behind.
DELETE FROM notification_events
WHERE kind = 'TEST' AND source_key LIKE 'push-test-%';
