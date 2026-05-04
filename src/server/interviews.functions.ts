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
      .select("id, user_id, candidate_name, role_title, job_description")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");

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
      .select("id, user_id, candidate_name, role_title, job_description")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session || session.user_id !== userId) throw new Error("Not found");

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
    });

    const rows = [
      ...result.follow_ups.map((c) => ({ session_id: session.id, kind: "suggestion" as const, content: c })),
      ...result.red_flags.map((c) => ({ session_id: session.id, kind: "red_flag" as const, content: c })),
      ...result.signals.map((c) => ({ session_id: session.id, kind: "suggestion" as const, content: `Signal: ${c}` })),
    ];
    if (rows.length) await supabaseAdmin.from("interview_events").insert(rows);
    return { ok: true, ...result };
  });