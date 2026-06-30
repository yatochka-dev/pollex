package middleware

import (
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
)

func TestGetUserRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c := &gin.Context{}
	c.Set("userRole", repository.UserRoleAdmin)

	role, ok := GetUserRole(c)
	if !ok {
		t.Fatal("GetUserRole ok = false, want true")
	}
	if role != repository.UserRoleAdmin {
		t.Fatalf("GetUserRole role = %q, want %q", role, repository.UserRoleAdmin)
	}
}

func TestGetUserRoleRejectsMissingOrWrongType(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name  string
		value any
		set   bool
	}{
		{name: "missing"},
		{name: "string", value: "admin", set: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &gin.Context{}
			if tt.set {
				c.Set("userRole", tt.value)
			}

			if _, ok := GetUserRole(c); ok {
				t.Fatal("GetUserRole ok = true, want false")
			}
		})
	}
}
