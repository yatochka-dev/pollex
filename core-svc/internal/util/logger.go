package util

import (
	"fmt"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ANSI color codes for terminal output
const (
	ColorReset   = "\033[0m"
	ColorRed     = "\033[31m"
	ColorGreen   = "\033[32m"
	ColorYellow  = "\033[33m"
	ColorBlue    = "\033[34m"
	ColorMagenta = "\033[35m"
	ColorCyan    = "\033[36m"
	ColorWhite   = "\033[37m"
	ColorGray    = "\033[90m"
	ColorBold    = "\033[1m"
)

// RequestLogger provides standardized debug logging for API endpoints
type RequestLogger struct {
	Method     string
	Path       string
	UserID     *uuid.UUID
	StartTime  time.Time
	StatusCode int
}

// NewRequestLogger creates a new request logger
func NewRequestLogger(c *gin.Context) *RequestLogger {
	return &RequestLogger{
		Method:    c.Request.Method,
		Path:      c.FullPath(),
		StartTime: time.Now(),
	}
}

// SetUserID sets the authenticated user ID for the request
func (rl *RequestLogger) SetUserID(userID uuid.UUID) {
	rl.UserID = &userID
}

// LogStart logs the beginning of a request with parameters
func (rl *RequestLogger) LogStart(params ...interface{}) {
	userInfo := ColorGray + "guest" + ColorReset
	if rl.UserID != nil {
		userInfo = ColorCyan + fmt.Sprintf("user=%s", rl.UserID.String()[:8]) + ColorReset
	}

	paramStr := ""
	if len(params) > 0 {
		paramStr = ColorGray + fmt.Sprintf(" | params=%v", params) + ColorReset
	}

	log.Printf("%s[START]%s %s%s %s%s | %s%s",
		ColorBlue+ColorBold,
		ColorReset,
		ColorYellow,
		rl.Method,
		ColorReset+ColorGray,
		rl.Path,
		userInfo,
		paramStr,
	)
}

// LogEnd logs the completion of a request with status and duration
func (rl *RequestLogger) LogEnd(statusCode int, additionalInfo ...interface{}) {
	rl.StatusCode = statusCode
	duration := time.Since(rl.StartTime)

	userInfo := ColorGray + "guest" + ColorReset
	if rl.UserID != nil {
		userInfo = ColorCyan + fmt.Sprintf("user=%s", rl.UserID.String()[:8]) + ColorReset
	}

	// Color status code based on HTTP status
	statusColor := ColorGreen
	if statusCode >= 400 && statusCode < 500 {
		statusColor = ColorYellow
	} else if statusCode >= 500 {
		statusColor = ColorRed
	}

	// Color duration based on speed
	durationColor := ColorGreen
	if duration > 500*time.Millisecond {
		durationColor = ColorYellow
	}
	if duration > 1*time.Second {
		durationColor = ColorRed
	}

	infoStr := ""
	if len(additionalInfo) > 0 {
		infoStr = ColorGray + fmt.Sprintf(" | info=%v", additionalInfo) + ColorReset
	}

	log.Printf("%s[END]%s %s%s %s%s | %s | %sstatus=%d%s | %sduration=%v%s%s",
		ColorGreen+ColorBold,
		ColorReset,
		ColorYellow,
		rl.Method,
		ColorReset+ColorGray,
		rl.Path,
		userInfo,
		statusColor,
		statusCode,
		ColorReset,
		durationColor,
		duration,
		ColorReset,
		infoStr,
	)
}

// LogError logs an error that occurred during request processing
func (rl *RequestLogger) LogError(err error, context string) {
	userInfo := ColorGray + "guest" + ColorReset
	if rl.UserID != nil {
		userInfo = ColorCyan + fmt.Sprintf("user=%s", rl.UserID.String()[:8]) + ColorReset
	}

	log.Printf("%s[ERROR]%s %s%s %s%s | %s | %scontext=%s%s | %serror=%v%s",
		ColorRed+ColorBold,
		ColorReset,
		ColorYellow,
		rl.Method,
		ColorReset+ColorGray,
		rl.Path,
		userInfo,
		ColorMagenta,
		context,
		ColorReset,
		ColorRed,
		err,
		ColorReset,
	)
}
