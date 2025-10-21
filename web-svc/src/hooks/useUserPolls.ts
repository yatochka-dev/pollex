/**
 * useUserPolls Hook
 *
 * Custom TanStack Query hook for fetching polls created by the authenticated user.
 *
 * Features:
 * - Fetches user's polls from GET /polls endpoint
 * - Validates response using Zod schema
 * - Handles API errors with user-friendly toast messages
 * - Provides loading, error, and data states for UI feedback
 * - Automatically refetches when user authentication changes
 * - Caches data for improved performance
 *
 * Usage:
 * ```tsx
 * const { polls, isLoading, isError, error, refetch } = useUserPolls();
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (isError) return <div>Error: {error.message}</div>;
 *
 * return <div>{polls.map(poll => <PollCard key={poll.id} poll={poll} />)}</div>;
 * ```
 *
 * @returns Object with polls data, loading state, and error state
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch, getPath } from "~/lib/api";
import {
  UserPollsResponseSchema,
  type UserPollsResponse,
} from "~/lib/types";

/**
 * API function to fetch user's polls
 * Sends GET request to /polls endpoint
 *
 * @returns Array of polls created by the authenticated user
 * @throws Error if API request fails or validation fails
 */
const fetchUserPolls = async (): Promise<UserPollsResponse> => {
  const result = await apiFetch(getPath("/polls"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    parser: (data) => UserPollsResponseSchema.parse(data),
    showErrorToast: true,
  });

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
};

/**
 * Hook for fetching user's polls with TanStack Query
 *
 * Manages the entire data fetching lifecycle including:
 * - Initial load
 * - Loading states
 * - Error handling
 * - Data caching
 * - Automatic refetching
 *
 * @returns {Object} User polls query utilities
 * @returns {UserPollsResponse} polls - Array of user's polls (empty array if loading/error)
 * @returns {boolean} isLoading - True when query is in progress
 * @returns {boolean} isError - True if query failed
 * @returns {Error|null} error - Error object if query failed
 * @returns {Function} refetch - Function to manually refetch data
 */
function useUserPolls() {
  const query = useQuery({
    queryKey: ["user", "polls"],
    queryFn: fetchUserPolls,
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
    // Keep data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Retry failed requests once
    retry: 1,
  });

  return {
    polls: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useUserPolls;
