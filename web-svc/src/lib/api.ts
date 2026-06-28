import { env } from "~/env";
import { ErrorResponseSchema, type ErrorResponse } from "./types";
import toast from "react-hot-toast";

export function getPath(path: string) {
  return new URL(path, env.NEXT_PUBLIC_SERVER_URL);
}

// ============================================================================
// API Error Handling
// ============================================================================

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";
const NETWORK_ERROR_MESSAGE =
  "We couldn't reach the server. Check your connection and try again.";
const RESPONSE_ERROR_MESSAGE =
  "We couldn't process the server response. Please try again.";

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: "Please check your input and try again.",
  401: "Please sign in to continue.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "That conflicts with an existing item.",
  422: "Please check your input and try again.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our side. Please try again later.",
  502: "The server is temporarily unavailable. Please try again later.",
  503: "The server is temporarily unavailable. Please try again later.",
  504: "The request timed out. Please try again.",
};

function cleanMessage(message: unknown): string | undefined {
  if (typeof message !== "string") return undefined;

  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;

  return normalized.endsWith(".") ? normalized : `${normalized}.`;
}

function getKnownUserMessage(message: string): string | undefined {
  const lower = message.toLowerCase();

  if (lower.includes("invalid email or password")) {
    return "Invalid email or password.";
  }

  if (lower.includes("email already registered")) {
    return "An account with this email already exists.";
  }

  if (lower.includes("email already verified")) {
    return "Your email is already verified.";
  }

  if (lower.includes("email verification required")) {
    return "Please verify your email before continuing.";
  }

  if (lower.includes("too many verification emails")) {
    return "Too many verification emails requested. Please try again later.";
  }

  if (lower.includes("too many password reset requests")) {
    return "Too many password reset requests. Please try again later.";
  }

  if (lower.includes("verification token")) {
    return "This verification link is invalid or expired.";
  }

  if (lower.includes("reset token") || lower.includes("reset link")) {
    if (lower.includes("already been used")) {
      return "This reset link has already been used. Request a new one to continue.";
    }

    return "This reset link is invalid or expired. Request a new one to continue.";
  }

  if (lower.includes("password must be at least")) {
    return "Password must be at least 8 characters.";
  }

  if (
    lower.includes("poll is closed") ||
    lower.includes("poll is closed or expired")
  ) {
    return "This poll is closed.";
  }

  if (lower.includes("poll not found")) {
    return "This poll doesn't exist or has been removed.";
  }

  return undefined;
}

function isTechnicalMessage(message: string): boolean {
  const lower = message.toLowerCase();

  return [
    "failed to",
    "sql",
    "pq:",
    "json:",
    "uuid",
    "runtime",
    "panic",
    "syntaxerror",
    "zoderror",
    "invalid_type",
    "unrecognized_keys",
    "expected",
    "key:",
    "error:",
    "cannot",
    "unexpected",
    "networkerror",
  ].some((token) => lower.includes(token));
}

function getUserMessageForStatus(status: number, rawMessage?: string): string {
  const knownMessage = rawMessage ? getKnownUserMessage(rawMessage) : undefined;
  if (knownMessage !== undefined) return knownMessage;

  if (status >= 500) {
    return (
      STATUS_ERROR_MESSAGES[status] ??
      STATUS_ERROR_MESSAGES[500] ??
      GENERIC_ERROR_MESSAGE
    );
  }

  const cleanedMessage = cleanMessage(rawMessage);
  if (
    cleanedMessage &&
    cleanedMessage.length <= 140 &&
    !isTechnicalMessage(cleanedMessage)
  ) {
    return cleanedMessage;
  }

  return STATUS_ERROR_MESSAGES[status] ?? GENERIC_ERROR_MESSAGE;
}

function getClientErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The request was cancelled.";
  }

  if (error instanceof TypeError) {
    return NETWORK_ERROR_MESSAGE;
  }

  return RESPONSE_ERROR_MESSAGE;
}

export function getUserFacingErrorMessage(
  error: unknown,
  fallback = GENERIC_ERROR_MESSAGE,
): string {
  if (!(error instanceof Error)) return fallback;

  const knownMessage = getKnownUserMessage(error.message);
  if (knownMessage) return knownMessage;

  const cleanedMessage = cleanMessage(error.message);
  if (
    cleanedMessage &&
    cleanedMessage.length <= 140 &&
    !isTechnicalMessage(cleanedMessage)
  ) {
    return cleanedMessage;
  }

  return fallback;
}

/**
 * Parse error response from API
 */
export async function parseErrorResponse(
  response: Response,
): Promise<ErrorResponse> {
  let rawMessage: string | undefined;
  let data: unknown;

  try {
    const json: unknown = await response.json();
    data = json;
    const parsed = ErrorResponseSchema.safeParse(json);

    if (parsed.success) {
      rawMessage = parsed.data.message;
    } else if (typeof json === "object" && json !== null) {
      rawMessage =
        "message" in json || "error" in json
          ? ((json as { message?: string; error?: string }).message ??
            (json as { message?: string; error?: string }).error)
          : undefined;
    }
  } catch {
    rawMessage = undefined;
  }

  return {
    message: getUserMessageForStatus(response.status, rawMessage),
    rawMessage: cleanMessage(rawMessage),
    data,
  };
}

/**
 * Handle API errors
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

  if (showToast) {
    toast.error(error.message);
  }

  if (response.status === 401) {
    options?.onUnauthorized?.();
  }

  return error;
}

/**
 * fetch wrapper with error handling
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
      const err = await handleApiError(response, {
        showToast: options?.showErrorToast ?? true,
        onUnauthorized: options?.onUnauthorized,
      });
      return { success: false, error: err, status: response.status };
    }

    const json: unknown = await response.json();
    const data = options?.parser ? options.parser(json) : (json as T);

    return { success: true, data };
  } catch (error) {
    const errMsg = getClientErrorMessage(error);
    console.error("API request failed:", error);
    if (options?.showErrorToast ?? true) {
      toast.error(errMsg);
    }
    return {
      success: false,
      error: { message: errMsg },
      status: 0,
    };
  }
}
