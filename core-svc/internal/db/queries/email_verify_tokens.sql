-- name: CreateEmailVerifyToken :one
INSERT INTO email_verify_tokens (user_id, token_hash, expires_at)
VALUES ($1, $2, $3)
RETURNING id, user_id, token_hash, expires_at, used_at, created_at;

-- name: GetEmailVerifyTokenByHash :one
SELECT id, user_id, token_hash, expires_at, used_at, created_at
FROM email_verify_tokens
WHERE token_hash = $1
LIMIT 1;

-- name: MarkEmailVerifyTokenUsed :one
UPDATE email_verify_tokens
SET used_at = NOW()
WHERE id = $1
RETURNING id, user_id, token_hash, expires_at, used_at, created_at;

-- name: DeleteExpiredEmailVerifyTokens :exec
DELETE FROM email_verify_tokens
WHERE expires_at < NOW();

-- name: DeleteEmailVerifyTokensByUserID :exec
DELETE FROM email_verify_tokens
WHERE user_id = $1;

-- name: GetUnusedEmailVerifyTokenByUserID :one
SELECT id, user_id, token_hash, expires_at, used_at, created_at
FROM email_verify_tokens
WHERE user_id = $1
  AND used_at IS NULL
  AND expires_at > NOW()
ORDER BY created_at DESC
LIMIT 1;

-- name: SetUserEmailVerified :one
UPDATE app_user
SET email_verified_at = NOW()
WHERE id = $1
RETURNING id, name, email, role, email_verified_at, created_at;

-- name: IsEmailVerified :one
SELECT email_verified_at IS NOT NULL AS is_verified
FROM app_user
WHERE id = $1;

-- name: CountUnusedTokensByUserID :one
SELECT COUNT(*)
FROM email_verify_tokens
WHERE user_id = $1
  AND used_at IS NULL
  AND expires_at > NOW();
