import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getPath } from "~/lib/api";
import {
  LoginInputSchema,
  LoginResponseSchema,
  type LoginInput,
} from "~/lib/types";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const login = async (creds: LoginInput) => {
  // Validate input
  const validated = LoginInputSchema.parse(creds);

  const result = await apiFetch(getPath("/auth/login"), {
    method: "POST",
    body: JSON.stringify(validated),
    headers: {
      "Content-Type": "application/json",
    },
    parser: (data) => LoginResponseSchema.parse(data),
    showErrorToast: true,
  });

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
};

function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mut = useMutation({
    mutationKey: ["login"],
    mutationFn: login,
    onSuccess: () => {
      toast.success("Logged in successfully!");
      // Redirect to home after successful login
      router.push("/");
    },
    onSettled: async () => {
      // Refresh user profile data
      await queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  return {
    dispatch: mut.mutateAsync,
    isLoading: mut.isPending,
    isError: mut.isError,
    error: mut.error,
  };
}

export default useLogin;
