-- Promote Admin Script
-- This script promotes a user to admin role by their email address.
--
-- Usage:
--   1. Replace 'user@example.com' with the actual email address
--   2. Run this script against your database
--   3. Verify the promotion was successful
--
-- IMPORTANT: Always ensure at least one admin exists in the system!

-- Example: Promote a specific user by email
UPDATE app_user
SET role = 'admin'
WHERE email = 'user@example.com';

-- Verify the promotion
SELECT id, name, email, role, created_at
FROM app_user
WHERE email = 'user@example.com';

-- Optional: List all admins in the system
SELECT id, name, email, role, created_at
FROM app_user
WHERE role = 'admin'
ORDER BY created_at;

-- Optional: Count users by role
SELECT role, COUNT(*) as count
FROM app_user
GROUP BY role;
