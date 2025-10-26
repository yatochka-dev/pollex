package service

import (
	"errors"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/pubsub"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

type VotingService struct {
	Broker  *pubsub.Broker
	Queries *repository.Queries
}

func NewVotingService(queries *repository.Queries, broker *pubsub.Broker) *VotingService {
	return &VotingService{
		Broker:  broker,
		Queries: queries,
	}
}

func (s *VotingService) Vote(c *gin.Context, optionId uuid.UUID, userId uuid.UUID) error {
	// Check if user's email is verified
	user, err := s.Queries.GetUserByID(c, userId)
	if err != nil {
		return err
	}

	if !user.EmailVerifiedAt.Valid {
		return errors.New("email verification required. Please verify your email before voting")
	}

	vote, err := s.Queries.CreateVote(c, repository.CreateVoteParams{UserID: userId, OptionID: optionId})

	if err != nil {
		println(err.Error())
		return err
	}

	votesData, err := s.GetVotes(c, vote.PollID)
	if err != nil {
		return err
	}

	p, opts, err := s.GetPollData(c, vote.PollID)
	if err != nil {
		return err
	}

	// publish to SSE subscribers
	log.Printf("pub poll=%s active=%d", vote.PollID.String(), s.Broker.ActiveSubscribers(vote.PollID.String()))
	s.Broker.PublishVoteUpdate(p, opts, votesData, &optionId)

	return nil
}

func (s *VotingService) GetPollData(c *gin.Context, pollId uuid.UUID) (repository.Poll, []repository.PollOption, error) {
	p, err := s.Queries.GetPollByID(c, pollId)
	if err != nil {
		return repository.Poll{}, nil, err
	}

	opts, err := s.Queries.ListOptionsByPollID(c, pollId)
	if err != nil {
		return repository.Poll{}, nil, err
	}

	return p, opts, nil
}

func (s *VotingService) GetVoteUpdate(c *gin.Context, pollId uuid.UUID) (pubsub.VoteUpdate, error) {
	poll, options, err := s.GetPollData(c, pollId)
	if err != nil {
		return pubsub.VoteUpdate{}, err
	}

	votes, err := s.GetVotes(c, pollId)
	if err != nil {
		return pubsub.VoteUpdate{}, err
	}

	return pubsub.VoteUpdate{
		Poll:         poll,
		Options:      options,
		Votes:        votes,
		UserVotedFor: nil,
	}, nil
}

func (s *VotingService) GetVotes(c *gin.Context, pollId uuid.UUID) (util.PollVotes, error) {
	votes, err := s.Queries.ListVotesByPollId(c, pollId)
	if err != nil {
		println(err.Error())
		return util.PollVotes{}, err
	}

	votesMap := make(util.PollVotes, len(votes))

	for _, vote := range votes {
		voteCount := vote.VoteCount
		votesMap[vote.OptionID] = voteCount
	}

	return votesMap, nil
}

// GetVoteForUser gets user's vote for a poll
func (s *VotingService) GetVoteForUser(c *gin.Context, poll_id uuid.UUID, userId uuid.UUID) (uuid.UUID, error) {
	optionId, err := s.Queries.GetUserOptionIdByPollId(c, repository.GetUserOptionIdByPollIdParams{PollID: poll_id, UserID: userId})
	if err != nil {
		// no rows = hasn't voted yet
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, nil
		}
		// actual error
		log.Printf("Failed to fetch vote for user %s on poll %s: %v", userId, poll_id, err)
		return uuid.Nil, err
	}

	return optionId, nil
}
