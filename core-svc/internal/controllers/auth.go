package controllers

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/middleware"
	"github.com/yatochka-dev/pollex/core-svc/internal/service"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

type AuthHandler struct {
	Queries      *repository.Queries
	TokenService *service.TokenService
	AuthService  *service.AuthService
} // auth handler struct
type LoginResponse struct {
	Message string `json:"message"`
} // login response struct

func NewAuthHandler(queries *repository.Queries, tokenService *service.TokenService, service *service.AuthService) *AuthHandler {
	return &AuthHandler{
		Queries:      queries,
		TokenService: tokenService,
		AuthService:  service,
	}
} // constructor

// Login endpoint
func (h *AuthHandler) Login(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	var input service.LoginInput

	if err := c.ShouldBindJSON(&input); err != nil {
		logger.LogError(err, "bind_json")
		ErrorResponse(c, http.StatusBadRequest, "Invalid request format")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.LogStart(map[string]interface{}{"email": input.Email})

	token, err := h.AuthService.Login(c, input)
	if err != nil {
		// Map service errors to proper HTTP status codes
		if errors.Is(err, util.ErrInvalidCredentials) {
			logger.LogError(err, "invalid_credentials")
			ErrorResponse(c, http.StatusUnauthorized, "Invalid email or password")
			logger.LogEnd(http.StatusUnauthorized)
			return
		}
		logger.LogError(err, "auth_service_failed")
		ErrorResponse(c, http.StatusInternalServerError, "Authentication failed")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	config := util.NewConfig()
	c.SetCookie(
		"pollex.session", token, 900*4, "/", config.CookieDomain, config.CookieSecure, true)

	log.Printf("%s[AUTH]%s Login successful | email=%s%s%s", util.ColorGreen+util.ColorBold, util.ColorReset, util.ColorCyan, input.Email, util.ColorReset)
	c.JSON(http.StatusOK, LoginResponse{Message: "logged in!"})
	logger.LogEnd(http.StatusOK)
}

// Logout endpoint
func (h *AuthHandler) Logout(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	logger.LogStart()

	config := util.NewConfig()
	// Clear session cookie
	c.SetCookie(
		"pollex.session", "", -1, "/", config.CookieDomain, config.CookieSecure, true)

	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
	logger.LogEnd(http.StatusOK)
}

// Register endpoint
func (h *AuthHandler) Register(c *gin.Context) {
	logger := util.NewRequestLogger(c)
	var input service.RegisterInput

	if err := c.ShouldBindJSON(&input); err != nil {
		logger.LogError(err, "bind_json")
		ErrorResponse(c, http.StatusBadRequest, "Invalid request format")
		logger.LogEnd(http.StatusBadRequest)
		return
	}

	logger.LogStart(map[string]interface{}{"email": input.Email, "name": input.Name})

	user, err := h.AuthService.Register(c, input)

	if err != nil {
		// Map service errors to proper HTTP status codes
		if errors.Is(err, util.ErrEmailExists) {
			logger.LogError(err, "email_exists")
			ErrorResponse(c, http.StatusConflict, "Email address already registered")
			logger.LogEnd(http.StatusConflict)
			return
		}
		logger.LogError(err, "registration_failed")
		ErrorResponse(c, http.StatusInternalServerError, "Registration failed")
		logger.LogEnd(http.StatusInternalServerError)
		return
	}

	log.Printf("%s[AUTH]%s Registration successful | email=%s%s%s | name=%s%s%s | user_id=%s%s%s",
		util.ColorGreen+util.ColorBold, util.ColorReset,
		util.ColorCyan, input.Email, util.ColorReset,
		util.ColorCyan, input.Name, util.ColorReset,
		util.ColorMagenta, user.ID, util.ColorReset)
	Response(c, gin.H{
		"data":  user,
		"isNew": true,
	}, http.StatusCreated)
	logger.LogEnd(http.StatusCreated, map[string]interface{}{"user_id": user.ID})

}

// Profile endpoint
func (h *AuthHandler) Profile(c *gin.Context) {
	logger := util.NewRequestLogger(c)

	userId, err := middleware.GetUserID(c)
	if err != nil {
		logger.LogError(err, "get_user_id")
		ErrorResponse(c, http.StatusUnauthorized, "Invalid session")
		logger.LogEnd(http.StatusUnauthorized)
		return
	}

	logger.SetUserID(userId)
	logger.LogStart()

	user, err := h.AuthService.Queries.GetUserByID(c, userId)

	if err != nil {
		logger.LogError(err, "get_user_by_id")
		ErrorResponse(c, http.StatusNotFound, "User not found")
		logger.LogEnd(http.StatusNotFound)
		return
	}

	OkResponse(c, user)
	logger.LogEnd(http.StatusOK, map[string]interface{}{"user_id": userId})
}

// Register auth routes
func RegisterAuthRoutes(r *gin.Engine, queries *repository.Queries, config *util.Config) {

	AuthService := service.NewAuthService(config, queries, service.NewTokenService(config))
	handler := NewAuthHandler(queries, service.NewTokenService(config), AuthService)
	authRoutes := r.Group("/auth")
	{
		authRoutes.POST("/login", handler.Login)
		authRoutes.POST("/register", handler.Register)
		authRoutes.POST("/logout", handler.Logout)
		// authRoutes.GET("/profile", handler.Profile, )
	}

	userRoutes := r.Group("/user").Use(middleware.AuthMiddleware())
	{
		userRoutes.GET("/profile", handler.Profile)
	}
}
