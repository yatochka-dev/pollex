package util

import (
	"log"
	"os"
	"strconv"

	env "github.com/joho/godotenv"
)

type Config struct {
	DatabaseUrl            string
	AuthTokenLifespanHours int64
	AuthSecret             string
	AllowedOrigins         []string
	CookieDomain           string
	CookieSecure           bool
	ResendAPIKey           string
	AppBaseURL             string
	Port                   int16
}

func LoadEnvironment() {
	err := env.Load(".env")
	if err != nil {
		log.Println("Unable to load the core environment file")
	}

}

func NewConfig() *Config {
	// Cookie security: use "true" for production, "false" for local development
	cookieSecure := os.Getenv("COOKIE_SECURE") == "true"

	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	if cookieDomain == "" {
		cookieDomain = "localhost" // fallback for dev
	}

	appBaseURL := os.Getenv("APP_BASE_URL")
	if appBaseURL == "" {
		appBaseURL = "http://localhost:8080" // fallback for dev
	}

	// PORT - parse to int16, default 8080
	port := int16(8080)
	if s := os.Getenv("PORT"); s != "" {
		if p, err := strconv.ParseInt(s, 10, 16); err == nil {
			port = int16(p)
		}
	}

	// AUTH SECRET
	authSecret := os.Getenv("AUTH_SECRET")
	if authSecret == "" {
		authSecret = "hello"
	}

	// AUTH TOKEN LIFESPAN (hours) - parse to int64, default 24
	authLifespan := int64(24)
	if s := os.Getenv("AUTH_TOKEN_LIFESPAN_HOURS"); s != "" {
		authLifespan, _ = strconv.ParseInt(s, 10, 64)
	}

	// ALLOWED ORIGINS - comma separated env var
	defaultOrigins := []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"http://localhost:3000/",
		"http://127.0.0.1:3000/",
	}
	allowedOrigins := []string{}
	if s := os.Getenv("ALLOWED_ORIGINS"); s != "" {
		// helper trim
		trim := func(str string) string {
			i, j := 0, len(str)-1
			for i <= j {
				c := str[i]
				if c == ' ' || c == '\t' || c == '\n' || c == '\r' {
					i++
					continue
				}
				break
			}
			for j >= i {
				c := str[j]
				if c == ' ' || c == '\t' || c == '\n' || c == '\r' {
					j--
					continue
				}
				break
			}
			if i > j {
				return ""
			}
			return str[i : j+1]
		}

		start := 0
		for start < len(s) {
			end := start
			for end < len(s) && s[end] != ',' {
				end++
			}
			token := trim(s[start:end])
			if token != "" {
				allowedOrigins = append(allowedOrigins, token)
			}
			start = end + 1
		}
	}

	if len(allowedOrigins) == 0 {
		allowedOrigins = defaultOrigins
	}

	return &Config{
		DatabaseUrl:            os.Getenv("DATABASE_URL"),
		AuthTokenLifespanHours: authLifespan,
		AuthSecret:             authSecret,
		AllowedOrigins:         allowedOrigins,
		CookieDomain:           cookieDomain,
		CookieSecure:           cookieSecure,
		ResendAPIKey:           os.Getenv("RESEND_API_KEY"),
		AppBaseURL:             appBaseURL,
		Port:                   port,
	}
}
