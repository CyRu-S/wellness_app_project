-- Global admin summaries filter by date before grouping by member.
CREATE INDEX IF NOT EXISTS idx_meals_date_user ON meals(meal_date, user_id);
CREATE INDEX IF NOT EXISTS idx_water_logged_user ON water_logs(logged_at, user_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_plan_sort ON plan_items(plan_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_push_expiry ON push_deliveries(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_otp_expiry ON password_reset_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_otp_expiry ON email_verification_otps(expires_at);
