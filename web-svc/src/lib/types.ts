import { z } from "zod";

// ============================================================================
// Core Entity Schemas
// ============================================================================

export const PollSchema = z.object({
  id: z.string(),
  question: z.string(),
  createdAt: z.string().transform((date) => new Date(date)),
  closed: z.boolean(),
});

export const PollDataSchema = PollSchema.extend({
  totalVotes: z.number(),
  currentUser: z.string().optional(),
  options: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      votes: z.number(),
    }),
  ),
});

export type Poll = z.infer<typeof PollSchema>;
export type PollData = z.infer<typeof PollDataSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  created_at: z.string().transform((date) => new Date(date)),
});

export type User = z.infer<typeof UserSchema>;

// ============================================================================
// Error Response Schema
// ============================================================================

export const ErrorResponseSchema = z.object({
  message: z.string(),
  data: z.unknown().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============================================================================
// Auth Schemas
// ============================================================================

export const LoginInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const LoginResponseSchema = z.object({
  message: z.string(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).max(100),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const RegisterResponseSchema = z.object({
  data: UserSchema,
  isNew: z.boolean(),
});

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

export const LogoutResponseSchema = z.object({
  message: z.string(),
});

export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

// ============================================================================
// Voting Schemas
// ============================================================================

export const VoteInputSchema = z.object({
  option_id: z.string().uuid("Invalid option ID"),
});

export type VoteInput = z.infer<typeof VoteInputSchema>;

export const VoteResponseSchema = z.object({
  message: z.string(),
});

export type VoteResponse = z.infer<typeof VoteResponseSchema>;

export const UserVoteResponseSchema = z.object({
  option_id: z.string().uuid().nullable(),
});

export type UserVoteResponse = z.infer<typeof UserVoteResponseSchema>;

// ============================================================================
// Poll Creation Schemas
// ============================================================================

export const CreatePollInputSchema = z.object({
  question: z
    .string()
    .min(5, "Question must be at least 5 characters")
    .max(200, "Question must be less than 200 characters"),
  options: z
    .array(
      z
        .string()
        .min(1, "Option cannot be empty")
        .max(100, "Option must be less than 100 characters"),
    )
    .min(2, "You must provide at least 2 options")
    .max(10, "You can provide at most 10 options"),
});

export type CreatePollInput = z.infer<typeof CreatePollInputSchema>;

export const CreatePollResponseSchema = z.object({
  id: z.string().uuid(),
  question: z.string(),
  user_id: z.string().uuid(),
  created_at: z.string().transform((date) => new Date(date)),
  closed: z.boolean(),
});

export type CreatePollResponse = z.infer<typeof CreatePollResponseSchema>;

// TODO maybe merge these schemas?
export const UserPollSchema = z.object({
  id: z.string().uuid(),
  question: z.string(),
  user_id: z.string().uuid(),
  created_at: z.string().transform((date) => new Date(date)),
  closed: z.boolean(),
});

export type UserPoll = z.infer<typeof UserPollSchema>;

export const UserPollsResponseSchema = z.array(UserPollSchema);

export type UserPollsResponse = z.infer<typeof UserPollsResponseSchema>;

// ============================================================================
// SSE Event Schemas
// ============================================================================

export const ViewersEventSchema = z.object({
  pollId: z.string().uuid(),
  viewerCount: z.number().int().nonnegative(),
});

export type ViewersEvent = z.infer<typeof ViewersEventSchema>;

// ============================================================================
// Utility Types
// ============================================================================

// API result type for error handling
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ErrorResponse; status: number };

// async state for UI
export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };
