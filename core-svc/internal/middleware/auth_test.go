package middleware

import (
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestGetUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c := &gin.Context{}
	userID := uuid.New()
	c.Set("userID", userID)

	got, err := GetUserID(c)
	if err != nil {
		t.Fatalf("GetUserID returned error: %v", err)
	}
	if got != userID {
		t.Fatalf("GetUserID = %s, want %s", got, userID)
	}
}

func TestGetUserIDRejectsMissingOrWrongType(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name  string
		value any
		set   bool
	}{
		{name: "missing"},
		{name: "string", value: uuid.NewString(), set: true},
		{name: "nil", value: nil, set: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &gin.Context{}
			if tt.set {
				c.Set("userID", tt.value)
			}

			if _, err := GetUserID(c); err == nil {
				t.Fatal("GetUserID returned nil error")
			}
		})
	}
}
