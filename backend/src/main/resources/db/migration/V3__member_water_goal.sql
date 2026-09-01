ALTER TABLE user_profiles
  ADD COLUMN water_goal_ml INTEGER NOT NULL DEFAULT 2000;

ALTER TABLE user_profiles
  ADD CONSTRAINT ck_user_profiles_water_goal
  CHECK (water_goal_ml BETWEEN 500 AND 6000 AND MOD(water_goal_ml, 250) = 0);
