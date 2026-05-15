import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/auth-middleware", async () => {
  const { createMiddleware } = await import("@tanstack/react-start");
  return {
    requireSupabaseAuth: createMiddleware({ type: "function" }).server(({ next }) =>
      next({ context: { supabase: {} as never, userId: "u1", claims: {} as never } }),
    ),
  };
});

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
    }),
  },
}));

describe("probe", () => {
  it("calls a server fn", async () => {
    const { revokeAdmin } = await import("@/server/admin.functions");
    await expect(revokeAdmin({ data: { user_id: "11111111-2222-3333-4444-555555555555" } })).rejects.toThrow();
  });
});
