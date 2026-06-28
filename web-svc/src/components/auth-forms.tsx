"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
  Vote,
} from "lucide-react";
import { z } from "zod";
import toast from "react-hot-toast";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import useSession from "~/hooks/useSession";
import { register } from "~/lib/register";

type FormType = "login" | "register";

type AuthValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type FieldErrors = Partial<Record<keyof AuthValues, string>>;

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters."),
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z
      .string()
      .min(6, "Confirm password must be at least 6 characters."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const initialValues: AuthValues = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function AuthForms() {
  const [formType, setFormType] = useQueryState("form", {
    defaultValue: "login",
    parse: (value): FormType => (value === "register" ? "register" : "login"),
  });
  const [values, setValues] = useState<AuthValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const session = useSession();
  const isRegister = formType === "register";

  const switchForm = (type: FormType) => {
    if (type === formType) return;

    void setFormType(type);
    setValues(initialValues);
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const updateValue = (name: keyof AuthValues, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const validate = (): boolean => {
    const schema = isRegister ? registerSchema : loginSchema;
    const result = schema.safeParse(values);

    if (result.success) {
      setErrors({});
      return true;
    }

    const nextErrors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && field in values) {
        nextErrors[field as keyof AuthValues] ??= issue.message;
      }
    }

    setErrors(nextErrors);
    toast.error(
      result.error.issues[0]?.message ?? "Check the highlighted fields.",
    );
    return false;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (isRegister) {
        const result = await register({
          email: values.email,
          password: values.password,
          name: values.username.trim(),
        });

        if (result.data?.name) {
          toast.success(
            `Welcome, ${result.data.name}. Check your email to verify your account.`,
            { duration: 6000 },
          );
        }
      }

      await session.login({
        email: values.email,
        password: values.password,
      });
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="bg-card grid w-full overflow-hidden rounded-lg border shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="hidden border-r bg-zinc-950 text-zinc-50 lg:block">
          <div className="flex h-full min-h-[620px] flex-col justify-between p-10">
            <div>
              <div className="mb-10 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-50 text-zinc-950">
                  <Vote className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Pollex</p>
                  <p className="text-sm text-zinc-400">Polling workspace</p>
                </div>
              </div>

              <div className="max-w-sm space-y-4">
                <p className="text-3xl leading-tight font-semibold">
                  Welcome to your Pollex workspace.
                </p>
                <p className="text-sm leading-6 text-zinc-400">
                  A quieter way to collect decisions, check responses, and move
                  on.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Account ready
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Lock className="h-4 w-4 text-sky-400" />
                  Protected session
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-[620px] flex-col justify-center px-5 py-8 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <div className="mb-6 flex items-center gap-3 lg:hidden">
                <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-md">
                  <Vote className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Pollex</p>
                  <p className="text-muted-foreground text-sm">
                    Polling workspace
                  </p>
                </div>
              </div>

              <div className="bg-muted mb-6 grid grid-cols-2 rounded-lg border p-1">
                <button
                  type="button"
                  onClick={() => switchForm("login")}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    !isRegister
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => switchForm("register")}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    isRegister
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create account
                </button>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight">
                {isRegister ? "Create your account" : "Welcome back"}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {isRegister
                  ? "Use an email you can verify after signing up."
                  : "Enter your account details to continue."}
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              {isRegister && (
                <AuthField
                  id="username"
                  label="Username"
                  icon={<User className="h-4 w-4" />}
                  value={values.username}
                  error={errors.username}
                  autoComplete="name"
                  placeholder="Your name"
                  onChange={(value) => updateValue("username", value)}
                />
              )}

              <AuthField
                id="email"
                label="Email"
                type="email"
                icon={<Mail className="h-4 w-4" />}
                value={values.email}
                error={errors.email}
                autoComplete="email"
                placeholder="you@example.com"
                onChange={(value) => updateValue("email", value)}
              />

              <PasswordField
                id="password"
                label="Password"
                value={values.password}
                error={errors.password}
                showPassword={showPassword}
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={isRegister ? "Create a password" : "Your password"}
                onToggle={() => setShowPassword((current) => !current)}
                onChange={(value) => updateValue("password", value)}
                rightLabel={
                  !isRegister ? (
                    <Link
                      href="/forgot-password"
                      className="text-muted-foreground hover:text-foreground text-xs font-medium underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  ) : undefined
                }
              />

              {isRegister && (
                <PasswordField
                  id="confirm-password"
                  label="Confirm password"
                  value={values.confirmPassword}
                  error={errors.confirmPassword}
                  showPassword={showConfirmPassword}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  onToggle={() => setShowConfirmPassword((current) => !current)}
                  onChange={(value) => updateValue("confirmPassword", value)}
                />
              )}

              <Button
                type="submit"
                size="lg"
                className="mt-2 w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {isRegister ? "Creating account..." : "Signing in..."}
                  </>
                ) : isRegister ? (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create account
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </>
                )}
              </Button>
            </form>

            <div className="bg-muted/40 text-muted-foreground mt-6 rounded-lg border p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span>
                  {isRegister
                    ? "Already have an account?"
                    : "Need a Pollex account?"}
                </span>
                <button
                  type="button"
                  onClick={() => switchForm(isRegister ? "login" : "register")}
                  className="text-foreground inline-flex shrink-0 items-center gap-1 font-medium underline-offset-4 hover:underline"
                >
                  {isRegister ? "Sign in" : "Create one"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthField({
  id,
  label,
  value,
  onChange,
  error,
  icon,
  type = "text",
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  icon: ReactNode;
  type?: string;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
          {icon}
        </span>
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 pl-9"
        />
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  showPassword,
  onToggle,
  placeholder,
  autoComplete,
  rightLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  showPassword: boolean;
  onToggle: () => void;
  placeholder: string;
  autoComplete: string;
  rightLabel?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {rightLabel}
      </div>
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
          <Lock className="h-4 w-4" />
        </span>
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
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
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} className="text-destructive min-h-5 text-xs font-medium">
      {message ?? ""}
    </p>
  );
}
