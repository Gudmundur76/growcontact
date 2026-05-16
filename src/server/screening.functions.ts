import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { dbError } from "./db-errors";
import { scoreScreeningSubmission } from "./screening-ai.server";

// ---------- Schemas ----------

const QuestionSchema = z.object({
  id: z.string().min(1).max(64),
  prompt: z.string().min(1).max(1000),
  helper: z.string().max(500).optional().nullable(),
});

const RubricItemSchema = z.object({
  name: z.string().min(1).max(120),
  weight: z.number().int().min(1).max(10).optional().nullable(),
});

const CreateScreenerSchema = z.object({
  name: z.string().min(1).max(160),
  roleTitle: z.string().max(200).optional().nullable(),
  format: z.enum(["text", "code", "video"]).default("text"),
  description: z.string().max(2000).optional().nullable(),
  questions: z.array(QuestionSchema).min(1).max(20),
  rubric: z.array(RubricItemSchema).max(10).default([]),
  shareExpiresAt: z.string().datetime().optional().nullable(),
});

const UpdateScreenerSchema = CreateScreenerSchema.partial().extend({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
});

// ---------- Recruiter: list + CRUD ----------

export const listScreeners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("screening_screeners")
      .select("id, name, role_title, format, share_token, is_active, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw dbError(error, "screening.list");

    // submission counts per screener
    const ids = (data ?? []).map((s) => s.id);
    let counts: Record<string, { total: number; scored: number; avg: number | null }> = {};
    if (ids.length) {
      const { data: subs, error: e2 } = await supabase
        .from("screening_submissions")
        .select("screener_id, ai_score, status")
        .in("screener_id", ids);
      if (e2) throw dbError(e2, "screening.list.counts");
      counts = ids.reduce<typeof counts>((acc, id) => {
        const own = (subs ?? []).filter((s) => s.screener_id === id);
        const scored = own.filter((s) => typeof s.ai_score === "number");
        const avg = scored.length
          ? Math.round(scored.reduce((sum, s) => sum + (s.ai_score ?? 0), 0) / scored.length)
          : null;
        acc[id] = { total: own.length, scored: scored.length, avg };
        return acc;
      }, {});
    }
    return { screeners: data ?? [], counts };
  });

export const getScreener = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: screener, error } = await supabase
      .from("screening_screeners")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw dbError(error, "screening.get");
    if (!screener) throw new Error("Screener not found");

    const { data: subs, error: e2 } = await supabase
      .from("screening_submissions")
      .select(
        "id, candidate_name, candidate_email, ai_score, ai_summary, ai_recommendation, ai_strengths, ai_concerns, status, submitted_at, scored_at",
      )
      .eq("screener_id", data.id)
      .order("ai_score", { ascending: false, nullsFirst: false })
      .order("submitted_at", { ascending: false });
    if (e2) throw dbError(e2, "screening.get.subs");

    return { screener, submissions: subs ?? [] };
  });

export const createScreener = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateScreenerSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("screening_screeners")
      .insert({
        user_id: userId,
        name: data.name,
        role_title: data.roleTitle ?? null,
        format: data.format,
        description: data.description ?? null,
        questions: data.questions,
        rubric: data.rubric,
        share_expires_at: data.shareExpiresAt ?? null,
      })
      .select("id, share_token")
      .single();
    if (error) throw dbError(error, "screening.create");
    return row;
  });

export const updateScreener = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateScreenerSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.roleTitle !== undefined) patch.role_title = data.roleTitle;
    if (data.format !== undefined) patch.format = data.format;
    if (data.description !== undefined) patch.description = data.description;
    if (data.questions !== undefined) patch.questions = data.questions;
    if (data.rubric !== undefined) patch.rubric = data.rubric;
    if (data.shareExpiresAt !== undefined) patch.share_expires_at = data.shareExpiresAt;
    if (data.isActive !== undefined) patch.is_active = data.isActive;

    const { error } = await supabase
      .from("screening_screeners")
      .update(patch as never)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw dbError(error, "screening.update");
    return { ok: true };
  });

export const deleteScreener = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("screening_screeners")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw dbError(error, "screening.delete");
    return { ok: true };
  });

// ---------- Public: candidate fetch + submit ----------

const PublicTokenSchema = z.object({ token: z.string().min(8).max(128) });

export const getPublicScreener = createServerFn({ method: "GET" })
  .inputValidator((i: { token: string }) => PublicTokenSchema.parse(i))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("screening_screeners")
      .select(
        "id, name, role_title, format, description, questions, share_expires_at, is_active",
      )
      .eq("share_token", data.token)
      .maybeSingle();
    if (error) throw dbError(error, "screening.public.get");
    if (!row || !row.is_active) throw new Error("This screener is no longer available.");
    if (row.share_expires_at && new Date(row.share_expires_at) < new Date()) {
      throw new Error("This screener has expired.");
    }
    return {
      id: row.id,
      name: row.name,
      role_title: row.role_title,
      format: row.format,
      description: row.description,
      questions: row.questions,
    };
  });

