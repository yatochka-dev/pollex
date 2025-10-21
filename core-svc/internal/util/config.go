package util

import (
	"os"

	env "github.com/joho/godotenv"
)

type Config struct {
	DatabaseUrl            string
	AuthTokenLifespanHours int64
	AuthSecret             string
	AllowedOrigins         []string
	CookieDomain           string
	CookieSecure           bool
}

func LoadEnvironment() {
	err := env.Load(".env")
	if err != nil {
		//log.Fatal("Unable to load the core enviroment file")
		panic(".env" + err.Error())
	}

}

func NewConfig() *Config {
	// Cookie security: use "true" for production, "false" for local development
	cookieSecure := os.Getenv("COOKIE_SECURE") == "true"

	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	if cookieDomain == "" {
		cookieDomain = "localhost" // fallback for dev
	}

	return &Config{
		DatabaseUrl:            os.Getenv("DATABASE_URL"),
		AuthTokenLifespanHours: 24,
		AuthSecret:             "hello",
		AllowedOrigins:         []string{"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3000/", "http://127.0.0.1:3000/"},
		CookieDomain:           cookieDomain,
		CookieSecure:           cookieSecure,
	}
}
