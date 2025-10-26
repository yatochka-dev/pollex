/**
 * Profile Page
 *
 * This page displays the authenticated user's profile information and their created polls.
 *
 * Architecture:
 * - Uses TanStack Query (via useUserPolls hook) to fetch user's polls
 * - Uses useSession hook for authentication and user info
 * - Protected route - redirects to /auth if not authenticated
 *
 * Features:
 * - Displays user information (name, email)
 * - Lists all polls created by the user
 * - Shows poll statistics (creation date, status)
 * - Links to individual poll pages
 * - Empty state when no polls exist
 * - Loading and error states
 * - Create new poll CTA
 *
 * API Endpoint: GET /polls
 */

"use client";

import { useRouter } from "next/navigation";
import useSession from "~/hooks/useSession";
import useUserPolls from "~/hooks/useUserPolls";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  User,
  Mail,
  Vote,
  Plus,
  Calendar,
  ChevronRight,
  Lock,
  Unlock,
} from "lucide-react";
import {
  EmailVerificationBanner,
  EmailVerifiedBadge,
} from "~/components/email-verification-banner";

export default function ProfilePage() {
  const { user, authenticated, isLoading: sessionLoading } = useSession();
  const { polls, isLoading: pollsLoading, isError, refetch } = useUserPolls();
  const router = useRouter();

  // Redirect to auth if not authenticated
  if (!sessionLoading && !authenticated) {
    router.push("/auth?form=login");
    return null;
  }

  // Show loading state while checking auth or loading polls
  if (sessionLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const isLoading = pollsLoading;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Email Verification Banner */}
      <div className="mb-6">
        <EmailVerificationBanner
          isVerified={!!user?.email_verified_at}
          userEmail={user?.email}
        />
      </div>

      {/* User Info Card */}
      <Card className="mb-8 border-zinc-800">
        <CardHeader className="border-b border-zinc-800 px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-full">
                <User className="text-primary h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {user?.name || "User"}
                </h1>
                <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>{user?.email || "No email"}</span>
                  <EmailVerifiedBadge isVerified={!!user?.email_verified_at} />
                </div>
              </div>
            </div>
            <Button
              onClick={() => router.push("/polls/create")}
              className="bg-zinc-100 font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Poll
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vote className="text-primary h-5 w-5" />
              <span className="font-semibold">
                {polls.length} {polls.length === 1 ? "Poll" : "Polls"} Created
              </span>
            </div>
            {polls.length > 0 && (
              <span className="text-muted-foreground text-sm">
                Member since {user?.created_at?.toLocaleDateString() || "N/A"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Polls Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Polls</h2>
          {polls.length > 0 && !isLoading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="text-muted-foreground"
            >
              Refresh
            </Button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
              <p className="text-muted-foreground">Loading your polls...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <Card className="border-red-500/20 bg-red-500/10">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <div className="rounded-full bg-red-500/20 p-3">
                <Vote className="h-8 w-8 text-red-500" />
              </div>
              <div className="text-center">
                <h3 className="mb-2 text-lg font-semibold text-red-500">
                  Failed to Load Polls
                </h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  There was an error loading your polls. Please try again.
                </p>
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  className="border-red-500/20"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !isError && polls.length === 0 && (
          <Card className="border-zinc-800">
            <CardContent className="flex flex-col items-center gap-4 py-16">
              <div className="bg-primary/10 rounded-full p-4">
                <Vote className="text-primary h-12 w-12" />
              </div>
              <div className="text-center">
                <h3 className="mb-2 text-xl font-semibold">No polls yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first poll to start gathering opinions and
                  insights from your community.
                </p>
                <Button
                  onClick={() => router.push("/polls/create")}
                  className="bg-zinc-100 font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Poll
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Polls List */}
        {!isLoading && !isError && polls.length > 0 && (
          <div className="grid gap-4">
            {polls.map((poll) => (
              <Card
                key={poll.id}
                className="border-zinc-800 transition-all hover:border-zinc-700 hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-3 flex items-start gap-3">
                        <div className="bg-primary/10 mt-1 rounded-lg p-2">
                          <Vote className="text-primary h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-2 text-lg leading-tight font-semibold">
                            {poll.question}
                          </h3>
                          <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {poll.created_at.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <Badge
                              variant={poll.closed ? "secondary" : "default"}
                              className={
                                poll.closed
                                  ? "bg-zinc-800 text-zinc-300"
                                  : "bg-green-500/10 text-green-500"
                              }
                            >
                              {poll.closed ? (
                                <>
                                  <Lock className="mr-1 h-3 w-3" />
                                  Closed
                                </>
                              ) : (
                                <>
                                  <Unlock className="mr-1 h-3 w-3" />
                                  Active
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/${poll.id}`)}
                      className="shrink-0"
                    >
                      View
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tips Section - Only show when user has polls */}
      {!isLoading && !isError && polls.length > 0 && (
        <Card className="bg-card mt-8 border-zinc-800">
          <CardContent className="p-6">
            <h3 className="mb-3 text-sm font-semibold">💡 Pro Tips</h3>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  Share your poll links with friends to get more responses
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  Check your poll results regularly to track engagement
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Create diverse options to get meaningful insights</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
