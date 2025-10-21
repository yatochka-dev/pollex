import { getPath, parseErrorResponse } from "~/lib/api";
import { UserSchema } from "~/lib/types";
import useLogin from "./useLogin";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type User = typeof UserSchema._output;

async function getUserProfile(): Promise<User | null> {
  const res = await fetch(getPath("/user/profile"), {
    method: "GET",
    credentials: "include",
  });

  // Session expired or invalid - user is logged out
  if (res.status === 401) {
    return null;
  }

  if (!res.ok) {
    const error = await parseErrorResponse(res);
    const err = new Error(error.message);
    // @ts-expect-error - attach status for retry logic
    err.status = res.status;
    throw err;
  }

  const json: unknown = await res.json();
  return UserSchema.parse(json);
}

function useSession() {
  const qc = useQueryClient();
  const login = useLogin();
  const router = useRouter();

  const q = useQuery({
    queryKey: ["user"],
    queryFn: getUserProfile,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",

    // Don't retry on auth failures
    retry(failureCount, error: { status?: number }) {
      if (error?.status === 401) return false;
      return failureCount < 2;
    },

    // Always enabled - let the query run and handle null results
    enabled: true,
  });

  return {
    authenticated: !!q.data && !!q.data.id,
    user: q.data ?? null,
    isLoading: q.isLoading,
    login: login.dispatch,
    logout: async () => {
      try {
        const res = await fetch(getPath("/auth/logout"), {
          credentials: "include",
          method: "POST",
        });

        if (!res.ok) {
          toast.error("Logout failed");
          return;
        }

        // Clear all user-related cache
        qc.setQueryData(["user"], null);
        qc.setQueriesData({ queryKey: ["userVote"] }, null);

        toast.success("Logged out successfully");
        router.push("/auth");
      } catch {
        toast.error("Logout failed");
      }
    },
  };
}

export default useSession;
