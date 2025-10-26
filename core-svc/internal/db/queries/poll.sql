-- name: CreatePollWithOptions :one
WITH new_poll AS (
INSERT INTO poll (question, user_id, expires_at)
VALUES (sqlc.arg(question), sqlc.arg(user_id), sqlc.narg(expires_at))
    RETURNING id, question, user_id, created_at, closed, expires_at
    ),
    ins_opts AS (
INSERT INTO poll_option (poll_id, label)
SELECT np.id, o::text
FROM new_poll np
    CROSS JOIN unnest(sqlc.arg(options)::text[]) AS o
    )
SELECT p.*,
       ARRAY(
           SELECT po.label
         FROM poll_option po
         WHERE po.poll_id = p.id
         ORDER BY po.id
       ) AS options
FROM new_poll p;

-- name: GetPollWithOptions :one
SELECT p.*,
       ARRAY(
           SELECT po.label
         FROM poll_option po
         WHERE po.poll_id = p.id
         ORDER BY po.id
       ) AS options
FROM poll p
WHERE p.id = sqlc.arg(id);

-- name: GetPollByID :one
SELECT * FROM poll
WHERE id = $1 LIMIT 1;

-- name: GetPollsByUserID :many
SELECT * FROM poll
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: ListOptionsByPollID :many
SELECT * FROM poll_option WHERE poll_id = sqlc.arg(poll_id);

-- Admin: List all polls with pagination
-- name: ListAllPolls :many
SELECT p.*, u.name as owner_name, u.email as owner_email
FROM poll p
LEFT JOIN app_user u ON p.user_id = u.id
ORDER BY p.created_at DESC
LIMIT $1 OFFSET $2;

-- Admin: Count total polls
-- name: CountPolls :one
SELECT COUNT(*) FROM poll;

-- Admin: Close a poll
-- name: ClosePoll :one
UPDATE poll
SET closed = true
WHERE id = $1
RETURNING *;

-- Admin: Reopen a poll
-- name: ReopenPoll :one
UPDATE poll
SET closed = false
WHERE id = $1
RETURNING *;

-- Admin: Delete a poll (cascade will handle options and votes)
-- name: DeletePoll :exec
DELETE FROM poll WHERE id = $1;

-- Admin: List polls by status
-- name: ListPollsByStatus :many
SELECT p.*, u.name as owner_name, u.email as owner_email
FROM poll p
LEFT JOIN app_user u ON p.user_id = u.id
WHERE p.closed = $1
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $3;

-- Admin: Count polls by status
-- name: CountPollsByStatus :one
SELECT COUNT(*) FROM poll WHERE closed = $1;

-- Check if poll has any votes
-- name: PollHasVotes :one
SELECT EXISTS(
    SELECT 1 FROM votes
    WHERE poll_id = $1
) AS has_votes;

-- Update poll question (only if no votes)
-- name: UpdatePollQuestion :one
UPDATE poll
SET question = $2
WHERE id = $1
RETURNING *;

-- Update poll options (only if no votes)
-- name: UpdatePollOptions :exec
DELETE FROM poll_option WHERE poll_id = $1;

-- Insert poll options (used with UpdatePollOptions)
-- name: InsertPollOptions :copyfrom
INSERT INTO poll_option (poll_id, label) VALUES ($1, $2);

-- Check if user owns poll
-- name: IsPollOwner :one
SELECT user_id = $2 AS is_owner
FROM poll
WHERE id = $1;

-- Get poll owner ID
-- name: GetPollOwnerID :one
SELECT user_id FROM poll WHERE id = $1;

-- Update poll expiration
-- name: UpdatePollExpiration :one
UPDATE poll
SET expires_at = $2
WHERE id = $1
RETURNING *;

-- Get expired polls that aren't closed
-- name: GetExpiredPolls :many
SELECT id, question, user_id, created_at, closed, expires_at
FROM poll
WHERE expires_at IS NOT NULL
  AND expires_at <= NOW()
  AND closed = false;

-- Auto-close expired polls
-- name: AutoCloseExpiredPolls :exec
UPDATE poll
SET closed = true
WHERE expires_at IS NOT NULL
  AND expires_at <= NOW()
  AND closed = false;

-- Increment vote count for option
-- name: IncrementOptionVoteCount :exec
UPDATE poll_option
SET vote_count = vote_count + 1
WHERE id = $1;

-- Decrement vote count for option (for vote changes)
-- name: DecrementOptionVoteCount :exec
UPDATE poll_option
SET vote_count = vote_count - 1
WHERE id = $1 AND vote_count > 0;

-- Get poll with vote counts
-- name: GetPollWithVoteCounts :one
SELECT p.id, p.question, p.user_id, p.created_at, p.closed, p.expires_at,
       COALESCE(
           json_agg(
               json_build_object(
                   'id', po.id,
                   'label', po.label,
                   'vote_count', po.vote_count
               ) ORDER BY po.id
           ) FILTER (WHERE po.id IS NOT NULL),
           '[]'::json
       ) AS options
FROM poll p
LEFT JOIN poll_option po ON po.poll_id = p.id
WHERE p.id = $1
GROUP BY p.id;

-- Check if poll is closed or expired
-- name: IsPollClosedOrExpired :one
SELECT closed OR (expires_at IS NOT NULL AND expires_at <= NOW()) AS is_closed
FROM poll
WHERE id = $1;
