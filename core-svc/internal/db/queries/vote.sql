-- name: CreateVote :one
INSERT INTO votes (poll_id, user_id, option_id)
SELECT po.poll_id, $1, $2
FROM poll_option po
JOIN poll p ON p.id = po.poll_id
WHERE po.id = $2
  AND p.closed = FALSE
ON CONFLICT (poll_id, user_id) DO UPDATE
SET option_id = EXCLUDED.option_id
-- also block the UPDATE path if the poll is closed
WHERE EXISTS (
  SELECT 1
  FROM poll p
  WHERE p.id = EXCLUDED.poll_id
    AND p.closed = FALSE
)
RETURNING id, poll_id;


-- name: GetVoteById :one
SELECT id, poll_id, user_id, option_id, created_at FROM votes WHERE id = $1;

-- name: ListVotesByPollId :many
SELECT option_id, COUNT(*) AS vote_count
FROM votes
WHERE poll_id = $1
GROUP BY option_id;


-- name: GetUserOptionIdByPollId :one
SELECT option_id FROM votes WHERE poll_id = $1 AND user_id = $2;
