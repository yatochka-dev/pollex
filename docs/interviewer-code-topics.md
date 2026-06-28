# Top 10 Code Topics For An Interview

Use this list when walking someone through the codebase.

1. Service split

Explain why the backend and frontend are separate folders.

Show `core-svc/main.go` and `web-svc/src/app`.

2. Database access

Show `core-svc/sqlc.yml`, `internal/db/queries`, and generated repository code.

Explain that handwritten SQL still gets typed Go methods.

3. Auth flow

Show login, JWT creation, cookie setting, and `AuthMiddleware`.

Mention what should be hardened for production.

4. Real-time voting

Show `internal/pubsub/broker.go`, `controllers/vote.go`, and `useSubscribeToPoll.ts`.

Explain why SSE was enough instead of WebSockets.

5. Vote write path

Trace a vote from frontend mutation to backend service to database to SSE publish.

This is the best full-stack flow to demo in code.

6. React Query usage

Show how server state is fetched, cached, invalidated, and patched from SSE.

7. Zod schemas

Show `web-svc/src/lib/types.ts`.

Explain runtime validation at the API boundary.

8. Admin RBAC

Show admin middleware, admin service methods, and audit logging.

Call out last-admin protection.

9. Email verification and reset

Show token generation, hashing, expiry, and one-time use.

Explain why raw tokens are not stored.

10. Gaps and next steps

Be direct about missing automated tests.

Mention auth hardening, deployment cleanup, and better observability.

That honesty usually lands better than pretending the project is finished.

If time is short, cover only three paths.

First, show auth from login to middleware.

Second, show voting from button click to database write.

Third, show SSE from backend publish to frontend cache update.

Those three paths explain most of the project.

If the interviewer asks about scale, keep it simple.

The current broker is in-memory.

That is fine for one backend instance.

For multiple backend instances, use Redis pub/sub or a message broker.

If the interviewer asks about security, mention cookies, CORS, token secrets, and rate limits.

If the interviewer asks about quality, mention the missing tests before they do.

That shows judgment.

If they ask what you would build next, start with tests.

Then mention deployment hardening.

Then mention better observability.

Those are practical improvements.

They also connect directly to the current code.

Avoid jumping to unrelated features.
