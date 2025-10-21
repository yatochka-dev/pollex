package dto

import (
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/yatochka-dev/pollex/core-svc/internal/pubsub"
)

// SSEMessage represents a Server-Sent Event message
type SSEMessage struct {
	Event string `json:"-"` // Event type (vote, viewers, etc.)
	Data  string `json:"-"` // JSON data to send
}

// VoteEventData is the JSON structure sent for vote updates
type VoteEventData struct {
	ID         uuid.UUID          `json:"id"`
	Question   string             `json:"question"`
	CreatedAt  pgtype.Timestamptz `json:"createdAt"`
	Closed     bool               `json:"closed"`
	TotalVotes uint64             `json:"totalVotes"`
	Options    []OptionData       `json:"options"`
}

// OptionData represents a poll option with vote count
type OptionData struct {
	ID    uuid.UUID `json:"id"`
	Label string    `json:"label"`
	Votes int64     `json:"votes"`
}

// ViewersEventData is the JSON structure sent for viewer count updates
type ViewersEventData struct {
	PollID      uuid.UUID `json:"pollId"`
	ViewerCount int       `json:"viewerCount"`
}

// FormatSSEEvent converts a pubsub.Event into an SSE message
func FormatSSEEvent(event pubsub.Event) (SSEMessage, error) {
	switch event.Type {
	case pubsub.EventTypeVote:
		return formatVoteEvent(event.Vote)
	case pubsub.EventTypeViewers:
		return formatViewersEvent(event.Viewers)
	default:
		return SSEMessage{}, nil
	}
}

// formatVoteEvent converts a VoteUpdate into an SSE message
func formatVoteEvent(vote *pubsub.VoteUpdate) (SSEMessage, error) {
	if vote == nil {
		return SSEMessage{}, nil
	}

	// Calculate total votes
	totalVotes := uint64(0)
	for _, count := range vote.Votes {
		totalVotes += uint64(count)
	}

	// Build options with vote counts
	options := make([]OptionData, 0, len(vote.Options))
	for _, opt := range vote.Options {
		count := vote.Votes[opt.ID]
		options = append(options, OptionData{
			ID:    opt.ID,
			Label: opt.Label,
			Votes: count,
		})
	}

	// Create the event data
	data := VoteEventData{
		ID:         vote.Poll.ID,
		Question:   vote.Poll.Question,
		CreatedAt:  vote.Poll.CreatedAt,
		Closed:     vote.Poll.Closed,
		TotalVotes: totalVotes,
		Options:    options,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return SSEMessage{}, err
	}

	return SSEMessage{
		Event: string(pubsub.EventTypeVote),
		Data:  string(jsonData),
	}, nil
}

// formatViewersEvent converts a ViewersUpdate into an SSE message
func formatViewersEvent(viewers *pubsub.ViewersUpdate) (SSEMessage, error) {
	if viewers == nil {
		return SSEMessage{}, nil
	}

	data := ViewersEventData{
		PollID:      viewers.PollID,
		ViewerCount: viewers.ViewerCount,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return SSEMessage{}, err
	}

	return SSEMessage{
		Event: string(pubsub.EventTypeViewers),
		Data:  string(jsonData),
	}, nil
}

// WriteSSE formats and writes an SSE message to a byte slice
func WriteSSE(msg SSEMessage) []byte {
	var result []byte

	if msg.Event != "" {
		result = append(result, []byte("event: "+msg.Event+"\n")...)
	}

	if msg.Data != "" {
		result = append(result, []byte("data: "+msg.Data+"\n")...)
	}

	result = append(result, '\n')
	return result
}
