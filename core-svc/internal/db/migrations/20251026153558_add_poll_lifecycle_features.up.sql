-- Add expiration timestamp to polls
ALTER TABLE poll ADD COLUMN expires_at TIMESTAMPTZ;

-- Add vote count cache to poll_option for performance
ALTER TABLE poll_option ADD COLUMN vote_count INTEGER NOT NULL DEFAULT 0;

-- Create index for expiration queries
CREATE INDEX idx_poll_expires_at ON poll(expires_at) WHERE expires_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN poll.expires_at IS 'Optional expiration time for the poll (null means no expiration)';
COMMENT ON COLUMN poll_option.vote_count IS 'Cached count of votes for this option (updated on vote)';
