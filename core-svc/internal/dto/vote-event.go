package dto

import (
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/yatochka-dev/pollex/core-svc/internal/pubsub"
)

// SSEMessage - Server-Sent Event format
type SSEMessage struct {
	Event string `json:"-"` // event type
	Data  string `json:"-"` // json data
}

// VoteEventData - vote update json structure
type VoteEventData struct {
	ID         uuid.UUID          `json:"id"`
	Question   string             `json:"question"`
	CreatedAt  pgtype.Timestamptz `json:"createdAt"`
	Closed     bool               `json:"closed"`
	TotalVotes uint64             `json:"totalVotes"`
	Options    []OptionData       `json:"options"`
}

// OptionData - poll option with votes
type OptionData struct {
	ID    uuid.UUID `json:"id"`
	Label string    `json:"label"`
	Votes int64     `json:"votes"`
}

// ViewersEventData viewer count
type ViewersEventData struct {
	PollID      uuid.UUID `json:"pollId"`
	ViewerCount int       `json:"viewerCount"`
}

// FormatSSEEvent - converts event to SSE message
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

func formatVoteEvent(vote *pubsub.VoteUpdate) (SSEMessage, error) {
	if vote == nil {
		return SSEMessage{}, nil
	}

	// calc total
	total := uint64(0)
	for _, count := range vote.Votes {
		total += uint64(count)
	}

	// build options array
	opts := make([]OptionData, 0, len(vote.Options))
	for _, opt := range vote.Options {
		cnt := vote.Votes[opt.ID]
		opts = append(opts, OptionData{
			ID:    opt.ID,
			Label: opt.Label,
			Votes: cnt,
		})
	}

	// create event data
	data := VoteEventData{
		ID:         vote.Poll.ID,
		Question:   vote.Poll.Question,
		CreatedAt:  vote.Poll.CreatedAt,
		Closed:     vote.Poll.Closed,
		TotalVotes: total,
		Options:    opts,
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

// WriteSSE formats SSE message to bytes
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
