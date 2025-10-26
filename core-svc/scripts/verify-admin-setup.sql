-- Admin System Verification Script
-- Run this script to verify the admin system is properly set up
--
-- Usage:
--   psql -h localhost -p 6001 -U postgres -d mydb -f scripts/verify-admin-setup.sql

\echo '=========================================='
\echo 'Admin System Setup Verification'
\echo '=========================================='
\echo ''

-- 1. Check if role column exists
\echo '1. Checking app_user table for role column...'
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'app_user'
  AND column_name IN ('role', 'email_verified_at');

\echo ''

-- 2. Check if user_role enum exists
\echo '2. Checking user_role enum type...'
SELECT
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

\echo ''

-- 3. Check if audit_log table exists
\echo '3. Checking audit_log table structure...'
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_log'
ORDER BY ordinal_position;

\echo ''

-- 4. Check indexes
\echo '4. Checking indexes on app_user and audit_log...'
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('app_user', 'audit_log')
  AND indexname LIKE '%role%'
   OR indexname LIKE '%audit%'
ORDER BY tablename, indexname;

\echo ''

-- 5. Count users by role
\echo '5. User statistics by role...'
SELECT
    role,
    COUNT(*) as count
FROM app_user
GROUP BY role
ORDER BY role;

\echo ''

-- 6. List all admins
\echo '6. Current admin users...'
SELECT
    id,
    name,
    email,
    role,
    created_at
FROM app_user
WHERE role = 'admin'
ORDER BY created_at;

\echo ''

-- 7. Check audit log entries
\echo '7. Audit log statistics...'
SELECT
    COUNT(*) as total_entries,
    COUNT(DISTINCT actor_user_id) as unique_actors,
    COUNT(DISTINCT action) as unique_actions,
    MIN(created_at) as oldest_entry,
    MAX(created_at) as newest_entry
FROM audit_log;

\echo ''

-- 8. Most common audit actions
\echo '8. Top 10 audit actions by frequency...'
SELECT
    action,
    COUNT(*) as count
FROM audit_log
GROUP BY action
ORDER BY count DESC
LIMIT 10;

\echo ''

-- 9. Recent audit log entries
\echo '9. Last 5 audit log entries...'
SELECT
    al.created_at,
    u.email as actor_email,
    al.action,
    al.subject_type,
    al.subject_id
FROM audit_log al
LEFT JOIN app_user u ON al.actor_user_id = u.id
ORDER BY al.created_at DESC
LIMIT 5;

\echo ''

-- 10. Verify foreign key constraints
\echo '10. Checking foreign key constraints...'
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'audit_log';

\echo ''
\echo '=========================================='
\echo 'Verification Complete!'
\echo '=========================================='
\echo ''
\echo 'Expected results:'
\echo '  ✓ app_user has role and email_verified_at columns'
\echo '  ✓ user_role enum exists with values: user, admin'
\echo '  ✓ audit_log table exists with all required columns'
\echo '  ✓ Indexes exist on role and audit log fields'
\echo '  ✓ At least one admin user exists'
\echo '  ✓ Foreign key from audit_log to app_user exists'
\echo ''
\echo 'If any checks failed, review ADMIN_SYSTEM.md for setup instructions.'
\echo ''
