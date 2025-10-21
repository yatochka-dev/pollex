-- name: CreatePollWithOptions :one
WITH new_poll AS (
INSERT INTO poll (question, user_id)
VALUES (sqlc.arg(question), sqlc.arg(user_id))
    RETURNING id, question, user_id, created_at, closed
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
