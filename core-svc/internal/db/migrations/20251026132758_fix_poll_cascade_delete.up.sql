-- Fix poll_option foreign key to cascade on delete
-- This allows poll deletion to automatically delete associated options

-- Drop the existing foreign key constraint
ALTER TABLE poll_option
    DROP CONSTRAINT IF EXISTS poll_option_poll_id_fkey;

-- Re-add the constraint with ON DELETE CASCADE
ALTER TABLE poll_option
    ADD CONSTRAINT poll_option_poll_id_fkey
    FOREIGN KEY (poll_id)
    REFERENCES poll(id)
    ON DELETE CASCADE;
