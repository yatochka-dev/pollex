package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

type PollService struct {
	repo *repository.Queries
}

func NewPollService(repo *repository.Queries) *PollService {
	return &PollService{
		repo: repo,
	}
}

// CreatePoll creates a new poll with options and optional expiration
func (s *PollService) CreatePoll(ctx context.Context, userID uuid.UUID, question string, options []string, expiresAt *time.Time) (*repository.Poll, error) {
	// Validate inputs
	if question == "" {
		return nil, fmt.Errorf("poll question cannot be empty")
	}
	if len(options) < 2 {
		return nil, fmt.Errorf("poll must have at least 2 options")
	}
	if len(options) > 10 {
		return nil, fmt.Errorf("poll cannot have more than 10 options")
	}

	// Check if user's email is verified
	verified, err := s.repo.IsEmailVerified(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check email verification: %w", err)
	}
	if isVerified, ok := verified.(bool); !ok || !isVerified {
		return nil, fmt.Errorf("email must be verified before creating polls")
	}

	// Create poll with options
	params := repository.CreatePollWithOptionsParams{
		Question: question,
		UserID:   userID,
		Options:  options,
	}

	if expiresAt != nil {
		params.ExpiresAt = pgtype.Timestamptz{
			Time:  *expiresAt,
			Valid: true,
		}
	}

	poll, err := s.repo.CreatePollWithOptions(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to create poll: %w", err)
	}

	log.Printf("%s[POLL]%s Created poll %s by user %s",
		util.ColorGreen, util.ColorReset, poll.ID, userID)

	return &repository.Poll{
		ID:        poll.ID,
		Question:  poll.Question,
		UserID:    poll.UserID,
		CreatedAt: poll.CreatedAt,
		Closed:    poll.Closed,
		ExpiresAt: poll.ExpiresAt,
	}, nil
}

// GetPoll retrieves a poll by ID and auto-closes if expired
func (s *PollService) GetPoll(ctx context.Context, pollID uuid.UUID) (*repository.Poll, error) {
	poll, err := s.repo.GetPollByID(ctx, pollID)
	if err != nil {
		return nil, fmt.Errorf("poll not found")
	}

	// Auto-close if expired
	if poll.ExpiresAt.Valid && time.Now().After(poll.ExpiresAt.Time) && !poll.Closed {
		poll.Closed = true
		_, err := s.repo.ClosePoll(ctx, pollID)
		if err != nil {
			log.Printf("%s[POLL WARNING]%s Failed to auto-close expired poll %s: %v",
				util.ColorYellow, util.ColorReset, pollID, err)
		}
	}

	return &poll, nil
}

