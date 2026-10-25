ALTER TABLE users ADD COLUMN last_nudged_at TIMESTAMP WITH TIME ZONE;

-- Preserve active cooldowns during deployment. Clearing an inbox must not reset them.
UPDATE users SET last_nudged_at = (
    SELECT MAX(event.scheduled_at) FROM notification_events event
    WHERE event.user_id = users.id AND event.source_key LIKE 'member-nudge-%'
);
