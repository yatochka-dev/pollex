package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func testContext() (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	return c, w
}

func TestResponseHelpers(t *testing.T) {
	c, w := testContext()

	Response(c, gin.H{"id": "123"}, http.StatusCreated)

	if w.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusCreated)
	}

	var body map[string]map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("response body was not valid JSON: %v", err)
	}
	if body["data"]["id"] != "123" {
		t.Fatalf("response data id = %q, want 123", body["data"]["id"])
	}
}

func TestOkResponse(t *testing.T) {
	c, w := testContext()

	OkResponse(c, gin.H{"message": "ok"})

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusOK)
	}
	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("response body was not valid JSON: %v", err)
	}
	if body["message"] != "ok" {
		t.Fatalf("message = %q, want ok", body["message"])
	}
}

func TestErrorResponse(t *testing.T) {
	c, w := testContext()

	ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
	var body TErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("response body was not valid JSON: %v", err)
	}
	if body.Message != "Unauthorized" {
		t.Fatalf("message = %q, want Unauthorized", body.Message)
	}
	if body.Data != nil {
		t.Fatalf("data = %#v, want nil", body.Data)
	}
}

func TestErrorResponseWithData(t *testing.T) {
	c, w := testContext()

	ErrorResponseWithData(c, http.StatusForbidden, "Forbidden", gin.H{"required": "admin"})

	if w.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusForbidden)
	}
	var body TErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("response body was not valid JSON: %v", err)
	}
	if body.Message != "Forbidden" {
		t.Fatalf("message = %q, want Forbidden", body.Message)
	}
	if body.Data == nil {
		t.Fatal("data = nil, want payload")
	}
}
