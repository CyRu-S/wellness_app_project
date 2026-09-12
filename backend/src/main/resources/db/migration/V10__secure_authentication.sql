ALTER TABLE users ADD COLUMN google_subject VARCHAR(255);
ALTER TABLE users ADD COLUMN token_version BIGINT NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX uk_users_google_subject ON users(google_subject);

CREATE TABLE password_reset_otps (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash VARCHAR(255) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_otps_user_created
  ON password_reset_otps(user_id, created_at DESC);
