ALTER TABLE users ADD COLUMN follow_up_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE health_profile_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  height_cm INTEGER,
  weight_kg DOUBLE PRECISION,
  age INTEGER,
  body_fat_percent DOUBLE PRECISION,
  dietary_preferences VARCHAR(500),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_health_profile_history_user_recorded
  ON health_profile_history(user_id, recorded_at DESC);

CREATE TABLE plan_item_completions (
  id BIGSERIAL PRIMARY KEY,
  plan_item_id BIGINT NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT uq_plan_item_completion_day UNIQUE (plan_item_id, user_id, completed_date)
);
CREATE INDEX idx_plan_item_completions_user_date
  ON plan_item_completions(user_id, completed_date);
