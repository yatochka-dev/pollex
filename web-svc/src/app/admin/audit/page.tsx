"use client";

import { useState } from "react";
import { useAuditLogs } from "~/hooks/useAuditLogs";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  BarChart3,
  Shield,
  Key,
  Trash2,
  Lock,
  Unlock,
  Filter,
} from "lucide-react";
import type { AuditLog } from "~/lib/types";

export default function AdminAuditPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const limit = 50;
  const offset = page * limit;

  const actionFilterValue = actionFilter === "all" ? undefined : actionFilter;

  const { data, isLoading, error } = useAuditLogs({
    limit,
    offset,
    action: actionFilterValue,
  });

  const filteredLogs = data?.logs.filter(
    (log) =>
      log.actor_name.toLowerCase().includes(search.toLowerCase()) ||
      log.actor_email.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  // Get unique action types for filter
  const actionTypes = [
    "all",
    "user.create",
    "user.update",
    "user.delete",
    "user.role_change",
    "user.password_reset",
    "poll.close",
    "poll.reopen",
    "poll.delete",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-muted-foreground">
            View and track all administrative actions
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by admin name, email, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background focus:ring-primary w-full rounded-lg border py-2 pr-4 pl-10 focus:ring-2 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-muted-foreground h-4 w-4" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-background focus:ring-primary rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
          >
            <option value="all">All Actions</option>
            <option value="user.create">User Created</option>
            <option value="user.update">User Updated</option>
            <option value="user.delete">User Deleted</option>
            <option value="user.role_change">Role Changed</option>
            <option value="user.password_reset">Password Reset</option>
            <option value="poll.close">Poll Closed</option>
            <option value="poll.reopen">Poll Reopened</option>
            <option value="poll.delete">Poll Deleted</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatBox
            label="Total Events"
            value={data.total}
            icon={<FileText className="h-5 w-5" />}
          />
          <StatBox
            label="User Actions"
            value={data.logs.filter((l) => l.subject_type === "user").length}
            icon={<User className="h-5 w-5" />}
          />
          <StatBox
            label="Poll Actions"
            value={data.logs.filter((l) => l.subject_type === "poll").length}
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <StatBox
            label="Recent (24h)"
            value={
              data.logs.filter(
                (l) =>
                  new Date().getTime() - l.created_at.getTime() <
                  24 * 60 * 60 * 1000,
              ).length
            }
            icon={<FileText className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-card rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading audit logs...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-destructive">Failed to load audit logs</div>
          </div>
        ) : !filteredLogs || filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground">No audit logs found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                      Timestamp
                    </th>
                    <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                      Admin
                    </th>
                    <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                      Action
                    </th>
                    <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                      Subject
                    </th>
                    <th className="text-muted-foreground px-6 py-3 text-right text-xs font-medium tracking-wider uppercase">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {formatDateTime(log.created_at)}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {formatRelativeTime(log.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                            <span className="text-primary text-xs font-semibold">
                              {log.actor_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              {log.actor_name}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {log.actor_email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <div>
                            <ActionBadge action={log.action} />
                            <div className="text-muted-foreground mt-0.5 text-xs">
                              {formatActionDescription(log.action)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <span className="font-medium capitalize">
                            {log.subject_type}
                          </span>
                          {log.subject_id && (
                            <div className="text-muted-foreground text-xs">
                              {log.subject_id.slice(0, 8)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button className="text-primary text-sm hover:underline">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-6 py-4">
                <div className="text-muted-foreground text-sm">
                  Page {page + 1} of {totalPages} · {data?.total} total events
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="hover:bg-accent inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    className="hover:bg-accent inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <AuditLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const colors = getActionColors(action);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors}`}
    >
      {formatActionLabel(action)}
    </span>
  );
}

function StatBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
    </div>
  );
}

function AuditLogDetailModal({
  log,
  onClose,
}: {
  log: AuditLog;
  onClose: () => void;
}) {
  return (
    <div
      className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-2xl rounded-lg border p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="mb-1 text-lg font-semibold">Audit Log Details</h3>
            <p className="text-muted-foreground text-sm">
              {formatDateTime(log.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <DetailRow label="Event ID" value={log.id} />
          <DetailRow
            label="Admin"
            value={`${log.actor_name} (${log.actor_email})`}
          />
          <DetailRow
            label="Action"
            value={formatActionDescription(log.action)}
          />
          <DetailRow label="Subject Type" value={log.subject_type} />
          {log.subject_id && (
            <DetailRow label="Subject ID" value={log.subject_id} />
          )}

          {log.meta && Object.keys(log.meta).length > 0 && (
            <div>
              <div className="text-muted-foreground mb-2 text-sm font-medium">
                Additional Details
              </div>
              <div className="bg-muted rounded-lg p-4">
                <pre className="overflow-auto text-xs">
                  {JSON.stringify(log.meta, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="hover:bg-accent rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 border-b pb-3 last:border-b-0">
      <div className="text-muted-foreground w-32 shrink-0 text-sm font-medium">
        {label}
      </div>
      <div className="text-sm break-all">{value}</div>
    </div>
  );
}

function getActionIcon(action: string) {
  if (action.includes("user")) {
    if (action.includes("role")) return <Shield className="h-4 w-4" />;
    if (action.includes("password")) return <Key className="h-4 w-4" />;
    if (action.includes("delete")) return <Trash2 className="h-4 w-4" />;
    return <User className="h-4 w-4" />;
  }
  if (action.includes("poll")) {
    if (action.includes("close")) return <Lock className="h-4 w-4" />;
    if (action.includes("reopen")) return <Unlock className="h-4 w-4" />;
    if (action.includes("delete")) return <Trash2 className="h-4 w-4" />;
    return <BarChart3 className="h-4 w-4" />;
  }
  return <FileText className="h-4 w-4" />;
}

function getActionColors(action: string): string {
  if (action.includes("delete")) {
    return "bg-red-500/10 text-red-500";
  }
  if (action.includes("role")) {
    return "bg-purple-500/10 text-purple-500";
  }
  if (action.includes("password")) {
    return "bg-orange-500/10 text-orange-500";
  }
  if (action.includes("close")) {
    return "bg-yellow-500/10 text-yellow-500";
  }
  if (action.includes("reopen")) {
    return "bg-green-500/10 text-green-500";
  }
  return "bg-blue-500/10 text-blue-500";
}

function formatActionLabel(action: string): string {
  return action
    .split(".")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" → ");
}

function formatActionDescription(action: string): string {
  const actionMap: Record<string, string> = {
    "user.create": "Created a user account",
    "user.update": "Updated user information",
    "user.delete": "Deleted a user account",
    "user.role_change": "Changed user role",
    "user.password_reset": "Reset user password",
    "poll.close": "Closed a poll",
    "poll.reopen": "Reopened a poll",
    "poll.delete": "Deleted a poll",
    "admin.login": "Logged in as admin",
  };

  return actionMap[action] || action;
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 10) return "just now";
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return `${Math.floor(diffDays / 7)}w ago`;
}
