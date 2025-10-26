"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAdminUser,
  useUpdateUserRole,
  useUpdateUserName,
  useResetUserPassword,
  useDeleteUser,
  useToggleEmailVerification,
} from "~/hooks/useAdminUsers";
import {
  ArrowLeft,
  Shield,
  User as UserIcon,
  Mail,
  Calendar,
  Save,
  Trash2,
  Key,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type {
  UpdateUserRoleInput,
  UpdateUserNameInput,
  ResetPasswordInput,
} from "~/lib/types";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { data: user, isLoading, error } = useAdminUser(use(params).id);
  const updateRole = useUpdateUserRole();
  const updateName = useUpdateUserName();
  const resetPassword = useResetUserPassword();
  const deleteUser = useDeleteUser();
  const toggleVerification = useToggleEmailVerification();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"user" | "admin">("user");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Initialize form values when user loads
  if (user && !editingName && !name) {
    setName(user.name);
    setSelectedRole(user.role);
  }

  const handleUpdateName = async () => {
    if (!user || !name.trim()) return;

    await updateName.mutateAsync({
      userId: user.id,
      input: { name: name.trim() },
    });
    setEditingName(false);
  };

  const handleUpdateRole = async (newRole: "user" | "admin") => {
    if (!user) return;

    await updateRole.mutateAsync({
      userId: user.id,
      input: { role: newRole },
    });
    setSelectedRole(newRole);
  };

  const handleToggleVerification = async (verified: boolean) => {
    if (!user) return;

    await toggleVerification.mutateAsync({
      userId: user.id,
      verified: verified,
    });
  };

  const handleResetPassword = async () => {
    if (!user || newPassword.length < 6) return;

    await resetPassword.mutateAsync({
      userId: user.id,
      input: { password: newPassword },
    });
    setNewPassword("");
    setShowPasswordForm(false);
  };

  const handleDelete = async () => {
    if (!user) return;

    await deleteUser.mutateAsync(user.id);
    router.push("/admin/users");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading user...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/users"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Link>
        <div className="flex items-center justify-center py-12">
          <div className="text-destructive">User not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/admin/users"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-full">
            <span className="text-primary text-2xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <RoleBadge role={user.role} />
      </div>

      {/* User Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <div className="bg-card rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>
          <div className="space-y-4">
            <InfoRow
              icon={<UserIcon className="h-4 w-4" />}
              label="User ID"
              value={user.id}
            />
            <InfoRow
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={user.email}
            />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="Joined"
              value={formatDate(user.created_at)}
            />
            {user.email_verified_at && (
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="Email Verified"
                value={formatDate(user.email_verified_at)}
              />
            )}
          </div>
        </div>

        {/* Role Management */}
        <div className="bg-card rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Role Management</h2>
          <div className="space-y-4">
            <div>
              <label className="text-muted-foreground mb-2 block text-sm font-medium">
                Current Role
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateRole("user")}
                  disabled={updateRole.isPending}
                  className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                    user.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  <UserIcon className="mr-2 inline h-4 w-4" />
                  User
                </button>
                <button
                  onClick={() => handleUpdateRole("admin")}
                  disabled={updateRole.isPending}
                  className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                    user.role === "admin"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  <Shield className="mr-2 inline h-4 w-4" />
                  Admin
                </button>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Admins have full access to all management features
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Name */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Update Name</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter new name"
            className="bg-background focus:ring-primary flex-1 rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
          />
          <button
            onClick={handleUpdateName}
            disabled={
              updateName.isPending || !name.trim() || name === user.name
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {updateName.isPending ? "Saving..." : "Save Name"}
          </button>
        </div>
      </div>

      {/* Reset Password */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Reset Password</h2>
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="hover:bg-accent inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          >
            <Key className="h-4 w-4" />
            Reset User Password
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
              className="bg-background focus:ring-primary w-full rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleResetPassword}
                disabled={resetPassword.isPending || newPassword.length < 6}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resetPassword.isPending ? "Resetting..." : "Reset Password"}
              </button>
              <button
                onClick={() => {
                  setShowPasswordForm(false);
                  setNewPassword("");
                }}
                className="hover:bg-accent rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-muted-foreground text-xs">
              The user will be able to log in with this new password
              immediately.
            </p>
          </div>
        )}
      </div>

      {/* Email Verification */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Email Verification</h2>
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            {user.email_verified_at
              ? "This user's email has been verified. You can remove verification if needed."
              : "This user's email has not been verified. Unverified users cannot create polls or vote."}
          </p>
          <div className="flex items-center gap-3">
            {user.email_verified_at ? (
              <div className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Email verified on {formatDate(user.email_verified_at)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <XCircle className="h-4 w-4" />
                <span>Email not verified</span>
              </div>
            )}
          </div>
          <button
            onClick={() => handleToggleVerification(!user.email_verified_at)}
            disabled={toggleVerification.isPending}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              user.email_verified_at
                ? "hover:bg-accent border"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {toggleVerification.isPending ? (
              "Updating..."
            ) : user.email_verified_at ? (
              <>
                <XCircle className="h-4 w-4" />
                Remove Verification
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Mark as Verified
              </>
            )}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border-destructive bg-card rounded-lg border p-6">
        <h2 className="text-destructive mb-4 text-lg font-semibold">
          Danger Zone
        </h2>
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Once you delete a user, there is no going back. All polls created by
            this user will also be deleted.
          </p>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete User
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-lg border p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold">Delete User</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Are you sure you want to delete <strong>{user.name}</strong>? This
              action cannot be undone. All polls created by this user will also
              be deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleteUser.isPending}
                className="hover:bg-accent rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteUser.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleteUser.isPending ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: "user" | "admin" }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-3 py-1.5 text-sm font-medium text-purple-500">
        <Shield className="h-4 w-4" />
        Admin
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-500">
      <UserIcon className="h-4 w-4" />
      User
    </span>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {label}
        </div>
        <div className="mt-1 text-sm break-all">{value}</div>
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
