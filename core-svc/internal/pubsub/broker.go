package pubsub

import (
	"context"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

// EventType represents the type of SSE event
type EventType string

const (
	EventTypeVote    EventType = "vote"
	EventTypeViewers EventType = "viewers"
)

// VoteUpdate contains all data needed for a vote update event
type VoteUpdate struct {
	Poll         repository.Poll
	Options      []repository.PollOption
	Votes        util.PollVotes
	UserVotedFor *uuid.UUID // pointer to allow nil
}

// ViewersUpdate contains the current viewer count for a poll
type ViewersUpdate struct {
	PollID      uuid.UUID
	ViewerCount int
}

// Event is a union type for all possible SSE events
type Event struct {
	Type    EventType
	Vote    *VoteUpdate
	Viewers *ViewersUpdate
}

// NewVoteEvent creates a new vote update event
func NewVoteEvent(poll repository.Poll, options []repository.PollOption, votes util.PollVotes, userVotedFor *uuid.UUID) Event {
	return Event{
		Type: EventTypeVote,
		Vote: &VoteUpdate{
			Poll:         poll,
			Options:      options,
			Votes:        votes,
			UserVotedFor: userVotedFor,
		},
	}
}

// NewViewersEvent creates a new viewers update event
func NewViewersEvent(pollID uuid.UUID, count int) Event {
	return Event{
		Type: EventTypeViewers,
		Viewers: &ViewersUpdate{
			PollID:      pollID,
			ViewerCount: count,
		},
	}
}

type subscriber struct {
	ch   chan Event
	done chan struct{}
}

type Broker struct {
	mu   sync.RWMutex
	subs map[string]map[*subscriber]struct{}
}

func NewBroker() *Broker {
	return &Broker{
		subs: make(map[string]map[*subscriber]struct{}),
	}
}

func canon(s string) string {
	return strings.ToLower(s)
}

func (b *Broker) Subscribe(ctx context.Context, pollID string, buf int) (<-chan Event, func()) {
	key := canon(pollID)
	s := &subscriber{
		ch:   make(chan Event, buf),
		done: make(chan struct{}),
	}

	b.mu.Lock()
	if b.subs[key] == nil {
		b.subs[key] = make(map[*subscriber]struct{})
	}
	b.subs[key][s] = struct{}{}
	b.mu.Unlock()

	// Notify all subscribers about the new viewer count
	go func() {
		pollUUID, err := uuid.Parse(pollID)
		if err == nil {
			b.PublishViewersUpdate(pollUUID)
		}
	}()

	cancel := func() {
		b.mu.Lock()
		set, ok := b.subs[key]
		if ok {
			if _, ok := set[s]; ok {
				delete(set, s)
				// closing ch signals the stream loop to exit
				close(s.ch)
				close(s.done)
				if len(set) == 0 {
					delete(b.subs, key)
				} else {
					// Notify remaining subscribers about updated viewer count
					pollUUID, err := uuid.Parse(pollID)
					b.mu.Unlock()
					if err == nil {
						b.PublishViewersUpdate(pollUUID)
					}
					return
				}
			}
		}
		b.mu.Unlock()
	}

	// Auto-unsubscribe on ctx cancel.
	go func() {
		select {
		case <-ctx.Done():
			cancel()
		case <-s.done:
		}
	}()

	return s.ch, cancel
}

// Publish sends an event to all subscribers of a poll
func (b *Broker) Publish(pollID uuid.UUID, event Event) {
	key := canon(pollID.String())
	b.mu.RLock()
	set := b.subs[key]

	targets := make([]*subscriber, 0, len(set))
	for s := range set {
		targets = append(targets, s)
	}
	b.mu.RUnlock()

	for _, s := range targets {
		select {
		case s.ch <- event:
		default:
			// Channel full, skip this subscriber
		}
	}
}

// PublishVoteUpdate is a convenience method for publishing vote updates
func (b *Broker) PublishVoteUpdate(poll repository.Poll, options []repository.PollOption, votes util.PollVotes, userVotedFor *uuid.UUID) {
	event := NewVoteEvent(poll, options, votes, userVotedFor)
	b.Publish(poll.ID, event)
}

// PublishViewersUpdate sends the current viewer count to all subscribers
func (b *Broker) PublishViewersUpdate(pollID uuid.UUID) {
	count := b.ActiveSubscribers(pollID.String())
	event := NewViewersEvent(pollID, count)
	b.Publish(pollID, event)
}

func (b *Broker) ActiveSubscribers(pollID string) int {
	key := canon(pollID)
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.subs[key])
}
