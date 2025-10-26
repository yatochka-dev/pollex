package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/middleware"
	"github.com/yatochka-dev/pollex/core-svc/internal/service"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
	"golang.org/x/crypto/bcrypt"
)

type EmailHandler struct {
	EmailService *service.EmailService
	Queries      *repository.Queries
}

func NewEmailHandler(emailService *service.EmailService, queries *repository.Queries) *EmailHandler {
	return &EmailHandler{
		EmailService: emailService,
		Queries:      queries,
	}
}

// ResendVerificationEmail godoc
// @Summary Resend verification email
// @Description Sends a new verification email to the authenticated user
// @Tags email
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 429 {object} map[string]string
// @Router /email/resend-verification [post]
func (h *EmailHandler) ResendVerificationEmail(c *gin.Context) {
	logger := util.NewRequestLogger(c)

	userID, err := middleware.GetUserID(c)
	if err != nil {
		logger.LogError(err, "get_user_id")
		ErrorResponse(c, http.StatusUnauthorized, "Invalid session")
		logger.LogEnd(http.StatusUnauthorized)
		return
	}

	logger.SetUserID(userID)
	logger.LogStart()

	// Get user details
	user, err := h.Queries.GetUserByID(c, userID)
	if err != nil {
		logger.LogError(err, "get_user")
		ErrorResponse(c, http.StatusNotFound, "User not found")
		logger.LogEnd(http.StatusNotFound)
		return
	}

	// Check if already verified
	if user.EmailVerifiedAt.Valid {
		ErrorResponse(c, http.StatusBadRequest, "Email already verified")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	// Send verification email
	err = h.EmailService.SendVerificationEmail(c, userID, user.Email, user.Name)
	if err != nil {
		logger.LogError(err, "send_verification_email")
		if err.Error() == "too many verification emails requested, please try again later" {
			ErrorResponse(c, http.StatusTooManyRequests, err.Error())
			logger.LogEnd(http.StatusTooManyRequests)
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "Failed to send verification email")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	Response(c, gin.H{
		"message": "Verification email sent",
	}, http.StatusOK)
	logger.LogEnd(http.StatusOK)
}

// VerifyEmail godoc
// @Summary Verify email address
// @Description Verifies a user's email address using a token
// @Tags email
// @Accept json
// @Produce json
// @Param token query string true "Verification token"
// @Param uid query string true "User ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /email/verify [post]
func (h *EmailHandler) VerifyEmail(c *gin.Context) {
	logger := util.NewRequestLogger(c)

	token := c.Query("token")
	uidStr := c.Query("uid")

	if token == "" || uidStr == "" {
		logger.LogError(nil, "missing_params")
		ErrorResponse(c, http.StatusBadRequest, "Missing token or uid")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(uidStr)
	if err != nil {
		logger.LogError(err, "invalid_uid")
		ErrorResponse(c, http.StatusBadRequest, "Invalid user ID")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.SetUserID(userID)
	logger.LogStart()

	// Verify email
	err = h.EmailService.VerifyEmail(c, userID, token)
	if err != nil {
		logger.LogError(err, "verify_email_failed")
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	Response(c, gin.H{
		"message": "Email verified successfully",
	}, http.StatusOK)
	logger.LogEnd(http.StatusOK)
}

// RequestPasswordReset godoc
// @Summary Request password reset
// @Description Sends a password reset email to the user
// @Tags email
// @Accept json
// @Produce json
// @Param body body object{email=string} true "Email address"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 429 {object} map[string]string
// @Router /email/request-password-reset [post]
func (h *EmailHandler) RequestPasswordReset(c *gin.Context) {
	logger := util.NewRequestLogger(c)

	var input struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		logger.LogError(err, "bind_json")
		ErrorResponse(c, http.StatusBadRequest, "Invalid email address")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.LogStart(map[string]interface{}{"email": input.Email})

	// Get user by email
	user, err := h.Queries.GetUserByEmail(c, input.Email)
	if err != nil {
		// Don't reveal if email exists or not for security
		OkResponse(c, gin.H{
			"message": "If an account exists with this email, a password reset link has been sent",
		})
		logger.LogEnd(http.StatusOK)
		return
	}

	// Send password reset email
	err = h.EmailService.SendPasswordResetEmail(c, user.ID, user.Email, user.Name)
	if err != nil {
		logger.LogError(err, "send_reset_email")
		if err.Error() == "too many password reset requests, please try again later" {
			ErrorResponse(c, http.StatusTooManyRequests, err.Error())
			logger.LogEnd(http.StatusTooManyRequests)
			return
		}
		// Don't reveal error details for security
		OkResponse(c, gin.H{
			"message": "If an account exists with this email, a password reset link has been sent",
		})
		logger.LogEnd(http.StatusOK)
		return
	}

	Response(c, gin.H{
		"message": "If an account exists with this email, a password reset link has been sent",
	}, http.StatusOK)
	logger.LogEnd(http.StatusOK)
}

// ValidatePasswordResetToken godoc
// @Summary Validate password reset token
// @Description Checks if a password reset token is valid
// @Tags email
// @Accept json
// @Produce json
// @Param token query string true "Reset token"
// @Param uid query string true "User ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /email/validate-reset-token [get]
func (h *EmailHandler) ValidatePasswordResetToken(c *gin.Context) {
	logger := util.NewRequestLogger(c)

	token := c.Query("token")
	uidStr := c.Query("uid")

	if token == "" || uidStr == "" {
		logger.LogError(nil, "missing_params")
		ErrorResponse(c, http.StatusBadRequest, "Missing token or uid")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(uidStr)
	if err != nil {
		logger.LogError(err, "invalid_uid")
		ErrorResponse(c, http.StatusBadRequest, "Invalid user ID")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.SetUserID(userID)
	logger.LogStart()

	// Validate token
	err = h.EmailService.ValidatePasswordResetToken(c, userID, token)
	if err != nil {
		logger.LogError(err, "validate_token_failed")
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	Response(c, gin.H{
		"message": "Token is valid",
		"valid":   true,
	}, http.StatusOK)
	logger.LogEnd(http.StatusOK)
}

// ResetPassword godoc
// @Summary Reset password
// @Description Resets a user's password using a valid token
// @Tags email
// @Accept json
// @Produce json
// @Param body body object{token=string,uid=string,password=string} true "Reset details"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /email/reset-password [post]
func (h *EmailHandler) ResetPassword(c *gin.Context) {
	logger := util.NewRequestLogger(c)

	var input struct {
		Token    string `json:"token" binding:"required"`
		UID      string `json:"uid" binding:"required"`
		Password string `json:"password" binding:"required,min=8"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		logger.LogError(err, "bind_json")
		ErrorResponse(c, http.StatusBadRequest, "Invalid request. Password must be at least 8 characters")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	userID, err := uuid.Parse(input.UID)
	if err != nil {
		logger.LogError(err, "invalid_uid")
		ErrorResponse(c, http.StatusBadRequest, "Invalid user ID")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.SetUserID(userID)
	logger.LogStart()

	// Hash the new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		logger.LogError(err, "hash_password")
		ErrorResponse(c, http.StatusInternalServerError, "Failed to process password")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	// Reset password
	err = h.EmailService.ResetPassword(c, userID, input.Token, string(hashedPassword))
	if err != nil {
		logger.LogError(err, "reset_password_failed")
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	Response(c, gin.H{
		"message": "Password reset successfully",
	}, http.StatusOK)
	logger.LogEnd(http.StatusOK)
}

// RegisterEmailRoutes registers all email-related routes
func RegisterEmailRoutes(r *gin.Engine, queries *repository.Queries, emailService *service.EmailService) {
	handler := NewEmailHandler(emailService, queries)

	emailRoutes := r.Group("/email")
	{
		// Public routes
		emailRoutes.POST("/verify", handler.VerifyEmail)
		emailRoutes.POST("/request-password-reset", handler.RequestPasswordReset)
		emailRoutes.GET("/validate-reset-token", handler.ValidatePasswordResetToken)
		emailRoutes.POST("/reset-password", handler.ResetPassword)

		// Protected routes (require authentication)
		emailRoutes.POST("/resend-verification", middleware.AuthMiddleware(), handler.ResendVerificationEmail)
	}
}
