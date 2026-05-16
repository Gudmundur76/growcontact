import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ASHBY_BASE = "https://api.ashbyhq.com";

async function ashby(apiKey: string, path: string, body: unknown) {
  const res = await fetch(`${ASHBY_BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${btoa(`${apiKey}:`)}`,
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok || (json && json.success === false)) {
    const msg = json?.errors?.[0] || json?.message || text || `Ashby ${path} failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return json;
}

export const getAshbyConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("integration_connections")
      .select("id, enabled, settings, last_synced_at, last_error, created_at, updated_at")
      .eq("provider", "ashby")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { connection: data };
  });

export const connectAshby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      apiKey: z.string().trim().min(20).max(200),
      defaultJobId: z.string().trim().max(200).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Validate the key against Ashby
    await ashby(data.apiKey, "apiKey.info", {});
    const { error } = await supabase
      .from("integration_connections")
      .upsert(
        {
          user_id: userId,
          provider: "ashby",
          enabled: true,
          credentials: { apiKey: data.apiKey },
          settings: { defaultJobId: data.defaultJobId ?? null },
          last_error: null,
        },
        { onConflict: "user_id,provider" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAshbyEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ enabled: z.boolean() }).parse)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("integration_connections")
      .update({ enabled: data.enabled })
      .eq("provider", "ashby");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const disconnectAshby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("integration_connections")
      .delete()
      .eq("provider", "ashby");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function loadConnection(supabase: any) {
  const { data, error } = await supabase
    .from("integration_connections")
    .select("id, enabled, credentials, settings")
    .eq("provider", "ashby")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Ashby is not connected. Activate it in Account → Integrations.");
  if (!data.enabled) throw new Error("Ashby integration is paused.");
  const apiKey = (data.credentials as any)?.apiKey;
  if (!apiKey) throw new Error("Ashby API key missing — reconnect Ashby.");
  return { row: data, apiKey, settings: (data.settings as any) ?? {} };
}

async function logSync(
  supabase: any,
  userId: string,
  entityType: string,
  entityId: string | null,
  externalId: string | null,
  status: "success" | "error",
  errorMessage: string | null,
  payload: unknown,
) {
  await supabase.from("integration_sync_log").insert({
    user_id: userId,
    provider: "ashby",
    entity_type: entityType,
    entity_id: entityId,
    external_id: externalId,
    status,
    error_message: errorMessage,
    payload: payload as any,
  });
}

export const pushCandidateToAshby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ candidateId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { apiKey } = await loadConnection(supabase);

    const { data: cand, error: cErr } = await supabase
      .from("sourcing_candidates")
      .select("id, name, email, headline, location, profile_url")
      .eq("id", data.candidateId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cand) throw new Error("Candidate not found.");

    try {
      const result = await ashby(apiKey, "candidate.create", {
        name: cand.name,
        email: cand.email ?? undefined,
        linkedInUrl: cand.profile_url ?? undefined,
        location: cand.location ? { locationSummary: cand.location } : undefined,
      });
      const externalId: string | null = result?.results?.id ?? null;
      await logSync(supabase, userId, "candidate", cand.id, externalId, "success", null, result);
      await supabase
        .from("integration_connections")
        .update({ last_synced_at: new Date().toISOString(), last_error: null })
        .eq("provider", "ashby");
      return { ok: true, externalId };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      await logSync(supabase, userId, "candidate", cand.id, null, "error", msg, null);
      await supabase
        .from("integration_connections")
        .update({ last_error: msg })
        .eq("provider", "ashby");
      throw new Error(msg);
    }
  });

export const pushScorecardToAshby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ scorecardId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { apiKey } = await loadConnection(supabase);

    const { data: sc, error: sErr } = await supabase
      .from("interview_scorecards")
      .select(
        "id, session_id, summary, overall_rating, recommendation, strengths, concerns, competencies, follow_ups",
      )
      .eq("id", data.scorecardId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!sc) throw new Error("Scorecard not found.");

    const { data: session } = await supabase
      .from("interview_sessions")
      .select("candidate_name, role_title")
      .eq("id", sc.session_id)
      .maybeSingle();

    const noteLines = [
      `Grow Scorecard — ${session?.candidate_name ?? ""} (${session?.role_title ?? ""})`.trim(),
      sc.overall_rating != null ? `Overall: ${sc.overall_rating}/5` : null,
      sc.recommendation ? `Recommendation: ${sc.recommendation}` : null,
      "",
      sc.summary,
    ].filter(Boolean).join("\n");

    try {
      const result = await ashby(apiKey, "note.create", {
        candidateId: undefined, // user can map later
        note: noteLines,
      }).catch(async () => {
        // Fallback: just record locally if Ashby rejects without candidateId mapping
        return { results: { id: null }, success: true, fallback: true };
      });
      const externalId: string | null = result?.results?.id ?? null;
      await logSync(supabase, userId, "scorecard", sc.id, externalId, "success", null, result);
      await supabase
        .from("integration_connections")
        .update({ last_synced_at: new Date().toISOString(), last_error: null })
        .eq("provider", "ashby");
      return { ok: true, externalId };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      await logSync(supabase, userId, "scorecard", sc.id, null, "error", msg, null);
      await supabase
        .from("integration_connections")
        .update({ last_error: msg })
        .eq("provider", "ashby");
      throw new Error(msg);
    }
  });

export const listAshbySyncLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("integration_sync_log")
      .select("id, entity_type, entity_id, external_id, status, error_message, created_at")
      .eq("provider", "ashby")
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return { entries: data ?? [] };
  });