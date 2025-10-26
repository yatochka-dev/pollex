-- name: CreatePasswordResetToken :one
INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
VALUES ($1, $2, $3)
RETURNING id, user_id, token_hash, expires_at, used_at, created_at;

-- name: GetPasswordResetTokenByHash :one
SELECT id, user_id, token_hash, expires_at, used_at, created_at
FROM password_reset_tokens
WHERE token_hash = $1
LIMIT 1;

-- name: MarkPasswordResetTokenUsed :one
UPDATE password_reset_tokens
SET used_at = NOW()
WHERE id = $1
RETURNING id, user_id, token_hash, expires_at, used_at, created_at;

-- name: DeleteExpiredPasswordResetTokens :exec
DELETE FROM password_reset_tokens
WHERE expires_at < NOW();

-- name: DeletePasswordResetTokensByUserID :exec
DELETE FROM password_reset_tokens
WHERE user_id = $1;

-- name: GetUnusedPasswordResetTokenByUserID :one
SELECT id, user_id, token_hash, expires_at, used_at, created_at
FROM password_reset_tokens
WHERE user_id = $1
  AND used_at IS NULL
  AND expires_at > NOW()
ORDER BY created_at DESC
LIMIT 1;

-- name: CountRecentPasswordResetRequests :one
SELECT COUNT(*)
FROM password_reset_tokens
WHERE user_id = $1
  AND created_at > $2;

-- name: CountUnusedPasswordResetTokensByUserID :one
SELECT COUNT(*)
FROM password_reset_tokens
WHERE user_id = $1
  AND used_at IS NULL
  AND expires_at > NOW();
