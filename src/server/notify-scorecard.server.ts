import { supabaseAdmin } from "@/integrations/supabase/client.server";

const NOTION_VERSION = "2022-06-28";
const DISCORD_WEBHOOK_RE =
  /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/i;
const SHEETS_URL_RE =
  /^https:\/\/script\.google\.com\/(macros|a\/macros)\/[^/]+\/s\/[A-Za-z0-9_-]+\/exec\b/;

type Provider = "notion" | "discord" | "sheets";

async function logResult(
  userId: string,
  provider: Provider,
  scorecardId: string,
  ok: boolean,
  message: string | null,
  externalId: string | null,
) {
  await supabaseAdmin.from("integration_sync_log").insert({
    user_id: userId,
    provider,
    entity_type: "scorecard",
    entity_id: scorecardId,
    external_id: externalId,
    status: ok ? "success" : "error",
    error_message: ok ? null : message,
    payload: { auto: true } as any,
  });
  await supabaseAdmin
    .from("integration_connections")
    .update(ok
      ? { last_synced_at: new Date().toISOString(), last_error: null }
      : { last_error: message })
    .eq("user_id", userId)
    .eq("provider", provider);
}

async function loadScorecard(scorecardId: string) {
  const { data: sc } = await supabaseAdmin
    .from("interview_scorecards")
    .select("id, session_id, summary, overall_rating, recommendation")
    .eq("id", scorecardId)
    .maybeSingle();
  if (!sc) return null;
  const { data: session } = await supabaseAdmin
    .from("interview_sessions")
    .select("candidate_name, role_title, share_token")
    .eq("id", sc.session_id)
    .maybeSingle();
  return { sc, session };
}

async function notifyNotion(userId: string, scorecardId: string) {
  const { data: conn } = await supabaseAdmin
    .from("integration_connections")
    .select("enabled, credentials, settings")
    .eq("user_id", userId)
    .eq("provider", "notion")
    .maybeSingle();
  if (!conn?.enabled) return;
  const token = (conn.credentials as any)?.token as string | undefined;
  const databaseId = (conn.settings as any)?.databaseId as string | undefined;
  if (!token || !databaseId) return;

  const bundle = await loadScorecard(scorecardId);
  if (!bundle) return;
  const { sc, session } = bundle;

  const title = `${session?.candidate_name ?? "Candidate"}${
    session?.role_title ? ` — ${session.role_title}` : ""
  }`;
  const bodyText = [
    sc.overall_rating != null ? `Rating: ${sc.overall_rating}/5` : null,
    sc.recommendation ? `Recommendation: ${sc.recommendation}` : null,
    sc.summary ? String(sc.summary).slice(0, 1800) : null,
  ].filter(Boolean).join("\n\n") || "Scorecard published.";

  try {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          // The database must have a Title-typed property. Notion auto-resolves
          // by type, so we set the first title-property by sending "title".
          title: { title: [{ text: { content: title } }] },
        },
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ type: "text", text: { content: bodyText } }] },
          },
        ],
      }),
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* noop */ }
    if (!res.ok) throw new Error(json?.message || text || `Notion failed (${res.status})`);
    await logResult(userId, "notion", sc.id, true, null, json?.id ?? null);
  } catch (e: any) {
    await logResult(userId, "notion", sc.id, false, e?.message ?? String(e), null);
  }
}

async function notifyDiscord(userId: string, scorecardId: string) {
  const { data: conn } = await supabaseAdmin
    .from("integration_connections")
    .select("enabled, credentials")
    .eq("user_id", userId)
    .eq("provider", "discord")
    .maybeSingle();
  if (!conn?.enabled) return;
  const webhookUrl = (conn.credentials as any)?.webhookUrl as string | undefined;
  if (!webhookUrl || !DISCORD_WEBHOOK_RE.test(webhookUrl)) return;

  const bundle = await loadScorecard(scorecardId);
  if (!bundle) return;
  const { sc, session } = bundle;

  const content = [
    `📋 **New scorecard** — ${session?.candidate_name ?? "Candidate"}${
      session?.role_title ? ` (${session.role_title})` : ""
    }`,
    sc.overall_rating != null ? `Rating: ${sc.overall_rating}/5` : null,
    sc.recommendation ? `Recommendation: ${sc.recommendation}` : null,
    sc.summary ? `> ${String(sc.summary).slice(0, 400)}` : null,
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 1900) }),
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`Discord failed (${res.status})`);
    }
    await logResult(userId, "discord", sc.id, true, null, null);
  } catch (e: any) {
    await logResult(userId, "discord", sc.id, false, e?.message ?? String(e), null);
  }
}

async function notifySheets(userId: string, scorecardId: string) {
  const { data: conn } = await supabaseAdmin
    .from("integration_connections")
    .select("enabled, settings")
    .eq("user_id", userId)
    .eq("provider", "sheets")
    .maybeSingle();
  if (!conn?.enabled) return;
  const url = (conn.settings as any)?.url as string | undefined;
  if (!url || !SHEETS_URL_RE.test(url)) return;

  const bundle = await loadScorecard(scorecardId);
  if (!bundle) return;
  const { sc, session } = bundle;

  const payload = {
    event: "scorecard.published",
    at: new Date().toISOString(),
    row: [
      new Date().toISOString(),
      session?.candidate_name ?? "",
      session?.role_title ?? "",
      sc.overall_rating ?? "",
      sc.recommendation ?? "",
      (sc.summary ?? "").slice(0, 1000),
    ],
    scorecard: {
      id: sc.id,
      sessionId: sc.session_id,
      rating: sc.overall_rating,
      recommendation: sc.recommendation,
      summary: sc.summary,
      candidate: session?.candidate_name,
      role: session?.role_title,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Sheets script failed (${res.status})`);
    await logResult(userId, "sheets", sc.id, true, null, null);
  } catch (e: any) {
    await logResult(userId, "sheets", sc.id, false, e?.message ?? String(e), null);
  }
}

/**
 * Fire-and-forget fan-out to all enabled scorecard notifiers for a user.
 * Each provider is independent; failures are logged per-provider and never
 * break the calling flow.
 */
export async function autoNotifyScorecardAll(params: {
  userId: string;
  scorecardId: string;
}) {
  const { userId, scorecardId } = params;
  try {
    await Promise.allSettled([
      notifyNotion(userId, scorecardId),
      notifyDiscord(userId, scorecardId),
      notifySheets(userId, scorecardId),
    ]);
  } catch (e) {
    console.error("autoNotifyScorecardAll failed", e);
  }
}