import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createRecallBot, leaveRecallBot, detectPlatform } from "./recall.server";
import { generateScorecard } from "./interview-ai.server";
import { dbError } from "./db-errors";

// ---------- In-memory rate limiter ----------
// Best-effort per-instance throttle. Acceptable for abuse prevention; resets on cold start.
const rateBuckets = new Map<string, { count: number; reset: number }>();
function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || b.reset < now) {
    rateBuckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  if (b.count >= limit) {
    const wait = Math.ceil((b.reset - now) / 1000);
    throw new Error(`Rate limit exceeded — try again in ${wait}s`);
  }
  b.count += 1;
}

export const StartSchema = z.object({
  candidateName: z.string().min(1).max(200),
  roleTitle: z.string().min(1).max(200),
  jobDescription: z.string().max(20000).optional().nullable(),
  meetingUrl: z.string().url().max(2000),
  rubricId: z.string().uuid().optional().nullable(),
});

export const startInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StartSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const platform = detectPlatform(data.meetingUrl);

    // Verify rubric ownership before storing the FK to prevent cross-tenant leak
    let safeRubricId: string | null = null;
    if (data.rubricId) {
      const { data: ownedRubric } = await supabase
        .from("interview_rubrics")
        .select("id")
        .eq("id", data.rubricId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!ownedRubric) throw new Error("Rubric not found");
      safeRubricId = ownedRubric.id;
    }

    // Insert pending session first (so we have an id even if Recall fails)
    const { data: session, error: insertErr } = await supabase
      .from("interview_sessions")
      .insert({
        user_id: userId,
        candidate_name: data.candidateName,
        role_title: data.roleTitle,
        job_description: data.jobDescription ?? null,
        meeting_url: data.meetingUrl,
        meeting_platform: platform,
        status: "pending",
        rubric_id: safeRubricId,
      })
      .select("id")
      .single();
    if (insertErr || !session) throw new Error(insertErr?.message ?? "Failed to create session");

    if (!process.env.RECALL_API_KEY) {
      // Allow flow to work without Recall key — useful before key is added.
      await supabaseAdmin.from("interview_events").insert({
        session_id: session.id,
        kind: "status",
        content:
          "Recall.ai API key not configured yet — bot was not dispatched. Add RECALL_API_KEY to enable live capture.",
      });
      return { sessionId: session.id, botDispatched: false as const };
    }

    const baseUrl = process.env.PUBLIC_BASE_URL ?? "https://growcontact.lovable.app";
    const webhookUrl = `${baseUrl}/api/public/recall-webhook?session_id=${session.id}`;

    try {
      const bot = await createRecallBot({
        meetingUrl: data.meetingUrl,
        webhookUrl,
        botName: "Interview Copilot",
      });
      await supabaseAdmin
        .from("interview_sessions")
        .update({ recall_bot_id: bot.id, status: "joining", started_at: new Date().toISOString() })
        .eq("id", session.id);
      await supabaseAdmin.from("interview_events").insert({
        session_id: session.id,
        kind: "status",
        content: `Bot dispatched to ${platform.replace("_", " ")} meeting.`,
      });
      return { sessionId: session.id, botDispatched: true as const };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      await supabaseAdmin
        .from("interview_sessions")
        .update({ status: "failed" })
        .eq("id", session.id);
      await supabaseAdmin.from("interview_events").insert({
        session_id: session.id,
        kind: "status",
        content: `Failed to dispatch bot: ${msg}`,
      });
      return { sessionId: session.id, botDispatched: false as const, error: msg };
    }
  });

export const EndSchema = z.object({ sessionId: z.string().uuid() });

export const endInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EndSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("id, user_id, recall_bot_id, status")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");

    if (session.recall_bot_id && process.env.RECALL_API_KEY) {
      try {
        await leaveRecallBot(session.recall_bot_id);
      } catch (e) {
        console.error("leaveRecallBot failed", e);
      }
    }
    await supabaseAdmin
      .from("interview_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", session.id);
    return { ok: true };
  });

