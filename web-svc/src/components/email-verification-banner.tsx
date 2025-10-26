"use client";

import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Mail, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { apiFetch, getPath } from "~/lib/api";
import {
  ResendVerificationResponseSchema,
  type ResendVerificationResponse,
} from "~/lib/types";
import toast from "react-hot-toast";

interface EmailVerificationBannerProps {
  isVerified: boolean;
  userEmail?: string;
}

export function EmailVerificationBanner({
  isVerified,
  userEmail,
}: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = React.useState(false);
  const [lastSentAt, setLastSentAt] = React.useState<Date | null>(null);

  // Don't show banner if already verified
  if (isVerified) {
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);

    const result = await apiFetch<ResendVerificationResponse>(
      getPath("/email/resend-verification"),
      {
        method: "POST",
        parser: (data) => ResendVerificationResponseSchema.parse(data),
        showErrorToast: true,
      },
    );

    setIsResending(false);

    if (result.success) {
      setLastSentAt(new Date());
      toast.success("Verification email sent! Check your inbox.", {
        duration: 5000,
      });
    } else if (result.status === 429) {
      toast.error(
        "You've requested too many verification emails. Please try again later.",
        {
          duration: 5000,
        },
      );
    }
  };

  const canResend = !lastSentAt || Date.now() - lastSentAt.getTime() > 60000; // 1 minute cooldown

  return (
    <Alert className="border-yellow-500/50 bg-yellow-500/10">
      <AlertCircle className="h-4 w-4 text-yellow-500" />
      <AlertTitle className="text-yellow-500">
        Email verification required
      </AlertTitle>
      <AlertDescription className="mt-2 flex flex-col gap-3 text-sm">
        <p>
          Please verify your email address{" "}
          {userEmail && (
            <span className="font-medium">({userEmail})</span>
          )}{" "}
          to create polls and vote. Check your inbox for the verification link.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleResend}
            disabled={isResending || !canResend}
            className="border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-3 w-3" />
                {lastSentAt ? "Resend verification email" : "Send verification email"}
              </>
            )}
          </Button>
          {lastSentAt && !canResend && (
            <span className="text-xs text-muted-foreground">
              Wait {Math.ceil((60000 - (Date.now() - lastSentAt.getTime())) / 1000)}s before
              resending
            </span>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface EmailVerifiedBadgeProps {
  isVerified: boolean;
  className?: string;
}

export function EmailVerifiedBadge({
  isVerified,
  className = "",
}: EmailVerifiedBadgeProps) {
  if (!isVerified) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500 ${className}`}
    >
      <CheckCircle2 className="h-3 w-3" />
      <span>Verified</span>
    </div>
  );
}
