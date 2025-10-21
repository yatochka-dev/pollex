import { env } from "~/env";
import { ErrorResponseSchema, type ErrorResponse } from "./types";
import toast from "react-hot-toast";

export function getPath(path: string) {
  return new URL(path, env.NEXT_PUBLIC_SERVER_URL);
}

// ============================================================================
// API Error Handling
// ============================================================================

/**
 * Parse error response from API
 * Validates response structure and extracts error message
 */
export async function parseErrorResponse(
  response: Response,
): Promise<ErrorResponse> {
  try {
    const json: unknown = await response.json();
    const parsed = ErrorResponseSchema.safeParse(json);

    if (parsed.success) {
      return parsed.data;
    }

    // Fallback if response doesn't match expected format
    return {
      message:
        (typeof json === "object" &&
        json !== null &&
        ("message" in json || "error" in json)
          ? ((json as { message?: string; error?: string }).message ??
            (json as { message?: string; error?: string }).error)
          : undefined) ?? "An error occurred",
    };
  } catch {
    // Response wasn't JSON or couldn't be parsed
    return {
      message: `Request failed with status ${response.status}`,
    };
  }
}

/**
 * Handle API errors with appropriate user feedback
 * Maps HTTP status codes to user actions
 */
export async function handleApiError(
  response: Response,
  options?: {
    showToast?: boolean;
    onUnauthorized?: () => void;
  },
): Promise<ErrorResponse> {
  const error = await parseErrorResponse(response);
  const showToast = options?.showToast ?? true;

  switch (response.status) {
    case 400:
      // Bad request - validation error
      if (showToast) {
        toast.error(error.message || "Invalid request");
      }
      break;

    case 401:
      // Unauthorized - redirect to auth
      if (showToast) {
        toast.error("Please sign in to continue");
      }
      options?.onUnauthorized?.();
      break;

    case 409:
      // Conflict - duplicate resource
      if (showToast) {
        toast.error(error.message || "Resource already exists");
      }
      break;

    case 500:
      // Server error
      if (showToast) {
        toast.error("Server error. Please try again later.");
      }
      break;

    default:
      if (showToast) {
        toast.error(error.message || "Something went wrong");
      }
  }

  return error;
}

/**
 * Wrapper for fetch with automatic error handling
 * Returns typed result for consistent error handling
 */
export async function apiFetch<T>(
  url: string | URL,
  options?: RequestInit & {
    parser?: (data: unknown) => T;
    showErrorToast?: boolean;
    onUnauthorized?: () => void;
  },
): Promise<
  | { success: true; data: T }
  | { success: false; error: ErrorResponse; status: number }
> {
  try {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
    });

    if (!response.ok) {
      const error = await handleApiError(response, {
        showToast: options?.showErrorToast ?? true,
        onUnauthorized: options?.onUnauthorized,
      });
      return { success: false, error, status: response.status };
    }

    const json: unknown = await response.json();
    const data = options?.parser ? options.parser(json) : (json as T);

    return { success: true, data };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Network error";
    if (options?.showErrorToast ?? true) {
      toast.error(errorMessage);
    }
    return {
      success: false,
      error: { message: errorMessage },
      status: 0,
    };
  }
}
