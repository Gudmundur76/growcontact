import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProviderKey = "greenhouse" | "slack" | "webhook" | "teams";
const PROVIDER = z.enum(["greenhouse", "slack", "webhook", "teams"]);

// ---------- Helpers ----------

async function logSync(
  supabase: any,
  userId: string,
  provider: ProviderKey,
  entityType: string,
  entityId: string | null,
  externalId: string | null,
  status: "success" | "error",
  errorMessage: string | null,
  payload: unknown,
) {
  await supabase.from("integration_sync_log").insert({
    user_id: userId,
    provider,
    entity_type: entityType,
    entity_id: entityId,
    external_id: externalId,
    status,
    error_message: errorMessage,
    payload: payload as any,
  });
}

async function loadConn(supabase: any, provider: ProviderKey) {
  const { data, error } = await supabase
    .from("integration_connections")
    .select("id, enabled, credentials, settings")
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`${provider} is not connected. Activate it in Account → Integrations.`);
  if (!data.enabled) throw new Error(`${provider} integration is paused.`);
  return data;
}

async function markSynced(supabase: any, provider: ProviderKey, err: string | null) {
  await supabase
    .from("integration_connections")
    .update(err
      ? { last_error: err }
      : { last_synced_at: new Date().toISOString(), last_error: null })
    .eq("provider", provider);
}

// ---------- Generic read/update/delete ----------

export const listConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("integration_connections")
      .select("id, provider, enabled, settings, last_synced_at, last_error, created_at, updated_at");
    if (error) throw new Error(error.message);
    return { connections: data ?? [] };
  });

export const setProviderEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ provider: PROVIDER, enabled: z.boolean() }).parse)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("integration_connections")
      .update({ enabled: data.enabled })
      .eq("provider", data.provider);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const disconnectProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ provider: PROVIDER }).parse)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("integration_connections")
      .delete()
      .eq("provider", data.provider);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listProviderSyncLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ provider: PROVIDER }).parse)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("integration_sync_log")
      .select("id, entity_type, entity_id, external_id, status, error_message, created_at")
      .eq("provider", data.provider)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return { entries: rows ?? [] };
  });

// ---------- Greenhouse ----------
// Greenhouse Harvest API uses Basic auth with the API key as username.

const GH_BASE = "https://harvest.greenhouse.io/v1";

async function gh(apiKey: string, path: string, init: RequestInit & { onBehalfOf?: string } = {}) {
  const headers: Record<string, string> = {
    Authorization: `Basic ${btoa(`${apiKey}:`)}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (init.onBehalfOf) headers["On-Behalf-Of"] = init.onBehalfOf;
  const res = await fetch(`${GH_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || json?.message || text || `Greenhouse ${path} failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return json;
}

export const connectGreenhouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      apiKey: z.string().trim().min(20).max(200),
      onBehalfOf: z.string().trim().min(1).max(64),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    // Validate by hitting /users (cheap, scope-tolerant)
    await gh(data.apiKey, "/users?per_page=1");
    const { error } = await context.supabase
      .from("integration_connections")
      .upsert(
        {
          user_id: context.userId,
          provider: "greenhouse",
          enabled: true,
          credentials: { apiKey: data.apiKey },
          settings: { onBehalfOf: data.onBehalfOf },
          last_error: null,
        },
        { onConflict: "user_id,provider" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const pushCandidateToGreenhouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ candidateId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const conn = await loadConn(supabase, "greenhouse");
    const apiKey = (conn.credentials as any)?.apiKey;
    const onBehalfOf = (conn.settings as any)?.onBehalfOf;
    if (!apiKey || !onBehalfOf) throw new Error("Greenhouse credentials missing — reconnect.");

    const { data: cand, error } = await supabase
      .from("sourcing_candidates")
      .select("id, name, email, headline, location, profile_url")
      .eq("id", data.candidateId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cand) throw new Error("Candidate not found.");

    const [first, ...rest] = (cand.name || "").split(" ");
    const body = {
      first_name: first || cand.name,
      last_name: rest.join(" ") || "",
      title: cand.headline ?? undefined,
      addresses: cand.location ? [{ value: cand.location, type: "home" }] : [],
      email_addresses: cand.email ? [{ value: cand.email, type: "personal" }] : [],
      website_addresses: cand.profile_url ? [{ value: cand.profile_url, type: "personal" }] : [],
    };
    try {
      const result = await gh(apiKey, "/candidates", {
        method: "POST",
        body: JSON.stringify(body),
        onBehalfOf,
      });
      const externalId = result?.id ? String(result.id) : null;
      await logSync(supabase, userId, "greenhouse", "candidate", cand.id, externalId, "success", null, result);
      await markSynced(supabase, "greenhouse", null);
      return { ok: true, externalId };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      await logSync(supabase, userId, "greenhouse", "candidate", cand.id, null, "error", msg, null);
      await markSynced(supabase, "greenhouse", msg);
      throw new Error(msg);
    }
  });

// ---------- Slack (incoming webhook) ----------

const SLACK_WEBHOOK_RE = /^https:\/\/hooks\.slack\.com\/services\/[A-Z0-9/]+/i;

async function postSlack(webhookUrl: string, text: string) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack webhook failed (${res.status}): ${body}`);
  }
}

