import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { listSubscribers } from "@/server/admin.functions";

export const Route = createFileRoute("/admin/subscribers")({
  head: () => ({
    meta: [
      { title: "Admin · Subscribers — Grow" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SubscribersPage,
});

interface Sub {
  id: string;
  email: string;
  source: string;
  status: string;
  confirmed_at: string | null;
  created_at: string;
}

function csvEscape(v: string) {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function SubscribersPage() {
  const fetchSubs = useServerFn(listSubscribers);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-subscribers"],
    queryFn: () => fetchSubs(),
  });
  const rows = (data?.subscribers ?? []) as Sub[];

  function handleExport() {
    const header = ["email", "status", "source", "confirmed_at", "created_at"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [r.email, r.status, r.source, r.confirmed_at ?? "", r.created_at]
          .map((v) => csvEscape(String(v)))
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Newsletter subscribers
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "subscriber" : "subscribers"}, newest first.
          </p>
        </div>
        <Button onClick={handleExport} disabled={!rows.length} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/40">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="px-6 py-12 text-center text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load"}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No subscribers yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-foreground">{r.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs " +
                        (r.status === "active"
                          ? "bg-primary/15 text-primary"
                          : "bg-white/10 text-muted-foreground")
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.source}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
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