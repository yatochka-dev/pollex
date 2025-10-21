import { apiFetch, getPath } from "./api";
import {
  RegisterInputSchema,
  RegisterResponseSchema,
  type RegisterInput,
  type RegisterResponse,
} from "./types";

/**
 * Registers a new user using the /auth/register endpoint.
 * Validates input and response using Zod schemas.
 * Shows toast notifications for errors automatically.
 *
 * @param input - Registration data: { email, password, name }
 * @returns The registered user and isNew flag
 * @throws Error if registration fails or response is invalid
 */
export async function register(
  input: RegisterInput,
): Promise<RegisterResponse> {
  // Validate input
  const validated = RegisterInputSchema.parse(input);

  const result = await apiFetch(getPath("/auth/register"), {
    method: "POST",
    body: JSON.stringify(validated),
    headers: {
      "Content-Type": "application/json",
    },
    parser: (data) => RegisterResponseSchema.parse(data),
    showErrorToast: true,
  });

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}
