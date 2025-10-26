package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/resend/resend-go/v2"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

const (
	// Email configuration (hardcoded as per requirements)
	emailSender     = "Pollex <no-reply@yatochka.dev>"
	baseURL         = "https://pollex.app"
	tokenExpiration = 24 * time.Hour

	// Rate limiting
	maxVerificationEmailsPerHour = 4
	maxPasswordResetPerHour      = 5
)

type EmailService struct {
	repo         *repository.Queries
	resendClient *resend.Client
	apiKey       string
}

func NewEmailService(repo *repository.Queries, apiKey string) *EmailService {
	client := resend.NewClient(apiKey)
	return &EmailService{
		repo:         repo,
		resendClient: client,
		apiKey:       apiKey,
	}
}

// generateSecureToken generates a cryptographically secure random token
func (s *EmailService) generateSecureToken() (string, string, error) {
	// Generate 32 bytes of random data
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", "", fmt.Errorf("failed to generate random token: %w", err)
	}

	// Encode as base64 URL-safe string
	token := base64.URLEncoding.EncodeToString(tokenBytes)

	// Hash the token for storage
	hash := sha256.Sum256([]byte(token))
	tokenHash := fmt.Sprintf("%x", hash)

	return token, tokenHash, nil
}

// SendVerificationEmail sends an email verification link to the user
func (s *EmailService) SendVerificationEmail(ctx context.Context, userID uuid.UUID, userEmail, userName string) error {
	// Check rate limiting
	count, err := s.repo.CountUnusedTokensByUserID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to check rate limit: %w", err)
	}
	if count >= maxVerificationEmailsPerHour {
		return fmt.Errorf("too many verification emails requested, please try again later")
	}

	// Generate token
	token, tokenHash, err := s.generateSecureToken()
	if err != nil {
		return err
	}

	// Store token in database
	expiresAt := time.Now().Add(tokenExpiration)
	_, err = s.repo.CreateEmailVerifyToken(ctx, repository.CreateEmailVerifyTokenParams{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
	})
	if err != nil {
		return fmt.Errorf("failed to create verification token: %w", err)
	}

	// Build verification URL
	verifyURL := fmt.Sprintf("%s/verify-email?token=%s&uid=%s", baseURL, token, userID.String())

	// Prepare email content
	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Verify your email address</h2>
        <p>Hi %s,</p>
        <p>Thanks for signing up for Pollex! Please verify your email address by clicking the button below:</p>
        <a href="%s" class="button">Verify Email</a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4F46E5;">%s</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create a Pollex account, you can safely ignore this email.</p>
        <div class="footer">
            <p>This email was sent by Pollex. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`, userName, verifyURL, verifyURL)

	textContent := fmt.Sprintf(`
Verify your email address

Hi %s,

Thanks for signing up for Pollex! Please verify your email address by clicking the link below:

%s

This link will expire in 24 hours.

If you didn't create a Pollex account, you can safely ignore this email.

