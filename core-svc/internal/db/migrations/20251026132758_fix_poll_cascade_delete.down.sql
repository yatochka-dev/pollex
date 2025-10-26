-- Rollback: Remove cascade delete from poll_option foreign key
-- This reverts the constraint to its original state without ON DELETE CASCADE

-- Drop the CASCADE constraint
ALTER TABLE poll_option
    DROP CONSTRAINT IF EXISTS poll_option_poll_id_fkey;

-- Re-add the constraint without CASCADE (original behavior)
ALTER TABLE poll_option
    ADD CONSTRAINT poll_option_poll_id_fkey
    FOREIGN KEY (poll_id)
    REFERENCES poll(id);
