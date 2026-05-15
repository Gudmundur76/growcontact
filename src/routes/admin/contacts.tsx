import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/contacts")({
  head: () => ({
    meta: [
      { title: "Admin · Contact submissions — Grow" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminContactsPage,
});

interface Submission {
  id: string;
  name: string;
  email: string;
  company: string | null;
  team_size: string | null;
  message: string;
  created_at: string;
  user_agent: string | null;
}

function AdminContactsPage() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) toast.error(error.message);
      setRows((data ?? []) as Submission[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Contact submissions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "submission" : "submissions"}, newest first.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-card/40 p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <article key={row.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h3 className="text-base font-medium text-foreground">
                      {row.name}
                      {row.company ? (
                        <span className="text-muted-foreground"> · {row.company}</span>
                      ) : null}
                    </h3>
                    <a href={`mailto:${row.email}`} className="text-sm text-primary hover:underline">
                      {row.email}
                    </a>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                    {row.team_size ? ` · ${row.team_size}` : ""}
                  </div>
                </header>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">{row.message}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}