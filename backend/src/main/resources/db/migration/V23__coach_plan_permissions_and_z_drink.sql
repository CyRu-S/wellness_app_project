ALTER TABLE users ADD COLUMN can_assign_plans BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE plans ADD COLUMN assigned_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE plans ADD COLUMN z_drink_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE plans ADD COLUMN previous_plan_snapshot TEXT;

CREATE INDEX idx_plans_assigned_by ON plans(assigned_by_user_id);
