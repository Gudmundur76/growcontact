/**
 * Integration tests for server-function handlers.
 *
 * Strategy: mock the auth middleware to inject a fake authenticated context
 * and mock the Supabase admin client, then call the real createServerFn
 * exports end-to-end. This exercises Zod validation, the middleware contract,
 * and the handler body — including the DB-write call shapes — without
 * touching a real database.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { runWithStartContext } from "@tanstack/start-storage-context";
import { TEST_UUIDS } from "./test-fixtures";

const TEST_USER_ID = TEST_UUIDS.user;
const UUID_A = TEST_UUIDS.a;
const UUID_B = TEST_UUIDS.b;

type Resp = { data: any; error: any };
type Responses = Record<string, Resp>;
type CallLog = { table: string; method: string; args: unknown[] }[];

const { mockState, makeClient } = vi.hoisted(() => {
  const state: { responses: Responses; calls: CallLog; userId: string } = {
    responses: {},
    calls: [],
    userId: TEST_UUIDS.user,
  };

  function resolveFor(table: string, method: string): Resp {
    return (
      state.responses[`${table}.${method}`] ??
      state.responses[table] ?? { data: null, error: null }
    );
  }

  function makeQB(table: string): any {
    const handler: ProxyHandler<any> = {
      get(_t, prop: string) {
        if (prop === "then") {
          // Awaiting the chain (no terminal call) — resolve with table default.
          const r = resolveFor(table, "*");
          return (resolve: any, reject: any) =>
            Promise.resolve(r).then(resolve, reject);
        }
        return (...args: unknown[]) => {
          state.calls.push({ table, method: prop, args });
          if (prop === "maybeSingle" || prop === "single") {
            return Promise.resolve(resolveFor(table, prop));
          }
          return proxy;
        };
      },
    };
    const proxy: any = new Proxy(function () {}, handler);
    return proxy;
  }

  function makeClient() {
    return {
      from: (table: string) => makeQB(table),
      auth: {
        admin: {
          listUsers: vi.fn(async () => ({
            data: { users: state.responses["__users"]?.data ?? [] },
            error: null,
          })),
        },
      },
    };
  }

  return { mockState: state, makeClient };
});

vi.mock("@/integrations/supabase/auth-middleware", async () => {
  const { createMiddleware } = await import("@tanstack/react-start");
  return {
    requireSupabaseAuth: createMiddleware({ type: "function" }).server(({ next }) =>
      next({
        context: {
          supabase: makeClient() as never,
          userId: mockState.userId,
          claims: { sub: mockState.userId } as never,
        },
      }),
    ),
  };
});

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: makeClient(),
}));

// Avoid pulling in the AI SDK at import time.
vi.mock("@/server/interview-ai.server", () => ({
  generateScorecard: vi.fn(),
  generateLiveSuggestions: vi.fn(),
}));
vi.mock("@/server/recall.server", async () => {
  const actual =
    await vi.importActual<typeof import("@/server/recall.server")>("@/server/recall.server");
  return { ...actual, createRecallBot: vi.fn(), leaveRecallBot: vi.fn() };
});

beforeEach(() => {
  mockState.responses = {};
  mockState.calls = [];
  mockState.userId = TEST_USER_ID;
});

function lastCall(table: string, method: string) {
  return [...mockState.calls].reverse().find((c) => c.table === table && c.method === method);
}

/**
 * createServerFn requires a Start AsyncLocalStorage context to run. In tests
 * we provide a minimal fake one and route every server-fn call through it.
 */
function withCtx<T>(fn: () => Promise<T>): Promise<T> {
  return runWithStartContext(
    {
      getRouter: () => ({}) as never,
      request: new Request("http://test.local/", {
        headers: { authorization: "Bearer test-token" },
      }),
      startOptions: {},
      contextAfterGlobalMiddlewares: {},
      executedRequestMiddlewares: new Set(),
    },
    fn,
  );
}

// ---------- admin.functions ----------

