"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, Mail, XCircle } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { apiFetch, getPath } from "~/lib/api";
import {
  VerifyEmailResponseSchema,
  type VerifyEmailResponse,
} from "~/lib/types";

type VerificationState =
  | { status: "verifying" }
  | { status: "success" }
  | { status: "error"; message: string }
  | { status: "missing-params" };

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = React.useState<VerificationState>({
    status: "verifying",
  });

  const token = searchParams.get("token");
  const uid = searchParams.get("uid");

  React.useEffect(() => {
    async function verifyEmail() {
      if (!token || !uid) {
        setState({ status: "missing-params" });
        return;
      }

      const params = new URLSearchParams({ token, uid });
      const result = await apiFetch<VerifyEmailResponse>(
        getPath(`/email/verify?${params.toString()}`),
        {
          method: "POST",
          parser: (data) => VerifyEmailResponseSchema.parse(data),
          showErrorToast: false,
        },
      );

      if (result.success) {
        setState({ status: "success" });
        setTimeout(() => {
          router.push("/profile");
        }, 2000);
      } else {
        setState({
          status: "error",
          message: result.error.message || "Verification failed.",
        });
      }
    }

    void verifyEmail();
  }, [token, uid, router]);

  const content = getVerificationContent(state);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <Card className="mx-auto w-full max-w-md overflow-hidden rounded-lg py-0">
        <CardHeader className="bg-muted/40 border-b px-6 py-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="bg-background flex h-12 w-12 items-center justify-center rounded-full">
              {content.icon}
            </div>
          </div>
          <CardTitle className="text-2xl">{content.title}</CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-6 py-6">
          {state.status === "success" && (
            <p className="text-muted-foreground text-center text-sm">
              You can now create polls and vote on other polls.
            </p>
          )}

          {state.status === "error" && (
            <div className="space-y-3">
              <Button
                onClick={() => router.push("/profile")}
                className="w-full"
              >
                Go to profile
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-muted-foreground text-center text-sm">
                You can request a new verification email from your profile page.
              </p>
            </div>
          )}

          {state.status === "missing-params" && (
            <div className="space-y-3">
              <Button onClick={() => router.push("/auth")} className="w-full">
                Go to login
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => router.push("/")}
                variant="ghost"
                className="w-full"
              >
                Back to home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function getVerificationContent(state: VerificationState) {
  switch (state.status) {
    case "verifying":
      return {
        icon: <Loader2 className="text-primary h-6 w-6 animate-spin" />,
        title: "Verifying your email",
        description: "Please wait while we confirm your email address.",
      };
    case "success":
      return {
        icon: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
        title: "Email verified",
        description: "Your email is verified. Redirecting to your profile...",
      };
    case "error":
      return {
        icon: <XCircle className="text-destructive h-6 w-6" />,
        title: "Verification failed",
        description: state.message,
      };
    case "missing-params":
      return {
        icon: <Mail className="h-6 w-6 text-amber-500" />,
        title: "Invalid verification link",
        description:
          "This verification link is invalid or incomplete. Use the latest link from your email.",
      };
  }
}
