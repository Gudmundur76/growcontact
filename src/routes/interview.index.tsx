import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Video, Trash2 } from "lucide-react";
import { deleteSession } from "@/server/interviews.functions";
import { toast } from "sonner";

type Session = {
  id: string;
  candidate_name: string;
  role_title: string;
  meeting_platform: string;
  status: string;
  created_at: string;
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

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("interview_sessions")
        .select("id, candidate_name, role_title, meeting_platform, status, created_at")
        .order("created_at", { ascending: false });
      setSessions((data ?? []) as Session[]);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  async function onDelete(e: React.MouseEvent, sid: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this interview and all its transcripts?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await deleteSession({
        data: { sessionId: sid },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      setSessions((prev) => prev.filter((s) => s.id !== sid));
      toast.success("Interview deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

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

        <div className="mt-10 rounded-xl border bg-card">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-16 text-center">
              <Video className="size-8 text-muted-foreground" />
              <p className="text-lg">No interviews yet</p>
              <p className="text-sm text-muted-foreground">
                Start by dispatching a copilot bot to your next interview.
              </p>
              <Button asChild className="mt-2">
                <Link to="/interview/new">Start your first interview</Link>
              </Button>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-2 opacity-0 group-hover:opacity-100"
                    aria-label="Delete interview"
                    onClick={(e) => onDelete(e, s.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}