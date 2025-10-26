-- Remove vote count cache from poll_option
ALTER TABLE poll_option DROP COLUMN IF EXISTS vote_count;

-- Remove expiration timestamp from polls
ALTER TABLE poll DROP COLUMN IF EXISTS expires_at;
