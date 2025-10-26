-- Drop audit_log table and related indexes
DROP TABLE IF EXISTS audit_log;

-- Remove role and email_verified_at columns from app_user
ALTER TABLE app_user
    DROP COLUMN IF EXISTS role,
    DROP COLUMN IF EXISTS email_verified_at;

-- Drop the user_role enum type
DROP TYPE IF EXISTS user_role;
