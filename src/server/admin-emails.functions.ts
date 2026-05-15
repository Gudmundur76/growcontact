import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { dbError } from "./db-errors";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const EmailAnalyticsSchema = z.object({
  range: z.enum(["24h", "7d", "30d"]).default("7d"),
  template: z.string().max(120).optional().nullable(),
  status: z.string().max(40).optional().nullable(),
  limit: z.number().int().min(1).max(500).default(100),
});

type LogRow = {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

function rangeToStart(range: "24h" | "7d" | "30d"): string {
  const ms = range === "24h" ? 86_400_000 : range === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
  return new Date(Date.now() - ms).toISOString();
}

export const getEmailAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EmailAnalyticsSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const startIso = rangeToStart(data.range);

    const { data: rawLogs, error } = await supabaseAdmin
      .from("email_send_log")
      .select("id, message_id, template_name, recipient_email, status, error_message, created_at")
      .gte("created_at", startIso)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw dbError(error, "admin-emails.functions");

    const seen = new Set<string>();
    const deduped: LogRow[] = [];
    for (const r of (rawLogs ?? []) as LogRow[]) {
      const key = r.message_id ?? r.id;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(r);
    }

    const { count: suppressedCount } = await supabaseAdmin
      .from("suppressed_emails")
      .select("id", { count: "exact", head: true });

    const templates = Array.from(new Set(deduped.map((r) => r.template_name))).sort();

    const stats = {
      total: deduped.length,
      sent: deduped.filter((r) => r.status === "sent").length,
      failed: deduped.filter((r) => ["dlq", "failed", "bounced"].includes(r.status)).length,
      suppressed: deduped.filter((r) => r.status === "suppressed").length,
      complained: deduped.filter((r) => r.status === "complained").length,
      pending: deduped.filter((r) => r.status === "pending").length,
      suppression_list_total: suppressedCount ?? 0,
    };

    let rows = deduped;
    if (data.template) rows = rows.filter((r) => r.template_name === data.template);
    if (data.status) {
      if (data.status === "failed") {
        rows = rows.filter((r) => ["dlq", "failed", "bounced"].includes(r.status));
      } else {
        rows = rows.filter((r) => r.status === data.status);
      }
    }
    rows = rows.slice(0, data.limit);

    return { stats, templates, rows };
  });
