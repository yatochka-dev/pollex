package util

import "testing"

func TestPasswordHashAndVerify(t *testing.T) {
	password := "correct horse battery staple"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword returned error: %v", err)
	}
	if hash == "" {
		t.Fatal("HashPassword returned an empty hash")
	}
	if hash == password {
		t.Fatal("HashPassword returned the raw password")
	}

	ok, err := VerifyPassword(password, hash)
	if err != nil {
		t.Fatalf("VerifyPassword returned error for valid hash: %v", err)
	}
	if !ok {
		t.Fatal("VerifyPassword returned false for the original password")
	}

	ok, err = VerifyPassword("wrong password", hash)
	if err != nil {
		t.Fatalf("VerifyPassword returned error for mismatched password: %v", err)
	}
	if ok {
		t.Fatal("VerifyPassword returned true for a mismatched password")
	}
}

func TestVerifyPasswordRejectsInvalidHash(t *testing.T) {
	ok, err := VerifyPassword("password", "not-a-bcrypt-hash")
	if err == nil {
		t.Fatal("VerifyPassword returned nil error for malformed hash")
	}
	if ok {
		t.Fatal("VerifyPassword returned true for malformed hash")
	}
}
