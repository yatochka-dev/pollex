package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yatochka-dev/pollex/core-svc/internal/dto"
	"github.com/yatochka-dev/pollex/core-svc/internal/middleware"
	"github.com/yatochka-dev/pollex/core-svc/internal/pubsub"
	"github.com/yatochka-dev/pollex/core-svc/internal/service"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

type VoteHandler struct {
	svc    *service.VotingService
	broker *pubsub.Broker
}

type VoteOnPoll struct {
	OptionId string `json:"option_id" binding:"required"`
}

func NewVoteHandler(svc *service.VotingService, broker *pubsub.Broker) *VoteHandler {
	return &VoteHandler{
		svc:    svc,
		broker: broker,
	}
}

func (h *VoteHandler) Vote(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	var input VoteOnPoll

	if err := c.ShouldBindJSON(&input); err != nil {
		logger.LogError(err, "bind_json")
		ErrorResponse(c, http.StatusBadRequest, "Invalid request")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	userId, err := middleware.GetUserID(c)
	if err != nil {
		logger.LogError(err, "get_user_id")
		ErrorResponse(c, http.StatusUnauthorized, "Not logged in")
		logger.LogEnd(http.StatusUnauthorized)
		return
	}

	logger.SetUserID(userId)

	optionId, err := uuid.Parse(input.OptionId)
	if err != nil {
		logger.LogError(err, "parse_option_id")
		ErrorResponse(c, http.StatusBadRequest, "bad option ID")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.LogStart(map[string]interface{}{"option_id": optionId.String()})

	err = h.svc.Vote(c, optionId, userId)
	if err != nil {
		logger.LogError(err, "vote_failed")
		ErrorResponse(c, http.StatusInternalServerError, "vote failed")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	log.Printf("%s[VOTE]%s Vote recorded | user=%s%s%s | option=%s%s%s",
		util.ColorGreen+util.ColorBold, util.ColorReset,
		util.ColorCyan, userId.String()[:8], util.ColorReset,
		util.ColorMagenta, optionId.String()[:8], util.ColorReset)
	OkResponse(c, gin.H{"message": "Vote Successful!"})
	logger.LogEnd(http.StatusOK)
}

func (h *VoteHandler) GetVotes(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	id_raw := c.Param("pollId")

	pollId, err := uuid.Parse(id_raw)
	if err != nil {
		logger.LogError(err, "parse_poll_id")
		ErrorResponse(c, http.StatusBadRequest, "Invalid poll ID")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.LogStart(map[string]interface{}{"poll_id": pollId.String()})

	vu, err := h.svc.GetVoteUpdate(c, pollId)
	if err != nil {
		logger.LogError(err, "get_vote_update")
		ErrorResponse(c, http.StatusInternalServerError, "Failed to get poll data")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	msg, err := dto.FormatSSEEvent(pubsub.NewVoteEvent(vu.Poll, vu.Options, vu.Votes, vu.UserVotedFor))
	if err != nil {
		logger.LogError(err, "format_event")
		ErrorResponse(c, http.StatusInternalServerError, "Failed to format data")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	var voteData dto.VoteEventData
	if err := json.Unmarshal([]byte(msg.Data), &voteData); err != nil {
		logger.LogError(err, "unmarshal_vote_data")
		ErrorResponse(c, http.StatusInternalServerError, "parse error")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	OkResponse(c, voteData)
	logger.LogEnd(http.StatusOK, map[string]interface{}{"total_votes": voteData.TotalVotes})
}

// SubscribeVotes - SSE endpoint (this shit took forever to get working)
func (handler *VoteHandler) SubscribeVotes(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	pollID := c.Param("pollId")

	logger.LogStart(map[string]interface{}{"poll_id": pollID})

	if handler.broker == nil {
		logger.LogError(nil, "broker_not_initialized")
		ErrorResponse(c, http.StatusInternalServerError, "broker not initialized")
		return
	}

	// validate poll ID
	pollUUID, err := uuid.Parse(pollID)
	if err != nil {
		logger.LogError(err, "invalid_poll_id")
		ErrorResponse(c, http.StatusBadRequest, "bad poll ID")
		return
	}

	// SSE headers - don't fucking touch these they finally work
	h := c.Writer.Header()
	h.Set("Content-Type", "text/event-stream")
	h.Set("Cache-Control", "no-cache")
	h.Set("Connection", "keep-alive")
	h.Set("X-Accel-Buffering", "no")

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		ErrorResponse(c, http.StatusInternalServerError, "Flusher not supported")
		return
	}

	// Subscribe (this auto-sends viewer count now)
	events, cancel := handler.broker.Subscribe(c.Request.Context(), pollID, 32)
	defer cancel()

	log.Printf("%s[SSE]%s New subscriber | poll=%s%s%s | active=%s%d%s",
		util.ColorBlue+util.ColorBold, util.ColorReset,
		util.ColorMagenta, pollID[:8], util.ColorReset,
		util.ColorCyan, handler.broker.ActiveSubscribers(pollID), util.ColorReset)

	// connection confirmation
	c.Writer.Write([]byte(": connected\n\n"))
	flusher.Flush()

	// heartbeat every 25s
	heartbeat := time.NewTicker(25 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case event, ok := <-events:
			if !ok {
				log.Printf("%s[SSE]%s Channel closed | poll=%s%s%s",
					util.ColorYellow+util.ColorBold, util.ColorReset,
					util.ColorMagenta, pollID[:8], util.ColorReset)
				return
			}

			msg, err := dto.FormatSSEEvent(event)
			if err != nil {
				log.Printf("%s[SSE ERROR]%s Failed to format event: %v",
					util.ColorRed+util.ColorBold, util.ColorReset, err)
				continue
			}

			sseData := dto.WriteSSE(msg)
			c.Writer.Write(sseData)
			flusher.Flush()

		case <-heartbeat.C:
			// ping
			c.Writer.Write([]byte(": ping\n\n"))
			flusher.Flush()

			// send viewer count on heartbeat
			handler.broker.PublishViewersUpdate(pollUUID)

		case <-c.Request.Context().Done():
			log.Printf("%s[SSE]%s Client disconnected | poll=%s%s%s",
				util.ColorYellow+util.ColorBold, util.ColorReset,
				util.ColorMagenta, pollID[:8], util.ColorReset)
			return
		}
	}
}

func (h *VoteHandler) GetOptionVotedFor(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	poll_id_raw := c.Param("pollId")

	poll_id, err := uuid.Parse(poll_id_raw)
	if err != nil {
		logger.LogError(err, "parse_poll_id")
		ErrorResponse(c, http.StatusBadRequest, "Invalid poll ID")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	userId, err := middleware.GetUserID(c)
	if err != nil {
		logger.LogError(err, "get_user_id")
		ErrorResponse(c, http.StatusUnauthorized, "not logged in")
		logger.LogEnd(http.StatusUnauthorized)
		return
	}

	logger.SetUserID(userId)
	logger.LogStart(map[string]interface{}{"poll_id": poll_id.String()})

	optionId, err := h.svc.GetVoteForUser(c, poll_id, userId)
	if err != nil {
		logger.LogError(err, "get_vote_for_user")
		ErrorResponse(c, http.StatusInternalServerError, "error getting vote")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	// user hasn't voted
	if optionId == uuid.Nil {
		OkResponse(c, gin.H{
			"option_id": nil,
		})
		logger.LogEnd(http.StatusOK, map[string]interface{}{"has_voted": false})
		return
	}

	OkResponse(c, gin.H{
		"option_id": optionId.String(),
	})
	logger.LogEnd(http.StatusOK, map[string]interface{}{"option_id": optionId.String()})
}

func RegisterVoteRoutes(r *gin.Engine, svc *service.VotingService, broker *pubsub.Broker) {
	handler := NewVoteHandler(svc, broker)

	voting := r.Group("/polls/votes")

	voting.GET("/:pollId", handler.GetVotes)
	voting.GET("/:pollId/subscribe", handler.SubscribeVotes)

	protected := voting.Group("/")
	protected.Use(middleware.AuthMiddleware())
	protected.POST("", handler.Vote)
	protected.GET(":pollId/vote", handler.GetOptionVotedFor)

}
