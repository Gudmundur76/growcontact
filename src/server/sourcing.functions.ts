import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import {
  searchGithubCandidates,
  searchPdlCandidates,
  enrichPdlPerson,
  findPdlEmail,
  fetchPdlCompany,
  rankCandidates,
  personalizeOutreach,
} from "./sourcing.server";
import * as React from "react";
import { render } from "@react-email/components";
import { TEMPLATES } from "@/lib/email-templates/registry";
import { dbError } from "./db-errors";

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

export const RunSearchSchema = z.object({
  query: z.string().min(2).max(500),
  roleTitle: z.string().max(200).optional().nullable(),
  source: z.enum(["github", "pdl"]).optional(),
  filters: z
    .object({
      location: z.string().max(120).optional().nullable(),
      language: z.string().max(60).optional().nullable(),
      minFollowers: z.number().int().min(0).max(100000).optional().nullable(),
      minRepos: z.number().int().min(0).max(10000).optional().nullable(),
      jobTitle: z.string().max(200).optional().nullable(),
      company: z.string().max(200).optional().nullable(),
      seniority: z
        .enum(["entry", "senior", "manager", "director", "vp", "cxo"])
        .optional()
        .nullable(),
      skills: z.array(z.string().min(1).max(60)).max(15).optional().nullable(),
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

    const source = data.source ?? "github";
    const raw =
      source === "pdl"
        ? await searchPdlCandidates({
            query: data.query,
            filters: {
              location: data.filters?.location ?? null,
              jobTitle: data.filters?.jobTitle ?? null,
              company: data.filters?.company ?? null,
              seniority: data.filters?.seniority ?? null,
              skills: data.filters?.skills ?? null,
            },
            limit: data.limit ?? 12,
          })
        : await searchGithubCandidates({
            query: data.query,
            filters: {
              location: data.filters?.location ?? null,
              language: data.filters?.language ?? null,
              minFollowers: data.filters?.minFollowers ?? null,
              minRepos: data.filters?.minRepos ?? null,
            },
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
          filters: (data.filters ?? {}) as Json,
          last_run_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw dbError(error, "sourcing.functions");
      searchId = ins.id;
    } else if (searchId) {
      // Verify ownership before mutating via admin client (prevents IDOR)
      const { data: owned } = await supabaseAdmin
        .from("sourcing_searches")
        .select("id")
        .eq("id", searchId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!owned) {
        throw new Error("Search not found");
      }
      await supabaseAdmin
        .from("sourcing_searches")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", searchId)
        .eq("user_id", userId);
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
      signals: c.signals as Json,
      ai_summary: c.ai_summary,
      fit_score: c.fit_score,
      last_search_id: searchId,
    }));
    if (rows.length) {
      const { error } = await supabaseAdmin
        .from("sourcing_candidates")
        .upsert(rows, { onConflict: "user_id,source,external_id" });
      if (error) throw dbError(error, "sourcing.functions");
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

// ---------- PDL: enrichment + email finder + company signals ----------

export const EnrichSchema = z.object({ candidateId: z.string().uuid() });

export const enrichCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EnrichSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    rateLimit(`sourcing:enrich:${userId}`, 60, 60_000);

    const { data: c, error } = await supabaseAdmin
      .from("sourcing_candidates")
      .select("*")
      .eq("id", data.candidateId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw dbError(error, "sourcing.functions");
    if (!c) throw new Error("Candidate not found");

    const sig = (c.signals as Record<string, unknown>) ?? {};
    const linkedinUrl =
      (sig.linkedin_url as string | undefined) ?? (c.source === "pdl" ? c.profile_url : null);
    const githubUrl =
      c.source === "github" ? c.profile_url : ((sig.github_url as string | undefined) ?? null);

    const person = await enrichPdlPerson({
      email: c.email,
      linkedinUrl: linkedinUrl ?? null,
      githubUrl: githubUrl ?? null,
      name: c.name,
      company: (sig.company as string | undefined) ?? null,
    });
    if (!person) return { ok: false as const, reason: "no_match" };

    const newSignals = {
      ...sig,
      job_title: person.job_title ?? sig.job_title,
      job_title_levels: person.job_title_levels ?? sig.job_title_levels,
      company: person.job_company_name ?? sig.company,
      company_size: person.job_company_size ?? sig.company_size,
      company_industry: person.job_company_industry ?? sig.company_industry,
      company_employees: person.job_company_employee_count ?? sig.company_employees,
      skills: person.skills?.slice(0, 20) ?? sig.skills,
      linkedin_url: person.linkedin_url ?? linkedinUrl,
      github_url: person.github_url ?? githubUrl,
      enriched_at: new Date().toISOString(),
    };
    const newEmail =
      c.email ||
      person.work_email ||
      person.personal_emails?.[0] ||
      person.emails?.find((e) => e.type === "professional")?.address ||
      person.emails?.[0]?.address ||
      null;

    const { error: updErr } = await supabaseAdmin
      .from("sourcing_candidates")
      .update({
        email: newEmail,
        headline:
          c.headline ||
          [person.job_title, person.job_company_name].filter(Boolean).join(" at ") ||
          null,
        location: c.location || person.location_name || null,
        signals: newSignals as Json,
      })
      .eq("id", c.id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true as const, email: newEmail, signals: newSignals as Record<string, Json> };
  });

export const FindEmailSchema = z.object({ candidateId: z.string().uuid() });

export const findCandidateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FindEmailSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    rateLimit(`sourcing:email:${userId}`, 60, 60_000);

    const { data: c } = await supabaseAdmin
      .from("sourcing_candidates")
      .select("*")
      .eq("id", data.candidateId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!c) throw new Error("Candidate not found");
    if (c.email) return { email: c.email, cached: true };

    const sig = (c.signals as Record<string, unknown>) ?? {};
    const email = await findPdlEmail({
      linkedinUrl:
        (sig.linkedin_url as string | undefined) ?? (c.source === "pdl" ? c.profile_url : null),
      name: c.name,
      company: (sig.company as string | undefined) ?? null,
    });
    if (!email) return { email: null, cached: false };

    await supabaseAdmin.from("sourcing_candidates").update({ email }).eq("id", c.id);
    return { email, cached: false };
  });

export const CompanySchema = z.object({ candidateId: z.string().uuid() });

export const fetchCandidateCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CompanySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    rateLimit(`sourcing:company:${userId}`, 60, 60_000);

    const { data: c } = await supabaseAdmin
      .from("sourcing_candidates")
      .select("*")
      .eq("id", data.candidateId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!c) throw new Error("Candidate not found");
    const sig = (c.signals as Record<string, unknown>) ?? {};
    const companyName = (sig.company as string | undefined) ?? null;
    if (!companyName) return { company: null };

    const company = (await fetchPdlCompany(companyName)) as Record<string, Json> | null;
    if (!company) return { company: null };

    const newSignals = { ...sig, company_profile: company };
    await supabaseAdmin
      .from("sourcing_candidates")
      .update({ signals: newSignals as Json })
      .eq("id", c.id);
    return { company };
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
    if (error) throw dbError(error, "sourcing.functions");
    return data ?? [];
  });

