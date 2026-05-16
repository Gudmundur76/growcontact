/**
 * Shared test fixtures.
 *
 * Centralised UUIDv4 constants so Zod's strict UUIDv4 validation stays
 * consistent across every test file. Always import from here instead of
 * inlining literals — keeps "version 4" (third group starts with 4) and
 * "variant 10xx" (fourth group starts with 8/9/a/b) invariants in one place.
 */

export const TEST_UUIDS = {
  /** Generic UUID — use when a test only needs one valid id. */
  generic: "11111111-1111-4111-8111-111111111111",
  /** Stand-in for the authenticated user id in handler tests. */
  user: "11111111-1111-4111-8111-111111111111",
  /** Distinct ids when a test needs two or more uuids. */
  a: "22222222-2222-4222-8222-222222222222",
  b: "33333333-3333-4333-8333-333333333333",
  c: "44444444-4444-4444-8444-444444444444",
} as const;

/** Backwards-compatible single-uuid alias used by schema tests. */
export const TEST_UUID = TEST_UUIDS.generic;