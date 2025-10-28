import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPath, parseErrorResponse } from "~/lib/api";
import {
  AdminUsersResponseSchema,
  AdminUserSchema,
  type AdminUsersResponse,
  type AdminUser,
  type UpdateUserRoleInput,
  type UpdateUserNameInput,
  type ResetPasswordInput,
} from "~/lib/types";
import toast from "react-hot-toast";

interface UseAdminUsersOptions {
  limit?: number;
  offset?: number;
}

async function fetchAdminUsers(
  limit: number,
  offset: number,
): Promise<AdminUsersResponse> {
  const res = await fetch(
    getPath(`/admin/users?limit=${limit}&offset=${offset}`),
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (!res.ok) {
    const error = await parseErrorResponse(res);
    throw new Error(error.message);
  }

  const json: unknown = await res.json();
  return AdminUsersResponseSchema.parse(json);
}

async function fetchAdminUser(userId: string): Promise<AdminUser> {
  const res = await fetch(getPath(`/admin/users/${userId}`), {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const error = await parseErrorResponse(res);
    throw new Error(error.message);
  }

  const json: unknown = await res.json();
  return AdminUserSchema.parse(json);
}

async function updateUserRole(
  userId: string,
  input: UpdateUserRoleInput,
): Promise<AdminUser> {
  const res = await fetch(getPath(`/admin/users/${userId}/role`), {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await parseErrorResponse(res);
    throw new Error(error.message);
  }

  const json: unknown = await res.json();
  return AdminUserSchema.parse(json);
}

async function updateUserName(
  userId: string,
  input: UpdateUserNameInput,
): Promise<AdminUser> {
  const res = await fetch(getPath(`/admin/users/${userId}/name`), {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await parseErrorResponse(res);
    throw new Error(error.message);
  }

  const json: unknown = await res.json();
  return AdminUserSchema.parse(json);
}

async function resetUserPassword(
  userId: string,
  input: ResetPasswordInput,
): Promise<void> {
  const res = await fetch(getPath(`/admin/users/${userId}/reset-password`), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await parseErrorResponse(res);
    throw new Error(error.message);
  }
}

async function deleteUser(userId: string): Promise<void> {
  const res = await fetch(getPath(`/admin/users/${userId}`), {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    const error = await parseErrorResponse(res);
    throw new Error(error.message);
  }
}

async function toggleEmailVerification(
  userId: string,
  verified: boolean,
): Promise<void> {
  const res = await fetch(getPath(`/admin/users/${userId}/verification`), {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ verified }),
  });

  if (!res.ok) {
    const error = await parseErrorResponse(res);
    throw new Error(error.message);
  }
}

export function useAdminUsers(options: UseAdminUsersOptions = {}) {
  const { limit = 50, offset = 0 } = options;

  return useQuery({
    queryKey: ["admin", "users", limit, offset],
    queryFn: () => fetchAdminUsers(limit, offset),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAdminUser(userId: string) {
  return useQuery({
    queryKey: ["admin", "users", userId],
    queryFn: () => fetchAdminUser(userId),
    enabled: !!userId,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: UpdateUserRoleInput;
    }) => updateUserRole(userId, input),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.setQueryData(
        ["admin", "users", variables.userId],
        data,
      );
      toast.success("User role updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update user role");
    },
  });
}

export function useUpdateUserName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: UpdateUserNameInput;
    }) => updateUserName(userId, input),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.setQueryData(
        ["admin", "users", variables.userId],
        data,
      );
      toast.success("User name updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update user name");
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: ResetPasswordInput;
    }) => resetUserPassword(userId, input),
    onSuccess: () => {
      toast.success("Password reset successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reset password");
    },
  });
}

export function useToggleEmailVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, verified }: { userId: string; verified: boolean }) =>
      toggleEmailVerification(userId, verified),
    onSuccess: async (_, { userId }) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "user", userId],
      });
      toast.success("Email verification status updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update verification status");
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete user");
    },
  });
}