// UpdatePoll updates a poll's question and/or options (only if no votes exist)
func (s *PollService) UpdatePoll(ctx context.Context, pollID uuid.UUID, userID uuid.UUID, question string, options []string) error {
	// Check ownership
	isOwner, err := s.repo.IsPollOwner(ctx, repository.IsPollOwnerParams{
		ID:     pollID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("poll not found")
	}
	if !isOwner {
		return fmt.Errorf("not authorized to update this poll")
	}

	// Check if poll has votes
	hasVotes, err := s.repo.PollHasVotes(ctx, pollID)
	if err != nil {
		return fmt.Errorf("failed to check poll votes: %w", err)
	}
	if hasVotes {
		return fmt.Errorf("cannot edit poll after votes have been cast")
	}

	// Check if poll is closed
	poll, err := s.repo.GetPollByID(ctx, pollID)
	if err != nil {
		return fmt.Errorf("poll not found")
	}
	if poll.Closed {
		return fmt.Errorf("cannot edit closed poll")
	}

	// Validate inputs
	if question == "" {
		return fmt.Errorf("poll question cannot be empty")
	}
	if len(options) < 2 {
		return fmt.Errorf("poll must have at least 2 options")
	}
	if len(options) > 10 {
		return fmt.Errorf("poll cannot have more than 10 options")
	}

	// Update question
	_, err = s.repo.UpdatePollQuestion(ctx, repository.UpdatePollQuestionParams{
		ID:       pollID,
		Question: question,
	})
	if err != nil {
		return fmt.Errorf("failed to update poll question: %w", err)
	}

	// Update options (delete old ones and insert new ones)
	err = s.repo.UpdatePollOptions(ctx, pollID)
	if err != nil {
		return fmt.Errorf("failed to delete old options: %w", err)
	}

	// Insert new options using CopyFrom
	optionsToInsert := make([]repository.InsertPollOptionsParams, len(options))
	for i, option := range options {
		optionsToInsert[i] = repository.InsertPollOptionsParams{
			PollID: pollID,
			Label:  option,
		}
	}

	_, err = s.repo.InsertPollOptions(ctx, optionsToInsert)
	if err != nil {
		return fmt.Errorf("failed to insert options: %w", err)
	}

	log.Printf("%s[POLL]%s Updated poll %s by user %s",
		util.ColorGreen, util.ColorReset, pollID, userID)

	return nil
}

// DeletePoll deletes a poll (owner only)
func (s *PollService) DeletePoll(ctx context.Context, pollID uuid.UUID, userID uuid.UUID) error {
	// Check ownership
	isOwner, err := s.repo.IsPollOwner(ctx, repository.IsPollOwnerParams{
		ID:     pollID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("poll not found")
	}
	if !isOwner {
		return fmt.Errorf("not authorized to delete this poll")
	}

	// Delete poll (cascade will handle options and votes)
	err = s.repo.DeletePoll(ctx, pollID)
	if err != nil {
		return fmt.Errorf("failed to delete poll: %w", err)
	}

	log.Printf("%s[POLL]%s Deleted poll %s by user %s",
		util.ColorGreen, util.ColorReset, pollID, userID)

	return nil
}

// ClosePoll closes a poll (owner only)
func (s *PollService) ClosePoll(ctx context.Context, pollID uuid.UUID, userID uuid.UUID) error {
	// Check ownership
	isOwner, err := s.repo.IsPollOwner(ctx, repository.IsPollOwnerParams{
		ID:     pollID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("poll not found")
	}
	if !isOwner {
		return fmt.Errorf("not authorized to close this poll")
	}

	// Close poll
	_, err = s.repo.ClosePoll(ctx, pollID)
	if err != nil {
		return fmt.Errorf("failed to close poll: %w", err)
	}

	log.Printf("%s[POLL]%s Closed poll %s by user %s",
		util.ColorGreen, util.ColorReset, pollID, userID)

	return nil
}

// ReopenPoll reopens a poll (owner only)
func (s *PollService) ReopenPoll(ctx context.Context, pollID uuid.UUID, userID uuid.UUID) error {
	// Check ownership
	isOwner, err := s.repo.IsPollOwner(ctx, repository.IsPollOwnerParams{
		ID:     pollID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("poll not found")
	}
	if !isOwner {
		return fmt.Errorf("not authorized to reopen this poll")
	}

	// Check if poll is expired
	poll, err := s.repo.GetPollByID(ctx, pollID)
	if err != nil {
		return fmt.Errorf("poll not found")
	}
	if poll.ExpiresAt.Valid && time.Now().After(poll.ExpiresAt.Time) {
		return fmt.Errorf("cannot reopen expired poll")
	}

	// Reopen poll
	_, err = s.repo.ReopenPoll(ctx, pollID)
	if err != nil {
		return fmt.Errorf("failed to reopen poll: %w", err)
	}

	log.Printf("%s[POLL]%s Reopened poll %s by user %s",
		util.ColorGreen, util.ColorReset, pollID, userID)

	return nil
}

// UpdatePollExpiration updates a poll's expiration time (owner only)
func (s *PollService) UpdatePollExpiration(ctx context.Context, pollID uuid.UUID, userID uuid.UUID, expiresAt *time.Time) error {
	// Check ownership
	isOwner, err := s.repo.IsPollOwner(ctx, repository.IsPollOwnerParams{
		ID:     pollID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("poll not found")
	}
	if !isOwner {
		return fmt.Errorf("not authorized to update this poll")
	}

	// Update expiration
	params := repository.UpdatePollExpirationParams{
		ID: pollID,
	}
	if expiresAt != nil {
		params.ExpiresAt = pgtype.Timestamptz{
			Time:  *expiresAt,
			Valid: true,
		}
	}

	_, err = s.repo.UpdatePollExpiration(ctx, params)
	if err != nil {
		return fmt.Errorf("failed to update poll expiration: %w", err)
	}

	log.Printf("%s[POLL]%s Updated expiration for poll %s by user %s",
		util.ColorGreen, util.ColorReset, pollID, userID)

	return nil
}

// AutoCloseExpiredPolls closes all expired polls (called periodically)
func (s *PollService) AutoCloseExpiredPolls(ctx context.Context) error {
	err := s.repo.AutoCloseExpiredPolls(ctx)
	if err != nil {
		return fmt.Errorf("failed to auto-close expired polls: %w", err)
	}
	return nil
}

// IsPollClosedOrExpired checks if a poll is closed or expired
func (s *PollService) IsPollClosedOrExpired(ctx context.Context, pollID uuid.UUID) (bool, error) {
	result, err := s.repo.IsPollClosedOrExpired(ctx, pollID)
	if err != nil {
		return false, fmt.Errorf("failed to check poll status: %w", err)
	}
	if result.Valid {
		return result.Bool, nil
	}
	return false, nil
}

// GetPollWithVoteCounts retrieves a poll with vote counts for each option
func (s *PollService) GetPollWithVoteCounts(ctx context.Context, pollID uuid.UUID) (*repository.GetPollWithVoteCountsRow, error) {
	poll, err := s.repo.GetPollWithVoteCounts(ctx, pollID)
	if err != nil {
		return nil, fmt.Errorf("poll not found")
	}

	// Auto-close if expired
	if poll.ExpiresAt.Valid && time.Now().After(poll.ExpiresAt.Time) && !poll.Closed {
		_, err := s.repo.ClosePoll(ctx, pollID)
		if err != nil {
			log.Printf("%s[POLL WARNING]%s Failed to auto-close expired poll %s: %v",
				util.ColorYellow, util.ColorReset, pollID, err)
		}
		poll.Closed = true
	}

	return &poll, nil
}

// CanUserVote checks if a user can vote on a poll (not closed, not expired, email verified)
func (s *PollService) CanUserVote(ctx context.Context, pollID uuid.UUID, userID uuid.UUID) error {
	// Check if user's email is verified
	verified, err := s.repo.IsEmailVerified(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to check email verification: %w", err)
	}
	if isVerified, ok := verified.(bool); !ok || !isVerified {
		return fmt.Errorf("email must be verified before voting")
	}

	// Check if poll is closed or expired
	isClosed, err := s.IsPollClosedOrExpired(ctx, pollID)
	if err != nil {
		return err
	}
	if isClosed {
		return fmt.Errorf("poll is closed or expired")
	}

	return nil
}
