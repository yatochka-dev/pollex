# Pollex

Pollex is a small real-time polling app.

It has two services:

- `core-svc`: Go API with Gin, PostgreSQL, sqlc, JWT cookies, and SSE.
- `web-svc`: Next.js frontend with React Query, Zod, and Tailwind.

The main flow is simple:

1. A signed-in user creates a poll.
2. Another user opens the poll link.
3. Votes are saved in Postgres.
4. The API broadcasts vote updates over Server-Sent Events.
5. Open browser tabs update without a manual refresh.

Useful docs:

- [Project overview](docs/project-overview.md)
- [Admin notes](docs/admin.md)
- [Test plan](docs/test-plan.md)
- [Interviewer code topics](docs/interviewer-code-topics.md)
- [Interviewer walkthrough](docs/interviewer-walkthrough.md)
- [Deployment plan](docs/deployment-plan.md)

Local commands:

```bash
docker compose up -d
cd core-svc && go run main.go
cd web-svc && pnpm dev
```

Before showing the project to someone else, run:

```bash
cd core-svc && go test ./... && go vet ./...
cd web-svc && pnpm check && pnpm build
```

What to demo first:

- Create a poll.
- Open the poll in two browser windows.
- Vote in one window.
- Watch the other window update live.

What to show in code:

- `core-svc/internal/controllers/vote.go`
- `core-svc/internal/pubsub/broker.go`
- `web-svc/src/hooks/useSubscribeToPoll.ts`
- `web-svc/src/lib/types.ts`

Current deployment target:

- Frontend on Vercel.
- Backend on Render, Fly.io, Railway, or a VPS.
- Database on managed Postgres.
- Email through Resend.

Known gaps:

- No automated tests are checked in yet.
- Production auth settings need hardening.
- Debug/build artifacts should stay out of git.
- Demo data should be seeded before interviews.
- Keep the walkthrough focused on one clean poll flow.
