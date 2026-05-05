import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  searchGithubCandidates,
  rankCandidates,
  personalizeOutreach,
} from "./sourcing.server";

// ---------- Rate limiter ----------
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

// ---------- Search ----------

const RunSearchSchema = z.object({
  query: z.string().min(2).max(500),
  roleTitle: z.string().max(200).optional().nullable(),
  filters: z
    .object({
      location: z.string().max(120).optional().nullable(),
      language: z.string().max(60).optional().nullable(),
      minFollowers: z.number().int().min(0).max(100000).optional().nullable(),
      minRepos: z.number().int().min(0).max(10000).optional().nullable(),
    })
    .optional(),
  limit: z.number().int().min(1).max(25).optional(),
  saveAs: z.string().max(120).optional().nullable(),
  searchId: z.string().uuid().optional().nullable(),
});

export const runSourcingSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RunSearchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    rateLimit(`sourcing:search:${userId}`, 20, 60_000);

    const raw = await searchGithubCandidates({
      query: data.query,
      filters: data.filters ?? undefined,
      limit: data.limit ?? 12,
    });
    const ranked = await rankCandidates({
      brief: data.query,
      roleTitle: data.roleTitle ?? null,
      candidates: raw,
      topN: Math.min(raw.length, 12),
    });

    // Persist search if requested
    let searchId: string | null = data.searchId ?? null;
    if (data.saveAs && !searchId) {
      const { data: ins, error } = await supabaseAdmin
        .from("sourcing_searches")
        .insert({
          user_id: userId,
          name: data.saveAs,
          query: data.query,
          role_title: data.roleTitle ?? null,
          filters: data.filters ?? {},
          last_run_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      searchId = ins.id;
    } else if (searchId) {
      await supabaseAdmin
        .from("sourcing_searches")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", searchId);
    }

    // Upsert candidates
    const rows = ranked.map((c) => ({
      user_id: userId,
      source: c.source,
      external_id: c.external_id,
      name: c.name,
      headline: c.headline,
      location: c.location,
      profile_url: c.profile_url,
      avatar_url: c.avatar_url,
      email: c.email,
      signals: c.signals,
      ai_summary: c.ai_summary,
      fit_score: c.fit_score,
      last_search_id: searchId,
    }));
    if (rows.length) {
      const { error } = await supabaseAdmin
        .from("sourcing_candidates")
        .upsert(rows, { onConflict: "user_id,source,external_id" });
      if (error) throw new Error(error.message);
    }

    // Re-fetch with ids
    const { data: stored } = await supabaseAdmin
      .from("sourcing_candidates")
      .select("*")
      .eq("user_id", userId)
      .in(
        "external_id",
        ranked.map((r) => r.external_id),
      )
      .order("fit_score", { ascending: false });

    return { searchId, candidates: stored ?? [] };
  });

// ---------- Searches CRUD ----------

export const listSourcingSearches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("sourcing_searches")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const ToggleAlertSchema = z.object({
  searchId: z.string().uuid(),
  enabled: z.boolean(),
  frequency: z.enum(["daily", "weekly"]).optional(),
});
export const toggleSearchAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ToggleAlertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("sourcing_searches")
      .update({
        alert_enabled: data.enabled,
        ...(data.frequency ? { alert_frequency: data.frequency } : {}),
      })
      .eq("id", data.searchId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSourcingSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ searchId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("sourcing_searches").delete().eq("id", data.searchId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Shortlists ----------

const ShortlistUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  roleTitle: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});
export const upsertShortlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ShortlistUpsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = {
      user_id: userId,
      name: data.name,
      role_title: data.roleTitle ?? null,
      description: data.description ?? null,
    };
    if (data.id) {
      const { error } = await supabase.from("sourcing_shortlists").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await supabase
      .from("sourcing_shortlists")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const listShortlists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("sourcing_shortlists")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteShortlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ shortlistId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("sourcing_shortlists").delete().eq("id", data.shortlistId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AddMemberSchema = z.object({
  shortlistId: z.string().uuid(),
  candidateId: z.string().uuid(),
  stage: z.enum(["new", "contacted", "replied", "screening", "passed", "rejected"]).optional(),
});
export const addToShortlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AddMemberSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("sourcing_shortlist_members").upsert(
      {
        user_id: userId,
        shortlist_id: data.shortlistId,
        candidate_id: data.candidateId,
        stage: data.stage ?? "new",
      },
      { onConflict: "shortlist_id,candidate_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UpdateStageSchema = z.object({
  memberId: z.string().uuid(),
  stage: z.enum(["new", "contacted", "replied", "screening", "passed", "rejected"]),
  notes: z.string().max(2000).optional().nullable(),
});
export const updateShortlistMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateStageSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("sourcing_shortlist_members")
      .update({ stage: data.stage, notes: data.notes ?? null })
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFromShortlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ memberId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("sourcing_shortlist_members")
      .delete()
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getShortlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ shortlistId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: list } = await supabase
      .from("sourcing_shortlists")
      .select("*")
      .eq("id", data.shortlistId)
      .maybeSingle();
    if (!list) throw new Error("Not found");
    const { data: members } = await supabase
      .from("sourcing_shortlist_members")
      .select("*, candidate:sourcing_candidates(*)")
      .eq("shortlist_id", data.shortlistId)
      .order("added_at", { ascending: false });
    return { list, members: members ?? [] };
  });

