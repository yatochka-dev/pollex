# Admin Notes

The admin system is role based.

Users have a `role` field in Postgres.

The two roles are `user` and `admin`.

Admin routes live under `/admin`.

Every admin route requires a valid session cookie.

Every admin route also checks the user's role in the database.

The middleware path is:

```text
AuthMiddleware -> RequireAdmin -> handler
```

Admin screens exist in `web-svc/src/app/admin`.

Backend admin handlers are in `core-svc/internal/controllers/admin.go`.

Admin business logic is in `core-svc/internal/service/admin.go`.

Audit logging is in `core-svc/internal/service/audit.go`.

Admins can list users.

Admins can change user roles.

Admins can update names.

Admins can reset passwords.

Admins can toggle email verification.

Admins can delete users.

Admins can list polls.

Admins can close, reopen, or delete polls.

Admins can view audit logs.

There is protection against deleting yourself.

There is also protection against deleting or demoting the last admin.

The email verification toggle endpoint is:

```text
PUT /admin/users/:id/verification
```

The request body must include `verified`.

Both values are valid:

```json
{"verified": true}
{"verified": false}
```

The Go handler uses `*bool` so it can tell the difference between missing and false.

That is a small but good interview detail.

The audit log records who did the action and which resource changed.

Before deploying, remove or protect debug-only admin endpoints.

Also make sure a real admin account exists in the production database.

Good code to show:

- `core-svc/internal/middleware/rbac.go`
- `core-svc/internal/service/admin.go`
- `core-svc/internal/service/audit.go`
- `web-svc/src/app/admin`

Good product flow to show:

1. Log in as admin.
2. Open the admin dashboard.
3. Change a user setting.
4. Show the audit log entry.

One honest caveat:

The admin area needs automated tests before production use.
