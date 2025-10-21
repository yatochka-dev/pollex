import { useQuery } from "@tanstack/react-query";
import { apiFetch, getPath } from "~/lib/api";
import useSession from "./useSession";
import { UserVoteResponseSchema } from "~/lib/types";

async function getUserVote(pollId: string) {
  const result = await apiFetch(getPath(`polls/votes/${pollId}/vote`), {
    method: "GET",
    parser: (data) => UserVoteResponseSchema.parse(data),
    showErrorToast: false, // Don't show toast for "no vote" case
  });

  if (!result.success) {
    // Return null on error - user likely hasn't voted
    return { option_id: null };
  }

  return result.data;
}

function useUserVote(pollId: string) {
  const sess = useSession();
  const queryKey = ["userVote", pollId];
  const q = useQuery({
    queryKey,
    queryFn: () => getUserVote(pollId),
    enabled: !!sess.user?.id, // Only fetch when user is logged in
    retry: false, // Don't retry on failure - user just hasn't voted
    placeholderData: (previousData) => previousData, // Keep previous data while refetching to prevent UI flash
  });

  return {
    option_id: q.data?.option_id ?? null,
    hasVoted: q.data?.option_id !== null && q.data?.option_id !== undefined,
    isLoading: q.isLoading,
  };
}

export default useUserVote;