const PublicSubmitSchema = z.object({
  token: z.string().min(8).max(128),
  candidateName: z.string().min(1).max(160),
  candidateEmail: z.string().email().max(255).optional().nullable(),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1).max(64),
        answer: z.string().max(8000),
      }),
    )
    .min(1)
    .max(20),
});

// Rate limit by token: max 3 submissions per minute per token
const subBuckets = new Map<string, { count: number; reset: number }>();
function limitSubmit(key: string) {
  const now = Date.now();
  const b = subBuckets.get(key);
  if (!b || b.reset < now) {
    subBuckets.set(key, { count: 1, reset: now + 60_000 });
    return;
  }
  if (b.count >= 3) throw new Error("Too many submissions — please try again shortly.");
  b.count += 1;
}

export const submitScreening = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => PublicSubmitSchema.parse(i))
  .handler(async ({ data }) => {
    limitSubmit(`submit:${data.token}`);

    const { data: screener, error } = await supabaseAdmin
      .from("screening_screeners")
      .select("id, user_id, name, role_title, description, questions, rubric, share_expires_at, is_active")
      .eq("share_token", data.token)
      .maybeSingle();
    if (error) throw dbError(error, "screening.submit.find");
    if (!screener || !screener.is_active) throw new Error("This screener is no longer available.");
    if (screener.share_expires_at && new Date(screener.share_expires_at) < new Date()) {
      throw new Error("This screener has expired.");
    }

    // Insert as pending
    const { data: inserted, error: e1 } = await supabaseAdmin
      .from("screening_submissions")
      .insert({
        screener_id: screener.id,
        user_id: screener.user_id,
        candidate_name: data.candidateName,
        candidate_email: data.candidateEmail ?? null,
        answers: data.answers,
        status: "scoring",
      })
      .select("id")
      .single();
    if (e1) throw dbError(e1, "screening.submit.insert");

    // Score with AI (best-effort; mark failed if it errors)
    try {
      const questions = (screener.questions as { id: string; prompt: string }[]) ?? [];
      const rubric = (screener.rubric as { name: string; weight?: number }[]) ?? [];
      const result = await scoreScreeningSubmission({
        roleTitle: screener.role_title ?? null,
        screenerName: screener.name,
        description: screener.description ?? null,
        questions,
        rubric,
        candidateName: data.candidateName,
        answers: data.answers,
      });
      await supabaseAdmin
        .from("screening_submissions")
        .update({
          ai_score: result.score,
          ai_summary: result.summary,
          ai_recommendation: result.recommendation,
          ai_strengths: result.strengths,
          ai_concerns: result.concerns,
          status: "scored",
          scored_at: new Date().toISOString(),
        })
        .eq("id", inserted.id);
    } catch (err) {
      console.error("[screening.submit] scoring failed:", err);
      await supabaseAdmin
        .from("screening_submissions")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Scoring failed",
        })
        .eq("id", inserted.id);
    }

    return { ok: true };
  });

// ---------- Recruiter: rescore + mark reviewed ----------

export const rescoreSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub, error } = await supabase
      .from("screening_submissions")
      .select("id, screener_id, candidate_name, answers")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw dbError(error, "screening.rescore.sub");
    if (!sub) throw new Error("Submission not found");

    const { data: screener, error: e2 } = await supabase
      .from("screening_screeners")
      .select("name, role_title, description, questions, rubric")
      .eq("id", sub.screener_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (e2) throw dbError(e2, "screening.rescore.screener");
    if (!screener) throw new Error("Screener not found");

    await supabase.from("screening_submissions").update({ status: "scoring" }).eq("id", data.id);

    const questions = (screener.questions as { id: string; prompt: string }[]) ?? [];
    const rubric = (screener.rubric as { name: string; weight?: number }[]) ?? [];
    const answers = (sub.answers as { questionId: string; answer: string }[]) ?? [];
    const result = await scoreScreeningSubmission({
      roleTitle: screener.role_title ?? null,
      screenerName: screener.name,
      description: screener.description ?? null,
      questions,
      rubric,
      candidateName: sub.candidate_name,
      answers,
    });
    const { error: e3 } = await supabase
      .from("screening_submissions")
      .update({
        ai_score: result.score,
        ai_summary: result.summary,
        ai_recommendation: result.recommendation,
        ai_strengths: result.strengths,
        ai_concerns: result.concerns,
        status: "scored",
        scored_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", data.id);
    if (e3) throw dbError(e3, "screening.rescore.update");
    return { ok: true };
  });

export const markReviewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("screening_submissions")
      .update({ status: "reviewed" })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw dbError(error, "screening.markReviewed");
    return { ok: true };
  });
