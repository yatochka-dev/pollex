"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch, getPath } from "~/lib/api";
import {
  VerifyEmailResponseSchema,
  type VerifyEmailResponse,
} from "~/lib/types";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

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

      const result = await apiFetch<VerifyEmailResponse>(
        getPath(`/email/verify?token=${token}&uid=${uid}`),
        {
          method: "POST",
          parser: (data) => VerifyEmailResponseSchema.parse(data),
          showErrorToast: false,
        },
      );

      if (result.success) {
        setState({ status: "success" });
        // Redirect to profile after 2 seconds
        setTimeout(() => {
          router.push("/profile");
        }, 2000);
      } else {
        setState({
          status: "error",
          message: result.error.message || "Verification failed",
        });
      }
    }

    void verifyEmail();
  }, [token, uid, router]);

  return (
    <div className="container flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            {state.status === "verifying" && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {state.status === "success" && (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            )}
            {state.status === "error" && (
              <XCircle className="h-12 w-12 text-red-500" />
            )}
            {state.status === "missing-params" && (
              <Mail className="h-12 w-12 text-yellow-500" />
            )}
          </div>
          <CardTitle>
            {state.status === "verifying" && "Verifying your email..."}
            {state.status === "success" && "Email verified!"}
            {state.status === "error" && "Verification failed"}
            {state.status === "missing-params" && "Invalid verification link"}
          </CardTitle>
          <CardDescription>
            {state.status === "verifying" &&
              "Please wait while we verify your email address."}
            {state.status === "success" &&
              "Your email has been successfully verified. Redirecting to your profile..."}
            {state.status === "error" && state.message}
            {state.status === "missing-params" &&
              "This verification link is invalid or incomplete. Please use the link from your verification email."}
          </CardDescription>
        </CardHeader>

        {state.status === "error" && (
          <CardFooter className="flex flex-col gap-2">
            <Button
              onClick={() => router.push("/profile")}
              className="w-full"
              variant="outline"
            >
              Go to Profile
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              You can request a new verification email from your profile page.
            </p>
          </CardFooter>
        )}

        {state.status === "missing-params" && (
          <CardFooter>
            <Button
              onClick={() => router.push("/")}
              className="w-full"
              variant="outline"
            >
              Go to Home
            </Button>
          </CardFooter>
        )}

        {state.status === "success" && (
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              You can now create polls and vote on other polls.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
