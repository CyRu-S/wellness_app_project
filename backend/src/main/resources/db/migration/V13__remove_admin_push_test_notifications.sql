-- Only the in-app "Send test notification" rows are disposable. Keep genuine
-- deadline, signup, check-in, and nudge history untouched.
DELETE FROM notification_events
WHERE id IN (
  SELECT n.id FROM notification_events n
  JOIN users u ON u.id = n.user_id
  WHERE u.role = 'ADMIN' AND n.kind = 'TEST' AND n.source_key LIKE 'push-test-%'
);
