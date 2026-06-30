package util

import (
	"reflect"
	"testing"
)

func TestNewConfigDefaults(t *testing.T) {
	t.Setenv("COOKIE_SECURE", "")
	t.Setenv("COOKIE_DOMAIN", "")
	t.Setenv("APP_BASE_URL", "")
	t.Setenv("PORT", "")
	t.Setenv("AUTH_SECRET", "")
	t.Setenv("AUTH_TOKEN_LIFESPAN_HOURS", "")
	t.Setenv("ALLOWED_ORIGINS", "")
	t.Setenv("DATABASE_URL", "")
	t.Setenv("RESEND_API_KEY", "")

	config := NewConfig()

	if config.CookieSecure {
		t.Fatal("CookieSecure defaulted to true")
	}
	if config.CookieDomain != "localhost" {
		t.Fatalf("CookieDomain = %q, want localhost", config.CookieDomain)
	}
	if config.AppBaseURL != "http://localhost:8080" {
		t.Fatalf("AppBaseURL = %q, want http://localhost:8080", config.AppBaseURL)
	}
	if config.Port != 8080 {
		t.Fatalf("Port = %d, want 8080", config.Port)
	}
	if config.AuthSecret != "hello" {
		t.Fatalf("AuthSecret = %q, want hello", config.AuthSecret)
	}
	if config.AuthTokenLifespanHours != 24 {
		t.Fatalf("AuthTokenLifespanHours = %d, want 24", config.AuthTokenLifespanHours)
	}

	wantOrigins := []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"http://localhost:3000/",
		"http://127.0.0.1:3000/",
	}
	if !reflect.DeepEqual(config.AllowedOrigins, wantOrigins) {
		t.Fatalf("AllowedOrigins = %#v, want %#v", config.AllowedOrigins, wantOrigins)
	}
}

func TestNewConfigParsesEnvironment(t *testing.T) {
	t.Setenv("COOKIE_SECURE", "true")
	t.Setenv("COOKIE_DOMAIN", "pollex.example")
	t.Setenv("APP_BASE_URL", "https://pollex.example")
	t.Setenv("PORT", "9090")
	t.Setenv("AUTH_SECRET", "secret")
	t.Setenv("AUTH_TOKEN_LIFESPAN_HOURS", "12")
	t.Setenv("ALLOWED_ORIGINS", " https://a.example,https://b.example , ,http://localhost:3000 ")
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("RESEND_API_KEY", "re_123")

	config := NewConfig()

	if !config.CookieSecure {
		t.Fatal("CookieSecure = false, want true")
	}
	if config.CookieDomain != "pollex.example" {
		t.Fatalf("CookieDomain = %q, want pollex.example", config.CookieDomain)
	}
	if config.AppBaseURL != "https://pollex.example" {
		t.Fatalf("AppBaseURL = %q, want https://pollex.example", config.AppBaseURL)
	}
	if config.Port != 9090 {
		t.Fatalf("Port = %d, want 9090", config.Port)
	}
	if config.AuthSecret != "secret" {
		t.Fatalf("AuthSecret = %q, want secret", config.AuthSecret)
	}
	if config.AuthTokenLifespanHours != 12 {
		t.Fatalf("AuthTokenLifespanHours = %d, want 12", config.AuthTokenLifespanHours)
	}
	wantOrigins := []string{"https://a.example", "https://b.example", "http://localhost:3000"}
	if !reflect.DeepEqual(config.AllowedOrigins, wantOrigins) {
		t.Fatalf("AllowedOrigins = %#v, want %#v", config.AllowedOrigins, wantOrigins)
	}
	if config.DatabaseUrl != "postgres://example" {
		t.Fatalf("DatabaseUrl = %q, want postgres://example", config.DatabaseUrl)
	}
	if config.ResendAPIKey != "re_123" {
		t.Fatalf("ResendAPIKey = %q, want re_123", config.ResendAPIKey)
	}
}

func TestNewConfigFallsBackForInvalidNumbers(t *testing.T) {
	t.Setenv("PORT", "invalid")
	t.Setenv("AUTH_TOKEN_LIFESPAN_HOURS", "invalid")

	config := NewConfig()

	if config.Port != 8080 {
		t.Fatalf("Port = %d, want fallback 8080", config.Port)
	}
	if config.AuthTokenLifespanHours != 0 {
		t.Fatalf("AuthTokenLifespanHours = %d, want 0 for invalid parse", config.AuthTokenLifespanHours)
	}
}
