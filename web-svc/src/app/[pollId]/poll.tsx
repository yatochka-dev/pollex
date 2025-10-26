"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { CheckCircle2, Lock, AlertCircle, Users, Share2 } from "lucide-react";
import { useSubscribeToPoll } from "~/hooks/useSubscribeToPoll";
import useVote from "~/hooks/useVote";
import useUserVote from "~/hooks/useUserVote";
import useSession from "~/hooks/useSession";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface PollProps {
  pollId: string;
}

export function PollCard({ pollId }: PollProps) {
  const [animating, setAnimating] = useState(false);

  const { poll, error, viewerCount } = useSubscribeToPoll(pollId);
  const voteControl = useVote();
  const userVote = useUserVote(pollId);

  const session = useSession();
  const router = useRouter();

  // loading state
  if (!poll && !error) {
    return (
      <Card className="overflow-hidden border-2 shadow-lg">
        <CardContent className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
            <p className="text-muted-foreground">Loading poll...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // error
  if (error || !poll) {
    return (
      <Card className="overflow-hidden border-2 border-red-500 shadow-lg">
        <CardContent className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-16 w-16 text-red-500" />
            <div>
              <p className="text-lg font-semibold">Poll not found</p>
              <p className="text-muted-foreground text-sm">
                This poll doesn&apos;t exist or has been removed
              </p>
            </div>
            <Button onClick={() => router.push("/")} variant="outline">
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: poll.question,
      text: `Vote on: ${poll.question}`,
      url: shareUrl,
    };

    // check if we can use native share (mobile)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } catch (err) {
        // user cancelled or error - just ignore
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    } else {
      // fallback to clipboard copy (desktop)
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
      } catch (err) {
        toast.error("Failed to copy link");
        console.error("Copy failed:", err);
      }
    }
  };

  const handleOptionClick = async (optionId: string) => {
    // check auth
    if (!session.authenticated) {
      toast.error("Please sign in to vote");
      router.push("/auth");
      return;
    }

    // can't vote on closed polls
    if (poll.closed) {
      toast.error("This poll is closed");
      return;
    }

    // can't vote same option twice
    if (userVote.hasVoted && userVote.option_id === optionId) {
      return;
    }

    // prevent double click
    if (voteControl.isPending) {
      return;
    }

    setAnimating(true);

    // toast.promise for smooth feedback
    void toast
      .promise(
        voteControl.vote(optionId),
        {
          loading: "Recording your vote...",
          success: "Vote recorded!",
          error: "Failed to record vote",
        },
        {
          style: {
            minWidth: "200px",
          },
          success: {
            duration: 2000,
            icon: "✓",
          },
        },
      )
      .finally(() => {
        setTimeout(() => {
          setAnimating(false);
        }, 600);
      });
  };

  const getPercentage = (votes: number) => {
    if (poll.totalVotes === 0) return 0;
    return Math.round((votes / poll.totalVotes) * 100);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const showResults =
    session.authenticated && (userVote.hasVoted || poll.closed);

  return (
    <>
      <Card className="overflow-hidden border-2 shadow-lg">
        <CardHeader className="bg-accent/30 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="flex-1 text-2xl leading-tight font-bold text-balance">
              {poll.question}
            </CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              className="shrink-0 hover:bg-black/10"
              title="Share poll"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            {poll.closed && (
              <Badge variant="secondary" className="gap-1.5">
                <Lock className="h-3 w-3" />
                Closed
              </Badge>
            )}
            {viewerCount > 0 && (
              <Badge
                variant="outline"
                className="gap-1.5 border-green-500/50 bg-green-500/10"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                <Users className="h-3 w-3" />
                {viewerCount} viewing
              </Badge>
            )}
            {(poll.closed || viewerCount > 0) && <span>•</span>}
            <span>{poll.totalVotes.toLocaleString()} votes</span>
            <span>•</span>
            <span>Created {formatDate(poll.createdAt)}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-6">
          <div className="space-y-3">
            {poll.options.map((option, idx) => {
              const percentage = getPercentage(option.votes);
              const isSelected =
                userVote.option_id === option.id && session.authenticated;

              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionClick(option.id)}
                  disabled={poll.closed || voteControl.isPending}
                  className={`relative w-full rounded-lg border-2 p-4 text-left transition-all duration-300 ${
                    isSelected
                      ? "border-primary bg-primary/5 scale-[1.02] shadow-md"
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                  } ${poll.closed || voteControl.isPending ? "cursor-default" : "cursor-pointer"} ${animating && isSelected ? "animate-pulse" : ""} disabled:opacity-100`}
                  style={{
                    animationDelay: `${idx * 50}ms`,
                  }}
                >
                  {/* progress bar bg */}
                  {showResults && (
                    <div
                      className="absolute inset-0 rounded-md bg-black/10 transition-all duration-700 ease-out"
                      style={{
                        width: `${percentage}%`,
                        transitionDelay: `${idx * 100}ms`,
                      }}
                    />
                  )}

                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {showResults && isSelected && (
                        <CheckCircle2 className="text-primary animate-in zoom-in h-5 w-5 shrink-0 duration-300" />
                      )}
                      <span className="text-foreground truncate font-medium">
                        {option.label}
                      </span>
                    </div>

                    {showResults && (
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-muted-foreground text-sm font-semibold">
                          {option.votes.toLocaleString()}
                        </span>
                        <span className="text-primary min-w-[3.5rem] text-right text-lg font-bold">
                          {percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* status message area - reserve space to prevent layout shift */}
          <div className="min-h-[68px]">
            {!session.authenticated && (
              <div className="bg-accent/30 border-border animate-in fade-in slide-in-from-bottom-2 rounded-lg border p-4 text-center duration-500">
                <p className="text-muted-foreground text-sm font-medium">
                  <Button
                    variant="link"
                    className="text-primary h-auto p-0"
                    onClick={() => router.push("/auth")}
                  >
                    Sign in
                  </Button>{" "}
                  to vote on this poll
                </p>
              </div>
            )}

            {session.authenticated && userVote.hasVoted && !poll.closed && (
              <div className="bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-bottom-2 rounded-lg border p-4 text-center duration-500">
                <p className="text-primary text-sm font-medium">
                  Click another option to change your vote.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
