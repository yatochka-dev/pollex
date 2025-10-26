"use client";
import { LogIn, LogOut, User, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import useSession from "~/hooks/useSession";

export function Header() {
  const { logout, authenticated, user } = useSession();
  const router = useRouter();

  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/">
          <h1 className="text-lg font-semibold tracking-tight">pollex</h1>
        </Link>
        {!authenticated ? (
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            onClick={() => {
              router.push("/auth");
            }}
          >
            <LogIn className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm font-medium">
              {user?.name}
            </span>
            {user?.role === "admin" && (
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer"
                onClick={() => router.push("/admin")}
                title="Admin Dashboard"
              >
                <Shield className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer"
              onClick={() => router.push("/profile")}
              title="Profile"
            >
              <User className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer"
              onClick={() => void logout()}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
