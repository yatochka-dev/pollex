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
      // validate input
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
        showErrorToast: false, // toast.promise handles this
      });

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    onMutate: async (option_id: string) => {
      // cancel outgoing refetches
      await qc.cancelQueries({ queryKey: ["userVote"] });

      // snapshot previous value
      const previousVote = qc.getQueryData(["userVote"]);

      // optimistically update
      qc.setQueryData(["userVote"], { option_id });

      return { previousVote };
    },
    onError: (error, option_id, context) => {
      // rollback on error
      if (context?.previousVote) {
        qc.setQueryData(["userVote"], context.previousVote);
      }
    },
    onSuccess: () => {
      // success toast handled by toast.promise in poll.tsx
    },
    onSettled: async () => {
      // refresh data
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
