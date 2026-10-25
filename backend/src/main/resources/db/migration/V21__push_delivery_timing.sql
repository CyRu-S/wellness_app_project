-- Historical records do not contain exact transport timestamps. Leave them null.
ALTER TABLE push_deliveries ADD COLUMN queued_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE push_deliveries ADD COLUMN last_attempt_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE push_deliveries ADD COLUMN accepted_at TIMESTAMP WITH TIME ZONE;
