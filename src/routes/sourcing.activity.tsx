import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, BanIcon, Mail } from "lucide-react";
import { listOutreachSends, outreachStats } from "@/server/sourcing.functions";

export const Route = createFileRoute("/sourcing/activity")({
  component: ActivityPage,
});

type Send = {
  id: string;
  recipient_email: string;
  subject: string;
  status: string;
  error_message: string | null;
  sent_at: string;
  sourcing_candidates: { id: string; name: string; profile_url: string; avatar_url: string | null } | null;
  sourcing_sequences: { id: string; name: string } | null;
};
type Stats = { total: number; sent: number; failed: number; suppressed: number; last7: number };
type Filter = "all" | "sent" | "failed" | "suppressed";

function ActivityPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<Send[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        listOutreachSends({ data: { status: filter } }),
        outreachStats(),
      ]);
      setRows(r as Send[]);
      setStats(s as Stats);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Total sends" value={stats?.total ?? 0} />
        <Stat label="Delivered" value={stats?.sent ?? 0} tone="good" />
        <Stat label="Failed" value={stats?.failed ?? 0} tone="bad" />
        <Stat label="Suppressed" value={stats?.suppressed ?? 0} tone="muted" />
        <Stat label="Last 7 days" value={stats?.last7 ?? 0} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "sent", "failed", "suppressed"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
              filter === f
                ? "border-primary bg-primary/15 text-foreground"
                : "border-white/10 text-muted-foreground hover:bg-white/5"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-card/20 p-10 text-center text-sm text-muted-foreground">
          No outreach yet. Send a personalized email from the Search tab to see it here.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-card/40 p-4"
            >
              {r.sourcing_candidates?.avatar_url ? (
                <img
                  src={r.sourcing_candidates.avatar_url}
                  alt=""
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/20" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {r.sourcing_candidates ? (
                    <a
                      href={r.sourcing_candidates.profile_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-foreground hover:underline"
                    >
                      {r.sourcing_candidates.name}
                    </a>
                  ) : (
                    <span className="font-medium text-foreground">Unknown candidate</span>
                  )}
                  <span className="text-xs text-muted-foreground">{r.recipient_email}</span>
                  <StatusBadge status={r.status} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(r.sent_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{r.subject}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {r.sourcing_sequences ? (
                    <Badge variant="outline" className="text-[10px]">
                      <Mail className="mr-1 h-3 w-3" /> {r.sourcing_sequences.name}
                    </Badge>
                  ) : null}
                  {r.error_message ? (
                    <span className="text-destructive">{r.error_message}</span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" | "muted" }) {
  const toneClass =
    tone === "good"
      ? "text-emerald-400"
      : tone === "bad"
      ? "text-destructive"
      : tone === "muted"
      ? "text-muted-foreground"
      : "text-foreground";
  return (
    <div className="rounded-2xl border border-white/10 bg-card/40 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "sent")
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="h-3 w-3 text-emerald-400" /> sent
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> failed
      </Badge>
    );
  if (status === "suppressed")
    return (
      <Badge variant="outline" className="gap-1">
        <BanIcon className="h-3 w-3" /> suppressed
      </Badge>
    );
  return <Badge variant="outline">{status}</Badge>;
}