export const finalizeScorecard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EndSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("id, user_id, candidate_name, role_title, job_description, rubric_id")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");

    const rubric = await loadRubric(session.rubric_id, userId);

    const { data: events } = await supabaseAdmin
      .from("interview_events")
      .select("speaker, content, kind, created_at")
      .eq("session_id", session.id)
      .eq("kind", "transcript")
      .order("created_at", { ascending: true });

    const transcript =
      (events ?? []).map((e) => `${e.speaker ?? "Speaker"}: ${e.content}`).join("\n") ||
      "(no transcript captured)";

    const card = await generateScorecard({
      roleTitle: session.role_title,
      jobDescription: session.job_description,
      candidateName: session.candidate_name,
      transcript,
      rubric,
    });

    await supabaseAdmin.from("interview_scorecards").upsert(
      {
        session_id: session.id,
        summary: card.summary,
        overall_rating: card.overall_rating,
        recommendation: card.recommendation,
        strengths: card.strengths,
        concerns: card.concerns,
        competencies: card.competencies,
        follow_ups: card.follow_ups,
      },
      { onConflict: "session_id" },
    );

    return { ok: true, scorecard: card };
  });

export const generateLiveSuggestionsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EndSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("id, user_id, candidate_name, role_title, job_description, rubric_id")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");

    const rubric = await loadRubric(session.rubric_id, userId);

    const { data: events } = await supabaseAdmin
      .from("interview_events")
      .select("speaker, content")
      .eq("session_id", session.id)
      .eq("kind", "transcript")
      .order("created_at", { ascending: true })
      .limit(200);
    const transcript =
      (events ?? []).map((e) => `${e.speaker ?? "Speaker"}: ${e.content}`).join("\n") ||
      "(no transcript yet — interviewer just started)";

    const { generateLiveSuggestions } = await import("./interview-ai.server");
    const result = await generateLiveSuggestions({
      roleTitle: session.role_title,
      jobDescription: session.job_description,
      candidateName: session.candidate_name,
      transcriptSoFar: transcript,
      rubric,
    });

    const rows = [
      ...result.follow_ups.map((c) => ({
        session_id: session.id,
        kind: "suggestion" as const,
        content: c,
      })),
      ...result.red_flags.map((c) => ({
        session_id: session.id,
        kind: "red_flag" as const,
        content: c,
      })),
      ...result.signals.map((c) => ({
        session_id: session.id,
        kind: "suggestion" as const,
        content: `Signal: ${c}`,
      })),
    ];
    if (rows.length) await supabaseAdmin.from("interview_events").insert(rows);
    return { ok: true, ...result };
  });

// ---------- Rubric helpers ----------

async function loadRubric(
  rubricId: string | null | undefined,
  userId: string,
): Promise<{ name: string; focus: string | null; competencies: string[] } | null> {
  if (!rubricId) return null;
  const { data } = await supabaseAdmin
    .from("interview_rubrics")
    .select("name, focus, competencies")
    .eq("id", rubricId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const comps = Array.isArray(data.competencies)
    ? (data.competencies as unknown[]).map((c) => String(c)).filter(Boolean)
    : [];
  return { name: data.name, focus: data.focus, competencies: comps };
}

// ---------- Rubric CRUD ----------

export const RubricUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  roleTitle: z.string().max(200).optional().nullable(),
  focus: z.string().max(2000).optional().nullable(),
  competencies: z.array(z.string().min(1).max(120)).max(20),
  isDefault: z.boolean().optional(),
});

export const upsertRubric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RubricUpsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.isDefault) {
      await supabase.from("interview_rubrics").update({ is_default: false }).eq("user_id", userId);
    }
    const row = {
      user_id: userId,
      name: data.name,
      role_title: data.roleTitle ?? null,
      focus: data.focus ?? null,
      competencies: data.competencies,
      is_default: !!data.isDefault,
    };
    if (data.id) {
      const { data: updated, error } = await supabase
        .from("interview_rubrics")
        .update(row)
        .eq("id", data.id)
        .select("id")
        .single();
      if (error) throw dbError(error, "interviews.functions");
      return { id: updated.id };
    }
    const { data: inserted, error } = await supabase
      .from("interview_rubrics")
      .insert(row)
      .select("id")
      .single();
    if (error) throw dbError(error, "interviews.functions");
    return { id: inserted.id };
  });

export const IdSchema = z.object({ id: z.string().uuid() });

export const deleteRubric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("interview_rubrics").delete().eq("id", data.id);
    if (error) throw dbError(error, "interviews.functions");
    return { ok: true };
  });

// ---------- Sharing ----------

function randomToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const ShareSchema = z.object({
  sessionId: z.string().uuid(),
  enabled: z.boolean(),
});

export const setSessionShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ShareSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("id, user_id, share_token")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");

    const newToken = data.enabled ? (session.share_token ?? randomToken()) : null;
    const { error } = await supabaseAdmin
      .from("interview_sessions")
      .update({ share_token: newToken })
      .eq("id", session.id);
    if (error) throw dbError(error, "interviews.functions");
    return { token: newToken };
  });

