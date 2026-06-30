package pubsub

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

func readEvent(t *testing.T, ch <-chan Event) Event {
	t.Helper()

	select {
	case event, ok := <-ch:
		if !ok {
			t.Fatal("event channel closed before receiving event")
		}
		return event
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for event")
		return Event{}
	}
}

func readEventType(t *testing.T, ch <-chan Event, eventType EventType) Event {
	t.Helper()

	deadline := time.After(time.Second)
	for {
		select {
		case event, ok := <-ch:
			if !ok {
				t.Fatalf("event channel closed before receiving %q event", eventType)
			}
			if event.Type == eventType {
				return event
			}
		case <-deadline:
			t.Fatalf("timed out waiting for %q event", eventType)
			return Event{}
		}
	}
}

func requireChannelClosed(t *testing.T, ch <-chan Event) {
	t.Helper()

	deadline := time.After(time.Second)
	for {
		select {
		case _, ok := <-ch:
			if !ok {
				return
			}
		case <-deadline:
			t.Fatal("timed out waiting for channel to close")
		}
	}
}

func TestBrokerSubscribeTracksActiveSubscribersByPoll(t *testing.T) {
	broker := NewBroker()
	pollID := uuid.New()

	ctx := context.Background()
	ch1, cancel1 := broker.Subscribe(ctx, pollID.String(), 4)
	defer cancel1()
	if got := broker.ActiveSubscribers(pollID.String()); got != 1 {
		t.Fatalf("ActiveSubscribers after first subscribe = %d, want 1", got)
	}

	ch2, cancel2 := broker.Subscribe(ctx, pollID.String(), 4)
	defer cancel2()
	if got := broker.ActiveSubscribers(pollID.String()); got != 2 {
		t.Fatalf("ActiveSubscribers after second subscribe = %d, want 2", got)
	}

	cancel1()
	if got := broker.ActiveSubscribers(pollID.String()); got != 1 {
		t.Fatalf("ActiveSubscribers after cancel = %d, want 1", got)
	}

	cancel2()
	if got := broker.ActiveSubscribers(pollID.String()); got != 0 {
		t.Fatalf("ActiveSubscribers after final cancel = %d, want 0", got)
	}

	requireChannelClosed(t, ch1)
	requireChannelClosed(t, ch2)
}

func TestBrokerPublishesVoteUpdatesToMatchingPollOnly(t *testing.T) {
	broker := NewBroker()
	pollID := uuid.New()
	otherPollID := uuid.New()

	matching, cancelMatching := broker.Subscribe(context.Background(), pollID.String(), 4)
	defer cancelMatching()
	other, cancelOther := broker.Subscribe(context.Background(), otherPollID.String(), 4)
	defer cancelOther()

	poll := repository.Poll{ID: pollID, Question: "Best option?"}
	optionID := uuid.New()
	options := []repository.PollOption{{ID: optionID, PollID: pollID, Label: "A"}}
	votes := util.PollVotes{optionID: 3}
	userVote := optionID

	broker.PublishVoteUpdate(poll, options, votes, &userVote)

	event := readEventType(t, matching, EventTypeVote)
	if event.Type != EventTypeVote {
		t.Fatalf("event.Type = %q, want %q", event.Type, EventTypeVote)
	}
	if event.Vote == nil {
		t.Fatal("event.Vote is nil")
	}
	if event.Vote.Poll.ID != pollID {
		t.Fatalf("event poll ID = %s, want %s", event.Vote.Poll.ID, pollID)
	}
	if event.Vote.Votes[optionID] != 3 {
		t.Fatalf("vote count = %d, want 3", event.Vote.Votes[optionID])
	}
	if event.Vote.UserVotedFor == nil || *event.Vote.UserVotedFor != optionID {
		t.Fatalf("UserVotedFor = %v, want %s", event.Vote.UserVotedFor, optionID)
	}

	select {
	case event := <-other:
		if event.Type == EventTypeVote {
			t.Fatalf("received vote event for non-matching poll: %#v", event)
		}
	case <-time.After(50 * time.Millisecond):
	}
}

func TestBrokerContextCancellationUnsubscribes(t *testing.T) {
	broker := NewBroker()
	pollID := uuid.New()
	ctx, cancel := context.WithCancel(context.Background())

	ch, unsubscribe := broker.Subscribe(ctx, pollID.String(), 1)
	defer unsubscribe()

	if got := broker.ActiveSubscribers(pollID.String()); got != 1 {
		t.Fatalf("ActiveSubscribers = %d, want 1", got)
	}

	cancel()

	select {
	case _, ok := <-ch:
		if ok {
			t.Fatal("channel remained open after context cancellation")
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for context cancellation cleanup")
	}

	if got := broker.ActiveSubscribers(pollID.String()); got != 0 {
		t.Fatalf("ActiveSubscribers after context cancellation = %d, want 0", got)
	}
}
