package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/yatochka-dev/pollex/core-svc/internal/util"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type AuthTokenData struct {
	ID uuid.UUID
}

type TokenService struct {
	Config *util.Config
}

func NewTokenService(config *util.Config) *TokenService {
	return &TokenService{
		Config: config,
	}
}

// Claims embeds domain.AuthTokenData and jwt.RegisteredClaims
type Claims struct {
	AuthTokenData
	jwt.RegisteredClaims
}

// GenerateToken creates a JWT token signed with HS256 and includes user ID and expiry
func (t *TokenService) GenerateToken(data AuthTokenData) (string, error) {
	claims := Claims{
		AuthTokenData: data,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(t.Config.AuthTokenLifespanHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			// Optional: add Issuer, Subject, etc.

		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := []byte(t.Config.AuthSecret)

	signedToken, err := token.SignedString(secret)
	if err != nil {
		return "", err
	}

	return signedToken, nil
}

// ExtractToken extracts the Bearer token string from the "Authorization" header
func (t *TokenService) ExtractToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	const prefix = "Bearer "
	if !strings.HasPrefix(authHeader, prefix) {
		return ""
	}

	return strings.TrimSpace(authHeader[len(prefix):])
}

// ValidateToken validates the JWT token string and returns error if invalid
func (t *TokenService) ValidateToken(tokenString string) error {
	secret := []byte(t.Config.AuthSecret)

	// Parse token without claims extraction first, just for validation
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Ensure token method is HMAC
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	})

	expirationTime, err := token.Claims.GetExpirationTime()

	fmt.Println(expirationTime)

	return err
}

// ExtractTokenData parses the token string and extracts AuthTokenData from claims
func (t *TokenService) ExtractTokenData(tokenString string) (AuthTokenData, error) {
	secret := []byte(t.Config.AuthSecret)

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	})
	if err != nil {
		return AuthTokenData{}, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return AuthTokenData{}, errors.New("invalid token claims")
	}

	// Ensure ID is valid UUID
	if claims.AuthTokenData.ID == uuid.Nil {
		return AuthTokenData{}, errors.New("token missing user ID")
	}

	return claims.AuthTokenData, nil
}

// ParseToken is a convenience method to Extract, Validate and Extract Data from the gin context token
func (t *TokenService) ParseToken(c *gin.Context) (AuthTokenData, error) {
	tokenString := t.ExtractToken(c)
	if tokenString == "" {
		return AuthTokenData{}, errors.New("no token found in request")
	}

	if err := t.ValidateToken(tokenString); err != nil {
		return AuthTokenData{}, err
	}

	return t.ExtractTokenData(tokenString)
}
