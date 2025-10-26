package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

// RequireRole middleware ensures the user has the specified role
func RequireRole(queries *repository.Queries, requiredRole repository.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		userId, err := GetUserID(c)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
			return
		}

		user, err := queries.GetUserByID(c.Request.Context(), userId)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "User not found"})
			return
		}

		if user.Role != requiredRole {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"message":  "Insufficient permissions",
				"required": requiredRole,
				"current":  user.Role,
			})
			return
		}

		// Store role in context for later use
		c.Set("userRole", user.Role)
		c.Next()
	}
}

// RequireAdmin middleware ensures the user is an admin
func RequireAdmin(queries *repository.Queries) gin.HandlerFunc {
	return RequireRole(queries, repository.UserRoleAdmin)
}

// RequireOwnerOrAdmin checks if the user is either the owner of the resource or an admin
func RequireOwnerOrAdmin(queries *repository.Queries, getResourceOwnerID func(*gin.Context) (uuid.UUID, error)) gin.HandlerFunc {
	return func(c *gin.Context) {
		userId, err := GetUserID(c)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
			return
		}

		// Get the resource owner ID
		ownerId, err := getResourceOwnerID(c)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"message": "Resource not found"})
			return
		}

		// If user is the owner, allow access
		if userId == ownerId {
			c.Set("isOwner", true)
			c.Next()
			return
		}

		// Check if user is admin
		user, err := queries.GetUserByID(c.Request.Context(), userId)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "User not found"})
			return
		}

		if user.Role != repository.UserRoleAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "Access denied - must be owner or admin"})
			return
		}

		c.Set("isOwner", false)
		c.Set("userRole", user.Role)
		c.Next()
	}
}

// GetUserRole retrieves the user's role from context (must be set by RequireRole middleware)
func GetUserRole(c *gin.Context) (repository.UserRole, bool) {
	role, exists := c.Get("userRole")
	if !exists {
		return "", false
	}
	userRole, ok := role.(repository.UserRole)
	return userRole, ok
}

// IsAdmin checks if the current user is an admin
func IsAdmin(c *gin.Context, queries *repository.Queries) bool {
	userId, err := GetUserID(c)
	if err != nil {
		return false
	}

	isAdmin, err := queries.IsUserAdmin(c.Request.Context(), userId)
	if err != nil {
		return false
	}

	return isAdmin
}

// PreventLastAdminDemotion prevents demoting or deleting the last admin
func PreventLastAdminDemotion(c *gin.Context, queries *repository.Queries, targetUserId uuid.UUID) error {
	// Count current admins
	adminCount, err := queries.CountUsersByRole(c.Request.Context(), repository.UserRoleAdmin)
	if err != nil {
		return err
	}

	// If there's only one admin, check if we're targeting that admin
	if adminCount <= 1 {
		targetUser, err := queries.GetUserByID(c.Request.Context(), targetUserId)
		if err != nil {
			return err
		}

		if targetUser.Role == repository.UserRoleAdmin {
			return util.ErrLastAdmin
		}
	}

	return nil
}
