"use client";

import { useState } from "react";
import {
  useAdminPolls,
  useClosePoll,
  useReopenPoll,
  useDeletePoll,
} from "~/hooks/useAdminPolls";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Trash2,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import type { AdminPoll } from "~/lib/types";

export default function AdminPollsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [page, setPage] = useState(0);
  const [actionConfirm, setActionConfirm] = useState<{
    type: "close" | "reopen" | "delete";
    poll: AdminPoll;
  } | null>(null);

  const limit = 50;
  const offset = page * limit;

  const closedFilter =
    statusFilter === "all" ? undefined : statusFilter === "closed";

  const { data, isLoading, error } = useAdminPolls({
    limit,
    offset,
    closed: closedFilter,
  });

  const closePoll = useClosePoll();
  const reopenPoll = useReopenPoll();
  const deletePoll = useDeletePoll();

  const filteredPolls = data?.polls.filter((poll) =>
    poll.question.toLowerCase().includes(search.toLowerCase()) ||
    poll.owner_name.toLowerCase().includes(search.toLowerCase()) ||
    poll.owner_email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleAction = async () => {
    if (!actionConfirm) return;

    const { type, poll } = actionConfirm;

    switch (type) {
      case "close":
        await closePoll.mutateAsync(poll.id);
        break;
      case "reopen":
        await reopenPoll.mutateAsync(poll.id);
        break;
      case "delete":
        await deletePoll.mutateAsync(poll.id);
        break;
    }

    setActionConfirm(null);
  };

  const isPending =
    closePoll.isPending || reopenPoll.isPending || deletePoll.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Poll Management</h2>
          <p className="text-muted-foreground">
            Manage and moderate polls across the platform
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search polls by question or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "open" | "closed")
          }
          className="rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Polls</option>
          <option value="open">Open Only</option>
          <option value="closed">Closed Only</option>
        </select>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatBox
            label="Total Polls"
            value={data.total}
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <StatBox
            label="Open Polls"
            value={data.polls.filter((p) => !p.closed).length}
            icon={<Unlock className="h-5 w-5" />}
          />
          <StatBox
            label="Closed Polls"
            value={data.polls.filter((p) => p.closed).length}
            icon={<Lock className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Polls Table */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading polls...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-destructive">Failed to load polls</div>
          </div>
        ) : !filteredPolls || filteredPolls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No polls found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPolls.map((poll) => (
                    <tr
                      key={poll.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="font-medium line-clamp-2">
                              {poll.question}
                            </div>
                            <div className="text-muted-foreground text-xs mt-1">
                              ID: {poll.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium">
                            {poll.owner_name}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {poll.owner_email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge closed={poll.closed} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(poll.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/${poll.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                            title="View poll"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          {poll.closed ? (
                            <button
                              onClick={() =>
                                setActionConfirm({ type: "reopen", poll })
                              }
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-600/10 transition-colors"
                              title="Reopen poll"
                            >
                              <Unlock className="h-4 w-4" />
                              Reopen
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setActionConfirm({ type: "close", poll })
                              }
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-600/10 transition-colors"
                              title="Close poll"
                            >
                              <Lock className="h-4 w-4" />
                              Close
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setActionConfirm({ type: "delete", poll })
                            }
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete poll"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-6 py-4">
                <div className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages} · {data?.total} total polls
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Action Confirmation Modal */}
      {actionConfirm && (
        <ConfirmDialog
          title={getActionTitle(actionConfirm.type)}
          description={getActionDescription(actionConfirm.type, actionConfirm.poll)}
          confirmLabel={getActionLabel(actionConfirm.type)}
          onConfirm={handleAction}
          onCancel={() => setActionConfirm(null)}
          isLoading={isPending}
          variant={actionConfirm.type === "delete" ? "destructive" : "default"}
        />
      )}
    </div>
  );
}

function StatusBadge({ closed }: { closed: boolean }) {
  if (closed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-500">
        <Lock className="h-3 w-3" />
        Closed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">
      <Unlock className="h-3 w-3" />
      Open
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
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  isLoading,
  variant = "default",
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function getActionTitle(type: "close" | "reopen" | "delete"): string {
  switch (type) {
    case "close":
      return "Close Poll";
    case "reopen":
      return "Reopen Poll";
    case "delete":
      return "Delete Poll";
  }
}

function getActionDescription(type: "close" | "reopen" | "delete", poll: AdminPoll): string {
  switch (type) {
    case "close":
      return `Are you sure you want to close "${poll.question}"? Users will no longer be able to vote on this poll.`;
    case "reopen":
      return `Are you sure you want to reopen "${poll.question}"? Users will be able to vote on this poll again.`;
    case "delete":
      return `Are you sure you want to delete "${poll.question}"? This action cannot be undone. All votes will be permanently lost.`;
  }
}

function getActionLabel(type: "close" | "reopen" | "delete"): string {
  switch (type) {
    case "close":
      return "Close Poll";
    case "reopen":
      return "Reopen Poll";
    case "delete":
      return "Delete Poll";
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