export const ToggleAlertSchema = z.object({
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
    if (error) throw dbError(error, "sourcing.functions");
    return { ok: true };
  });

export const deleteSourcingSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ searchId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("sourcing_searches").delete().eq("id", data.searchId);
    if (error) throw dbError(error, "sourcing.functions");
    return { ok: true };
  });

// ---------- Shortlists ----------

export const ShortlistUpsertSchema = z.object({
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
      if (error) throw dbError(error, "sourcing.functions");
      return { id: data.id };
    }
    const { data: ins, error } = await supabase
      .from("sourcing_shortlists")
      .insert(row)
      .select("id")
      .single();
    if (error) throw dbError(error, "sourcing.functions");
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
    if (error) throw dbError(error, "sourcing.functions");
    return data ?? [];
  });

export const deleteShortlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ shortlistId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("sourcing_shortlists")
      .delete()
      .eq("id", data.shortlistId);
    if (error) throw dbError(error, "sourcing.functions");
    return { ok: true };
  });

export const AddMemberSchema = z.object({
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
    if (error) throw dbError(error, "sourcing.functions");
    return { ok: true };
  });

export const UpdateStageSchema = z.object({
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
    if (error) throw dbError(error, "sourcing.functions");
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
    if (error) throw dbError(error, "sourcing.functions");
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

export const SequenceUpsertSchema = z.object({
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
      if (error) throw dbError(error, "sourcing.functions");
      return { id: data.id };
    }
    const { data: ins, error } = await supabase
      .from("sourcing_sequences")
      .insert(row)
      .select("id")
      .single();
    if (error) throw dbError(error, "sourcing.functions");
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
    if (error) throw dbError(error, "sourcing.functions");
    return data ?? [];
  });

export const deleteSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sequenceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("sourcing_sequences").delete().eq("id", data.sequenceId);
    if (error) throw dbError(error, "sourcing.functions");
    return { ok: true };
  });

