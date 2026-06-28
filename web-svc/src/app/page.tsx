"use client";

import { useRouter } from "next/navigation";
import useSession from "~/hooks/useSession";
import { Button } from "~/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Link2,
  Vote,
} from "lucide-react";

const pollOptions = [
  { label: "Ship the new dashboard", percent: 58, votes: 128 },
  { label: "Improve poll discovery", percent: 27, votes: 61 },
  { label: "Add richer sharing tools", percent: 15, votes: 34 },
];

const highlights = [
  { icon: Clock3, label: "Live results" },
  { icon: Link2, label: "Shareable links" },
  { icon: CheckCircle2, label: "Simple voting" },
];

export default function HomePage() {
  const { authenticated, isLoading } = useSession();
  const router = useRouter();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-background relative isolate w-full max-w-6xl overflow-hidden rounded-lg border px-5 py-10 shadow-sm sm:px-8 sm:py-14 lg:px-12">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:44px_44px] opacity-35" />
      <div className="absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-emerald-100/70 via-amber-50/60 to-transparent dark:from-emerald-950/35 dark:via-amber-950/20" />

      <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
          <div className="bg-background/85 mb-5 inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm font-medium shadow-xs backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Polls that feel instant
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Make decisions visible with Pollex.
          </h1>

          <p className="text-muted-foreground mt-5 text-base leading-8 text-pretty sm:text-lg">
            Create a poll, send a link, and watch opinions turn into a clear
            result as people vote. No ceremony, no dashboard sprawl, just a
            clean way to ask and answer.
          </p>

          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:justify-start">
            {authenticated ? (
              <>
                <Button
                  size="lg"
                  onClick={() => router.push("/polls/create")}
                  className="h-11"
                >
                  <Vote />
                  Create a poll
                  <ArrowRight />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push("/polls")}
                  className="h-11"
                >
                  View polls
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={() => router.push("/auth?form=register")}
                  className="h-11"
                >
                  Get started
                  <ArrowRight />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push("/polls")}
                  className="h-11"
                >
                  View polls
                </Button>
              </>
            )}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {highlights.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="bg-background/80 flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium shadow-xs backdrop-blur lg:justify-start"
              >
                <Icon className="h-4 w-4 text-emerald-600" />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="bg-background/95 rounded-lg border p-4 shadow-xl shadow-slate-200/80 backdrop-blur dark:shadow-black/30">
            <div className="mb-4 flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Live poll
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  What should we prioritize next?
                </h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-4">
              {pollOptions.map((option, index) => (
                <div key={option.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {option.percent}%
                    </span>
                  </div>
                  <div className="bg-secondary h-3 overflow-hidden rounded-md">
                    <div
                      className={[
                        "h-full rounded-md",
                        index === 0
                          ? "bg-emerald-500"
                          : index === 1
                            ? "bg-sky-500"
                            : "bg-amber-500",
                      ].join(" ")}
                      style={{ width: `${option.percent}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {option.votes} votes
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-muted/40 mt-5 flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Total responses</span>
              <span className="font-semibold tabular-nums">223</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
