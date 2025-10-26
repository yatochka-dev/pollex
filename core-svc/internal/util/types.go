package util

import (
	"errors"

	"github.com/google/uuid"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
)

type PollVotes = map[uuid.UUID]int64

type PollWithOptions struct {
	repository.Poll
	Options []repository.PollOption
}

// Custom errors for proper HTTP status code mapping
var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailExists        = errors.New("email already exists")
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidInput       = errors.New("invalid input")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrLastAdmin          = errors.New("cannot demote or delete the last admin")
	ErrInsufficientPerms  = errors.New("insufficient permissions")
	ErrPollNotFound       = errors.New("poll not found")
)
