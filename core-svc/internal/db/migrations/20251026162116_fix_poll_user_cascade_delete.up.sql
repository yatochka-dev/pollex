-- Drop the existing foreign key constraint
ALTER TABLE poll DROP CONSTRAINT IF EXISTS poll_user_id_fkey;

-- Re-add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE poll
    ADD CONSTRAINT poll_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES app_user(id)
    ON DELETE CASCADE;
