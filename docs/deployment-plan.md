# Deployment Plan

The goal is to send an interviewer a link they can click.

The simplest path is:

- Frontend: Vercel.
- Backend: Render, Fly.io, Railway, or a small VPS.
- Database: managed Postgres.
- Email: Resend.

## What You Need

1. A GitHub repo with the project pushed.
2. A managed Postgres database.
3. Hosts for the Go API and Next.js app.
4. A Resend API key.
5. A real `AUTH_SECRET`.
6. Public frontend and backend URLs.
7. CORS and cookie settings for the deployed domains.

## Backend Environment

Set these for `core-svc`:

```bash
DATABASE_URL=postgresql://...
RESEND_API_KEY=re_...
APP_BASE_URL=https://your-frontend-domain
ALLOWED_ORIGINS=https://your-frontend-domain
COOKIE_DOMAIN=your-frontend-domain
COOKIE_SECURE=true
AUTH_SECRET=long-random-secret
PORT=8080
```

Before deployment, update the backend so missing `AUTH_SECRET` fails startup.

## Frontend Environment

Set this for `web-svc`:

```bash
NEXT_PUBLIC_SERVER_URL=https://your-backend-domain
```

The frontend and backend must both use HTTPS in production.

Cross-site cookies may need `SameSite=None; Secure` if the domains differ.

If cookie issues slow you down, use one parent domain with subdomains.

## Database

From `core-svc`:

```bash
make up DB="postgresql://..."
```

## Recommended Demo Setup

Create one normal user and one admin user.

Seed one poll with votes and keep one fresh poll ready.

## Final Checklist

1. Production frontend loads.
2. Backend health is reachable.
3. Register works.
4. Login works.
5. Create poll works.
6. Public poll link works.
7. Voting works.
8. Live updates work in two browser windows.
9. Admin page works for admin.
10. Admin page blocks normal users.
11. No secrets, `.exe`, `.log`, or build cache files are committed.

For the interview, send the frontend URL.

Keep the repo and logs open in case they ask how something works.
