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
	vote, err := s.Queries.CreateVote(c, repository.CreateVoteParams{UserID: userId, OptionID: optionId})

	if err != nil {
		println(err.Error())
		return err
	}

	votes, err := s.GetVotes(c, vote.PollID)
	if err != nil {
		return err
	}

	poll, options, err := s.GetPollData(c, vote.PollID)
	if err != nil {
		return err
	}

	// Publish vote update to all subscribers
	log.Printf("pub poll=%s active=%d", vote.PollID.String(), s.Broker.ActiveSubscribers(vote.PollID.String()))
	s.Broker.PublishVoteUpdate(poll, options, votes, &optionId)

	return nil
}

func (s *VotingService) GetPollData(c *gin.Context, pollId uuid.UUID) (repository.Poll, []repository.PollOption, error) {
	poll, err := s.Queries.GetPollByID(c, pollId)
	if err != nil {
		return repository.Poll{}, nil, err
	}

	options, err := s.Queries.ListOptionsByPollID(c, pollId)
	if err != nil {
		return repository.Poll{}, nil, err
	}

	return poll, options, nil
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

	votesMap := make(util.PollVotes, len(votes)) // second param (capacity) is for optimization

	for _, vote := range votes {
		voteCount := vote.VoteCount
		votesMap[vote.OptionID] = voteCount
	}

	return votesMap, nil
}

func (s *VotingService) GetVoteForUser(c *gin.Context, pollId uuid.UUID, userId uuid.UUID) (uuid.UUID, error) {
	optionId, err := s.Queries.GetUserOptionIdByPollId(c, repository.GetUserOptionIdByPollIdParams{PollID: pollId, UserID: userId})
	if err != nil {
		// No rows means user hasn't voted yet - this is expected behavior
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, nil
		}
		// Actual error occurred
		log.Printf("Failed to fetch vote for user %s on poll %s: %v", userId, pollId, err)
		return uuid.Nil, err
	}

	return optionId, nil
}