// ---------- Manual transcript entry (no-bot fallback) ----------

export const ManualTranscriptSchema = z.object({
  sessionId: z.string().uuid(),
  speaker: z.string().min(1).max(120),
  content: z.string().min(1).max(8000),
});

export const addManualTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ManualTranscriptSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    rateLimit(`manual:${userId}`, 60, 60_000);
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("id, user_id, status")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");

    if (session.status === "pending" || session.status === "failed") {
      await supabaseAdmin
        .from("interview_sessions")
        .update({ status: "in_call", started_at: new Date().toISOString() })
        .eq("id", session.id);
    }
    const { error } = await supabaseAdmin.from("interview_events").insert({
      session_id: session.id,
      kind: "transcript",
      speaker: data.speaker,
      content: data.content,
    });
    if (error) throw dbError(error, "interviews.functions");
    return { ok: true };
  });

export const BulkSchema = z.object({
  sessionId: z.string().uuid(),
  text: z.string().min(1).max(200000),
});

export const addBulkTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BulkSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    rateLimit(`bulk:${userId}`, 5, 60_000);
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("id, user_id, status")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");

    // Parse "Speaker: content" per line. Lines without a speaker prefix are
    // appended to the previous speaker's content.
    const lines = data.text.split(/\r?\n/);
    const rows: { session_id: string; kind: "transcript"; speaker: string; content: string }[] = [];
    let current: { speaker: string; parts: string[] } | null = null;
    const flush = () => {
      if (current && current.parts.join(" ").trim()) {
        rows.push({
          session_id: session.id,
          kind: "transcript",
          speaker: current.speaker,
          content: current.parts.join(" ").trim().slice(0, 8000),
        });
      }
    };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        flush();
        current = null;
        continue;
      }
      const m = line.match(/^([\w .'-]{1,80}):\s*(.*)$/);
      if (m) {
        flush();
        current = { speaker: m[1].trim(), parts: m[2] ? [m[2]] : [] };
      } else if (current) {
        current.parts.push(line);
      } else {
        current = { speaker: "Speaker", parts: [line] };
      }
    }
    flush();
    if (rows.length === 0) throw new Error("No transcript lines detected");
    if (rows.length > 500) throw new Error("Too many lines (max 500)");

    if (session.status === "pending" || session.status === "failed") {
      await supabaseAdmin
        .from("interview_sessions")
        .update({ status: "in_call", started_at: new Date().toISOString() })
        .eq("id", session.id);
    }
    const { error } = await supabaseAdmin.from("interview_events").insert(rows);
    if (error) throw dbError(error, "interviews.functions");
    return { ok: true, count: rows.length };
  });

export const deleteSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("id, user_id, deleted_at")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");
    // Soft-delete: keep transcripts recoverable for 30 days, then a future job can purge.
    const { error } = await supabase
      .from("interview_sessions")
      .update({ deleted_at: new Date().toISOString(), share_token: null })
      .eq("id", session.id);
    if (error) throw dbError(error, "interviews.functions");
    return { ok: true };
  });

export const restoreSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("id, user_id")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");
    const { error } = await supabase
      .from("interview_sessions")
      .update({ deleted_at: null })
      .eq("id", session.id);
    if (error) throw dbError(error, "interviews.functions");
    return { ok: true };
  });

export const setSessionArchived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sessionId: z.string().uuid(), archived: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("id, user_id")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");
    const { error } = await supabase
      .from("interview_sessions")
      .update({ archived: data.archived })
      .eq("id", session.id);
    if (error) throw dbError(error, "interviews.functions");
    return { ok: true };
  });

export const ListSchema = z.object({
  page: z.number().int().min(0).max(10000).default(0),
  pageSize: z.number().int().min(1).max(100).default(20),
  scope: z.enum(["active", "archived", "trash"]).default("active"),
  q: z.string().max(200).optional(),
});

export const listSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = supabase
      .from("interview_sessions")
      .select(
        "id, candidate_name, role_title, meeting_platform, status, created_at, archived, deleted_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.scope === "active") q = q.is("deleted_at", null).eq("archived", false);
    else if (data.scope === "archived") q = q.is("deleted_at", null).eq("archived", true);
    else q = q.not("deleted_at", "is", null);
    if (data.q && data.q.trim()) {
      const term = data.q.trim().replace(/[%_]/g, "");
      q = q.or(`candidate_name.ilike.%${term}%,role_title.ilike.%${term}%`);
    }
    const { data: rows, count, error } = await q;
    if (error) throw dbError(error, "interviews.functions");
    return { rows: rows ?? [], total: count ?? 0 };
  });

