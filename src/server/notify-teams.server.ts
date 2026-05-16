import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TEAMS_WEBHOOK_RE = /\.webhook\.office\.com\/(webhookb2|workflows)/;

async function postTeams(webhookUrl: string, title: string, text: string) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      summary: title,
      themeColor: "0F766E",
      title,
      text,
    }),
  });
  if (!res.ok) throw new Error(`Teams webhook failed [${res.status}]: ${await res.text().catch(() => "")}`);
}

/**
 * Fire-and-forget: notify the user's connected Teams channel that a
 * scorecard was published. No-ops when the user has no enabled Teams
 * connection. Errors are swallowed but logged into integration_sync_log.
 */
export async function autoNotifyScorecardTeams(params: {
  userId: string;
  scorecardId: string;
}) {
  const { userId, scorecardId } = params;
  try {
    const { data: conn } = await supabaseAdmin
      .from("integration_connections")
      .select("enabled, credentials")
      .eq("user_id", userId)
      .eq("provider", "teams")
      .maybeSingle();
    if (!conn || !conn.enabled) return;
    const webhookUrl = (conn.credentials as any)?.webhookUrl as string | undefined;
    if (!webhookUrl || !TEAMS_WEBHOOK_RE.test(webhookUrl)) return;

    const { data: sc } = await supabaseAdmin
      .from("interview_scorecards")
      .select("id, session_id, summary, overall_rating, recommendation")
      .eq("id", scorecardId)
      .maybeSingle();
    if (!sc) return;

    const { data: session } = await supabaseAdmin
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
      await supabaseAdmin.from("integration_sync_log").insert({
        user_id: userId,
        provider: "teams",
        entity_type: "scorecard",
        entity_id: sc.id,
        external_id: null,
        status: "success",
        error_message: null,
        payload: { title, auto: true } as any,
      });
      await supabaseAdmin
        .from("integration_connections")
        .update({ last_synced_at: new Date().toISOString(), last_error: null })
        .eq("user_id", userId)
        .eq("provider", "teams");
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      await supabaseAdmin.from("integration_sync_log").insert({
        user_id: userId,
        provider: "teams",
        entity_type: "scorecard",
        entity_id: sc.id,
        external_id: null,
        status: "error",
        error_message: msg,
        payload: { auto: true } as any,
      });
      await supabaseAdmin
        .from("integration_connections")
        .update({ last_error: msg })
        .eq("user_id", userId)
        .eq("provider", "teams");
    }
  } catch (e) {
    console.error("autoNotifyScorecardTeams failed", e);
  }
}