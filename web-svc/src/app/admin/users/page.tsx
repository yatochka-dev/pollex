"use client";

import { useState } from "react";
import { useAdminUsers, useDeleteUser } from "~/hooks/useAdminUsers";
import {
  Search,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Shield,
  User as UserIcon,
  Trash2,
  Edit,
} from "lucide-react";
import Link from "next/link";
import type { AdminUser } from "~/lib/types";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const limit = 50;
  const offset = page * limit;

  const { data, isLoading, error } = useAdminUsers({ limit, offset });
  const deleteUser = useDeleteUser();

  const filteredUsers = data?.users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleDelete = async (userId: string) => {
    await deleteUser.mutateAsync(userId);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background focus:ring-primary w-full rounded-lg border py-2 pr-4 pl-10 focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatBox
            label="Total Users"
            value={data.total}
            icon={<UserIcon className="h-5 w-5" />}
          />
          <StatBox
            label="Admins"
            value={data.users.filter((u) => u.role === "admin").length}
            icon={<Shield className="h-5 w-5" />}
          />
          <StatBox
            label="Regular Users"
            value={data.users.filter((u) => u.role === "user").length}
            icon={<UserIcon className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Users Table */}
      <div className="bg-card rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading users...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-destructive">Failed to load users</div>
          </div>
        ) : !filteredUsers || filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <UserIcon className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground">No users found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                      User
                    </th>
                    <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                      Email
                    </th>
                    <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                      Role
                    </th>
                    <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                      Joined
                    </th>
                    <th className="text-muted-foreground px-6 py-3 text-right text-xs font-medium tracking-wider uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                            <span className="text-primary text-sm font-semibold">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-muted-foreground text-sm">
                              {user.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">{user.email}</div>
                        {user.email_verified_at && (
                          <div className="text-muted-foreground text-xs">
                            Verified
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="text-muted-foreground px-6 py-4 text-sm whitespace-nowrap">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="hover:bg-accent inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Link>
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            className="text-destructive hover:bg-destructive/10 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
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
                <div className="text-muted-foreground text-sm">
                  Page {page + 1} of {totalPages} · {data?.total} total users
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete User"
          description="Are you sure you want to delete this user? This action cannot be undone. All polls created by this user will also be deleted."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          isLoading={deleteUser.isPending}
        />
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: "user" | "admin" }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-500">
        <Shield className="h-3 w-3" />
        Admin
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500">
      <UserIcon className="h-3 w-3" />
      User
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

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  isLoading,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-lg border p-6 shadow-lg">
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground mb-6 text-sm">{description}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="hover:bg-accent rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
