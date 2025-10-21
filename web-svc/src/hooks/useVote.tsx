import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getPath } from "~/lib/api";
import {
  VoteInputSchema,
  VoteResponseSchema,
  type VoteInput,
} from "~/lib/types";

function useVote() {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationKey: ["vote", "actions"],
    mutationFn: async (optionId: string) => {
      // Validate input
      const validated: VoteInput = VoteInputSchema.parse({
        option_id: optionId,
      });

      const result = await apiFetch(getPath("/polls/votes/"), {
        method: "POST",
        body: JSON.stringify(validated),
        headers: {
          "Content-Type": "application/json",
        },
        parser: (data) => VoteResponseSchema.parse(data),
        showErrorToast: false, // toast.promise handles this in poll.tsx
      });

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    onMutate: async (option_id: string) => {
      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await qc.cancelQueries({ queryKey: ["userVote"] });

      // Snapshot the previous value
      const previousVote = qc.getQueryData(["userVote"]);

      // Optimistically update to the new value
      qc.setQueryData(["userVote"], { option_id });

      // Return context with the snapshot
      return { previousVote };
    },
    onError: (error, option_id, context) => {
      // Rollback to previous value on error
      if (context?.previousVote) {
        qc.setQueryData(["userVote"], context.previousVote);
      }
      // Error toast now handled by toast.promise in poll.tsx
    },
    onSuccess: () => {
      // Success toast now handled by toast.promise in poll.tsx
    },
    onSettled: async () => {
      // Refresh the data to ensure consistency
      await qc.invalidateQueries({ queryKey: ["userVote"] });
    },
  });

  return {
    vote: mut.mutateAsync,
    isPending: mut.isPending,
    isSuccess: mut.isSuccess,
    isError: mut.isError,
    error: mut.error,
  };
}
export default useVote;
