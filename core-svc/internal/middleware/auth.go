package middleware

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yatochka-dev/pollex/core-svc/internal/service"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

// auth middleware - checks cookie and validates token
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr, err := c.Cookie("pollex.session")
		if err != nil || tokenStr == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
			return
		}
		config := util.NewConfig()
		svc := service.NewTokenService(config)
		// verify token
		claims, err := svc.ExtractTokenData(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Invalid or expired token"})
			return
		}
		c.Set("userID", claims.ID)
		c.Next()
	}
}

// gets userID from context
func GetUserID(c *gin.Context) (uuid.UUID, error) {
	id, _ := c.Get("userID")

	userId, ok := id.(uuid.UUID)
	if !ok {
		return uuid.Nil, errors.New("invalid user ID")
	}
	return userId, nil
}
