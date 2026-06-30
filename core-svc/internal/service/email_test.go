package service

import (
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"testing"
)

func TestEmailServiceGenerateSecureToken(t *testing.T) {
	svc := NewEmailService(nil, "")

	token, hash, err := svc.generateSecureToken()
	if err != nil {
		t.Fatalf("generateSecureToken returned error: %v", err)
	}
	if token == "" {
		t.Fatal("token is empty")
	}
	if hash == "" {
		t.Fatal("hash is empty")
	}

	decoded, err := base64.URLEncoding.DecodeString(token)
	if err != nil {
		t.Fatalf("token was not base64 URL encoded: %v", err)
	}
	if len(decoded) != 32 {
		t.Fatalf("decoded token length = %d, want 32", len(decoded))
	}

	wantHash := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))
	if hash != wantHash {
		t.Fatalf("hash = %q, want %q", hash, wantHash)
	}
}

func TestEmailServiceGenerateSecureTokenIsUnique(t *testing.T) {
	svc := NewEmailService(nil, "")

	firstToken, firstHash, err := svc.generateSecureToken()
	if err != nil {
		t.Fatalf("first generateSecureToken returned error: %v", err)
	}
	secondToken, secondHash, err := svc.generateSecureToken()
	if err != nil {
		t.Fatalf("second generateSecureToken returned error: %v", err)
	}

	if firstToken == secondToken {
		t.Fatal("generated duplicate tokens")
	}
	if firstHash == secondHash {
		t.Fatal("generated duplicate token hashes")
	}
}