// ---------- Sequences ----------

const SequenceUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(8000),
  senderName: z.string().max(120).optional().nullable(),
});
export const upsertSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SequenceUpsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = {
      user_id: userId,
      name: data.name,
      subject: data.subject,
      body: data.body,
      sender_name: data.senderName ?? null,
    };
    if (data.id) {
      const { error } = await supabase.from("sourcing_sequences").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await supabase
      .from("sourcing_sequences")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const listSequences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("sourcing_sequences")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sequenceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("sourcing_sequences").delete().eq("id", data.sequenceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Outreach ----------

const SendOutreachSchema = z.object({
  candidateId: z.string().uuid(),
  sequenceId: z.string().uuid(),
  recipientEmail: z.string().email().max(254),
  roleTitle: z.string().max(200),
});
export const sendOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SendOutreachSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    rateLimit(`sourcing:outreach:${userId}`, 30, 60_000);

    const [{ data: cand }, { data: seq }] = await Promise.all([
      supabase.from("sourcing_candidates").select("*").eq("id", data.candidateId).maybeSingle(),
      supabase.from("sourcing_sequences").select("*").eq("id", data.sequenceId).maybeSingle(),
    ]);
    if (!cand || !seq) throw new Error("Candidate or sequence not found");

    const personalized = await personalizeOutreach({
      template: { subject: seq.subject, body: seq.body },
      candidate: {
        name: cand.name,
        headline: cand.headline,
        signals: (cand.signals as Record<string, unknown>) ?? {},
        ai_summary: cand.ai_summary,
      },
      roleTitle: data.roleTitle,
      senderName: seq.sender_name,
    });

    // Send via internal transactional pipeline
    const baseUrl = process.env.PUBLIC_BASE_URL ?? "https://growcontact.lovable.app";
    const sendRes = await fetch(`${baseUrl}/lovable/email/transactional/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Auth": process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      },
      body: JSON.stringify({
        templateName: "outreach",
        recipientEmail: data.recipientEmail,
        idempotencyKey: `outreach-${data.candidateId}-${data.sequenceId}-${Date.now()}`,
        templateData: {
          subject: personalized.subject,
          body: personalized.body,
          senderName: seq.sender_name ?? "",
          candidateName: cand.name,
        },
      }),
    });

    const status = sendRes.ok ? "sent" : "failed";
    const errorMessage = sendRes.ok ? null : `Email send failed [${sendRes.status}]`;

    const { error: logErr } = await supabaseAdmin.from("sourcing_sends").insert({
      user_id: userId,
      candidate_id: data.candidateId,
      sequence_id: data.sequenceId,
      recipient_email: data.recipientEmail,
      subject: personalized.subject,
      body: personalized.body,
      status,
      error_message: errorMessage,
    });
    if (logErr) throw new Error(logErr.message);
    if (!sendRes.ok) throw new Error(errorMessage ?? "Send failed");
    return { ok: true, subject: personalized.subject };
  });