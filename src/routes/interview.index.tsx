import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Video, Trash2, Archive, ArchiveRestore, RotateCcw } from "lucide-react";
import {
  deleteSession,
  listSessions,
  restoreSession,
  setSessionArchived,
} from "@/server/interviews.functions";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Session = {
  id: string;
  candidate_name: string;
  role_title: string;
  meeting_platform: string;
  status: string;
  created_at: string;
  archived: boolean;
  deleted_at: string | null;
};

export const Route = createFileRoute("/interview/")({
  head: () => ({
    meta: [
      { title: "Interview Copilot — Grow" },
      {
        name: "description",
        content:
          "Live AI copilot for Zoom, Google Meet, and Microsoft Teams interviews. Auto-transcribe, surface follow-ups, and generate calibrated scorecards.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InterviewListPage,
});

function platformLabel(p: string) {
  return (
    {
      zoom: "Zoom",
      google_meet: "Google Meet",
      microsoft_teams: "Microsoft Teams",
      unknown: "Other",
    }[p] ?? p
  );
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    joining: "bg-blue-500/10 text-blue-600",
    in_call: "bg-emerald-500/10 text-emerald-600",
    completed: "bg-violet-500/10 text-violet-600",
    failed: "bg-red-500/10 text-red-600",
    cancelled: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[s] ?? "bg-muted"}`}>
      {s.replace("_", " ")}
    </span>
  );
}

function InterviewListPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"active" | "archived" | "trash">("active");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const pageSize = 20;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const r = await listSessions({
          data: { page, pageSize, scope, q: q || undefined },
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
        setSessions(r.rows as Session[]);
        setTotal(r.total);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading, navigate, page, scope, q]);

  async function authedHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
  }

  async function onDelete(e: React.MouseEvent, sid: string) {
    e.preventDefault();
    e.stopPropagation();
    const isTrash = scope === "trash";
    if (!confirm(isTrash ? "Move to trash (recoverable for 30 days)?" : "Move to trash?")) return;
    try {
      await deleteSession({ data: { sessionId: sid }, headers: await authedHeaders() });
      setSessions((prev) => prev.filter((s) => s.id !== sid));
      toast.success("Moved to trash");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function onRestore(e: React.MouseEvent, sid: string) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await restoreSession({ data: { sessionId: sid }, headers: await authedHeaders() });
      setSessions((prev) => prev.filter((s) => s.id !== sid));
      toast.success("Restored");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function onToggleArchive(e: React.MouseEvent, sid: string, archived: boolean) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await setSessionArchived({
        data: { sessionId: sid, archived: !archived },
        headers: await authedHeaders(),
      });
      setSessions((prev) => prev.filter((s) => s.id !== sid));
      toast.success(archived ? "Unarchived" : "Archived");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-5xl px-4 pb-24 pt-32">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-medium tracking-tight">Interview Copilot</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Drop a Zoom, Meet, or Teams link. The bot joins, transcribes, surfaces follow-ups in real
              time, and produces a calibrated scorecard.
            </p>
          </div>
          <Button asChild>
            <Link to="/interview/new">
              <Plus className="size-4" /> New interview
            </Link>
          </Button>
        </div>
        <div className="mt-3">
          <Link
            to="/interview/rubrics"
            className="text-sm text-primary hover:underline"
          >
            Manage rubrics →
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border bg-card p-0.5 text-sm">
            {(["active", "archived", "trash"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setScope(s); setPage(0); }}
                className={`rounded px-3 py-1 capitalize ${scope === s ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <Input
            value={q}
            onChange={(e) => { setPage(0); setQ(e.target.value); }}
            placeholder="Search candidate or role…"
            className="ml-auto max-w-xs"
          />
        </div>

        <div className="mt-4 rounded-xl border bg-card">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-16 text-center">
              <Video className="size-8 text-muted-foreground" />
              <p className="text-lg">
                {scope === "active" ? "No interviews yet" : scope === "archived" ? "Nothing archived" : "Trash is empty"}
              </p>
              <p className="text-sm text-muted-foreground">
                {scope === "active"
                  ? "Start by dispatching a copilot bot to your next interview."
                  : "Items here won't appear in your active list."}
              </p>
              {scope === "active" && (
                <Button asChild className="mt-2">
                  <Link to="/interview/new">Start your first interview</Link>
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {sessions.map((s) => (
                <li key={s.id} className="group flex items-center hover:bg-muted/40">
                  <Link
                    to="/interview/$id"
                    params={{ id: s.id }}
                    className="flex flex-1 items-center justify-between gap-4 p-4"
                  >
                    <div>
                      <div className="font-medium">{s.candidate_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {s.role_title} · {platformLabel(s.meeting_platform)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {statusBadge(s.status)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                  <div className="mr-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    {scope === "trash" ? (
                      <Button variant="ghost" size="icon" aria-label="Restore" onClick={(e) => onRestore(e, s.id)}>
                        <RotateCcw className="size-4" />
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={s.archived ? "Unarchive" : "Archive"}
                          onClick={(e) => onToggleArchive(e, s.id, s.archived)}
                        >
                          {s.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete interview"
                          onClick={(e) => onDelete(e, s.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {total > pageSize && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Page {page + 1} of {totalPages} · {total} total
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}