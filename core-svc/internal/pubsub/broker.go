package pubsub

import (
	"context"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

// event types for SSE
type EventType string

const (
	EventTypeVote    EventType = "vote"
	EventTypeViewers EventType = "viewers"
)

// VoteUpdate - all the data for vote event
type VoteUpdate struct {
	Poll         repository.Poll
	Options      []repository.PollOption
	Votes        util.PollVotes
	UserVotedFor *uuid.UUID // can be nil
}

// ViewersUpdate has viewer count
type ViewersUpdate struct {
	PollID      uuid.UUID
	ViewerCount int
}

// Event union type thing
type Event struct {
	Type    EventType
	Vote    *VoteUpdate
	Viewers *ViewersUpdate
}

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
	subs map[string]map[*subscriber]struct{} // TODO maybe use a better structure?
}

func NewBroker() *Broker {
	return &Broker{
		subs: make(map[string]map[*subscriber]struct{}),
	}
}

// idk why but lowercase works better here 
func canon(s string) string {
	return strings.ToLower(s)
}

func (b *Broker) Subscribe(ctx context.Context, pollID string, bufferSize int) (<-chan Event, func()) {
	key := canon(pollID)
	sub := &subscriber{
		ch:   make(chan Event, bufferSize),
		done: make(chan struct{}),
	}

	b.mu.Lock()
	if b.subs[key] == nil {
		b.subs[key] = make(map[*subscriber]struct{})
	}
	b.subs[key][sub] = struct{}{}
	b.mu.Unlock()

	// send viewer count when someone connects
	go func() {
		pollUUID, err := uuid.Parse(pollID)
		if err == nil {
			b.PublishViewersUpdate(pollUUID)
		}
	}()

	cancel := func() {
		b.mu.Lock()
		subs2, ok := b.subs[key]
		if ok {
			if _, ok := subs2[sub]; ok {
				delete(subs2, sub)
				close(sub.ch)
				close(sub.done)
				if len(subs2) == 0 {
					delete(b.subs, key)
				} else {
					// update viewer count for remaining subs
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

	// cleanup when context cancelled
	go func() {
		select {
		case <-ctx.Done():
			cancel()
		case <-sub.done:
		}
	}()

	return sub.ch, cancel
}

// Publish - broadcasts event to all poll subscribers
func (b *Broker) Publish(pollID uuid.UUID, event Event) {
	key := canon(pollID.String())
	b.mu.RLock()
	set := b.subs[key]

	// collect all the subs
	stuff := make([]*subscriber, 0, len(set))
	for s := range set {
		stuff = append(stuff, s)
	}
	b.mu.RUnlock()

	for _, s := range stuff {
		select {
		case s.ch <- event:
		default:
			// channel full skip
		}
	}
}

// helper for vote updates
func (b *Broker) PublishVoteUpdate(p repository.Poll, opts []repository.PollOption, votes util.PollVotes, userVotedFor *uuid.UUID) {
	ev := NewVoteEvent(p, opts, votes, userVotedFor)
	b.Publish(p.ID, ev)
}

// PublishViewersUpdate sends viewer count
func (b *Broker) PublishViewersUpdate(poll_id uuid.UUID) {
	cnt := b.ActiveSubscribers(poll_id.String())
	event := NewViewersEvent(poll_id, cnt)
	b.Publish(poll_id, event)
}

func (b *Broker) ActiveSubscribers(pollID string) int {
	key := canon(pollID)
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.subs[key])
}
