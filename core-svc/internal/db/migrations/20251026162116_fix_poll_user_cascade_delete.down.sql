-- Drop the CASCADE constraint
ALTER TABLE poll DROP CONSTRAINT IF EXISTS poll_user_id_fkey;

-- Re-add the original constraint without CASCADE
ALTER TABLE poll
    ADD CONSTRAINT poll_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES app_user(id);
