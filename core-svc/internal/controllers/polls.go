package controllers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/middleware"
	"github.com/yatochka-dev/pollex/core-svc/internal/service"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

type PollsHandler struct {
	Queries     *repository.Queries
	AuthService *service.AuthService
}

type CreatePollInput struct {
	Question string   `json:"question" binding:"required"`
	Options  []string `json:"options" binding:"required"`
}

type FullPoll struct {
	repository.Poll
	Options []repository.PollOption `json:"options"`
}

func NewPollsHandler(queries *repository.Queries, service *service.AuthService) *PollsHandler {
	return &PollsHandler{
		Queries:     queries,
		AuthService: service,
	}
}

func (h *PollsHandler) Create(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	var data CreatePollInput

	if err := c.ShouldBindJSON(&data); err != nil {
		logger.LogError(err, "bind_json")
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	userId, err := middleware.GetUserID(c)
	if err != nil {
		logger.LogError(err, "get_user_id")
		ErrorResponse(c, http.StatusForbidden, "Not Authorized")
		logger.LogEnd(http.StatusForbidden)
		return
	}

	logger.SetUserID(userId)
	logger.LogStart(map[string]interface{}{"question": data.Question, "options_count": len(data.Options)})

	// Check if user's email is verified
	user, err := h.Queries.GetUserByID(c.Request.Context(), userId)
	if err != nil {
		logger.LogError(err, "get_user_by_id")
		ErrorResponse(c, http.StatusInternalServerError, "Failed to verify user status")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	if !user.EmailVerifiedAt.Valid {
		logger.LogError(nil, "email_not_verified")
		ErrorResponse(c, http.StatusForbidden, "Email verification required. Please verify your email before creating polls.")
		logger.LogEnd(http.StatusForbidden)
		return
	}

	p, err := h.Queries.CreatePollWithOptions(c.Request.Context(), repository.CreatePollWithOptionsParams{
		Question: data.Question,
		UserID:   userId,
		Options:  data.Options,
	})

	if err != nil {
		logger.LogError(err, "create_poll_with_options")
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	log.Printf("%s[POLL]%s Poll created | user=%s%s%s | poll_id=%s%s%s | question=%s%s%s | options=%s%d%s",
		util.ColorGreen+util.ColorBold, util.ColorReset,
		util.ColorCyan, userId.String()[:8], util.ColorReset,
		util.ColorMagenta, p.ID.String()[:8], util.ColorReset,
		util.ColorYellow, data.Question, util.ColorReset,
		util.ColorGreen, len(data.Options), util.ColorReset)
	OkResponse(c, p)
	logger.LogEnd(http.StatusOK, map[string]interface{}{"poll_id": p.ID})
}

func (h *PollsHandler) Get(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	id := c.Param("id")

	pollId, err := uuid.Parse(id)
	if err != nil {
		logger.LogError(err, "parse_poll_id")
		ErrorResponse(c, http.StatusBadRequest, "Invalid poll ID format")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	userId, err := middleware.GetUserID(c)
	if err != nil {
		logger.LogError(err, "get_user_id")
		ErrorResponse(c, http.StatusForbidden, "Not Authorized")
		logger.LogEnd(http.StatusForbidden)
		return
	}

	logger.SetUserID(userId)
	logger.LogStart(map[string]interface{}{"poll_id": pollId.String()})

	pollRow, err := h.Queries.GetPollByID(c.Request.Context(), pollId)
	if err != nil {
		logger.LogError(err, "get_poll_by_id")
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	optRows, err := h.Queries.ListOptionsByPollID(c.Request.Context(), pollRow.ID)
	if err != nil {
		logger.LogError(err, "list_options_by_poll_id")
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	poll := FullPoll{
		Poll:    pollRow,
		Options: optRows,
	}

	OkResponse(c, poll)
	logger.LogEnd(http.StatusOK, map[string]interface{}{"poll_id": pollId.String(), "options_count": len(optRows)})
}

// GetUserPolls - TODO cleanup later
func (h *PollsHandler) GetUserPolls(c *gin.Context) {
	logger := util.NewRequestLogger(c)

	userId, err := middleware.GetUserID(c)
	if err != nil {
		logger.LogError(err, "get_user_id")
		ErrorResponse(c, http.StatusForbidden, "Not Authorized")
		logger.LogEnd(http.StatusForbidden)
		return
	}

	logger.SetUserID(userId)
	logger.LogStart(map[string]interface{}{"user_id": userId.String()})

	polls, err := h.Queries.GetPollsByUserID(c.Request.Context(), userId)
	if err != nil {
		logger.LogError(err, "get_polls_by_user_id")
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	log.Printf("%s[POLLS]%s User polls retrieved | user=%s%s%s | polls_count=%s%d%s",
		util.ColorGreen+util.ColorBold, util.ColorReset,
		util.ColorCyan, userId.String()[:8], util.ColorReset,
		util.ColorMagenta, len(polls), util.ColorReset)
	OkResponse(c, polls)
	logger.LogEnd(http.StatusOK, map[string]interface{}{"polls_count": len(polls)})
}

func RegisterPollsRoutes(r *gin.Engine, queries *repository.Queries, config *util.Config, emailService *service.EmailService) {

	AuthService := service.NewAuthService(config, queries, service.NewTokenService(config), emailService)
	handler := NewPollsHandler(queries, AuthService)

	pollsRoutes := r.Group("/polls").Use(middleware.AuthMiddleware())

	{
		pollsRoutes.POST("", handler.Create)
		pollsRoutes.GET("/:id", handler.Get)
		pollsRoutes.GET("", handler.GetUserPolls)
	}
}