describe("admin.revokeAdmin", () => {
  it("rejects callers that are not admin (assertAdmin path)", async () => {
    const { revokeAdmin } = await import("./admin.functions");
    mockState.responses["user_roles.maybeSingle"] = { data: null, error: null };
    await expect(withCtx(() => revokeAdmin({ data: { user_id: UUID_A } }))).rejects.toThrow(/Forbidden/);
  });

  it("refuses self-revocation even for admins", async () => {
    const { revokeAdmin } = await import("./admin.functions");
    mockState.responses["user_roles.maybeSingle"] = {
      data: { role: "admin" },
      error: null,
    };
    await expect(
      withCtx(() => revokeAdmin({ data: { user_id: TEST_USER_ID } })),
    ).rejects.toThrow(/can't revoke your own/i);
  });

  it("issues a delete on user_roles when admin revokes another admin", async () => {
    const { revokeAdmin } = await import("./admin.functions");
    mockState.responses["user_roles.maybeSingle"] = {
      data: { role: "admin" },
      error: null,
    };
    mockState.responses["user_roles"] = { data: null, error: null };
    const out = await withCtx(() => revokeAdmin({ data: { user_id: UUID_A } }));
    expect(out).toEqual({ ok: true });
    expect(lastCall("user_roles", "delete")).toBeTruthy();
  });

  it("rejects malformed input via Zod (non-uuid)", async () => {
    const { revokeAdmin } = await import("./admin.functions");
    await expect(withCtx(() => revokeAdmin({ data: { user_id: "nope" } as never }))).rejects.toThrow();
  });
});

describe("admin.grantAdminByEmail", () => {
  it("throws when no auth user matches the email", async () => {
    const { grantAdminByEmail } = await import("./admin.functions");
    mockState.responses["user_roles.maybeSingle"] = {
      data: { role: "admin" },
      error: null,
    };
    mockState.responses["__users"] = { data: [], error: null };
    await expect(
      withCtx(() => grantAdminByEmail({ data: { email: "ghost@example.com" } })),
    ).rejects.toThrow(/No user with that email/);
  });
});

// ---------- interviews.functions ----------

describe("interviews.upsertRubric", () => {
  it("inserts a new rubric and returns its id", async () => {
    const { upsertRubric } = await import("./interviews.functions");
    mockState.responses["interview_rubrics.single"] = {
      data: { id: UUID_A },
      error: null,
    };
    const out = await withCtx(() => upsertRubric({
      data: {
        name: "Staff Eng",
        roleTitle: "Staff Engineer",
        focus: "systems",
        competencies: ["scope", "ownership"],
        isDefault: true,
      },
    }));
    expect(out).toEqual({ id: UUID_A });
    expect(lastCall("interview_rubrics", "insert")).toBeTruthy();
    // isDefault: true triggers a clear of the previous default
    expect(lastCall("interview_rubrics", "update")).toBeTruthy();
  });

  it("rejects too-long names via Zod", async () => {
    const { upsertRubric } = await import("./interviews.functions");
    await expect(
      withCtx(() => upsertRubric({ data: { name: "a".repeat(500), competencies: [] } as never })),
    ).rejects.toThrow();
  });
});

describe("interviews.addManualTranscript", () => {
  it("rejects when the session is not owned by the caller", async () => {
    const { addManualTranscript } = await import("./interviews.functions");
    mockState.responses["interview_sessions.maybeSingle"] = {
      data: { id: UUID_A, user_id: UUID_B, status: "in_call" },
      error: null,
    };
    await expect(
      withCtx(() => addManualTranscript({
        data: { sessionId: UUID_A, speaker: "Alice", content: "hi" },
      })),
    ).rejects.toThrow(/Not found/);
  });

  it("inserts a transcript event for the owner", async () => {
    const { addManualTranscript } = await import("./interviews.functions");
    mockState.responses["interview_sessions.maybeSingle"] = {
      data: { id: UUID_A, user_id: TEST_USER_ID, status: "in_call" },
      error: null,
    };
    mockState.responses["interview_events"] = { data: null, error: null };
    const out = await withCtx(() => addManualTranscript({
      data: { sessionId: UUID_A, speaker: "Alice", content: "hello world" },
    }));
    expect(out).toEqual({ ok: true });
    const insert = lastCall("interview_events", "insert");
    expect(insert).toBeTruthy();
    expect(insert!.args[0]).toMatchObject({
      session_id: UUID_A,
      kind: "transcript",
      speaker: "Alice",
      content: "hello world",
    });
  });
});

// ---------- sourcing.functions ----------

describe("sourcing.upsertShortlist", () => {
  it("inserts a new shortlist when no id is provided", async () => {
    const { upsertShortlist } = await import("./sourcing.functions");
    mockState.responses["sourcing_shortlists.single"] = {
      data: { id: UUID_A },
      error: null,
    };
    const out = await withCtx(() => upsertShortlist({
      data: { name: "Staff hires Q3", roleTitle: "Staff Engineer" },
    }));
    expect(out).toEqual({ id: UUID_A });
    const insert = lastCall("sourcing_shortlists", "insert");
    expect(insert).toBeTruthy();
    expect(insert!.args[0]).toMatchObject({
      user_id: TEST_USER_ID,
      name: "Staff hires Q3",
      role_title: "Staff Engineer",
    });
  });

  it("updates an existing shortlist when id is provided", async () => {
    const { upsertShortlist } = await import("./sourcing.functions");
    mockState.responses["sourcing_shortlists"] = { data: null, error: null };
    const out = await withCtx(() => upsertShortlist({
      data: { id: UUID_A, name: "Renamed" },
    }));
    expect(out).toEqual({ id: UUID_A });
    expect(lastCall("sourcing_shortlists", "update")).toBeTruthy();
    expect(lastCall("sourcing_shortlists", "insert")).toBeUndefined();
  });
});

describe("sourcing.updateShortlistMember", () => {
  it("updates stage + notes on the member row", async () => {
    const { updateShortlistMember } = await import("./sourcing.functions");
    mockState.responses["sourcing_shortlist_members"] = { data: null, error: null };
    const out = await withCtx(() => updateShortlistMember({
      data: { memberId: UUID_A, stage: "screening", notes: "moving forward" },
    }));
    expect(out).toEqual({ ok: true });
    const upd = lastCall("sourcing_shortlist_members", "update");
    expect(upd).toBeTruthy();
    expect(upd!.args[0]).toEqual({ stage: "screening", notes: "moving forward" });
    expect(lastCall("sourcing_shortlist_members", "eq")).toMatchObject({
      args: ["id", UUID_A],
    });
  });

  it("rejects an unknown stage via Zod", async () => {
    const { updateShortlistMember } = await import("./sourcing.functions");
    await expect(
      withCtx(() => updateShortlistMember({
        data: { memberId: UUID_A, stage: "bogus" } as never,
      })),
    ).rejects.toThrow();
  });
});

// ---------- blog.functions ----------

describe("blog.setPostStatus", () => {
  it("rejects callers that are not admin", async () => {
    const { setPostStatus } = await import("./blog.functions");
    mockState.responses["user_roles.maybeSingle"] = { data: null, error: null };
    await expect(
      withCtx(() => setPostStatus({ data: { id: UUID_A, status: "published" } })),
    ).rejects.toThrow(/Forbidden/);
  });

  it("updates blog_posts with published_at when publishing", async () => {
    const { setPostStatus } = await import("./blog.functions");
    mockState.responses["user_roles.maybeSingle"] = {
      data: { role: "admin" },
      error: null,
    };
    mockState.responses["blog_posts"] = { data: null, error: null };
    const out = await withCtx(() => setPostStatus({
      data: { id: UUID_A, status: "published" },
    }));
    expect(out).toEqual({ ok: true });
    const upd = lastCall("blog_posts", "update");
    expect(upd).toBeTruthy();
    const patch = upd!.args[0] as { status: string; published_at?: string };
    expect(patch.status).toBe("published");
    expect(typeof patch.published_at).toBe("string");
  });
});