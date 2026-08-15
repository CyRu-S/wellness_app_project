CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('USER', 'ADMIN')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE user_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  goal VARCHAR(500),
  date_of_birth DATE,
  height_cm INTEGER,
  weight_kg DOUBLE PRECISION,
  dietary_preferences VARCHAR(500)
);

CREATE TABLE plans (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  goal VARCHAR(500) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE plan_items (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(160) NOT NULL,
  detail VARCHAR(500) NOT NULL,
  scheduled_time TIME,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE meals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  name VARCHAR(160) NOT NULL,
  meal_date DATE NOT NULL,
  meal_time TIME NOT NULL,
  calories INTEGER NOT NULL,
  protein_grams INTEGER NOT NULL,
  consumed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE meal_items (
  id BIGSERIAL PRIMARY KEY,
  meal_id BIGINT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  quantity VARCHAR(80) NOT NULL
);

CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE water_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE activity_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity VARCHAR(80) NOT NULL,
  duration_seconds INTEGER NOT NULL,
  distance_km DOUBLE PRECISION,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE notification_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  body VARCHAR(500) NOT NULL,
  read_flag BOOLEAN NOT NULL DEFAULT FALSE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE missed_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(40) NOT NULL,
  item_title VARCHAR(160) NOT NULL,
  missed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_plans_user_active ON plans(user_id, active);
CREATE INDEX idx_meals_user_date ON meals(user_id, meal_date);
CREATE INDEX idx_activity_user_started ON activity_sessions(user_id, started_at);
CREATE INDEX idx_water_user_logged ON water_logs(user_id, logged_at);
CREATE INDEX idx_notifications_user_scheduled ON notification_events(user_id, scheduled_at DESC);
CREATE INDEX idx_missed_unresolved ON missed_events(resolved, missed_at DESC);
