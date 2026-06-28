"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  XCircle,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { apiFetch, getPath } from "~/lib/api";
import {
  ResetPasswordWithTokenInputSchema,
  ResetPasswordWithTokenResponseSchema,
  ValidateResetTokenResponseSchema,
  type ResetPasswordWithTokenInput,
  type ResetPasswordWithTokenResponse,
  type ValidateResetTokenResponse,
} from "~/lib/types";

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
      token: token ?? "",
      uid: uid ?? "",
      password: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    async function validateToken() {
      if (!token || !uid) {
        setState({ status: "missing-params" });
        return;
      }

      const params = new URLSearchParams({ token, uid });
      const result = await apiFetch<ValidateResetTokenResponse>(
        getPath(`/email/validate-reset-token?${params.toString()}`),
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
              : "This reset link is invalid or expired.",
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
      setTimeout(() => {
        router.push("/auth");
      }, 2000);
    }
  };

  if (state.status === "validating") {
    return (
      <AuthStateCard
        icon={<Loader2 className="text-primary h-6 w-6 animate-spin" />}
        title="Checking reset link"
        description="Please wait while we verify this password reset link."
      />
    );
  }

  if (state.status === "success") {
    return (
      <AuthStateCard
        icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
        title="Password updated"
        description="Your password has been changed. Redirecting to login..."
        footer={
          <p className="text-muted-foreground text-center text-sm">
            You can now sign in with your new password.
          </p>
        }
      />
    );
  }

  if (state.status === "invalid" || state.status === "missing-params") {
    return (
      <AuthStateCard
        icon={<XCircle className="text-destructive h-6 w-6" />}
        title="Invalid reset link"
        description={
          state.status === "invalid"
            ? state.message
            : "This password reset link is invalid or incomplete."
        }
        footer={
          <div className="flex flex-col gap-2">
            <Button onClick={() => router.push("/forgot-password")}>
              Request a new reset link
            </Button>
            <Button onClick={() => router.push("/auth")} variant="ghost">
              Back to login
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <section className="hidden max-w-md lg:block">
        <div className="bg-primary text-primary-foreground mb-5 flex h-12 w-12 items-center justify-center rounded-lg">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Choose a new password
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          Use a password that is at least 8 characters and different from one
          you use elsewhere.
        </p>
      </section>

      <Card className="mx-auto w-full max-w-md rounded-lg">
        <CardHeader>
          <Button
            onClick={() => router.push("/auth")}
            variant="ghost"
            size="sm"
            className="mb-3 w-fit px-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Button>
          <div className="bg-primary/10 text-primary mb-2 flex h-10 w-10 items-center justify-center rounded-lg lg:hidden">
            <Lock className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl">Set new password</CardTitle>
          <CardDescription>
            Enter and confirm the password you want to use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        id="password"
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        showPassword={showPassword}
                        onToggle={() => setShowPassword((current) => !current)}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters.
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
                      <PasswordInput
                        id="confirm-password"
                        placeholder="Repeat new password"
                        autoComplete="new-password"
                        showPassword={showConfirmPassword}
                        onToggle={() =>
                          setShowConfirmPassword((current) => !current)
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Update password
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}

function PasswordInput({
  showPassword,
  onToggle,
  ...props
}: React.ComponentProps<typeof Input> & {
  showPassword: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <Input
        {...props}
        type={showPassword ? "text" : "password"}
        className="h-11 px-9"
      />
      <button
        type="button"
        aria-label={showPassword ? "Hide password" : "Show password"}
        onClick={onToggle}
        className="text-muted-foreground hover:bg-accent hover:text-foreground absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition"
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

function AuthStateCard({
  icon,
  title,
  description,
  footer,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  footer?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <Card className="mx-auto w-full max-w-md rounded-lg">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
              {icon}
            </div>
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {footer && <CardContent>{footer}</CardContent>}
      </Card>
    </main>
  );
}
