-- Create email verification tokens table
CREATE TABLE email_verify_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for email verification tokens
CREATE INDEX idx_email_verify_tokens_user_id ON email_verify_tokens(user_id);
CREATE INDEX idx_email_verify_tokens_token_hash ON email_verify_tokens(token_hash);
CREATE INDEX idx_email_verify_tokens_expires_at ON email_verify_tokens(expires_at);

-- Create password reset tokens table
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for password reset tokens
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Add comments for documentation
COMMENT ON TABLE email_verify_tokens IS 'Stores one-time tokens for email verification';
COMMENT ON COLUMN email_verify_tokens.token_hash IS 'SHA-256 hash of the verification token';
COMMENT ON COLUMN email_verify_tokens.expires_at IS 'Token expiration time (24 hours from creation)';
COMMENT ON COLUMN email_verify_tokens.used_at IS 'Timestamp when token was used (null if unused)';

COMMENT ON TABLE password_reset_tokens IS 'Stores one-time tokens for password reset';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of the reset token';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (24 hours from creation)';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when token was used (null if unused)';
