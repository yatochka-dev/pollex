"use client";

import { useRouter } from "next/navigation";
import useSession from "~/hooks/useSession";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Vote, TrendingUp, Users } from "lucide-react";

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
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="space-y-8 text-center">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Welcome to <span className="text-primary">Pollex</span>
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg sm:text-xl">
            Create polls, gather opinions, and see results update in real-time.
            Simple, fast, and built for engagement.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          {authenticated ? (
            <>
              <Button
                size="lg"
                onClick={() => router.push("/polls/create")}
                className="w-full sm:w-auto"
              >
                <Vote className="mr-2 h-5 w-5" />
                Create a Poll
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/polls")}
                className="w-full sm:w-auto"
              >
                <TrendingUp className="mr-2 h-5 w-5" />
                Browse Polls
              </Button>
            </>
          ) : (
            <>
              <Button
                size="lg"
                onClick={() => router.push("/auth?form=register")}
                className="w-full sm:w-auto"
              >
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/auth?form=login")}
                className="w-full sm:w-auto"
              >
                Sign In
              </Button>
            </>
          )}
        </div>

        {/* Features */}
        <div className="mx-auto mt-16 grid max-w-3xl gap-6 sm:grid-cols-3">
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-6">
              <Vote className="text-primary h-10 w-10" />
              <h3 className="font-semibold">Easy Voting</h3>
              <p className="text-muted-foreground text-center text-sm">
                Create and vote on polls with just a few clicks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-6">
              <TrendingUp className="text-primary h-10 w-10" />
              <h3 className="font-semibold">Real-time Updates</h3>
              <p className="text-muted-foreground text-center text-sm">
                Watch results update live as votes come in
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-6">
              <Users className="text-primary h-10 w-10" />
              <h3 className="font-semibold">Community Driven</h3>
              <p className="text-muted-foreground text-center text-sm">
                Share polls and gather opinions from your community
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demo Poll Link */}
        <div className="bg-accent/50 mt-12 rounded-lg border p-6">
          <p className="text-muted-foreground mb-4 text-sm">
            Want to see it in action?
          </p>
          <Button
            variant="secondary"
            onClick={() => router.push("/86227253-e029-482e-a1dd-dd42571c491c")}
          >
            View Demo Poll
          </Button>
        </div>
      </div>
    </div>
  );
}
