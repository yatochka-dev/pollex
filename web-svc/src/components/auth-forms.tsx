/** eslint-disable react/no-children-prop */
/** eslint-disable react/no-children-prop */
"use client";

import type React from "react";
import { useState } from "react";
import { useQueryState } from "nuqs";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { register } from "~/lib/register";
import toast from "react-hot-toast";

type FormType = "login" | "register";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string(),
});

const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(6, "Confirm Password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

import useSession from "~/hooks/useSession";

export function AuthForms() {
  // Store the current form type in the query string using nuqs
  const [formType, setFormType] = useQueryState("form", {
    defaultValue: "login",
  });
  const [isAnimating, setIsAnimating] = useState(false);

  const switchForm = (type: FormType) => {
    setIsAnimating(true);
    setTimeout(() => {
      void setFormType(type);
      setIsAnimating(false);
    }, 150);
  };

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const session = useSession();

  const form = useForm({
    defaultValues:
      formType === "login"
        ? { email: "", password: "" }
        : { username: "", email: "", password: "", confirmPassword: "" },
    validators: {
      onChange: formType === "login" ? loginSchema : registerSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        if (formType === "login") {
          await session.login({
            email: value.email,
            password: value.password,
          });
          // Success toast and redirect handled by useLogin
        } else {
          // Register the user
          const result = await register({
            email: value.email,
            password: value.password,
            name: value.username ?? "",
          });

          if (result.data?.name) {
            toast.success(`Welcome, ${result.data.name}!`);
          }

          // Immediately log them in
          await session.login({
            email: value.email,
            password: value.password,
          });
        }
      } catch (error) {
        // Errors are already shown via toast in the API layer
        console.error("Auth error:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <div
        className={`bg-card text-card-foreground flex w-full max-w-3xl flex-col gap-6 rounded-xl border py-6 shadow-sm transition-all duration-300 ${
          isAnimating ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <div className="space-y-1 px-6">
          <div className="text-2xl leading-none font-semibold tracking-tight">
            {formType === "login" ? "Welcome back" : "Create account"}
          </div>
          <div className="text-muted-foreground text-sm">
            {formType === "login"
              ? "Enter your credentials to access your account"
              : "Enter your information to create an account"}
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="space-y-4 px-6">
            {formType === "login" ? (
              <form.Field
                name="email"
                // eslint-disable-next-line react/no-children-prop
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={field.state.value ?? ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      required
                      className="w-full border-zinc-800 placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-zinc-700"
                    />
                    <div style={{ minHeight: "1.25em" }}>
                      {field.state.meta.errors.length > 0 && (
                        <em className="text-xs text-red-500">
                          {field.state.meta.errors
                            .map((err) =>
                              typeof err === "object" &&
                              err !== null &&
                              "message" in err
                                ? (err as { message: string }).message
                                : String(err),
                            )
                            .join(", ")}
                        </em>
                      )}
                    </div>
                  </div>
                )}
              />
            ) : (
              <form.Field
                name="username"
                // eslint-disable-next-line react/no-children-prop
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium">
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={field.state.value ?? ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      required
                      className="w-full border-zinc-800 placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-zinc-700"
                    />
                    <div style={{ minHeight: "1.25em" }}>
                      {field.state.meta.errors.length > 0 && (
                        <em className="text-xs text-red-500">
                          {field.state.meta.errors
                            .map((err) =>
                              typeof err === "object" &&
                              err !== null &&
                              "message" in err
                                ? (err as { message: string }).message
                                : String(err),
                            )
                            .join(", ")}
                        </em>
                      )}
                    </div>
                  </div>
                )}
              />
            )}

            {formType === "register" && (
              <form.Field
                name="email"
                // eslint-disable-next-line react/no-children-prop
                children={(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={field.state.value ?? ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      required
                      className="w-full border-zinc-800 placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-zinc-700"
                    />
                    <div style={{ minHeight: "1.25em" }}>
                      {field.state.meta.errors.length > 0 && (
                        <em className="text-xs text-red-500">
                          {field.state.meta.errors
                            .map((err) =>
                              typeof err === "object" &&
                              err !== null &&
                              "message" in err
                                ? (err as { message: string }).message
                                : String(err),
                            )
                            .join(", ")}
                        </em>
                      )}
                    </div>
                  </div>
                )}
              />
            )}

            <form.Field
              name="password"
              // eslint-disable-next-line react/no-children-prop
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={field.state.value ?? ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      required
                      className="w-full border-zinc-800 pr-10 placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-zinc-700"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <div style={{ minHeight: "1.25em" }}>
                    {field.state.meta.errors.length > 0 && (
                      <em className="text-xs text-red-500">
                        {field.state.meta.errors
                          .map((err) =>
                            typeof err === "object" &&
                            err !== null &&
                            "message" in err
                              ? (err as { message: string }).message
                              : String(err),
                          )
                          .join(", ")}
                      </em>
                    )}
                  </div>
                </div>
              )}
            />

            {formType === "register" && (
              <form.Field
                name="confirmPassword"
                // eslint-disable-next-line react/no-children-prop
                children={(field) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirm-password"
                      className="text-sm font-medium"
                    >
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        value={field.state.value ?? ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        required
                        className="w-full border-zinc-800 pr-10 placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-zinc-700"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 focus:outline-none"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <div style={{ minHeight: "1.25em" }}>
                      <div style={{ minHeight: "1.25em" }}>
                        {field.state.meta.errors.length > 0 && (
                          <em className="text-xs text-red-500">
                            {field.state.meta.errors
                              .map((err) =>
                                typeof err === "object" &&
                                err !== null &&
                                "message" in err
                                  ? (err as { message: string }).message
                                  : String(err),
                              )
                              .join(", ")}
                          </em>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              />
            )}

            <Button
              type="submit"
              className="w-full bg-zinc-100 font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!form.state.isValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
                  {formType === "login"
                    ? "Signing in..."
                    : "Creating account..."}
                </>
              ) : formType === "login" ? (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create account
                </>
              )}
            </Button>
          </div>
        </form>
        <div className="flex justify-center border-t border-zinc-800 px-6 pt-4">
          <p className="text-sm text-zinc-400">
            {formType === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() =>
                switchForm(formType === "login" ? "register" : "login")
              }
              className="cursor-pointer font-medium underline underline-offset-4 transition-colors"
            >
              {formType === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
