-- Add role enum type
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Add role and email_verified_at columns to app_user table
ALTER TABLE app_user
    ADD COLUMN role user_role NOT NULL DEFAULT 'user',
    ADD COLUMN email_verified_at timestamptz;

-- Create index on role for faster queries
CREATE INDEX idx_app_user_role ON app_user(role);

-- Create audit_log table for tracking admin actions
CREATE TABLE audit_log (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    action text NOT NULL,
    subject_type text NOT NULL,
    subject_id uuid,
    meta jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for audit_log queries
CREATE INDEX idx_audit_log_actor ON audit_log(actor_user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_subject ON audit_log(subject_type, subject_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- Add comments for documentation
COMMENT ON TABLE audit_log IS 'Tracks all administrative actions for accountability and debugging';
COMMENT ON COLUMN audit_log.actor_user_id IS 'The user who performed the action';
COMMENT ON COLUMN audit_log.action IS 'Action performed (e.g., user.delete, poll.close, user.role_change)';
COMMENT ON COLUMN audit_log.subject_type IS 'Type of resource affected (e.g., user, poll)';
COMMENT ON COLUMN audit_log.subject_id IS 'ID of the resource affected';
COMMENT ON COLUMN audit_log.meta IS 'Additional context data (JSON)';