// ---------- Scorecard editing ----------

export const ScorecardEditSchema = z.object({
  sessionId: z.string().uuid(),
  summary: z.string().min(1).max(8000),
  overall_rating: z.number().int().min(1).max(5).nullable(),
  recommendation: z
    .enum(["strong_hire", "hire", "no_hire", "strong_no_hire", "more_info"])
    .nullable(),
  strengths: z.array(z.string().min(1).max(500)).max(20),
  concerns: z.array(z.string().min(1).max(500)).max(20),
  competencies: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        rating: z.number().int().min(1).max(5),
        notes: z.string().max(1000).default(""),
        evidence: z.array(z.string().max(400)).max(5).default([]),
      }),
    )
    .max(20),
  follow_ups: z.array(z.string().min(1).max(500)).max(20),
});

export const updateScorecard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScorecardEditSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("id, user_id")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");
    const { error } = await supabase
      .from("interview_scorecards")
      .update({
        summary: data.summary,
        overall_rating: data.overall_rating,
        recommendation: data.recommendation,
        strengths: data.strengths,
        concerns: data.concerns,
        competencies: data.competencies,
        follow_ups: data.follow_ups,
      })
      .eq("session_id", session.id);
    if (error) throw dbError(error, "interviews.functions");
    return { ok: true };
  });

// ---------- Share token expiry ----------

export const ShareExpirySchema = z.object({
  sessionId: z.string().uuid(),
  enabled: z.boolean(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const setSessionShareV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ShareExpirySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("id, user_id, share_token")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");
    if (!data.enabled) {
      const { error } = await supabaseAdmin
        .from("interview_sessions")
        .update({ share_token: null, share_expires_at: null })
        .eq("id", session.id);
      if (error) throw dbError(error, "interviews.functions");
      return { token: null, expiresAt: null };
    }
    const token = session.share_token ?? randomToken();
    const days = data.expiresInDays ?? 14;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin
      .from("interview_sessions")
      .update({ share_token: token, share_expires_at: expiresAt })
      .eq("id", session.id);
    if (error) throw dbError(error, "interviews.functions");
    return { token, expiresAt };
  });

// ---------- Rubric templates ----------

const TEMPLATES: Record<string, { name: string; focus: string; competencies: string[] }> = {
  engineering: {
    name: "Software Engineer",
    focus:
      "System design depth, debugging instincts, ability to defend tradeoffs, ownership of production systems.",
    competencies: [
      "Technical depth",
      "System design",
      "Problem solving",
      "Code quality",
      "Communication",
      "Ownership",
      "Collaboration",
    ],
  },
  sales: {
    name: "Account Executive",
    focus:
      "Discovery quality, multi-threading, handling objections, closing rigor, pipeline hygiene.",
    competencies: [
      "Discovery",
      "Objection handling",
      "Closing",
      "Forecasting",
      "Communication",
      "Coachability",
    ],
  },
  product: {
    name: "Product Manager",
    focus:
      "Customer insight, prioritization framework, cross-functional leadership, metric ownership.",
    competencies: [
      "Customer insight",
      "Prioritization",
      "Strategy",
      "Execution",
      "Stakeholder management",
      "Communication",
    ],
  },
  design: {
    name: "Product Designer",
    focus:
      "Craft quality, design rationale, systems thinking, partnership with engineering and PM.",
    competencies: [
      "Craft",
      "Design rationale",
      "Systems thinking",
      "Research",
      "Collaboration",
      "Communication",
    ],
  },
};

export const SeedSchema = z.object({
  templates: z.array(z.enum(["engineering", "sales", "product", "design"])).min(1),
});

export const seedRubricTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SeedSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("interview_rubrics").select("id").limit(1);
    const hasAny = (existing ?? []).length > 0;
    const rows = data.templates.map((key, i) => {
      const t = TEMPLATES[key];
      return {
        user_id: userId,
        name: t.name,
        role_title: t.name,
        focus: t.focus,
        competencies: t.competencies,
        is_default: !hasAny && i === 0,
      };
    });
    const { error, data: inserted } = await supabase
      .from("interview_rubrics")
      .insert(rows)
      .select("id");
    if (error) throw dbError(error, "interviews.functions");
    return { count: inserted?.length ?? 0 };
  });
