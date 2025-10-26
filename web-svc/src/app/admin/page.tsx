"use client";

import { useAdminUsers } from "~/hooks/useAdminUsers";
import { useAdminPolls } from "~/hooks/useAdminPolls";
import { useAuditLogs } from "~/hooks/useAuditLogs";
import { Users, BarChart3, FileText, UserCheck, UserX } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: usersData } = useAdminUsers({ limit: 1, offset: 0 });
  const { data: pollsData } = useAdminPolls({ limit: 1, offset: 0 });
  const { data: closedPollsData } = useAdminPolls({
    limit: 1,
    offset: 0,
    closed: true,
  });
  const { data: auditData } = useAuditLogs({ limit: 10 });

  const totalUsers = usersData?.total ?? 0;
  const totalPolls = pollsData?.total ?? 0;
  const totalClosedPolls = closedPollsData?.total ?? 0;
  const activePolls = totalPolls - totalClosedPolls;
  const recentAudits = auditData?.logs ?? [];

  return (
    <div className="space-y-8">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon={<Users className="h-6 w-6" />}
          href="/admin/users"
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
        />
        <StatCard
          title="Total Polls"
          value={totalPolls}
          icon={<BarChart3 className="h-6 w-6" />}
          href="/admin/polls"
          iconBg="bg-green-500/10"
          iconColor="text-green-500"
        />
        <StatCard
          title="Active Polls"
          value={activePolls}
          icon={<UserCheck className="h-6 w-6" />}
          href="/admin/polls?closed=false"
          iconBg="bg-purple-500/10"
          iconColor="text-purple-500"
        />
        <StatCard
          title="Closed Polls"
          value={totalClosedPolls}
          icon={<UserX className="h-6 w-6" />}
          href="/admin/polls?closed=true"
          iconBg="bg-orange-500/10"
          iconColor="text-orange-500"
        />
      </div>

      {/* Recent Audit Logs */}
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Recent Activity</h2>
          </div>
          <Link
            href="/admin/audit"
            className="text-primary hover:underline text-sm"
          >
            View all
          </Link>
        </div>

        {recentAudits.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No recent activity
          </p>
        ) : (
          <div className="space-y-2">
            {recentAudits.map((log) => (
              <div
                key={log.id}
                className="border-b last:border-b-0 py-3 flex items-start gap-3"
              >
                <div className="bg-muted rounded-full p-2">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{log.actor_name}</p>
                      <p className="text-muted-foreground text-sm">
                        {formatAction(log.action)}
                      </p>
                      {log.meta && (
                        <p className="text-muted-foreground text-xs mt-1">
                          {formatMeta(log.meta)}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatRelativeTime(log.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <QuickActionButton href="/admin/users">
            Manage Users
          </QuickActionButton>
          <QuickActionButton href="/admin/polls">
            Manage Polls
          </QuickActionButton>
          <QuickActionButton href="/admin/audit">
            View Audit Logs
          </QuickActionButton>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  href,
  iconBg,
  iconColor,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Link href={href}>
      <div className="rounded-lg border bg-card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          <div className={`${iconBg} ${iconColor} rounded-full p-3`}>
            {icon}
          </div>
        </div>
      </div>
    </Link>
  );
}

function QuickActionButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="border rounded-lg p-4 hover:bg-accent transition-colors text-center font-medium"
    >
      {children}
    </Link>
  );
}

function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    "user.create": "Created a user",
    "user.update": "Updated a user",
    "user.delete": "Deleted a user",
    "user.role_change": "Changed user role",
    "user.password_reset": "Reset user password",
    "poll.close": "Closed a poll",
    "poll.reopen": "Reopened a poll",
    "poll.delete": "Deleted a poll",
    "admin.login": "Logged in as admin",
  };

  return actionMap[action] || action;
}

function formatMeta(meta: Record<string, unknown>): string {
  if (meta.old_role && meta.new_role) {
    return `${meta.old_role} → ${meta.new_role}`;
  }
  if (meta.poll_question) {
    return `"${meta.poll_question}"`;
  }
  return "";
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