// ---------- Outreach ----------

export const SendOutreachSchema = z.object({
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

    // Render and enqueue via the existing transactional pipeline (admin-side, no JWT hop).
    const recipient = data.recipientEmail.toLowerCase();
    const { data: suppressed } = await supabaseAdmin
      .from("suppressed_emails")
      .select("id")
      .eq("email", recipient)
      .maybeSingle();
    if (suppressed) {
      await supabaseAdmin.from("sourcing_sends").insert({
        user_id: userId,
        candidate_id: data.candidateId,
        sequence_id: data.sequenceId,
        recipient_email: data.recipientEmail,
        subject: personalized.subject,
        body: personalized.body,
        status: "suppressed",
      });
      throw new Error("Recipient has unsubscribed from emails.");
    }

    const tpl = TEMPLATES["outreach"];
    const element = React.createElement(tpl.component, {
      subject: personalized.subject,
      body: personalized.body,
      senderName: seq.sender_name ?? "",
      candidateName: cand.name,
    });
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const messageId = crypto.randomUUID();

    // Ensure unsubscribe token exists
    const { data: tok } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", recipient)
      .maybeSingle();
    let unsubscribe_token = tok?.token;
    if (!unsubscribe_token) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      unsubscribe_token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .upsert(
          { token: unsubscribe_token, email: recipient },
          { onConflict: "email", ignoreDuplicates: true },
        );
      const { data: re } = await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .select("token")
        .eq("email", recipient)
        .maybeSingle();
      unsubscribe_token = re?.token ?? unsubscribe_token;
    }

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "outreach",
      recipient_email: data.recipientEmail,
      status: "pending",
    });

    const { error: enqErr } = await supabaseAdmin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: data.recipientEmail,
        from: "growcontact <noreply@grow.contact>",
        sender_domain: "notify.grow.contact",
        subject: personalized.subject,
        html,
        text,
        purpose: "transactional",
        label: "outreach",
        idempotency_key: `outreach-${data.candidateId}-${data.sequenceId}`,
        unsubscribe_token,
        queued_at: new Date().toISOString(),
      },
    });

    const status = enqErr ? "failed" : "sent";
    const errorMessage = enqErr ? enqErr.message : null;

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
    if (enqErr) throw new Error(errorMessage ?? "Send failed");
    return { ok: true, subject: personalized.subject };
  });

// ---------- Outreach activity ----------

export const ListSendsSchema = z.object({
  status: z.enum(["all", "sent", "failed", "suppressed"]).optional(),
  candidateId: z.string().uuid().optional().nullable(),
  limit: z.number().int().min(1).max(200).optional(),
});

export const listOutreachSends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListSendsSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("sourcing_sends")
      .select(
        "id, recipient_email, subject, status, error_message, sent_at, sequence_id, candidate_id, sourcing_candidates!inner(id, name, profile_url, avatar_url), sourcing_sequences(id, name)",
      )
      .order("sent_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.candidateId) q = q.eq("candidate_id", data.candidateId);
    const { data: rows, error } = await q;
    if (error) throw dbError(error, "sourcing.functions");
    return rows ?? [];
  });

export const outreachStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.from("sourcing_sends").select("status, sent_at");
    if (error) throw dbError(error, "sourcing.functions");
    const total = data?.length ?? 0;
    const sent = data?.filter((r) => r.status === "sent").length ?? 0;
    const failed = data?.filter((r) => r.status === "failed").length ?? 0;
    const suppressed = data?.filter((r) => r.status === "suppressed").length ?? 0;
    const since = Date.now() - 7 * 86400_000;
    const last7 = data?.filter((r) => new Date(r.sent_at).getTime() >= since).length ?? 0;
    return { total, sent, failed, suppressed, last7 };
  });
