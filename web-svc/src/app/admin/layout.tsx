"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import useSession from "~/hooks/useSession";
import { Users, BarChart3, FileText, Home } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Don't render admin content if not admin
  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="container mx-auto max-w-7xl py-8">
      {/* Admin Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, polls, and view audit logs
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8 flex gap-2 border-b">
        <AdminNavLink href="/admin" icon={<Home size={16} />}>
          Overview
        </AdminNavLink>
        <AdminNavLink href="/admin/users" icon={<Users size={16} />}>
          Users
        </AdminNavLink>
        <AdminNavLink href="/admin/polls" icon={<BarChart3 size={16} />}>
          Polls
        </AdminNavLink>
        <AdminNavLink href="/admin/audit" icon={<FileText size={16} />}>
          Audit Logs
        </AdminNavLink>
      </div>

      {/* Main Content */}
      <div>{children}</div>
    </div>
  );
}

function AdminNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="hover:text-foreground hover:border-primary text-muted-foreground flex items-center gap-2 border-b-2 border-transparent px-4 py-2 transition-colors"
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
