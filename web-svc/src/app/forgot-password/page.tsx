"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Mail, Send } from "lucide-react";

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
import { apiFetch, getPath } from "~/lib/api";
import {
  RequestPasswordResetInputSchema,
  RequestPasswordResetResponseSchema,
  type RequestPasswordResetInput,
  type RequestPasswordResetResponse,
} from "~/lib/types";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState("");

  const form = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(RequestPasswordResetInputSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: RequestPasswordResetInput) => {
    const result = await apiFetch<RequestPasswordResetResponse>(
      getPath("/email/request-password-reset"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        parser: (json) => RequestPasswordResetResponseSchema.parse(json),
      },
    );

    if (result.success) {
      setSubmittedEmail(data.email);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <Card className="mx-auto w-full max-w-lg overflow-hidden rounded-lg py-0">
          <CardHeader className="bg-muted/40 border-b px-6 py-7 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription className="mx-auto max-w-sm">
              If an account exists with {submittedEmail}, you will receive a
              password reset link shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6 py-6">
            <div className="bg-background rounded-lg border p-4 text-sm">
              <p className="font-medium">Didn&apos;t receive the email?</p>
              <ul className="text-muted-foreground mt-3 space-y-2">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Check your spam folder</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Make sure you entered the correct email</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Wait a few minutes and try again</span>
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 border-t px-6 py-5">
            <Button onClick={() => setSubmitted(false)} className="w-full">
              Try another email
            </Button>
            <Button
              onClick={() => router.push("/auth")}
              variant="ghost"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <section className="hidden max-w-md lg:block">
        <div className="bg-primary text-primary-foreground mb-5 flex h-12 w-12 items-center justify-center rounded-lg">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Reset your password
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          Enter your account email and Pollex will send a reset link if the
          account exists.
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
            <Mail className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl">Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send a reset link if an account
            exists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          className="h-11 pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Reset links expire after 24 hours.
                    </FormDescription>
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
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send reset link
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
