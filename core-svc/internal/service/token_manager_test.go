package service

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

func testTokenService(secret string, lifespanHours int64) *TokenService {
	return NewTokenService(&util.Config{
		AuthSecret:             secret,
		AuthTokenLifespanHours: lifespanHours,
	})
}

func TestTokenServiceGenerateValidateAndExtractData(t *testing.T) {
	svc := testTokenService("test-secret", 1)
	userID := uuid.New()

	token, err := svc.GenerateToken(AuthTokenData{ID: userID})
	if err != nil {
		t.Fatalf("GenerateToken returned error: %v", err)
	}
	if token == "" {
		t.Fatal("GenerateToken returned an empty token")
	}

	if err := svc.ValidateToken(token); err != nil {
		t.Fatalf("ValidateToken returned error for generated token: %v", err)
	}

	data, err := svc.ExtractTokenData(token)
	if err != nil {
		t.Fatalf("ExtractTokenData returned error: %v", err)
	}
	if data.ID != userID {
		t.Fatalf("ExtractTokenData ID = %s, want %s", data.ID, userID)
	}
}

func TestTokenServiceRejectsWrongSecret(t *testing.T) {
	issuer := testTokenService("issuer-secret", 1)
	validator := testTokenService("validator-secret", 1)

	token, err := issuer.GenerateToken(AuthTokenData{ID: uuid.New()})
	if err != nil {
		t.Fatalf("GenerateToken returned error: %v", err)
	}

	if err := validator.ValidateToken(token); err == nil {
		t.Fatal("ValidateToken accepted a token signed with a different secret")
	}
	if _, err := validator.ExtractTokenData(token); err == nil {
		t.Fatal("ExtractTokenData accepted a token signed with a different secret")
	}
}

func TestTokenServiceRejectsExpiredToken(t *testing.T) {
	svc := testTokenService("test-secret", -1)

	token, err := svc.GenerateToken(AuthTokenData{ID: uuid.New()})
	if err != nil {
		t.Fatalf("GenerateToken returned error: %v", err)
	}

	if err := svc.ValidateToken(token); err == nil {
		t.Fatal("ValidateToken accepted an expired token")
	}
	if _, err := svc.ExtractTokenData(token); err == nil {
		t.Fatal("ExtractTokenData accepted an expired token")
	}
}

func TestTokenServiceRejectsMissingUserID(t *testing.T) {
	svc := testTokenService("test-secret", 1)

	token, err := svc.GenerateToken(AuthTokenData{ID: uuid.Nil})
	if err != nil {
		t.Fatalf("GenerateToken returned error: %v", err)
	}

	if err := svc.ValidateToken(token); err != nil {
		t.Fatalf("ValidateToken returned error before claim extraction: %v", err)
	}
	if _, err := svc.ExtractTokenData(token); err == nil {
		t.Fatal("ExtractTokenData accepted a token with nil user ID")
	}
}

func TestTokenServiceExtractToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name          string
		authorization string
		want          string
	}{
		{name: "missing"},
		{name: "wrong scheme", authorization: "Basic abc"},
		{name: "bearer token", authorization: "Bearer abc.def.ghi", want: "abc.def.ghi"},
		{name: "trims bearer token", authorization: "Bearer   abc.def.ghi  ", want: "abc.def.ghi"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			if tt.authorization != "" {
				req.Header.Set("Authorization", tt.authorization)
			}
			c.Request = req

			got := testTokenService("test-secret", 1).ExtractToken(c)
			if got != tt.want {
				t.Fatalf("ExtractToken() = %q, want %q", got, tt.want)
			}
		})
	}
}
