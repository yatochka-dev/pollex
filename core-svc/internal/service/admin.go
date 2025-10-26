package service

import (
	"context"
	"errors"
	"log"

	"github.com/google/uuid"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
	"golang.org/x/crypto/bcrypt"
)

// AdminService handles administrative operations
type AdminService struct {
	Queries      *repository.Queries
	AuditService *AuditService
}

func NewAdminService(queries *repository.Queries, auditService *AuditService) *AdminService {
	return &AdminService{
		Queries:      queries,
		AuditService: auditService,
	}
}

// ListUsersInput contains pagination parameters
type ListUsersInput struct {
	Limit  int32
	Offset int32
}

// ListUsersResponse contains paginated user results
type ListUsersResponse struct {
	Users  []repository.ListAllUsersRow `json:"users"`
	Total  int64                        `json:"total"`
	Limit  int32                        `json:"limit"`
	Offset int32                        `json:"offset"`
}

// ListUsers retrieves all users with pagination
func (s *AdminService) ListUsers(ctx context.Context, input ListUsersInput) (*ListUsersResponse, error) {
	users, err := s.Queries.ListAllUsers(ctx, repository.ListAllUsersParams{
		Limit:  input.Limit,
		Offset: input.Offset,
	})
	if err != nil {
		return nil, err
	}

	total, err := s.Queries.CountUsers(ctx)
	if err != nil {
		return nil, err
	}

	return &ListUsersResponse{
		Users:  users,
		Total:  total,
		Limit:  input.Limit,
		Offset: input.Offset,
	}, nil
}

// UpdateUserRoleInput contains role update parameters
type UpdateUserRoleInput struct {
	ActorUserID  uuid.UUID
	TargetUserID uuid.UUID
	NewRole      repository.UserRole
}

// UpdateUserRole changes a user's role
func (s *AdminService) UpdateUserRole(ctx context.Context, input UpdateUserRoleInput) (*repository.UpdateUserRoleRow, error) {
	// Prevent demoting the last admin
	if input.NewRole == repository.UserRoleUser {
		adminCount, err := s.Queries.CountUsersByRole(ctx, repository.UserRoleAdmin)
		if err != nil {
			return nil, err
		}

		if adminCount <= 1 {
			targetUser, err := s.Queries.GetUserByID(ctx, input.TargetUserID)
			if err != nil {
				return nil, err
			}

			if targetUser.Role == repository.UserRoleAdmin {
				return nil, util.ErrLastAdmin
			}
		}
	}

	// Update role
	updatedUser, err := s.Queries.UpdateUserRole(ctx, repository.UpdateUserRoleParams{
		ID:   input.TargetUserID,
		Role: input.NewRole,
	})
	if err != nil {
		return nil, err
	}

	// Log the action
	if err := s.AuditService.LogUserAction(ctx, input.ActorUserID, AuditActionUserRoleChange, input.TargetUserID); err != nil {
		log.Printf("[AUDIT ERROR] Failed to log role change: %v", err)
	}

	return &updatedUser, nil
}

// UpdateUserNameInput contains name update parameters
type UpdateUserNameInput struct {
	ActorUserID  uuid.UUID
	TargetUserID uuid.UUID
	NewName      string
}

// UpdateUserName changes a user's name
func (s *AdminService) UpdateUserName(ctx context.Context, input UpdateUserNameInput) (*repository.UpdateUserNameRow, error) {
	updatedUser, err := s.Queries.UpdateUserName(ctx, repository.UpdateUserNameParams{
		ID:   input.TargetUserID,
		Name: input.NewName,
	})
	if err != nil {
		return nil, err
	}

	// Log the action
	if err := s.AuditService.LogUserAction(ctx, input.ActorUserID, AuditActionUserUpdate, input.TargetUserID); err != nil {
		log.Printf("[AUDIT ERROR] Failed to log name update: %v", err)
	}

	return &updatedUser, nil
}

// ResetUserPasswordInput contains password reset parameters
type ResetUserPasswordInput struct {
	ActorUserID  uuid.UUID
	TargetUserID uuid.UUID
	NewPassword  string
}

// ResetUserPassword resets a user's password (admin action)
func (s *AdminService) ResetUserPassword(ctx context.Context, input ResetUserPasswordInput) error {
	if input.NewPassword == "" {
		return errors.New("password cannot be empty")
	}

	// Hash the new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update the password
	err = s.Queries.UpdateUserPasswordHash(ctx, repository.UpdateUserPasswordHashParams{
		ID:           input.TargetUserID,
		PasswordHash: string(hashedPassword),
	})
	if err != nil {
		return err
	}

	// Log the action
	if err := s.AuditService.LogUserAction(ctx, input.ActorUserID, AuditActionUserPasswordReset, input.TargetUserID); err != nil {
		log.Printf("[AUDIT ERROR] Failed to log password reset: %v", err)
	}

	return nil
}

// DeleteUserInput contains user deletion parameters
type DeleteUserInput struct {
	ActorUserID  uuid.UUID
	TargetUserID uuid.UUID
}

