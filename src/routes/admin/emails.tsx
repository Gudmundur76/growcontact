import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getEmailAnalytics } from "@/server/admin-emails.functions";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/emails")({
  head: () => ({
    meta: [
      { title: "Admin · Email analytics — Grow" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmailAnalyticsPage,
});

type Range = "24h" | "7d" | "30d";

function statusBadgeClass(status: string) {
  if (status === "sent")
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
  if (["dlq", "failed", "bounced"].includes(status))
    return "bg-red-500/15 text-red-300 border border-red-500/30";
  if (status === "suppressed" || status === "complained")
    return "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30";
  return "bg-white/5 text-muted-foreground border border-white/10";
}

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/40 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value.toLocaleString()}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function EmailAnalyticsPage() {
  const [range, setRange] = useState<Range>("7d");
  const [template, setTemplate] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const fetchFn = useServerFn(getEmailAnalytics);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-emails", range, template, status],
    queryFn: () =>
      fetchFn({
        data: {
          range,
          template: template || null,
          status: status || null,
          limit: 100,
        },
      }),
  });

  const stats = data?.stats;
  const templates = data?.templates ?? [];
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Email analytics
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deliverability across all transactional sends. Counts are deduplicated by message.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-card/40 p-0.5">
            {(["24h", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                  (range === r
                    ? "bg-primary/20 text-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {r === "24h" ? "Last 24h" : r === "7d" ? "Last 7 days" : "Last 30 days"}
              </button>
            ))}
          </div>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="h-8 rounded-md border border-white/10 bg-background px-2 text-xs"
          >
            <option value="">All templates</option>
            {templates.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-8 rounded-md border border-white/10 bg-background px-2 text-xs"
          >
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="suppressed">Suppressed</option>
            <option value="complained">Complained</option>
            <option value="pending">Pending</option>
          </select>
          <button
            onClick={() => refetch()}
            className="h-8 rounded-md border border-white/10 bg-card/40 px-3 text-xs text-muted-foreground hover:text-foreground"
            disabled={isFetching}
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-card/40 p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-7 w-16" />
              </div>
            ))
          : (
            <>
              <StatCard label="Total" value={stats?.total ?? 0} />
              <StatCard label="Sent" value={stats?.sent ?? 0} />
              <StatCard label="Failed" value={stats?.failed ?? 0} hint="dlq + failed + bounced" />
              <StatCard label="Suppressed" value={stats?.suppressed ?? 0} />
              <StatCard
                label="Suppression list"
                value={stats?.suppression_list_total ?? 0}
                hint="lifetime"
              />
            </>
          )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/40">
        {isLoading ? (
          <div className="divide-y divide-white/5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-6 py-12 text-center text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load"}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No emails in this window match the filter.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Template</th>
                <th className="px-4 py-3 font-medium">Recipient</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-foreground">{r.template_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.recipient_email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={"rounded-full px-2 py-0.5 text-xs " + statusBadgeClass(r.status)}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-3 text-xs text-muted-foreground">
                    {r.error_message ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
