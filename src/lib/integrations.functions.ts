import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProviderKey =
  | "greenhouse"
  | "slack"
  | "webhook"
  | "teams"
  | "hubspot"
  | "notion"
  | "sheets"
  | "discord";
const PROVIDER = z.enum([
  "greenhouse",
  "slack",
  "webhook",
  "teams",
  "hubspot",
  "notion",
  "sheets",
  "discord",
]);

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

// ---------- Microsoft Teams (Incoming Webhook / Workflows) ----------
// Accepts both classic Office 365 connector webhooks and Workflows webhook URLs.
const TEAMS_WEBHOOK_RE =
  /^https:\/\/[a-z0-9-]+\.webhook\.office\.com\/(webhookb2|workflows)\//i;

async function postTeams(webhookUrl: string, title: string, text: string) {
  // MessageCard payload — accepted by both classic webhooks and Workflows.
  const payload = {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    summary: title,
    themeColor: "0EA5E9",
    title,
    text,
  };
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Teams webhook failed (${res.status}): ${body}`);
  }
}

export const connectTeams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      webhookUrl: z
        .string()
        .url()
        .regex(TEAMS_WEBHOOK_RE, "Must be a Microsoft Teams Incoming Webhook or Workflows URL"),
      channelLabel: z.string().trim().max(80).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await postTeams(
      data.webhookUrl,
      "Grow connected",
      "Grow is now connected to this channel. You'll see scorecard updates here.",
    );
    const { error } = await context.supabase
      .from("integration_connections")
      .upsert(
        {
          user_id: context.userId,
          provider: "teams",
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

export const notifyScorecardTeams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ scorecardId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const conn = await loadConn(supabase, "teams");
    const webhookUrl = (conn.credentials as any)?.webhookUrl;
    if (!webhookUrl) throw new Error("Teams webhook missing — reconnect.");

    const { data: sc, error } = await supabase
      .from("interview_scorecards")
      .select("id, session_id, summary, overall_rating, recommendation")
      .eq("id", data.scorecardId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sc) throw new Error("Scorecard not found.");
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("candidate_name, role_title")
      .eq("id", sc.session_id)
      .maybeSingle();

    const title = `New scorecard — ${session?.candidate_name ?? "Candidate"}${
      session?.role_title ? ` (${session.role_title})` : ""
    }`;
    const lines = [
      sc.overall_rating != null ? `**Rating:** ${sc.overall_rating}/5` : null,
      sc.recommendation ? `**Recommendation:** ${sc.recommendation}` : null,
      sc.summary ? String(sc.summary).slice(0, 600) : null,
    ].filter(Boolean).join("\n\n");

    try {
      await postTeams(webhookUrl, title, lines || "Scorecard published.");
      await logSync(supabase, userId, "teams", "scorecard", sc.id, null, "success", null, { title });
      await markSynced(supabase, "teams", null);
      return { ok: true };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      await logSync(supabase, userId, "teams", "scorecard", sc.id, null, "error", msg, null);
      await markSynced(supabase, "teams", msg);
      throw new Error(msg);
    }
  });
// ---------- HubSpot CRM ----------
// Uses a Private App access token (Bearer). Pushes candidates as contacts.

const HUBSPOT_BASE = "https://api.hubapi.com";

async function hubspot(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${HUBSPOT_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* noop */ }
  if (!res.ok) {
    const msg = json?.message || text || `HubSpot ${path} failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return json;
}

