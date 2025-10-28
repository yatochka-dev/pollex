/** eslint-disable react/no-children-prop */
/**
 * Create Poll Page
 *
 * This page allows authenticated users to create new polls with a question and 2-10 options.
 *
 * Architecture:
 * - Uses TanStack Form for form state management (question field)
 * - Uses local React state for dynamic options array
 * - Uses TanStack Query (via useCreatePoll hook) for API mutation
 * - Protected route - redirects to /auth if not authenticated
 *
 * Features:
 * - Real-time validation with character limits
 * - Dynamic option management (add/remove)
 * - Loading states during submission
 * - Success toast and auto-redirect to created poll
 * - Mobile-responsive design
 *
 * API Endpoint: POST /polls
 * Success Redirect: /[pollId]
 */

"use client";

import { useForm } from "@tanstack/react-form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Plus, X, Vote, ArrowLeft } from "lucide-react";
import { useState } from "react";
import useCreatePoll from "~/hooks/useCreatePoll";
import { useRouter } from "next/navigation";
import useSession from "~/hooks/useSession";

export default function CreatePollPage() {
  const { authenticated, isLoading: sessionLoading } = useSession();
  const router = useRouter();
  const { createPoll, isLoading } = useCreatePoll();
  const [options, setOptions] = useState<string[]>(["", ""]);

  const form = useForm({
    defaultValues: {
      question: "",
    },
    onSubmit: async ({ value }) => {
      // Filter out empty options
      const validOptions = options.filter((opt) => opt.trim().length > 0);

      if (validOptions.length < 2) {
        return;
      }

      try {
        await createPoll({
          question: value.question,
          options: validOptions,
        });
      } catch (error) {
        console.error("Failed to create poll:", error);
      }
    },
  });

  // Redirect to auth if not authenticated
  if (!sessionLoading && !authenticated) {
    router.push("/auth?form=login");
    return null;
  }

  // Show loading state while checking auth
  if (sessionLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="border-primary h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const validOptions = options.filter((opt) => opt.trim().length > 0);
  const canSubmit =
    form.state.values.question.trim().length >= 5 &&
    validOptions.length >= 2 &&
    !isLoading;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.push("/")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>

      <Card className="border-zinc-800">
        <CardHeader className="space-y-1 border-b border-zinc-800 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <Vote className="text-primary h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Create a New Poll
              </h1>
              <p className="text-muted-foreground text-sm">
                Ask a question and provide options for people to vote on
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 py-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
            className="space-y-6"
          >
            {/* Question Field */}
            <form.Field
              name="question"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor="question" className="text-sm font-medium">
                    Question
                  </Label>
                  <Input
                    id="question"
                    type="text"
                    placeholder="What's your question?"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="w-full border-zinc-800 placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-zinc-700"
                    maxLength={200}
                  />
                  <div className="flex items-center justify-between">
                    <div style={{ minHeight: "1.25em" }}>
                      {field.state.value.length > 0 &&
                        field.state.value.length < 5 && (
                          <em className="text-xs text-amber-500">
                            Question must be at least 5 characters
                          </em>
                        )}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {field.state.value.length}/200
                    </span>
                  </div>
                </div>
              )}
            />

            {/* Options Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Options {validOptions.length < 2 && "(minimum 2 required)"}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={options.length >= 10}
                  className="border-zinc-800"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className="w-full border-zinc-800 placeholder:text-zinc-500 focus:border-zinc-700 focus:ring-zinc-700"
                        maxLength={100}
                      />
                    </div>
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                        className="h-10 w-10 text-zinc-500 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {options.length >= 10 && (
                <p className="text-muted-foreground text-xs">
                  Maximum of 10 options reached
                </p>
              )}
            </div>

            {/* Validation Messages */}
            {validOptions.length < 2 &&
              options.some((opt) => opt.length > 0) && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                  <p className="text-sm text-amber-500">
                    Please add at least 2 non-empty options
                  </p>
                </div>
              )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/")}
                className="flex-1 border-zinc-800"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-zinc-100 font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canSubmit}
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Vote className="mr-2 h-4 w-4" />
                    Create Poll
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tips Section */}
      <div className="bg-card mt-6 space-y-3 rounded-lg border border-zinc-800 p-4">
        <h3 className="text-sm font-semibold">
          Tips for creating a great poll
        </h3>
        <ul className="text-muted-foreground space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Keep your question clear and concise</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>
              Provide distinct options that cover different perspectives
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Avoid biased or leading language in your question</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Share your poll link to get more responses</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
