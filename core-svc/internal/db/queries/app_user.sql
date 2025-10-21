
-- name: CreateUser :one
INSERT INTO app_user (name, email, password_hash)
VALUES ($1, $2, $3) RETURNING id, name, email, created_at;                       -- id, email, created_at

-- name: GetUserByID :one
SELECT id, name, email, created_at FROM app_user
WHERE id = $1 LIMIT 1;

-- name: GetPasswordHashByEmail :one
SELECT id, password_hash FROM app_user
WHERE email = $1 LIMIT 1;

-- name: CheckEmailExists :one
SELECT EXISTS(
    SELECT 1 FROM app_user
    WHERE email = $1
);

-- name: GetUserByEmail :one
SELECT id, name, email, created_at FROM app_user
WHERE email = $1 LIMIT 1;
