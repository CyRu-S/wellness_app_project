ALTER TABLE user_profiles
  ADD COLUMN photo_media_key VARCHAR(255);

ALTER TABLE user_profiles
  ADD COLUMN photo_original_name VARCHAR(255);

ALTER TABLE user_profiles
  ADD COLUMN photo_content_type VARCHAR(80);

ALTER TABLE user_profiles
  ADD COLUMN photo_size BIGINT;

ALTER TABLE user_profiles
  ADD CONSTRAINT uq_user_profiles_photo_media_key UNIQUE (photo_media_key);
