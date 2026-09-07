ALTER TABLE user_profiles ADD COLUMN age INTEGER CHECK (age BETWEEN 1 AND 120);
ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE plan_items ADD COLUMN meal_type VARCHAR(30);
ALTER TABLE plan_items ADD COLUMN calories INTEGER NOT NULL DEFAULT 0 CHECK (calories >= 0);
ALTER TABLE plan_items ADD COLUMN protein_grams INTEGER NOT NULL DEFAULT 0 CHECK (protein_grams >= 0);
ALTER TABLE plan_items ADD COLUMN ingredients TEXT;
ALTER TABLE meals ADD COLUMN plan_item_id BIGINT REFERENCES plan_items(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX uq_meals_template_day ON meals(user_id, plan_item_id, meal_date);
CREATE TABLE media_objects (
  media_key VARCHAR(255) PRIMARY KEY,
  content BYTEA NOT NULL
);
CREATE INDEX idx_meal_posts_posted ON meal_posts(posted_at);
CREATE INDEX idx_users_role_status ON users(role, status);
ALTER TABLE notification_events ADD COLUMN source_key VARCHAR(100) UNIQUE;
ALTER TABLE missed_events ADD COLUMN source_key VARCHAR(100) UNIQUE;
