DROP INDEX IF EXISTS votes_option_id_idx;
DROP INDEX IF EXISTS votes_user_created_idx;
DROP INDEX IF EXISTS votes_poll_created_idx;

ALTER TABLE vote
  DROP CONSTRAINT IF EXISTS votes_unique_poll_user;


DROP TABLE vote;
