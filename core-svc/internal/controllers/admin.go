package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/middleware"
	"github.com/yatochka-dev/pollex/core-svc/internal/service"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

// AuditLogDTO is a data transfer object for audit logs with proper JSON serialization
type AuditLogDTO struct {
	ID          string                 `json:"id"`
	ActorUserID string                 `json:"actor_user_id"`
	ActorName   string                 `json:"actor_name"`
	ActorEmail  string                 `json:"actor_email"`
	Action      string                 `json:"action"`
	SubjectType string                 `json:"subject_type"`
	SubjectID   *string                `json:"subject_id"`
	Meta        map[string]interface{} `json:"meta"`
	CreatedAt   string                 `json:"created_at"`
}

// convertAuditLogRow converts a repository audit log row to a DTO
func convertAuditLogRow(row repository.ListAuditLogsRow) AuditLogDTO {
	var subjectID *string
	if row.SubjectID.Valid {
		id := uuid.UUID(row.SubjectID.Bytes).String()
		subjectID = &id
	}

	var meta map[string]interface{}
	if len(row.Meta) > 0 {
		_ = json.Unmarshal(row.Meta, &meta)
	}

	actorName := ""
	if row.ActorName.Valid {
		actorName = row.ActorName.String
	}

	actorEmail := ""
	if row.ActorEmail.Valid {
		actorEmail = row.ActorEmail.String
	}

	return AuditLogDTO{
		ID:          row.ID.String(),
		ActorUserID: row.ActorUserID.String(),
		ActorName:   actorName,
		ActorEmail:  actorEmail,
		Action:      row.Action,
		SubjectType: row.SubjectType,
		SubjectID:   subjectID,
		Meta:        meta,
		CreatedAt:   row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// convertAuditLogsByActorRow converts a repository audit log by actor row to a DTO
func convertAuditLogsByActorRow(row repository.ListAuditLogsByActorRow) AuditLogDTO {
	var subjectID *string
	if row.SubjectID.Valid {
		id := uuid.UUID(row.SubjectID.Bytes).String()
		subjectID = &id
	}

	var meta map[string]interface{}
	if len(row.Meta) > 0 {
		_ = json.Unmarshal(row.Meta, &meta)
	}

	actorName := ""
	if row.ActorName.Valid {
		actorName = row.ActorName.String
	}

	actorEmail := ""
	if row.ActorEmail.Valid {
		actorEmail = row.ActorEmail.String
	}

	return AuditLogDTO{
		ID:          row.ID.String(),
		ActorUserID: row.ActorUserID.String(),
		ActorName:   actorName,
		ActorEmail:  actorEmail,
		Action:      row.Action,
		SubjectType: row.SubjectType,
		SubjectID:   subjectID,
		Meta:        meta,
		CreatedAt:   row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// convertAuditLogsByActionRow converts a repository audit log by action row to a DTO
func convertAuditLogsByActionRow(row repository.ListAuditLogsByActionRow) AuditLogDTO {
	var subjectID *string
	if row.SubjectID.Valid {
		id := uuid.UUID(row.SubjectID.Bytes).String()
		subjectID = &id
	}

	var meta map[string]interface{}
	if len(row.Meta) > 0 {
		_ = json.Unmarshal(row.Meta, &meta)
	}

	actorName := ""
	if row.ActorName.Valid {
		actorName = row.ActorName.String
	}

	actorEmail := ""
	if row.ActorEmail.Valid {
		actorEmail = row.ActorEmail.String
	}

	return AuditLogDTO{
		ID:          row.ID.String(),
		ActorUserID: row.ActorUserID.String(),
		ActorName:   actorName,
		ActorEmail:  actorEmail,
		Action:      row.Action,
		SubjectType: row.SubjectType,
		SubjectID:   subjectID,
		Meta:        meta,
		CreatedAt:   row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

type AdminHandler struct {
	AdminService *service.AdminService
	AuditService *service.AuditService
	Queries      *repository.Queries
}

func NewAdminHandler(adminService *service.AdminService, auditService *service.AuditService, queries *repository.Queries) *AdminHandler {
	return &AdminHandler{
		AdminService: adminService,
		AuditService: auditService,
		Queries:      queries,
	}
}

// ===================== USER MANAGEMENT =====================

// ListUsers returns all users with pagination
func (h *AdminHandler) ListUsers(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	actorID, _ := middleware.GetUserID(c)
	logger.SetUserID(actorID)
	logger.LogStart()

	// Parse pagination parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	if limit > 100 {
		limit = 100 // Cap at 100
	}
	if limit < 1 {
		limit = 50
	}

	response, err := h.AdminService.ListUsers(c.Request.Context(), service.ListUsersInput{
		Limit:  int32(limit),
		Offset: int32(offset),
	})

	if err != nil {
		logger.LogError(err, "list_users_failed")
		ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve users")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	log.Printf("%s[ADMIN]%s Users listed | actor=%s%s%s | count=%s%d%s | total=%s%d%s",
		util.ColorGreen+util.ColorBold, util.ColorReset,
		util.ColorCyan, actorID.String()[:8], util.ColorReset,
		util.ColorMagenta, len(response.Users), util.ColorReset,
		util.ColorYellow, response.Total, util.ColorReset)

	OkResponse(c, response)
	logger.LogEnd(http.StatusOK, map[string]interface{}{"user_count": len(response.Users)})
}

// GetUser returns a specific user by ID
func (h *AdminHandler) GetUser(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	actorID, _ := middleware.GetUserID(c)
	logger.SetUserID(actorID)

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		logger.LogError(err, "parse_user_id")
		ErrorResponse(c, http.StatusBadRequest, "Invalid user ID format")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.LogStart(map[string]interface{}{"target_user_id": userID.String()})

	user, err := h.Queries.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		logger.LogError(err, "get_user_failed")
		ErrorResponse(c, http.StatusNotFound, "User not found")
		logger.LogEnd(http.StatusNotFound)
		return
	}

	OkResponse(c, user)
	logger.LogEnd(http.StatusOK)
}

type UpdateUserRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// UpdateUserRole changes a user's role
func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	actorID, _ := middleware.GetUserID(c)
	logger.SetUserID(actorID)

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		logger.LogError(err, "parse_user_id")
		ErrorResponse(c, http.StatusBadRequest, "Invalid user ID format")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	var req UpdateUserRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.LogError(err, "bind_json")
		ErrorResponse(c, http.StatusBadRequest, "Invalid request body")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	// Validate role
	var newRole repository.UserRole
	switch req.Role {
	case "user":
		newRole = repository.UserRoleUser
	case "admin":
		newRole = repository.UserRoleAdmin
	default:
		ErrorResponse(c, http.StatusBadRequest, "Invalid role. Must be 'user' or 'admin'")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.LogStart(map[string]interface{}{"target_user_id": userID.String(), "new_role": req.Role})

	updatedUser, err := h.AdminService.UpdateUserRole(c.Request.Context(), service.UpdateUserRoleInput{
		ActorUserID:  actorID,
		TargetUserID: userID,
		NewRole:      newRole,
	})

	if err != nil {
		if err == util.ErrLastAdmin {
			logger.LogError(err, "last_admin_protection")
			ErrorResponse(c, http.StatusForbidden, "Cannot demote the last admin")
			logger.LogEnd(http.StatusForbidden)
			return
		}
		logger.LogError(err, "update_role_failed")
		ErrorResponse(c, http.StatusInternalServerError, "Failed to update user role")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	log.Printf("%s[ADMIN]%s User role updated | actor=%s%s%s | target=%s%s%s | new_role=%s%s%s",
		util.ColorGreen+util.ColorBold, util.ColorReset,
		util.ColorCyan, actorID.String()[:8], util.ColorReset,
		util.ColorMagenta, userID.String()[:8], util.ColorReset,
		util.ColorYellow, req.Role, util.ColorReset)

	OkResponse(c, updatedUser)
	logger.LogEnd(http.StatusOK)
}

type UpdateUserNameRequest struct {
	Name string `json:"name" binding:"required"`
}

// UpdateUserName changes a user's name
func (h *AdminHandler) UpdateUserName(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	actorID, _ := middleware.GetUserID(c)
	logger.SetUserID(actorID)

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		logger.LogError(err, "parse_user_id")
		ErrorResponse(c, http.StatusBadRequest, "Invalid user ID format")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	var req UpdateUserNameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.LogError(err, "bind_json")
		ErrorResponse(c, http.StatusBadRequest, "Invalid request body")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.LogStart(map[string]interface{}{"target_user_id": userID.String(), "new_name": req.Name})

	updatedUser, err := h.AdminService.UpdateUserName(c.Request.Context(), service.UpdateUserNameInput{
		ActorUserID:  actorID,
		TargetUserID: userID,
		NewName:      req.Name,
	})

	if err != nil {
		logger.LogError(err, "update_name_failed")
		ErrorResponse(c, http.StatusInternalServerError, "Failed to update user name")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	log.Printf("%s[ADMIN]%s User name updated | actor=%s%s%s | target=%s%s%s",
		util.ColorGreen+util.ColorBold, util.ColorReset,
		util.ColorCyan, actorID.String()[:8], util.ColorReset,
		util.ColorMagenta, userID.String()[:8], util.ColorReset)

	OkResponse(c, updatedUser)
	logger.LogEnd(http.StatusOK)
}

type ResetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=6"`
}

// ResetUserPassword resets a user's password
func (h *AdminHandler) ResetUserPassword(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	actorID, _ := middleware.GetUserID(c)
	logger.SetUserID(actorID)

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		logger.LogError(err, "parse_user_id")
		ErrorResponse(c, http.StatusBadRequest, "Invalid user ID format")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.LogError(err, "bind_json")
		ErrorResponse(c, http.StatusBadRequest, "Invalid request body. Password must be at least 6 characters")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.LogStart(map[string]interface{}{"target_user_id": userID.String()})

	err = h.AdminService.ResetUserPassword(c.Request.Context(), service.ResetUserPasswordInput{
		ActorUserID:  actorID,
		TargetUserID: userID,
		NewPassword:  req.Password,
	})

	if err != nil {
		logger.LogError(err, "reset_password_failed")
		ErrorResponse(c, http.StatusInternalServerError, "Failed to reset password")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	log.Printf("%s[ADMIN]%s User password reset | actor=%s%s%s | target=%s%s%s",
		util.ColorGreen+util.ColorBold, util.ColorReset,
		util.ColorCyan, actorID.String()[:8], util.ColorReset,
		util.ColorMagenta, userID.String()[:8], util.ColorReset)

	OkResponse(c, gin.H{"message": "Password reset successfully"})
	logger.LogEnd(http.StatusOK)
}

// DeleteUser removes a user from the system
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	actorID, _ := middleware.GetUserID(c)
	logger.SetUserID(actorID)

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		logger.LogError(err, "parse_user_id")
		ErrorResponse(c, http.StatusBadRequest, "Invalid user ID format")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	// Prevent self-deletion
	if userID == actorID {
		ErrorResponse(c, http.StatusForbidden, "Cannot delete your own account")
		logger.LogEnd(http.StatusForbidden)
		return
	}

	logger.LogStart(map[string]interface{}{"target_user_id": userID.String()})

	err = h.AdminService.DeleteUser(c.Request.Context(), service.DeleteUserInput{
		ActorUserID:  actorID,
		TargetUserID: userID,
	})

	if err != nil {
		if err == util.ErrLastAdmin {
			logger.LogError(err, "last_admin_protection")
			ErrorResponse(c, http.StatusForbidden, "Cannot delete the last admin")
			logger.LogEnd(http.StatusForbidden)
			return
		}
		logger.LogError(err, "delete_user_failed")
		ErrorResponse(c, http.StatusInternalServerError, "Failed to delete user")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	log.Printf("%s[ADMIN]%s User deleted | actor=%s%s%s | target=%s%s%s",
		util.ColorRed+util.ColorBold, util.ColorReset,
		util.ColorCyan, actorID.String()[:8], util.ColorReset,
		util.ColorMagenta, userID.String()[:8], util.ColorReset)

	OkResponse(c, gin.H{"message": "User deleted successfully"})
	logger.LogEnd(http.StatusOK)
}

// ToggleEmailVerification toggles email verification status for a user
func (h *AdminHandler) ToggleEmailVerification(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	actorID, _ := middleware.GetUserID(c)
	logger.SetUserID(actorID)

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		logger.LogError(err, "parse_user_id")
		ErrorResponse(c, http.StatusBadRequest, "Invalid user ID format")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	var input struct {
		Verified *bool `json:"verified" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		logger.LogError(err, "bind_json")
		ErrorResponse(c, http.StatusBadRequest, "Invalid request body")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	// Ensure the field was present in the JSON payload (pointer non-nil).
	// Using a pointer avoids Gin's 'required' treating false as a missing/zero value.
	if input.Verified == nil {
		ErrorResponse(c, http.StatusBadRequest, "Invalid request body")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.LogStart(map[string]interface{}{"target_user_id": userID.String(), "verified": *input.Verified})

	err = h.AdminService.ToggleEmailVerification(c.Request.Context(), service.ToggleEmailVerificationInput{
		ActorUserID:  actorID,
		TargetUserID: userID,
		Verified:     *input.Verified,
	})

	if err != nil {
		logger.LogError(err, "toggle_verification_failed")
		ErrorResponse(c, http.StatusInternalServerError, "Failed to update verification status")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	action := "verified"
	if !*input.Verified {
		action = "unverified"
	}

	log.Printf("%s[ADMIN]%s Email %s | actor=%s%s%s | target=%s%s%s",
		util.ColorGreen+util.ColorBold, util.ColorReset, action,
		util.ColorCyan, actorID.String()[:8], util.ColorReset,
		util.ColorMagenta, userID.String()[:8], util.ColorReset)

	OkResponse(c, gin.H{"message": "Email verification status updated successfully"})
	logger.LogEnd(http.StatusOK)
}

// ===================== POLL MANAGEMENT =====================

// ListPolls returns all polls with pagination and optional filtering
func (h *AdminHandler) ListPolls(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	actorID, _ := middleware.GetUserID(c)
	logger.SetUserID(actorID)
	logger.LogStart()

	// Parse pagination parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	if limit > 100 {
		limit = 100
	}
	if limit < 1 {
		limit = 50
	}

	// Parse closed filter (optional)
	var closedFilter *bool
	if closedStr := c.Query("closed"); closedStr != "" {
		closed := closedStr == "true"
		closedFilter = &closed
	}

	response, err := h.AdminService.ListPolls(c.Request.Context(), service.ListPollsInput{
		Limit:  int32(limit),
		Offset: int32(offset),
		Closed: closedFilter,
	})

	if err != nil {
		logger.LogError(err, "list_polls_failed")
		ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve polls")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	log.Printf("%s[ADMIN]%s Polls listed | actor=%s%s%s | count=%s%d%s | total=%s%d%s",
		util.ColorGreen+util.ColorBold, util.ColorReset,
		util.ColorCyan, actorID.String()[:8], util.ColorReset,
		util.ColorMagenta, len(response.Polls), util.ColorReset,
		util.ColorYellow, response.Total, util.ColorReset)

	OkResponse(c, response)
	logger.LogEnd(http.StatusOK, map[string]interface{}{"poll_count": len(response.Polls)})
}

// ClosePoll closes a specific poll
func (h *AdminHandler) ClosePoll(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	actorID, _ := middleware.GetUserID(c)
	logger.SetUserID(actorID)

	pollID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		logger.LogError(err, "parse_poll_id")
		ErrorResponse(c, http.StatusBadRequest, "Invalid poll ID format")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.LogStart(map[string]interface{}{"poll_id": pollID.String()})

	poll, err := h.AdminService.ClosePoll(c.Request.Context(), service.ClosePollInput{
		ActorUserID: actorID,
		PollID:      pollID,
	})

	if err != nil {
		logger.LogError(err, "close_poll_failed")
		ErrorResponse(c, http.StatusInternalServerError, "Failed to close poll")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	log.Printf("%s[ADMIN]%s Poll closed | actor=%s%s%s | poll=%s%s%s",
		util.ColorGreen+util.ColorBold, util.ColorReset,
		util.ColorCyan, actorID.String()[:8], util.ColorReset,
		util.ColorMagenta, pollID.String()[:8], util.ColorReset)

	OkResponse(c, poll)
	logger.LogEnd(http.StatusOK)
}

// ReopenPoll reopens a closed poll
func (h *AdminHandler) ReopenPoll(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	actorID, _ := middleware.GetUserID(c)
	logger.SetUserID(actorID)

	pollID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		logger.LogError(err, "parse_poll_id")
		ErrorResponse(c, http.StatusBadRequest, "Invalid poll ID format")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.LogStart(map[string]interface{}{"poll_id": pollID.String()})

	poll, err := h.AdminService.ReopenPoll(c.Request.Context(), service.ReopenPollInput{
		ActorUserID: actorID,
		PollID:      pollID,
	})

	if err != nil {
		logger.LogError(err, "reopen_poll_failed")
		ErrorResponse(c, http.StatusInternalServerError, "Failed to reopen poll")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	log.Printf("%s[ADMIN]%s Poll reopened | actor=%s%s%s | poll=%s%s%s",
		util.ColorGreen+util.ColorBold, util.ColorReset,
		util.ColorCyan, actorID.String()[:8], util.ColorReset,
		util.ColorMagenta, pollID.String()[:8], util.ColorReset)

	OkResponse(c, poll)
	logger.LogEnd(http.StatusOK)
}

// DeletePoll removes a poll from the system
func (h *AdminHandler) DeletePoll(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	actorID, _ := middleware.GetUserID(c)
	logger.SetUserID(actorID)

	pollID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		logger.LogError(err, "parse_poll_id")
		ErrorResponse(c, http.StatusBadRequest, "Invalid poll ID format")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.LogStart(map[string]interface{}{"poll_id": pollID.String()})

	err = h.AdminService.DeletePoll(c.Request.Context(), service.DeletePollInput{
		ActorUserID: actorID,
		PollID:      pollID,
	})

	if err != nil {
		logger.LogError(err, "delete_poll_failed")
		ErrorResponse(c, http.StatusInternalServerError, "Failed to delete poll")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	log.Printf("%s[ADMIN]%s Poll deleted | actor=%s%s%s | poll=%s%s%s",
		util.ColorRed+util.ColorBold, util.ColorReset,
		util.ColorCyan, actorID.String()[:8], util.ColorReset,
		util.ColorMagenta, pollID.String()[:8], util.ColorReset)

	OkResponse(c, gin.H{"message": "Poll deleted successfully"})
	logger.LogEnd(http.StatusOK)
}

// ===================== AUDIT LOGS =====================

// ListAuditLogs returns audit logs with pagination and optional filtering
func (h *AdminHandler) ListAuditLogs(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	actorID, _ := middleware.GetUserID(c)
	logger.SetUserID(actorID)
	logger.LogStart()

	// Parse pagination parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	if limit > 100 {
		limit = 100
	}
	if limit < 1 {
		limit = 50
	}

	// Check for filters
	actorFilter := c.Query("actor_id")
	actionFilter := c.Query("action")

	var logDTOs []AuditLogDTO
	var total int64

	if actorFilter != "" {
		// Filter by actor
		actorUUID, err := uuid.Parse(actorFilter)
		if err != nil {
			ErrorResponse(c, http.StatusBadRequest, "Invalid actor_id format")
			logger.LogEnd(http.StatusBadRequest)
			return
		}
		actorLogs, err := h.AuditService.GetAuditLogsByActor(c.Request.Context(), actorUUID, int32(limit), int32(offset))
		if err != nil {
			logger.LogError(err, "get_audit_logs_by_actor_failed")
			ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve audit logs")
			logger.LogEnd(http.StatusInternalServerError)
			return
		}
		for _, log := range actorLogs {
			logDTOs = append(logDTOs, convertAuditLogsByActorRow(log))
		}
		total, _ = h.AuditService.Queries.CountAuditLogsByActor(c.Request.Context(), actorUUID)
	} else if actionFilter != "" {
		// Filter by action
		actionLogs, err := h.AuditService.GetAuditLogsByAction(c.Request.Context(), actionFilter, int32(limit), int32(offset))
		if err != nil {
			logger.LogError(err, "get_audit_logs_by_action_failed")
			ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve audit logs")
			logger.LogEnd(http.StatusInternalServerError)
			return
		}
		for _, log := range actionLogs {
			logDTOs = append(logDTOs, convertAuditLogsByActionRow(log))
		}
		total, _ = h.AuditService.CountAuditLogs(c.Request.Context())
	} else {
		// Get all logs
		allLogs, err := h.AuditService.GetAuditLogs(c.Request.Context(), int32(limit), int32(offset))
		if err != nil {
			logger.LogError(err, "get_audit_logs_failed")
			ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve audit logs")
			logger.LogEnd(http.StatusInternalServerError)
			return
		}
		for _, log := range allLogs {
			logDTOs = append(logDTOs, convertAuditLogRow(log))
		}
		total, _ = h.AuditService.CountAuditLogs(c.Request.Context())
	}

	// Initialize empty array if nil to ensure JSON returns [] instead of null
	if logDTOs == nil {
		logDTOs = []AuditLogDTO{}
	}

	response := gin.H{
		"logs":   logDTOs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	}

	OkResponse(c, response)
	logger.LogEnd(http.StatusOK)
}

// RegisterAdminRoutes registers all admin routes
func RegisterAdminRoutes(r *gin.Engine, queries *repository.Queries, config *util.Config) {
	auditService := service.NewAuditService(queries)
	adminService := service.NewAdminService(queries, auditService)
	handler := NewAdminHandler(adminService, auditService, queries)

	// Admin routes - all require authentication + admin role
	adminRoutes := r.Group("/admin").Use(middleware.AuthMiddleware()).Use(middleware.RequireAdmin(queries))
	{
		// User management
		adminRoutes.GET("/users", handler.ListUsers)
		adminRoutes.GET("/users/:id", handler.GetUser)
		adminRoutes.PUT("/users/:id/role", handler.UpdateUserRole)
		adminRoutes.PUT("/users/:id/name", handler.UpdateUserName)
		adminRoutes.PUT("/users/:id/verification", handler.ToggleEmailVerification)
		adminRoutes.POST("/users/:id/reset-password", handler.ResetUserPassword)
		adminRoutes.DELETE("/users/:id", handler.DeleteUser)

		// Poll management
		adminRoutes.GET("/polls", handler.ListPolls)
		adminRoutes.POST("/polls/:id/close", handler.ClosePoll)
		adminRoutes.POST("/polls/:id/reopen", handler.ReopenPoll)
		adminRoutes.DELETE("/polls/:id", handler.DeletePoll)

		// Audit logs
		adminRoutes.GET("/audit", handler.ListAuditLogs)

		// Test endpoint for debugging audit logs
		adminRoutes.POST("/test-audit", handler.TestAudit)
	}
}

// TestAudit is a test endpoint to verify audit logging works
func (h *AdminHandler) TestAudit(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	actorID, _ := middleware.GetUserID(c)
	logger.SetUserID(actorID)
	logger.LogStart()

	log.Printf("[TEST] Testing audit log creation for user: %s", actorID)

	// Try to create a test audit log
	err := h.AuditService.LogUserAction(
		c.Request.Context(),
		actorID,
		service.AuditActionUserUpdate,
		actorID,
	)

	if err != nil {
		log.Printf("[TEST] Failed to create audit log: %v", err)
		ErrorResponse(c, http.StatusInternalServerError, "Failed to create audit log: "+err.Error())
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	log.Printf("[TEST] Successfully created test audit log")
	OkResponse(c, gin.H{"message": "Test audit log created successfully"})
	logger.LogEnd(http.StatusOK)
}