---
This email was sent by Pollex. Please do not reply to this email.
`, userName, verifyURL)

	// Send email via Resend
	params := &resend.SendEmailRequest{
		From:    emailSender,
		To:      []string{userEmail},
		Subject: "Verify your email - Pollex",
		Html:    htmlContent,
		Text:    textContent,
	}

	sent, err := s.resendClient.Emails.Send(params)
	if err != nil {
		log.Printf("%s[EMAIL ERROR]%s Failed to send verification email to %s: %v",
			util.ColorRed, util.ColorReset, userEmail, err)
		return fmt.Errorf("failed to send verification email: %w", err)
	}

	log.Printf("%s[EMAIL]%s Verification email sent to %s (ID: %s)",
		util.ColorGreen, util.ColorReset, userEmail, sent.Id)

	return nil
}

// VerifyEmail verifies an email using the provided token
func (s *EmailService) VerifyEmail(ctx context.Context, userID uuid.UUID, token string) error {
	// Hash the provided token
	hash := sha256.Sum256([]byte(token))
	tokenHash := fmt.Sprintf("%x", hash)

	// Get token from database
	dbToken, err := s.repo.GetEmailVerifyTokenByHash(ctx, tokenHash)
	if err != nil {
		return fmt.Errorf("invalid or expired verification token")
	}

	// Verify user ID matches
	if dbToken.UserID != userID {
		return fmt.Errorf("invalid verification token")
	}

	// Check if already used
	if dbToken.UsedAt.Valid {
		// Idempotent success for already used tokens
		return nil
	}

	// Check if expired
	if time.Now().After(dbToken.ExpiresAt) {
		return fmt.Errorf("verification token has expired")
	}

	// Mark token as used
	_, err = s.repo.MarkEmailVerifyTokenUsed(ctx, dbToken.ID)
	if err != nil {
		return fmt.Errorf("failed to mark token as used: %w", err)
	}

	// Update user email_verified_at
	_, err = s.repo.SetUserEmailVerified(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to verify email: %w", err)
	}

	log.Printf("%s[EMAIL]%s Email verified for user %s",
		util.ColorGreen, util.ColorReset, userID.String())

	return nil
}

// SendPasswordResetEmail sends a password reset link to the user
func (s *EmailService) SendPasswordResetEmail(ctx context.Context, userID uuid.UUID, userEmail, userName string) error {
	// Check rate limiting (5 per hour)
	oneHourAgo := time.Now().Add(-1 * time.Hour)
	count, err := s.repo.CountRecentPasswordResetRequests(ctx, repository.CountRecentPasswordResetRequestsParams{
		UserID:    userID,
		CreatedAt: oneHourAgo,
	})
	if err != nil {
		return fmt.Errorf("failed to check rate limit: %w", err)
	}
	if count >= maxPasswordResetPerHour {
		return fmt.Errorf("too many password reset requests, please try again later")
	}

	// Generate token
	token, tokenHash, err := s.generateSecureToken()
	if err != nil {
		return err
	}

	// Store token in database
	expiresAt := time.Now().Add(tokenExpiration)
	_, err = s.repo.CreatePasswordResetToken(ctx, repository.CreatePasswordResetTokenParams{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
	})
	if err != nil {
		return fmt.Errorf("failed to create reset token: %w", err)
	}

	// Build reset URL
	resetURL := fmt.Sprintf("%s/reset-password?token=%s&uid=%s", baseURL, token, userID.String())

	// Prepare email content
	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .warning { background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 12px; margin: 20px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Reset your password</h2>
        <p>Hi %s,</p>
        <p>We received a request to reset your password for your Pollex account. Click the button below to choose a new password:</p>
        <a href="%s" class="button">Reset Password</a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4F46E5;">%s</p>
        <p>This link will expire in 24 hours.</p>
        <div class="warning">
            <strong>⚠️ Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will not be changed.
        </div>
        <div class="footer">
            <p>This email was sent by Pollex. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`, userName, resetURL, resetURL)

	textContent := fmt.Sprintf(`
Reset your password

Hi %s,

We received a request to reset your password for your Pollex account. Click the link below to choose a new password:

%s

This link will expire in 24 hours.

⚠️ Security Notice: If you didn't request a password reset, please ignore this email. Your password will not be changed.

---
This email was sent by Pollex. Please do not reply to this email.
`, userName, resetURL)

	// Send email via Resend
	params := &resend.SendEmailRequest{
		From:    emailSender,
		To:      []string{userEmail},
		Subject: "Reset your password - Pollex",
		Html:    htmlContent,
		Text:    textContent,
	}

	sent, err := s.resendClient.Emails.Send(params)
	if err != nil {
		log.Printf("%s[EMAIL ERROR]%s Failed to send password reset email to %s: %v",
			util.ColorRed, util.ColorReset, userEmail, err)
		return fmt.Errorf("failed to send password reset email: %w", err)
	}

	log.Printf("%s[EMAIL]%s Password reset email sent to %s (ID: %s)",
		util.ColorGreen, util.ColorReset, userEmail, sent.Id)

	return nil
}

// ValidatePasswordResetToken validates a password reset token
func (s *EmailService) ValidatePasswordResetToken(ctx context.Context, userID uuid.UUID, token string) error {
	// Hash the provided token
	hash := sha256.Sum256([]byte(token))
	tokenHash := fmt.Sprintf("%x", hash)

	// Get token from database
	dbToken, err := s.repo.GetPasswordResetTokenByHash(ctx, tokenHash)
	if err != nil {
		return fmt.Errorf("invalid or expired reset token")
	}

	// Verify user ID matches
	if dbToken.UserID != userID {
		return fmt.Errorf("invalid reset token")
	}

	// Check if already used
	if dbToken.UsedAt.Valid {
		return fmt.Errorf("reset token has already been used")
	}

	// Check if expired
	if time.Now().After(dbToken.ExpiresAt) {
		return fmt.Errorf("reset token has expired")
	}

	return nil
}

// ResetPassword resets a user's password using a valid token
func (s *EmailService) ResetPassword(ctx context.Context, userID uuid.UUID, token string, newPasswordHash string) error {
	// Validate the token first
	if err := s.ValidatePasswordResetToken(ctx, userID, token); err != nil {
		return err
	}

	// Hash the token to find it
	hash := sha256.Sum256([]byte(token))
	tokenHash := fmt.Sprintf("%x", hash)

	dbToken, err := s.repo.GetPasswordResetTokenByHash(ctx, tokenHash)
	if err != nil {
		return fmt.Errorf("invalid reset token")
	}

	// Update password
	err = s.repo.UpdateUserPasswordHash(ctx, repository.UpdateUserPasswordHashParams{
		ID:           userID,
		PasswordHash: newPasswordHash,
	})
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Mark token as used
	_, err = s.repo.MarkPasswordResetTokenUsed(ctx, dbToken.ID)
	if err != nil {
		return fmt.Errorf("failed to mark token as used: %w", err)
	}

	log.Printf("%s[PASSWORD]%s Password reset successful for user %s",
		util.ColorGreen, util.ColorReset, userID.String())

	return nil
}

// CleanupExpiredTokens removes expired tokens from the database
func (s *EmailService) CleanupExpiredTokens(ctx context.Context) error {
	if err := s.repo.DeleteExpiredEmailVerifyTokens(ctx); err != nil {
		return fmt.Errorf("failed to cleanup expired verification tokens: %w", err)
	}
	if err := s.repo.DeleteExpiredPasswordResetTokens(ctx); err != nil {
		return fmt.Errorf("failed to cleanup expired reset tokens: %w", err)
	}
	return nil
}
