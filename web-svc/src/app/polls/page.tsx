"use client";

import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import useSession from "~/hooks/useSession";
import useUserPolls from "~/hooks/useUserPolls";
import {
  ArrowRight,
  Calendar,
  Lock,
  Plus,
  RefreshCcw,
  Unlock,
  Vote,
} from "lucide-react";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PollsPage() {
  const { authenticated, isLoading: sessionLoading } = useSession();
  const { polls, isLoading, isError, refetch } = useUserPolls({
    enabled: authenticated,
  });

  if (sessionLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground">Loading polls...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <section className="bg-background w-full max-w-3xl rounded-lg border px-6 py-12 text-center shadow-sm sm:px-10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Vote className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Sign in to see your polls.
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl leading-7">
          Poll lists are tied to your account, so your created polls stay easy
          to find and manage.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-11">
            <Link href="/auth?form=login">Sign in</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11">
            <Link href="/auth?form=register">Create account</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto w-full max-w-5xl px-4 py-8">
      <div className="bg-background mb-8 flex flex-col gap-5 rounded-lg border p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">
            Poll library
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Your polls
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
            Review every poll you have created, open the live results, or start
            a new question.
          </p>
        </div>
        <Button asChild size="lg" className="h-11 shrink-0">
          <Link href="/polls/create">
            <Plus />
            New poll
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
            <p className="text-muted-foreground">Loading your polls...</p>
          </div>
        </div>
      )}

      {isError && !isLoading && (
        <Card className="border-red-500/25 bg-red-500/5">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="rounded-md bg-red-500/10 p-3">
              <Vote className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-500">
                Could not load polls
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Refresh the list and try again.
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCcw />
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && polls.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-5 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Vote className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">No polls yet</h2>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Create your first poll and it will appear here for quick access.
              </p>
            </div>
            <Button asChild>
              <Link href="/polls/create">
                <Plus />
                Create poll
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && polls.length > 0 && (
        <div className="grid gap-4">
          {polls.map((poll) => (
            <Link
              key={poll.id}
              href={`/${poll.id}`}
              className="group bg-background block rounded-lg border p-5 shadow-sm transition-all hover:border-emerald-500/60 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={poll.closed ? "secondary" : "outline"}
                      className={
                        poll.closed
                          ? "text-muted-foreground"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      }
                    >
                      {poll.closed ? (
                        <>
                          <Lock className="h-3 w-3" />
                          Closed
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3 w-3" />
                          Active
                        </>
                      )}
                    </Badge>
                    <span className="text-muted-foreground flex items-center gap-1 text-sm">
                      <Calendar className="h-4 w-4" />
                      {formatDate(poll.created_at)}
                    </span>
                  </div>
                  <h2 className="text-lg leading-7 font-semibold text-pretty group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                    {poll.question}
                  </h2>
                </div>

                <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium sm:pt-1">
                  Open poll
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
