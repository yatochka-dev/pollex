/**
 * useCreatePoll Hook
 *
 * Custom TanStack Query hook for creating new polls.
 *
 * Features:
 * - Validates input using Zod schema before sending to API
 * - Handles API errors with user-friendly toast messages
 * - Automatically redirects to newly created poll on success
 * - Invalidates polls cache to ensure data consistency
 * - Provides loading and error states for UI feedback
 *
 * Usage:
 * ```tsx
 * const { createPoll, isLoading, isError, error } = useCreatePoll();
 *
 * const handleSubmit = async () => {
 *   await createPoll({
 *     question: "What's your favorite color?",
 *     options: ["Red", "Blue", "Green"]
 *   });
 * };
 * ```
 *
 * @returns Object with createPoll function, loading state, and error state
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch, getPath } from "~/lib/api";
import {
  CreatePollInputSchema,
  CreatePollResponseSchema,
  type CreatePollInput,
  type CreatePollResponse,
} from "~/lib/types";

/**
 * API function to create a new poll
 * Validates input and sends POST request to /polls endpoint
 *
 * @param input - Poll creation data (question and options)
 * @returns Created poll data from server
 * @throws Error if validation fails or API request fails
 */
const createPoll = async (
  input: CreatePollInput,
): Promise<CreatePollResponse> => {
  // Validate input
  const validated = CreatePollInputSchema.parse(input);

  const result = await apiFetch(getPath("/polls"), {
    method: "POST",
    body: JSON.stringify(validated),
    headers: {
      "Content-Type": "application/json",
    },
    parser: (data) => CreatePollResponseSchema.parse(data),
    showErrorToast: true,
  });

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
};

/**
 * Hook for creating polls with TanStack Query
 *
 * Manages the entire poll creation lifecycle including:
 * - Form submission
 * - Loading states
 * - Success/error handling
 * - Cache invalidation
 * - Navigation after creation
 *
 * @returns {Object} Poll creation utilities
 * @returns {Function} createPoll - Async function to create a poll
 * @returns {boolean} isLoading - True when mutation is in progress
 * @returns {boolean} isError - True if mutation failed
 * @returns {Error|null} error - Error object if mutation failed
 */
function useCreatePoll() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationKey: ["createPoll"],
    mutationFn: createPoll,
    onSuccess: (data) => {
      toast.success("Poll created successfully!");
      // Redirect to the newly created poll view page
      router.push(`/${data.id}`);
    },
    onSettled: async () => {
      // Invalidate any polls list queries to ensure data consistency
      await queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });

  return {
    createPoll: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

export default useCreatePoll;