// DeleteUser removes a user from the system
func (s *AdminService) DeleteUser(ctx context.Context, input DeleteUserInput) error {
	// Prevent deleting the last admin
	targetUser, err := s.Queries.GetUserByID(ctx, input.TargetUserID)
	if err != nil {
		return util.ErrUserNotFound
	}

	if targetUser.Role == repository.UserRoleAdmin {
		adminCount, err := s.Queries.CountUsersByRole(ctx, repository.UserRoleAdmin)
		if err != nil {
			return err
		}

		if adminCount <= 1 {
			return util.ErrLastAdmin
		}
	}

	// Log the action before deletion
	if err := s.AuditService.LogUserAction(ctx, input.ActorUserID, AuditActionUserDelete, input.TargetUserID); err != nil {
		log.Printf("[AUDIT ERROR] Failed to log user deletion: %v", err)
	}

	// Delete the user
	err = s.Queries.DeleteUser(ctx, input.TargetUserID)
	if err != nil {
		return err
	}

	return nil
}

// ToggleEmailVerificationInput contains parameters for toggling email verification
type ToggleEmailVerificationInput struct {
	ActorUserID  uuid.UUID
	TargetUserID uuid.UUID
	Verified     bool
}

// ToggleEmailVerification sets or removes email verification for a user
func (s *AdminService) ToggleEmailVerification(ctx context.Context, input ToggleEmailVerificationInput) error {
	// Log the action
	action := "user.verify_email"
	if !input.Verified {
		action = "user.unverify_email"
	}
	log.Printf("%v", input.Verified)
	if err := s.AuditService.LogUserAction(ctx, input.ActorUserID, AuditAction(action), input.TargetUserID); err != nil {
		log.Printf("[AUDIT ERROR] Failed to log email verification toggle: %v", err)
	}

	// Update verification status
	_, err := s.Queries.SetEmailVerificationStatus(ctx, repository.SetEmailVerificationStatusParams{
		ID:      input.TargetUserID,
		Column2: input.Verified,
	})
	if err != nil {
		return err
	}

	return nil
}

// ListPollsInput contains pagination and filter parameters
type ListPollsInput struct {
	Limit  int32
	Offset int32
	Closed *bool // nil = all, true = closed only, false = open only
}

// ListPollsResponse contains paginated poll results
type ListPollsResponse struct {
	Polls  []repository.ListAllPollsRow `json:"polls"`
	Total  int64                        `json:"total"`
	Limit  int32                        `json:"limit"`
	Offset int32                        `json:"offset"`
}

// ListPolls retrieves all polls with pagination
func (s *AdminService) ListPolls(ctx context.Context, input ListPollsInput) (*ListPollsResponse, error) {
	var polls []repository.ListAllPollsRow
	var total int64
	var err error

	if input.Closed == nil {
		// Get all polls
		polls, err = s.Queries.ListAllPolls(ctx, repository.ListAllPollsParams{
			Limit:  input.Limit,
			Offset: input.Offset,
		})
		if err != nil {
			return nil, err
		}

		total, err = s.Queries.CountPolls(ctx)
	} else {
		// Get polls by status
		rows, err := s.Queries.ListPollsByStatus(ctx, repository.ListPollsByStatusParams{
			Closed: *input.Closed,
			Limit:  input.Limit,
			Offset: input.Offset,
		})
		if err != nil {
			return nil, err
		}

		// Convert to ListAllPollsRow (they should have the same structure)
		for _, row := range rows {
			polls = append(polls, repository.ListAllPollsRow(row))
		}

		total, err = s.Queries.CountPollsByStatus(ctx, *input.Closed)
	}

	if err != nil {
		return nil, err
	}

	return &ListPollsResponse{
		Polls:  polls,
		Total:  total,
		Limit:  input.Limit,
		Offset: input.Offset,
	}, nil
}

// ClosePollInput contains poll closure parameters
type ClosePollInput struct {
	ActorUserID uuid.UUID
	PollID      uuid.UUID
}

// ClosePoll closes a poll (admin action)
func (s *AdminService) ClosePoll(ctx context.Context, input ClosePollInput) (*repository.Poll, error) {
	poll, err := s.Queries.ClosePoll(ctx, input.PollID)
	if err != nil {
		return nil, util.ErrPollNotFound
	}

	// Log the action
	if err := s.AuditService.LogPollAction(ctx, input.ActorUserID, AuditActionPollClose, input.PollID); err != nil {
		log.Printf("[AUDIT ERROR] Failed to log poll closure: %v", err)
	}

	return &poll, nil
}

// ReopenPollInput contains poll reopening parameters
type ReopenPollInput struct {
	ActorUserID uuid.UUID
	PollID      uuid.UUID
}

// ReopenPoll reopens a closed poll (admin action)
func (s *AdminService) ReopenPoll(ctx context.Context, input ReopenPollInput) (*repository.Poll, error) {
	poll, err := s.Queries.ReopenPoll(ctx, input.PollID)
	if err != nil {
		return nil, util.ErrPollNotFound
	}

	// Log the action
	if err := s.AuditService.LogPollAction(ctx, input.ActorUserID, AuditActionPollReopen, input.PollID); err != nil {
		log.Printf("[AUDIT ERROR] Failed to log poll reopen: %v", err)
	}

	return &poll, nil
}

// DeletePollInput contains poll deletion parameters
type DeletePollInput struct {
	ActorUserID uuid.UUID
	PollID      uuid.UUID
}

// DeletePoll removes a poll from the system (admin action)
func (s *AdminService) DeletePoll(ctx context.Context, input DeletePollInput) error {
	// Log the action before deletion
	if err := s.AuditService.LogPollAction(ctx, input.ActorUserID, AuditActionPollDelete, input.PollID); err != nil {
		log.Printf("[AUDIT ERROR] Failed to log poll deletion: %v", err)
	}

	// Delete the poll
	err := s.Queries.DeletePoll(ctx, input.PollID)
	if err != nil {
		return err
	}

	return nil
}
