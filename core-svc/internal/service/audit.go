package service

import (
	"context"
	"log"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
)

// AuditService handles audit logging for admin actions
type AuditService struct {
	Queries *repository.Queries
}

func NewAuditService(queries *repository.Queries) *AuditService {
	return &AuditService{
		Queries: queries,
	}
}

// AuditAction represents the action being logged
type AuditAction string

const (
	// User actions
	AuditActionUserCreate        AuditAction = "user.create"
	AuditActionUserUpdate        AuditAction = "user.update"
	AuditActionUserDelete        AuditAction = "user.delete"
	AuditActionUserRoleChange    AuditAction = "user.role_change"
	AuditActionUserPasswordReset AuditAction = "user.password_reset"

	// Poll actions
	AuditActionPollClose  AuditAction = "poll.close"
	AuditActionPollReopen AuditAction = "poll.reopen"
	AuditActionPollDelete AuditAction = "poll.delete"

	// Admin actions
	AuditActionAdminLogin AuditAction = "admin.login"
)

// LogEntry creates a new audit log entry
func (s *AuditService) LogEntry(ctx context.Context, actorUserID uuid.UUID, action AuditAction, subjectType string, subjectID uuid.UUID) error {
	var pgSubjectID pgtype.UUID
	if subjectID != uuid.Nil {
		pgSubjectID = pgtype.UUID{
			Bytes: [16]byte(subjectID),
			Valid: true,
		}
	} else {
		pgSubjectID = pgtype.UUID{
			Bytes: [16]byte{},
			Valid: false,
		}
	}

	log.Printf("[AUDIT] Creating audit log: actor=%s, action=%s, subject_type=%s, subject_id=%s",
		actorUserID, action, subjectType, subjectID)

	_, err := s.Queries.CreateAuditLog(ctx, repository.CreateAuditLogParams{
		ActorUserID: actorUserID,
		Action:      string(action),
		SubjectType: subjectType,
		SubjectID:   pgSubjectID,
		Meta:        nil,
	})

	if err != nil {
		log.Printf("[AUDIT] Failed to create audit log: %v", err)
		return err
	}

	log.Printf("[AUDIT] Successfully created audit log for action: %s", action)
	return nil
}

// LogUserAction logs a user-related action
func (s *AuditService) LogUserAction(ctx context.Context, actorUserID uuid.UUID, action AuditAction, targetUserID uuid.UUID) error {
	return s.LogEntry(ctx, actorUserID, action, "user", targetUserID)
}

// LogPollAction logs a poll-related action
func (s *AuditService) LogPollAction(ctx context.Context, actorUserID uuid.UUID, action AuditAction, pollID uuid.UUID) error {
	return s.LogEntry(ctx, actorUserID, action, "poll", pollID)
}

// GetAuditLogs retrieves paginated audit logs
func (s *AuditService) GetAuditLogs(ctx context.Context, limit, offset int32) ([]repository.ListAuditLogsRow, error) {
	return s.Queries.ListAuditLogs(ctx, repository.ListAuditLogsParams{
		Limit:  limit,
		Offset: offset,
	})
}

// GetAuditLogsByActor retrieves audit logs for a specific actor
func (s *AuditService) GetAuditLogsByActor(ctx context.Context, actorUserID uuid.UUID, limit, offset int32) ([]repository.ListAuditLogsByActorRow, error) {
	return s.Queries.ListAuditLogsByActor(ctx, repository.ListAuditLogsByActorParams{
		ActorUserID: actorUserID,
		Limit:       limit,
		Offset:      offset,
	})
}

// GetAuditLogsBySubject retrieves audit logs for a specific subject
func (s *AuditService) GetAuditLogsBySubject(ctx context.Context, subjectType string, subjectID uuid.UUID, limit, offset int32) ([]repository.ListAuditLogsBySubjectRow, error) {
	pgSubjectID := pgtype.UUID{
		Bytes: subjectID,
		Valid: true,
	}

	return s.Queries.ListAuditLogsBySubject(ctx, repository.ListAuditLogsBySubjectParams{
		SubjectType: subjectType,
		SubjectID:   pgSubjectID,
		Limit:       limit,
		Offset:      offset,
	})
}

// GetAuditLogsByAction retrieves audit logs for a specific action
func (s *AuditService) GetAuditLogsByAction(ctx context.Context, action string, limit, offset int32) ([]repository.ListAuditLogsByActionRow, error) {
	return s.Queries.ListAuditLogsByAction(ctx, repository.ListAuditLogsByActionParams{
		Action: action,
		Limit:  limit,
		Offset: offset,
	})
}

// CountAuditLogs returns the total count of audit logs
func (s *AuditService) CountAuditLogs(ctx context.Context) (int64, error) {
	return s.Queries.CountAuditLogs(ctx)
}
