import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPath, parseErrorResponse } from "~/lib/api";
import {
  AdminPollsResponseSchema,
  type AdminPollsResponse,
  type AdminPoll,
} from "~/lib/types";
import toast from "react-hot-toast";

interface UseAdminPollsOptions {
  limit?: number;
  offset?: number;
  closed?: boolean;
}

async function fetchAdminPolls(
  limit: number,
  offset: number,
  closed?: boolean,
): Promise<AdminPollsResponse> {
  let url = `/admin/polls?limit=${limit}&offset=${offset}`;
  if (closed !== undefined) {
    url += `&closed=${closed}`;
  }

  const res = await fetch(getPath(url), {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const error = await parseErrorResponse(res);
    throw new Error(error.message);
  }

  const json: unknown = await res.json();
  return AdminPollsResponseSchema.parse(json);
}

async function closePoll(pollId: string): Promise<AdminPoll> {
  const res = await fetch(getPath(`/admin/polls/${pollId}/close`), {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    const error = await parseErrorResponse(res);
    throw new Error(error.message);
  }

  const json: unknown = await res.json();
  return json as AdminPoll;
}

async function reopenPoll(pollId: string): Promise<AdminPoll> {
  const res = await fetch(getPath(`/admin/polls/${pollId}/reopen`), {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    const error = await parseErrorResponse(res);
    throw new Error(error.message);
  }

  const json: unknown = await res.json();
  return json as AdminPoll;
}

async function deletePoll(pollId: string): Promise<void> {
  const res = await fetch(getPath(`/admin/polls/${pollId}`), {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    const error = await parseErrorResponse(res);
    throw new Error(error.message);
  }
}

export function useAdminPolls(options: UseAdminPollsOptions = {}) {
  const { limit = 50, offset = 0, closed } = options;

  return useQuery({
    queryKey: ["admin", "polls", limit, offset, closed],
    queryFn: () => fetchAdminPolls(limit, offset, closed),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useClosePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pollId: string) => closePoll(pollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "polls"] });
      toast.success("Poll closed successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to close poll");
    },
  });
}

export function useReopenPoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pollId: string) => reopenPoll(pollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "polls"] });
      toast.success("Poll reopened successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reopen poll");
    },
  });
}

export function useDeletePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pollId: string) => deletePoll(pollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "polls"] });
      toast.success("Poll deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete poll");
    },
  });
}
