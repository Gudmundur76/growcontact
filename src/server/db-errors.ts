/**
 * Sanitize Supabase/Postgres errors before surfacing to clients.
 *
 * Raw DB errors can leak schema, constraint names, RLS hints, and SQL
 * fragments. We log the full error server-side and map common Postgres
 * SQLSTATE codes to friendly, user-safe messages. Unknown codes fall
 * back to a generic message (overridable via `fallback`).
 *
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 * PostgREST also surfaces these codes for HTTP-level conditions like
 * "PGRST116" (no rows returned for `.single()`).
 */
export class DbError extends Error {
  readonly code?: string;
  readonly status: number;
  constructor(message: string, code?: string, status = 400) {
    super(message);
    this.name = "DbError";
    this.code = code;
    this.status = status;
  }
}

type RawDbError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null | undefined;

const CODE_MAP: Record<string, { message: string; status: number }> = {
  // Integrity
  "23505": { message: "That already exists.", status: 409 }, // unique_violation
  "23503": { message: "Related record is missing or in use.", status: 409 }, // foreign_key_violation
  "23502": { message: "A required field is missing.", status: 400 }, // not_null_violation
  "23514": { message: "Value is not allowed.", status: 400 }, // check_violation
  "22001": { message: "Value is too long.", status: 400 }, // string_data_right_truncation
  "22P02": { message: "Invalid input format.", status: 400 }, // invalid_text_representation

  // Auth / RLS
  "42501": { message: "You do not have permission to do that.", status: 403 }, // insufficient_privilege
  "42P01": { message: "Resource is unavailable.", status: 500 }, // undefined_table

  // PostgREST
  PGRST116: { message: "Not found.", status: 404 }, // single() returned 0 rows
  PGRST301: { message: "Please sign in and try again.", status: 401 }, // JWT expired
  PGRST302: { message: "You do not have permission to do that.", status: 403 },

  // Transient
  "40001": { message: "Please try again.", status: 409 }, // serialization_failure
  "40P01": { message: "Please try again.", status: 409 }, // deadlock_detected
  "57014": { message: "The request took too long. Please try again.", status: 504 }, // query_canceled
  "53300": { message: "Service is busy. Please try again shortly.", status: 503 }, // too_many_connections
};

export function dbError(
  error: RawDbError,
  context: string,
  fallback = "Something went wrong. Please try again.",
): DbError {
  console.error(`[db] ${context}:`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  });
  const code = error?.code;
  const mapped = code ? CODE_MAP[code] : undefined;
  if (mapped) return new DbError(mapped.message, code, mapped.status);
  // RLS denials sometimes surface without 42501; detect by message hint.
  const msg = error?.message?.toLowerCase() ?? "";
  if (msg.includes("row-level security") || msg.includes("violates row-level")) {
    return new DbError("You do not have permission to do that.", code ?? "42501", 403);
  }
  return new DbError(fallback, code, 500);
}
