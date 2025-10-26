
-- name: CreateUser :one
INSERT INTO app_user (name, email, password_hash)
VALUES ($1, $2, $3) RETURNING id, name, email, role, email_verified_at, created_at;

-- name: GetUserByID :one
SELECT id, name, email, role, email_verified_at, created_at FROM app_user
WHERE id = $1 LIMIT 1;

-- name: GetPasswordHashByEmail :one
SELECT id, password_hash FROM app_user
WHERE email = $1 LIMIT 1;

-- Admin: List all users with pagination
-- name: ListAllUsers :many
SELECT id, name, email, role, email_verified_at, created_at
FROM app_user
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- Admin: Count total users
-- name: CountUsers :one
SELECT COUNT(*) FROM app_user;

-- Admin: Update user role
-- name: UpdateUserRole :one
UPDATE app_user
SET role = $2
WHERE id = $1
RETURNING id, name, email, role, email_verified_at, created_at;

-- Admin: Update user name
-- name: UpdateUserName :one
UPDATE app_user
SET name = $2
WHERE id = $1
RETURNING id, name, email, role, email_verified_at, created_at;

-- Admin: Update user password hash
-- name: UpdateUserPasswordHash :exec
UPDATE app_user
SET password_hash = $2
WHERE id = $1;

-- Admin: Delete user
-- name: DeleteUser :exec
DELETE FROM app_user WHERE id = $1;

-- Admin: Count users by role
-- name: CountUsersByRole :one
SELECT COUNT(*) FROM app_user WHERE role = $1;

-- Admin: Check if user is admin
-- name: IsUserAdmin :one
SELECT role = 'admin' AS is_admin FROM app_user WHERE id = $1;

-- Admin: Get user with password hash (for authentication)
-- name: GetUserWithPasswordByID :one
SELECT id, name, email, role, password_hash, email_verified_at, created_at
FROM app_user
WHERE id = $1 LIMIT 1;

-- name: CheckEmailExists :one
SELECT EXISTS(
    SELECT 1 FROM app_user
    WHERE email = $1
);

-- name: GetUserByEmail :one
SELECT id, name, email, role, email_verified_at, created_at FROM app_user
WHERE email = $1 LIMIT 1;

-- Admin: Toggle email verification status
-- name: SetEmailVerificationStatus :one
UPDATE app_user
SET email_verified_at = CASE
    WHEN $2 = true THEN COALESCE(email_verified_at, NOW())
    WHEN $2 = false THEN NULL
    ELSE email_verified_at
END
WHERE id = $1
RETURNING id, name, email, role, email_verified_at, created_at;
