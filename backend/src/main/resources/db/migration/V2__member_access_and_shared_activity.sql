ALTER TABLE user_profiles ADD COLUMN waist_cm DOUBLE PRECISION;
ALTER TABLE user_profiles ADD COLUMN body_fat_percent DOUBLE PRECISION;
ALTER TABLE user_profiles ADD COLUMN last_body_metrics_updated_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE member_access_grants (
  id BIGSERIAL PRIMARY KEY,
  viewer_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_member_access_viewer_subject UNIQUE (viewer_user_id, subject_user_id),
  CONSTRAINT ck_member_access_not_self CHECK (viewer_user_id <> subject_user_id)
);

CREATE INDEX idx_member_access_viewer ON member_access_grants(viewer_user_id);
CREATE INDEX idx_member_access_subject ON member_access_grants(subject_user_id);

CREATE TABLE meal_posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  planned_meal_id BIGINT REFERENCES meals(id) ON DELETE SET NULL,
  meal_type VARCHAR(40) NOT NULL,
  meal_name VARCHAR(160) NOT NULL,
  calories INTEGER NOT NULL CHECK (calories >= 0),
  protein_grams INTEGER NOT NULL CHECK (protein_grams >= 0),
  carbs_grams INTEGER NOT NULL CHECK (carbs_grams >= 0),
  fat_grams INTEGER NOT NULL CHECK (fat_grams >= 0),
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  media_key VARCHAR(255) NOT NULL UNIQUE,
  media_original_name VARCHAR(255),
  media_content_type VARCHAR(80) NOT NULL,
  media_size BIGINT NOT NULL CHECK (media_size > 0),
  client_request_id VARCHAR(100) NOT NULL,
  CONSTRAINT uq_meal_post_planned_meal UNIQUE (planned_meal_id),
  CONSTRAINT uq_meal_post_user_request UNIQUE (user_id, client_request_id)
);

CREATE INDEX idx_meal_posts_user_posted ON meal_posts(user_id, posted_at DESC);
