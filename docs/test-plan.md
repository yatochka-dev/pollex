# Test Plan

This is the test list I would use before showing Pollex to an interviewer.

It mixes automated checks, manual browser testing, and API spot checks.

## Automated Checks

1. Run `go test ./...` in `core-svc`.
2. Run `go vet ./...` in `core-svc`.
3. Run `pnpm check` in `web-svc`.
4. Run `pnpm build` in `web-svc`.
5. Confirm there are no unexpected tracked binaries or logs.

## Local Smoke Test

6. Start Postgres with `docker compose up -d`.
7. Start the backend with `go run main.go`.
8. Start the frontend with `pnpm dev`.
9. Open the homepage.
10. Register a new user.
11. Log out.
12. Log in again.
13. Open the profile page.

## Poll Flow

14. Create a poll with two or three options.
15. Open the poll page in two browser windows.
16. Vote in one window.
17. Confirm the other window updates through SSE.
18. Refresh and confirm the result is still correct.
19. Try voting while logged out.

## Auth And Email

21. Register with an unverified email.
22. Try creating a poll before verification.
23. Request a verification email.
24. Verify the email from the link.
25. Request a password reset.
26. Reset the password.
27. Confirm the new password works.

## Admin Flow

29. Promote one local user to admin.
30. Open `/admin`.
31. List users.
32. Change a user's role.
33. Toggle email verification.
34. Reset a user's password.
35. List polls.
36. Close and reopen a poll.
37. Try admin pages as a normal user.

## Deployment Smoke Test

39. Open the production frontend URL.
40. Register or log in with a demo account.
41. Create a poll.
42. Vote from another browser session.
43. Check live updates.
44. Check logout/login.
45. Check admin access.

## Missing Automated Tests

46. Auth service login and password hashing.
47. Token generation and validation.
48. Vote service save and aggregate behavior.
49. Poll owner and closed-poll rules.
50. Admin role middleware.
51. Last-admin protection.
52. Email token hashing and expiry.
53. Poll page SSE cache update.
