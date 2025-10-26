-- name: CreateAuditLog :one
INSERT INTO audit_log (actor_user_id, action, subject_type, subject_id, meta)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, actor_user_id, action, subject_type, subject_id, meta, created_at;

-- name: ListAuditLogs :many
SELECT
    al.id,
    al.actor_user_id,
    al.action,
    al.subject_type,
    al.subject_id,
    al.meta,
    al.created_at,
    u.name as actor_name,
    u.email as actor_email
FROM audit_log al
LEFT JOIN app_user u ON al.actor_user_id = u.id
ORDER BY al.created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListAuditLogsByActor :many
SELECT
    al.id,
    al.actor_user_id,
    al.action,
    al.subject_type,
    al.subject_id,
    al.meta,
    al.created_at,
    u.name as actor_name,
    u.email as actor_email
FROM audit_log al
LEFT JOIN app_user u ON al.actor_user_id = u.id
WHERE al.actor_user_id = $1
ORDER BY al.created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListAuditLogsBySubject :many
SELECT
    al.id,
    al.actor_user_id,
    al.action,
    al.subject_type,
    al.subject_id,
    al.meta,
    al.created_at,
    u.name as actor_name,
    u.email as actor_email
FROM audit_log al
LEFT JOIN app_user u ON al.actor_user_id = u.id
WHERE al.subject_type = $1 AND al.subject_id = $2
ORDER BY al.created_at DESC
LIMIT $3 OFFSET $4;

-- name: ListAuditLogsByAction :many
SELECT
    al.id,
    al.actor_user_id,
    al.action,
    al.subject_type,
    al.subject_id,
    al.meta,
    al.created_at,
    u.name as actor_name,
    u.email as actor_email
FROM audit_log al
LEFT JOIN app_user u ON al.actor_user_id = u.id
WHERE al.action = $1
ORDER BY al.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountAuditLogs :one
SELECT COUNT(*) FROM audit_log;

-- name: CountAuditLogsByActor :one
SELECT COUNT(*) FROM audit_log WHERE actor_user_id = $1;

-- name: CountAuditLogsBySubject :one
SELECT COUNT(*) FROM audit_log WHERE subject_type = $1 AND subject_id = $2;

-- name: GetAuditLogByID :one
SELECT
    al.id,
    al.actor_user_id,
    al.action,
    al.subject_type,
    al.subject_id,
    al.meta,
    al.created_at,
    u.name as actor_name,
    u.email as actor_email
FROM audit_log al
LEFT JOIN app_user u ON al.actor_user_id = u.id
WHERE al.id = $1;