export const connectSlack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      webhookUrl: z.string().url().regex(SLACK_WEBHOOK_RE, "Must be a Slack Incoming Webhook URL"),
      channelLabel: z.string().trim().max(80).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await postSlack(data.webhookUrl, ":sparkles: Grow connected to Slack. You'll see candidate and scorecard updates here.");
    const { error } = await context.supabase
      .from("integration_connections")
      .upsert(
        {
          user_id: context.userId,
          provider: "slack",
          enabled: true,
          credentials: { webhookUrl: data.webhookUrl },
          settings: { channelLabel: data.channelLabel ?? null },
          last_error: null,
        },
        { onConflict: "user_id,provider" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const notifyScorecardSlack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ scorecardId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const conn = await loadConn(supabase, "slack");
    const webhookUrl = (conn.credentials as any)?.webhookUrl;
    if (!webhookUrl) throw new Error("Slack webhook missing — reconnect.");

    const { data: sc, error } = await supabase
      .from("interview_scorecards")
      .select("id, session_id, summary, overall_rating, recommendation")
      .eq("id", data.scorecardId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sc) throw new Error("Scorecard not found.");
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("candidate_name, role_title, share_token")
      .eq("id", sc.session_id)
      .maybeSingle();

    const text = [
      `:clipboard: *New scorecard* — ${session?.candidate_name ?? "Candidate"} (${session?.role_title ?? ""})`,
      sc.overall_rating != null ? `Rating: ${sc.overall_rating}/5` : null,
      sc.recommendation ? `Recommendation: ${sc.recommendation}` : null,
      sc.summary ? `> ${String(sc.summary).slice(0, 400)}` : null,
    ].filter(Boolean).join("\n");

    try {
      await postSlack(webhookUrl, text);
      await logSync(supabase, userId, "slack", "scorecard", sc.id, null, "success", null, { text });
      await markSynced(supabase, "slack", null);
      return { ok: true };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      await logSync(supabase, userId, "slack", "scorecard", sc.id, null, "error", msg, null);
      await markSynced(supabase, "slack", msg);
      throw new Error(msg);
    }
  });

// ---------- Generic Webhook ----------

export const connectWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      url: z.string().url().max(500),
      secret: z.string().trim().max(200).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    // Probe with a benign ping
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (data.secret) headers["X-Grow-Signature"] = data.secret;
    const res = await fetch(data.url, {
      method: "POST",
      headers,
      body: JSON.stringify({ event: "connection.test", at: new Date().toISOString() }),
    });
    if (!res.ok && res.status >= 500) {
      throw new Error(`Webhook ping failed (${res.status})`);
    }
    const { error } = await context.supabase
      .from("integration_connections")
      .upsert(
        {
          user_id: context.userId,
          provider: "webhook",
          enabled: true,
          credentials: { secret: data.secret ?? null },
          settings: { url: data.url },
          last_error: null,
        },
        { onConflict: "user_id,provider" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendWebhookTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const conn = await loadConn(supabase, "webhook");
    const url = (conn.settings as any)?.url;
    const secret = (conn.credentials as any)?.secret;
    if (!url) throw new Error("Webhook URL missing — reconnect.");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers["X-Grow-Signature"] = secret;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ event: "manual.test", at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await logSync(supabase, userId, "webhook", "test", null, null, "success", null, { url });
      await markSynced(supabase, "webhook", null);
      return { ok: true };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      await logSync(supabase, userId, "webhook", "test", null, null, "error", msg, null);
      await markSynced(supabase, "webhook", msg);
      throw new Error(msg);
    }
  });