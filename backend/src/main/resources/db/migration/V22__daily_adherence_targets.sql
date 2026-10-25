CREATE TABLE daily_adherence_targets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    water_goal_ml INTEGER NOT NULL,
    habit_targets TEXT NOT NULL,
    CONSTRAINT uq_daily_adherence_user_date UNIQUE (user_id, target_date)
);
