import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createRecallBot, leaveRecallBot, detectPlatform } from "./recall.server";
import { generateScorecard } from "./interview-ai.server";

const StartSchema = z.object({
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
        rubric_id: data.rubricId ?? null,
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

    const baseUrl =
      process.env.PUBLIC_BASE_URL ??
      "https://growcontact.lovable.app";
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

const EndSchema = z.object({ sessionId: z.string().uuid() });

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

    const rubric = await loadRubric(session.rubric_id);

    const { data: events } = await supabaseAdmin
      .from("interview_events")
      .select("speaker, content, kind, created_at")
      .eq("session_id", session.id)
      .eq("kind", "transcript")
      .order("created_at", { ascending: true });

    const transcript =
      (events ?? [])
        .map((e) => `${e.speaker ?? "Speaker"}: ${e.content}`)
        .join("\n") || "(no transcript captured)";

    const card = await generateScorecard({
      roleTitle: session.role_title,
      jobDescription: session.job_description,
      candidateName: session.candidate_name,
      transcript,
      rubric,
    });

    await supabaseAdmin
      .from("interview_scorecards")
      .upsert(
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
        { onConflict: "session_id" }
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

    const rubric = await loadRubric(session.rubric_id);

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
      ...result.follow_ups.map((c) => ({ session_id: session.id, kind: "suggestion" as const, content: c })),
      ...result.red_flags.map((c) => ({ session_id: session.id, kind: "red_flag" as const, content: c })),
      ...result.signals.map((c) => ({ session_id: session.id, kind: "suggestion" as const, content: `Signal: ${c}` })),
    ];
    if (rows.length) await supabaseAdmin.from("interview_events").insert(rows);
    return { ok: true, ...result };
  });

// ---------- Rubric helpers ----------

async function loadRubric(
  rubricId: string | null | undefined,
): Promise<{ name: string; focus: string | null; competencies: string[] } | null> {
  if (!rubricId) return null;
  const { data } = await supabaseAdmin
    .from("interview_rubrics")
    .select("name, focus, competencies")
    .eq("id", rubricId)
    .maybeSingle();
  if (!data) return null;
  const comps = Array.isArray(data.competencies)
    ? (data.competencies as unknown[]).map((c) => String(c)).filter(Boolean)
    : [];
  return { name: data.name, focus: data.focus, competencies: comps };
}

// ---------- Rubric CRUD ----------

const RubricUpsertSchema = z.object({
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
      await supabase
        .from("interview_rubrics")
        .update({ is_default: false })
        .eq("user_id", userId);
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
      if (error) throw new Error(error.message);
      return { id: updated.id };
    }
    const { data: inserted, error } = await supabase
      .from("interview_rubrics")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

const IdSchema = z.object({ id: z.string().uuid() });

export const deleteRubric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("interview_rubrics").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Sharing ----------

function randomToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

const ShareSchema = z.object({
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

    const newToken = data.enabled ? session.share_token ?? randomToken() : null;
    const { error } = await supabaseAdmin
      .from("interview_sessions")
      .update({ share_token: newToken })
      .eq("id", session.id);
    if (error) throw new Error(error.message);
    return { token: newToken };
  });

// ---------- Manual transcript entry (no-bot fallback) ----------

const ManualTranscriptSchema = z.object({
  sessionId: z.string().uuid(),
  speaker: z.string().min(1).max(120),
  content: z.string().min(1).max(8000),
});

export const addManualTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ManualTranscriptSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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
    if (error) throw new Error(error.message);
    return { ok: true };
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

const SeedSchema = z.object({
  templates: z.array(z.enum(["engineering", "sales", "product", "design"])).min(1),
});

export const seedRubricTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SeedSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("interview_rubrics")
      .select("id")
      .limit(1);
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
    if (error) throw new Error(error.message);
    return { count: inserted?.length ?? 0 };
  });