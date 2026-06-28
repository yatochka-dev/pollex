# Interviewer Walkthrough Plan

Goal: show the product first, then prove you understand the code.

Keep the walkthrough around 12 to 18 minutes.

## Before The Call

1. Open the deployed app in a clean browser.
2. Have a demo user ready.
3. Have an admin user ready.
4. Have one sample poll ready.
5. Keep the repo open in your editor.
6. Keep the terminal at the project root.
7. Run the checks before the interview.

## Product Demo

8. Start on the homepage.
9. Explain Pollex in one sentence.
10. Log in as the demo user.
11. Create a poll.
12. Open the poll in another browser window.
13. Vote in one window.
14. Show the other window updating live.
15. Mention this uses SSE, not polling.
16. Open the profile page.
17. Show the user's polls.
18. Log in as admin if time allows.
19. Show user management and audit logs.

## Code Walkthrough

20. Start with the folder split.
21. Open `core-svc/main.go`.
22. Explain dependency setup and route registration.
23. Open `controllers/vote.go`.
24. Trace the vote endpoint.
25. Open `service/voting.go`.
26. Explain where the write and aggregate logic lives.
27. Open `pubsub/broker.go`.
28. Explain subscriber management and broadcasts.
29. Open `useSubscribeToPoll.ts`.
30. Show how the frontend receives SSE events.
31. Open `lib/types.ts`.
32. Explain Zod validation.
33. Open `middleware/auth.go`.
34. Explain cookie auth.
35. Open `middleware/rbac.go`.
36. Explain admin authorization.

## What To Say About Tradeoffs

37. SSE was chosen because the app only needs server-to-client updates.
38. sqlc keeps SQL explicit while avoiding untyped query code.
39. React Query handles server state better than custom global state.
40. Cookies make browser auth simple, but production cookie settings matter.
41. The project needs automated tests before serious production use.
42. The next test target would be auth, voting, and admin RBAC.

## If Asked About Deployment

43. Frontend can run on Vercel.
44. Backend can run on Render, Fly.io, Railway, or a VPS.
45. Database should be managed Postgres.
46. Email needs a Resend key and verified sender domain.
47. The frontend API URL and backend CORS origins must match.

## Closing

48. End by naming one thing you are proud of.
49. Then name one thing you would improve next.
50. Keep both answers specific to this codebase.
