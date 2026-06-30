package dto

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/pubsub"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

func TestFormatSSEEventVote(t *testing.T) {
	pollID := uuid.New()
	firstOptionID := uuid.New()
	secondOptionID := uuid.New()
	event := pubsub.NewVoteEvent(
		repository.Poll{ID: pollID, Question: "Ship it?", Closed: true},
		[]repository.PollOption{
			{ID: firstOptionID, PollID: pollID, Label: "Yes"},
			{ID: secondOptionID, PollID: pollID, Label: "No"},
		},
		util.PollVotes{
			firstOptionID:  5,
			secondOptionID: 2,
		},
		nil,
	)

	msg, err := FormatSSEEvent(event)
	if err != nil {
		t.Fatalf("FormatSSEEvent returned error: %v", err)
	}
	if msg.Event != "vote" {
		t.Fatalf("message event = %q, want vote", msg.Event)
	}

	var data VoteEventData
	if err := json.Unmarshal([]byte(msg.Data), &data); err != nil {
		t.Fatalf("vote event data was not valid JSON: %v", err)
	}
	if data.ID != pollID {
		t.Fatalf("poll ID = %s, want %s", data.ID, pollID)
	}
	if data.Question != "Ship it?" {
		t.Fatalf("question = %q, want Ship it?", data.Question)
	}
	if !data.Closed {
		t.Fatal("closed = false, want true")
	}
	if data.TotalVotes != 7 {
		t.Fatalf("total votes = %d, want 7", data.TotalVotes)
	}
	if len(data.Options) != 2 {
		t.Fatalf("option count = %d, want 2", len(data.Options))
	}
	if data.Options[0].Votes != 5 || data.Options[1].Votes != 2 {
		t.Fatalf("option votes = %#v, want 5 and 2", data.Options)
	}
}

func TestFormatSSEEventViewers(t *testing.T) {
	pollID := uuid.New()

	msg, err := FormatSSEEvent(pubsub.NewViewersEvent(pollID, 3))
	if err != nil {
		t.Fatalf("FormatSSEEvent returned error: %v", err)
	}
	if msg.Event != "viewers" {
		t.Fatalf("message event = %q, want viewers", msg.Event)
	}

	var data ViewersEventData
	if err := json.Unmarshal([]byte(msg.Data), &data); err != nil {
		t.Fatalf("viewers event data was not valid JSON: %v", err)
	}
	if data.PollID != pollID {
		t.Fatalf("poll ID = %s, want %s", data.PollID, pollID)
	}
	if data.ViewerCount != 3 {
		t.Fatalf("viewer count = %d, want 3", data.ViewerCount)
	}
}

func TestWriteSSE(t *testing.T) {
	got := string(WriteSSE(SSEMessage{
		Event: "vote",
		Data:  `{"totalVotes":3}`,
	}))

	for _, want := range []string{
		"event: vote\n",
		"data: {\"totalVotes\":3}\n",
		"\n",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("WriteSSE output %q did not contain %q", got, want)
		}
	}
}

func TestFormatSSEEventHandlesEmptyPayloads(t *testing.T) {
	tests := []pubsub.Event{
		{Type: pubsub.EventTypeVote},
		{Type: pubsub.EventTypeViewers},
		{Type: pubsub.EventType("unknown")},
	}

	for _, event := range tests {
		msg, err := FormatSSEEvent(event)
		if err != nil {
			t.Fatalf("FormatSSEEvent(%q) returned error: %v", event.Type, err)
		}
		if msg != (SSEMessage{}) {
			t.Fatalf("FormatSSEEvent(%q) = %#v, want empty message", event.Type, msg)
		}
	}
}
