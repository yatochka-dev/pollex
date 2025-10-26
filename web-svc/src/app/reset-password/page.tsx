"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiFetch, getPath } from "~/lib/api";
import {
  ResetPasswordWithTokenInputSchema,
  ResetPasswordWithTokenResponseSchema,
  ValidateResetTokenResponseSchema,
  type ResetPasswordWithTokenInput,
  type ResetPasswordWithTokenResponse,
  type ValidateResetTokenResponse,
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

type ResetState =
  | { status: "validating" }
  | { status: "valid" }
  | { status: "invalid"; message: string }
  | { status: "success" }
  | { status: "missing-params" };

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = React.useState<ResetState>({
    status: "validating",
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const token = searchParams.get("token");
  const uid = searchParams.get("uid");

  const form = useForm<ResetPasswordWithTokenInput>({
    resolver: zodResolver(ResetPasswordWithTokenInputSchema),
    defaultValues: {
      token: token || "",
      uid: uid || "",
      password: "",
      confirmPassword: "",
    },
  });

  // Validate token on mount
  React.useEffect(() => {
    async function validateToken() {
      if (!token || !uid) {
        setState({ status: "missing-params" });
        return;
      }

      const result = await apiFetch<ValidateResetTokenResponse>(
        getPath(`/email/validate-reset-token?token=${token}&uid=${uid}`),
        {
          method: "GET",
          parser: (data) => ValidateResetTokenResponseSchema.parse(data),
          showErrorToast: false,
        },
      );

      if (result.success && result.data.data.valid) {
        setState({ status: "valid" });
      } else {
        setState({
          status: "invalid",
          message:
            result.success === false
              ? result.error.message
              : "Invalid or expired reset token",
        });
      }
    }

    void validateToken();
  }, [token, uid]);

  const onSubmit = async (data: ResetPasswordWithTokenInput) => {
    if (!token || !uid) return;

    const result = await apiFetch<ResetPasswordWithTokenResponse>(
      getPath("/email/reset-password"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          uid,
          password: data.password,
        }),
        parser: (json) => ResetPasswordWithTokenResponseSchema.parse(json),
      },
    );

    if (result.success) {
      setState({ status: "success" });
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/auth");
      }, 2000);
    }
  };

  // Loading state
  if (state.status === "validating") {
    return (
      <div className="container flex min-h-[80vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <CardTitle>Validating reset link...</CardTitle>
            <CardDescription>
              Please wait while we verify your password reset link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Success state
  if (state.status === "success") {
    return (
      <div className="container flex min-h-[80vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle>Password reset successful!</CardTitle>
            <CardDescription>
              Your password has been updated. Redirecting to login...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              You can now log in with your new password.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token state
  if (state.status === "invalid" || state.status === "missing-params") {
    return (
      <div className="container flex min-h-[80vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle>Invalid reset link</CardTitle>
            <CardDescription>
              {state.status === "invalid"
                ? state.message
                : "This password reset link is invalid or incomplete."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium">Common reasons:</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• The link has expired (links are valid for 24 hours)</li>
                <li>• The link has already been used</li>
                <li>• The link was copied incorrectly</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              onClick={() => router.push("/forgot-password")}
              className="w-full"
            >
              Request a new reset link
            </Button>
            <Button
              onClick={() => router.push("/auth")}
              variant="ghost"
              className="w-full"
            >
              Back to login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Valid token - show password reset form
  return (
    <div className="container flex min-h-[80vh] items-center justify-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Lock className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>Set new password</CardTitle>
          <CardDescription>
            Enter a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters long.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm new password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? "Resetting password..."
                  : "Reset password"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => router.push("/auth")}
            variant="ghost"
            className="w-full"
          >
            Back to login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
