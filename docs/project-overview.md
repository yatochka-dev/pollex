# Project Overview

Pollex is a real-time polling app.

The project is split into a Go backend and a Next.js frontend.

The backend lives in `core-svc`.

The frontend lives in `web-svc`.

Postgres is used for users, polls, options, votes, tokens, and audit logs.

The backend uses Gin for routing.

Database access is generated with sqlc.

Runtime DB access uses pgx and a connection pool.

Auth is based on a signed JWT stored in a `pollex.session` cookie.

The frontend sends cookie-backed requests with `credentials: "include"`.

Poll result updates are pushed through Server-Sent Events.

The SSE route is `GET /polls/votes/:pollId/subscribe`.

The broker stores subscribers by poll ID.

When a vote is saved, the vote service publishes an update.

Open poll pages receive the event and update React Query cache.

The public poll page can show results without a full refresh.

The app also has email verification and password reset flows.

Those flows use one-time token tables.

The raw token is emailed to the user.

The database stores only the token hash.

Admin users can manage users and polls.

Admin actions are written to an audit log.

The admin section is protected by auth middleware plus a role check.

The code is useful to discuss because it touches full-stack product work.

Good areas to show are auth, SSE, sqlc, React Query, and admin RBAC.

Before any interview demo, run the backend and frontend locally once.

Also run the build checks so there are no surprises.

Current checks:

```bash
cd core-svc && go test ./... && go vet ./...
cd web-svc && pnpm check && pnpm build
```

There are currently no automated test files.

That is worth being honest about during the interview.

The next practical improvement is adding focused tests around auth and voting.

The project is best described as a learning-oriented full-stack build.

It is not a polished SaaS product yet.

The most interesting technical part is the real-time vote path.

The most important production gap is test coverage.

The most important deployment gap is cookie hardening across domains.

The best interview framing is practical:

```text
I built the main product flow, added admin tooling, and know what I would harden next.
```

Avoid overselling it as finished.

Show the working parts clearly.

Then call out the next engineering steps yourself.

That makes the project feel real instead of rehearsed.

The goal is to show ownership, not perfection.