export const connectHubspot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      token: z.string().trim().min(20).max(300),
      pipelineLabel: z.string().trim().max(80).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await hubspot(data.token, "/crm/v3/owners?limit=1");
    const { error } = await context.supabase
      .from("integration_connections")
      .upsert(
        {
          user_id: context.userId,
          provider: "hubspot",
          enabled: true,
          credentials: { token: data.token },
          settings: { pipelineLabel: data.pipelineLabel ?? null },
          last_error: null,
        },
        { onConflict: "user_id,provider" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const pushCandidateToHubspot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ candidateId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const conn = await loadConn(supabase, "hubspot");
    const token = (conn.credentials as any)?.token;
    if (!token) throw new Error("HubSpot token missing — reconnect.");

    const { data: cand, error } = await supabase
      .from("sourcing_candidates")
      .select("id, name, email, headline, location, profile_url")
      .eq("id", data.candidateId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cand) throw new Error("Candidate not found.");

    const [first, ...rest] = (cand.name || "").split(" ");
    const properties: Record<string, string> = {
      firstname: first || cand.name,
      lastname: rest.join(" ") || "",
      jobtitle: cand.headline ?? "",
      website: cand.profile_url ?? "",
      city: cand.location ?? "",
      hs_lead_status: "NEW",
    };
    if (cand.email) properties.email = cand.email;

    try {
      const result = await hubspot(token, "/crm/v3/objects/contacts", {
        method: "POST",
        body: JSON.stringify({ properties }),
      });
      const externalId = result?.id ? String(result.id) : null;
      await logSync(supabase, userId, "hubspot", "candidate", cand.id, externalId, "success", null, result);
      await markSynced(supabase, "hubspot", null);
      return { ok: true, externalId };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      await logSync(supabase, userId, "hubspot", "candidate", cand.id, null, "error", msg, null);
      await markSynced(supabase, "hubspot", msg);
      throw new Error(msg);
    }
  });

// ---------- Notion ----------
// Internal Integration Token + a target Database ID. Each published scorecard
// creates a page in that database (auto-notify wired server-side).

const NOTION_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

async function notion(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${NOTION_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* noop */ }
  if (!res.ok) {
    const msg = json?.message || text || `Notion ${path} failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return json;
}

export const connectNotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      token: z.string().trim().min(20).max(300),
      databaseId: z.string().trim().min(20).max(64),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const dbId = data.databaseId.replace(/-/g, "");
    // Validate token + database access
    await notion(data.token, `/databases/${dbId}`);
    const { error } = await context.supabase
      .from("integration_connections")
      .upsert(
        {
          user_id: context.userId,
          provider: "notion",
          enabled: true,
          credentials: { token: data.token },
          settings: { databaseId: dbId },
          last_error: null,
        },
        { onConflict: "user_id,provider" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Google Sheets (via Apps Script Web App) ----------
// Per-user OAuth to Google is too heavy here — users deploy a 5-line Apps
// Script that appends rows, and paste the Web App URL. We POST JSON; the
// script writes to their sheet.

const SHEETS_URL_RE = /^https:\/\/script\.google\.com\/(macros|a\/macros)\/[^/]+\/s\/[A-Za-z0-9_-]+\/exec\b/;

async function postSheets(url: string, payload: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Sheets script failed (${res.status}): ${body.slice(0, 200)}`);
  }
}

export const connectSheets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      url: z.string().url().regex(SHEETS_URL_RE, "Must be a Google Apps Script Web App URL"),
      sheetLabel: z.string().trim().max(80).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await postSheets(data.url, {
      event: "connection.test",
      at: new Date().toISOString(),
      row: ["Grow connection test", new Date().toISOString()],
    });
    const { error } = await context.supabase
      .from("integration_connections")
      .upsert(
        {
          user_id: context.userId,
          provider: "sheets",
          enabled: true,
          credentials: {},
          settings: { url: data.url, sheetLabel: data.sheetLabel ?? null },
          last_error: null,
        },
        { onConflict: "user_id,provider" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Discord (incoming webhook) ----------

const DISCORD_WEBHOOK_RE =
  /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/i;

async function postDiscord(webhookUrl: string, content: string) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.slice(0, 1900) }),
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord webhook failed (${res.status}): ${body}`);
  }
}

export const connectDiscord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      webhookUrl: z.string().url().regex(DISCORD_WEBHOOK_RE, "Must be a Discord webhook URL"),
      channelLabel: z.string().trim().max(80).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await postDiscord(data.webhookUrl, "✨ Grow connected to this channel. You'll see scorecard updates here.");
    const { error } = await context.supabase
      .from("integration_connections")
      .upsert(
        {
          user_id: context.userId,
          provider: "discord",
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
