/**
 * Sanitize Supabase/Postgres errors before surfacing to clients.
 *
 * Raw DB errors can leak schema, constraint names, RLS hints, and SQL
 * fragments. We log the full error server-side and throw a generic,
 * user-safe message instead.
 */
export function dbError(
  error: { message?: string; code?: string; details?: string; hint?: string } | null | undefined,
  context: string,
  userMessage = "Something went wrong. Please try again.",
): Error {
  console.error(`[db] ${context}:`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  });
  return new Error(userMessage);
}
