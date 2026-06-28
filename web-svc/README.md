# Pollex Web Service

This is the Next.js frontend for Pollex.

It handles:

- Login and registration screens.
- Poll creation.
- Public poll pages.
- Real-time vote updates through SSE.
- Profile and user poll history.
- Admin screens for users, polls, and audit logs.

The API base URL comes from:

```bash
NEXT_PUBLIC_SERVER_URL=http://localhost:8080
```

Local setup:

```bash
pnpm install
pnpm dev
```

Checks:

```bash
pnpm check
pnpm build
```

Main folders:

- `src/app`: routes and pages.
- `src/hooks`: React Query hooks and API flows.
- `src/lib/types.ts`: Zod schemas and shared types.
- `src/lib/api.ts`: fetch wrapper and error handling.
- `src/components`: shared UI and auth components.

The frontend expects the backend to set a `pollex.session` cookie.

Most API requests use `credentials: "include"` so that cookie is sent.

For deployment, the frontend can go on Vercel, Netlify, or a container host.

The backend URL must be public, HTTPS, and allowed by the backend CORS config.

Good files to show:

- `src/app/[pollId]/poll.tsx`
- `src/hooks/useSubscribeToPoll.ts`
- `src/hooks/useVote.tsx`
- `src/hooks/useSession.tsx`
- `src/lib/api.ts`
- `src/lib/types.ts`

Demo checklist:

- Login screen loads.
- Poll creation works.
- Poll page receives SSE updates.
- Profile page loads user polls.
- Admin pages block non-admin users.

Deployment note:

If frontend and backend use different domains, test cookies carefully.

The browser must accept the backend session cookie.

That usually means HTTPS, correct cookie domain, and matching CORS settings.
