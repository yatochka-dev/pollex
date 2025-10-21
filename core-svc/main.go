package main

import (
	"context"
	"log"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yatochka-dev/pollex/core-svc/internal/controllers"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/pubsub"
	"github.com/yatochka-dev/pollex/core-svc/internal/service"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

var ctx = context.Background()

func mustPool(ctx context.Context, config *util.Config) *pgxpool.Pool {
	cfg, err := pgxpool.ParseConfig(config.DatabaseUrl)
	if err != nil {
		panic(err)
	}

	// connection pool settings
	cfg.MaxConns = 10
	cfg.MinConns = 2
	cfg.MaxConnLifetime = time.Hour
	cfg.MaxConnIdleTime = 10 * time.Minute
	cfg.HealthCheckPeriod = time.Minute

	// this fixes the "conn busy" errors
	cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		panic(err)
	}
	return pool
}

func main() {
	util.LoadEnvironment()
	config := util.NewConfig()

	pool := mustPool(ctx, config)
	repo := repository.New(pool)

	// disable gin's logging - we use custom logger
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()

	// recovery middleware with colors
	r.Use(gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		log.Printf("%s[PANIC]%s %s%s %s%s | recovered=%v",
			util.ColorRed+util.ColorBold,
			util.ColorReset,
			util.ColorYellow,
			c.Request.Method,
			util.ColorReset+util.ColorGray,
			c.FullPath(),
			recovered,
		)
		c.AbortWithStatus(500)
	}))

	// CORS config
	corsCfg := cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://127.0.0.1:3000/"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           time.Duration(config.AuthTokenLifespanHours) * time.Hour,
	}

	r.Use(cors.New(corsCfg))

	log.Printf("%s[SERVER]%s Starting Pollex API on %s:8080%s",
		util.ColorCyan+util.ColorBold,
		util.ColorReset+util.ColorGreen,
		util.ColorYellow,
		util.ColorReset,
	)

	// setup deps
	broker := pubsub.NewBroker()

	// services
	voteSvc := service.NewVotingService(repo, broker)

	// register routes
	controllers.RegisterAuthRoutes(r, repo, config)

	controllers.RegisterPollsRoutes(r, repo, config)

	controllers.RegisterVoteRoutes(r, voteSvc, broker)

	if err := r.Run(":8080"); err != nil {
		panic(err)
	}

}
