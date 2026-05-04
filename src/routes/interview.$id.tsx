import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  endInterview,
  finalizeScorecard,
  generateLiveSuggestionsFn,
  setSessionShareV2,
  updateScorecard,
  addManualTranscript,
  addBulkTranscript,
} from "@/server/interviews.functions";
import { toast } from "sonner";
import {
  Sparkles,
  AlertTriangle,
  CircleDot,
  StopCircle,
  FileText,
  ArrowLeft,
  Share2,
  Copy,
  Download,
  Zap,
  Plus,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SessionRow = {
  id: string;
  candidate_name: string;
  role_title: string;
  job_description: string | null;
  meeting_url: string;
  meeting_platform: string;
  status: string;
  recall_bot_id: string | null;
  share_token?: string | null;
  share_expires_at?: string | null;
};
type EventRow = {
  id: string;
  kind: "transcript" | "suggestion" | "red_flag" | "status";
  speaker: string | null;
  content: string;
  created_at: string;
};
type ScorecardRow = {
  summary: string;
  overall_rating: number | null;
  recommendation: string | null;
  strengths: unknown;
  concerns: unknown;
  competencies: unknown;
  follow_ups: unknown;
};

export const Route = createFileRoute("/interview/$id")({
  head: () => ({
    meta: [
      { title: "Live interview — Grow" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LiveInterviewPage,
});

function asArray(x: unknown): string[] {
  return Array.isArray(x) ? x.map((v) => String(v)) : [];
}
function asCompetencies(x: unknown): { name: string; rating: number; notes: string }[] {
  if (!Array.isArray(x)) return [];
  return x
    .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : null))
    .filter((c): c is Record<string, unknown> => !!c)
    .map((c) => ({
      name: String(c.name ?? ""),
      rating: Number(c.rating ?? 0),
      notes: String(c.notes ?? ""),
      evidence: Array.isArray(c.evidence) ? (c.evidence as unknown[]).map((e) => String(e)) : [],
    }));
}

function LiveInterviewPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [scorecard, setScorecard] = useState<ScorecardRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"end" | "finalize" | "suggest" | null>(null);
  const [autoSuggest, setAutoSuggest] = useState(false);
  const [manualSpeaker, setManualSpeaker] = useState("Candidate");
  const [manualText, setManualText] = useState("");
  const [addingTranscript, setAddingTranscript] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ScorecardRow | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const transcriptScroll = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  const transcript = useMemo(() => events.filter((e) => e.kind === "transcript"), [events]);
  const suggestions = useMemo(() => events.filter((e) => e.kind === "suggestion"), [events]);
  const redFlags = useMemo(() => events.filter((e) => e.kind === "red_flag"), [events]);
  const statuses = useMemo(() => events.filter((e) => e.kind === "status"), [events]);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  // Initial load
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: s }, { data: ev }, { data: card }] = await Promise.all([
        supabase
          .from("interview_sessions")
          .select(
            "id, candidate_name, role_title, job_description, meeting_url, meeting_platform, status, recall_bot_id, share_token, share_expires_at",
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("interview_events")
          .select("id, kind, speaker, content, created_at")
          .eq("session_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("interview_scorecards")
          .select("summary, overall_rating, recommendation, strengths, concerns, competencies, follow_ups")
          .eq("session_id", id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setSession(s as SessionRow | null);
      setEvents((ev ?? []) as EventRow[]);
      setScorecard(card as ScorecardRow | null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`interview-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "interview_events", filter: `session_id=eq.${id}` },
        (payload) => {
          setEvents((prev) => [...prev, payload.new as EventRow]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "interview_sessions", filter: `id=eq.${id}` },
        (payload) => {
          setSession((prev) => (prev ? { ...prev, ...(payload.new as SessionRow) } : prev));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  // Auto-scroll transcript when user is near bottom; otherwise show jump pill
  useEffect(() => {
    const el = transcriptScroll.current;
    if (!el) {
      transcriptEnd.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) {
      transcriptEnd.current?.scrollIntoView({ behavior: "smooth" });
      setShowJumpToLatest(false);
    } else {
      setShowJumpToLatest(true);
    }
  }, [transcript.length]);

  // Auto-suggestions every 60s while toggled on and the call is live
  useEffect(() => {
    if (!autoSuggest) return;
    const tick = async () => {
      try {
        await callServer(generateLiveSuggestionsFn);
      } catch (e) {
        console.error("auto-suggest failed", e);
      }
    };
    tick();
    const handle = window.setInterval(tick, 60_000);
    return () => window.clearInterval(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSuggest, id]);

  async function callServer<T>(fn: (args: { data: { sessionId: string }; headers?: Record<string, string> }) => Promise<T>) {
    const { data: { session: s } } = await supabase.auth.getSession();
    return fn({
      data: { sessionId: id },
      headers: s?.access_token ? { Authorization: `Bearer ${s.access_token}` } : undefined,
    });
  }

  async function onSuggest() {
    setBusy("suggest");
    try {
      await callServer(generateLiveSuggestionsFn);
      toast.success("New suggestions generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  // Keyboard shortcuts: Cmd/Ctrl+K → suggest follow-ups
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (busy === null && !completedRef.current) void onSuggest();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  function jumpToLatest() {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth" });
    setShowJumpToLatest(false);
  }

  function startEdit() {
    if (!scorecard) return;
    setDraft(JSON.parse(JSON.stringify(scorecard)) as ScorecardRow);
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setDraft(null);
  }
  async function saveEdit() {
    if (!draft) return;
    setSavingEdit(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const comps = asCompetencies(draft.competencies);
      await updateScorecard({
        data: {
          sessionId: id,
          summary: draft.summary,
          overall_rating: draft.overall_rating,
          recommendation: (draft.recommendation as
            | "strong_hire" | "hire" | "no_hire" | "strong_no_hire" | "more_info"
            | null) ?? null,
          strengths: asArray(draft.strengths).map((x) => x.trim()).filter(Boolean),
          concerns: asArray(draft.concerns).map((x) => x.trim()).filter(Boolean),
          competencies: comps.map((c) => ({ name: c.name, rating: c.rating, notes: c.notes })),
          follow_ups: asArray(draft.follow_ups).map((x) => x.trim()).filter(Boolean),
        },
        headers: s?.access_token ? { Authorization: `Bearer ${s.access_token}` } : undefined,
      });
      setScorecard(draft);
      setEditing(false);
      setDraft(null);
      toast.success("Scorecard saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingEdit(false);
    }
  }

  async function onEnd() {
    setBusy("end");
    try {
      await callServer(endInterview);
      toast.success("Interview ended");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }
  async function onFinalize() {
    setBusy("finalize");
    try {
      const r = await callServer(finalizeScorecard) as { scorecard: ScorecardRow };
      setScorecard(r.scorecard);
      toast.success("Scorecard generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function onToggleShare() {
    const enabled = !session?.share_token;
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const r = await setSessionShareV2({
        data: { sessionId: id, enabled, expiresInDays: 14 },
        headers: s?.access_token ? { Authorization: `Bearer ${s.access_token}` } : undefined,
      });
      setSession((prev) => (prev ? { ...prev, share_token: r.token, share_expires_at: r.expiresAt } : prev));
      if (r.token) {
        const url = `${window.location.origin}/share/scorecard/${r.token}`;
        await navigator.clipboard.writeText(url).catch(() => {});
        toast.success("Share link copied (expires in 14 days)", { description: url });
      } else {
        toast.success("Share link revoked");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function onAddManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualText.trim()) return;
    setAddingTranscript(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      await addManualTranscript({
        data: { sessionId: id, speaker: manualSpeaker.trim() || "Speaker", content: manualText.trim() },
        headers: s?.access_token ? { Authorization: `Bearer ${s.access_token}` } : undefined,
      });
      setManualText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add line");
    } finally {
      setAddingTranscript(false);
    }
  }

  async function onBulkPaste() {
    if (!bulkText.trim()) return;
    setBulkBusy(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const r = await addBulkTranscript({
        data: { sessionId: id, text: bulkText },
        headers: s?.access_token ? { Authorization: `Bearer ${s.access_token}` } : undefined,
      });
      toast.success(`Imported ${r.count} lines`);
      setBulkText("");
      setBulkOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBulkBusy(false);
    }
  }

  function buildMarkdown(): string {
    if (!session || !scorecard) return "";
    const lines: string[] = [];
    lines.push(`# Interview scorecard — ${session.candidate_name}`);
    lines.push(`**Role:** ${session.role_title}`);
    lines.push(
      `**Overall:** ${scorecard.overall_rating ?? "—"}/5 · ${(scorecard.recommendation ?? "").replace(/_/g, " ")}`,
    );
    lines.push("");
    lines.push("## Summary");
    lines.push(scorecard.summary);
    lines.push("");
    const strengths = asArray(scorecard.strengths);
    if (strengths.length) {
      lines.push("## Strengths");
      strengths.forEach((s) => lines.push(`- ${s}`));
      lines.push("");
    }
    const concerns = asArray(scorecard.concerns);
    if (concerns.length) {
      lines.push("## Concerns");
      concerns.forEach((s) => lines.push(`- ${s}`));
      lines.push("");
    }
    const comps = asCompetencies(scorecard.competencies);
    if (comps.length) {
      lines.push("## Competencies");
      comps.forEach((c) => lines.push(`- **${c.name}** — ${c.rating}/5 · ${c.notes}`));
      lines.push("");
    }
    const fups = asArray(scorecard.follow_ups);
    if (fups.length) {
      lines.push("## Follow-up questions");
      fups.forEach((s) => lines.push(`- ${s}`));
    }
    return lines.join("\n");
  }

  async function onCopyMarkdown() {
    const md = buildMarkdown();
    if (!md) return;
    await navigator.clipboard.writeText(md);
    toast.success("Markdown copied to clipboard");
  }
  function onDownloadMarkdown() {
    const md = buildMarkdown();
    if (!md || !session) return;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.candidate_name.replace(/\s+/g, "_")}_scorecard.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-6xl px-4 pb-24 pt-32 text-muted-foreground">
          Loading…
        </main>
        <Footer />
      </div>
    );
  }
  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-6xl px-4 pb-24 pt-32">
          <p>Interview not found.</p>
          <Button asChild className="mt-4">
            <Link to="/interview">Back to interviews</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const inCall = session.status === "in_call" || session.status === "joining";
  const completed = session.status === "completed";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 pb-24 pt-32">
        <Link to="/interview" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All interviews
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">{session.candidate_name}</h1>
            <p className="text-muted-foreground">
              {session.role_title} ·{" "}
              <span className="capitalize">{session.meeting_platform.replace("_", " ")}</span> ·{" "}
              <span className="capitalize">{session.status.replace("_", " ")}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={autoSuggest ? "default" : "outline"}
              onClick={() => setAutoSuggest((v) => !v)}
              disabled={completed}
            >
              <Zap className="size-4" /> {autoSuggest ? "Auto-suggest on" : "Auto-suggest"}
            </Button>
            <Button variant="outline" onClick={onSuggest} disabled={busy !== null}>
              <Sparkles className="size-4" /> {busy === "suggest" ? "Thinking…" : "Suggest follow-ups"}
            </Button>
            {!completed && (
              <Button variant="outline" onClick={onEnd} disabled={busy !== null}>
                <StopCircle className="size-4" /> End interview
              </Button>
            )}
            {!completed && (
              <Button variant="outline" onClick={() => setBulkOpen((v) => !v)}>
                <Plus className="size-4" /> Paste full transcript
              </Button>
            )}
            <Button onClick={onFinalize} disabled={busy !== null}>
              <FileText className="size-4" /> {busy === "finalize" ? "Generating…" : "Generate scorecard"}
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          {bulkOpen && !completed && (
            <div className="lg:col-span-2 rounded-xl border bg-card p-4 space-y-3">
              <div className="text-sm font-medium">Paste full transcript</div>
              <p className="text-xs text-muted-foreground">
                Format: one speaker per line, e.g. <code>Alex: I led the migration…</code>. Blank lines split turns.
              </p>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={10}
                placeholder={"Interviewer: Walk me through your last project.\n\nCandidate: I led the migration from…"}
              />
              <div className="flex gap-2">
                <Button onClick={onBulkPaste} disabled={bulkBusy || !bulkText.trim()}>
                  {bulkBusy ? "Importing…" : "Import"}
                </Button>
                <Button variant="ghost" onClick={() => setBulkOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}
          <section className="rounded-xl border bg-card">
            <header className="flex items-center gap-2 border-b px-4 py-3 text-sm font-medium">
              <CircleDot className={`size-3 ${inCall ? "text-emerald-500" : "text-muted-foreground"}`} />
              Live transcript
            </header>
            <div ref={transcriptScroll} className="relative max-h-[60vh] space-y-3 overflow-y-auto p-4">
              {transcript.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Waiting for the bot to join and start transcribing…
                </p>
              ) : (
                transcript.map((e) => (
                  <div key={e.id} className="text-sm">
                    <span className="font-medium">{e.speaker ?? "Speaker"}:</span>{" "}
                    <span className="text-muted-foreground">{e.content}</span>
                  </div>
                ))
              )}
              <div ref={transcriptEnd} />
            </div>
            {showJumpToLatest && (
              <button
                onClick={jumpToLatest}
                className="pointer-events-auto mx-auto -mt-10 mb-2 block rounded-full border bg-background/90 px-3 py-1 text-xs shadow-sm hover:bg-background"
              >
                Jump to latest ↓
              </button>
            )}
            {!completed && (
              <form
                onSubmit={onAddManual}
                className="flex flex-col gap-2 border-t bg-background/40 p-3 sm:flex-row"
              >
                <Input
                  value={manualSpeaker}
                  onChange={(e) => setManualSpeaker(e.target.value)}
                  className="sm:w-32"
                  placeholder="Speaker"
                  maxLength={120}
                />
                <Textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      void onAddManual(e as unknown as React.FormEvent);
                    }
                  }}
                  placeholder="Paste or type a transcript line… (⌘↵ to add, no bot needed)"
                  rows={2}
                  maxLength={8000}
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={addingTranscript || !manualText.trim()}>
                  <Plus className="size-4" /> Add
                </Button>
              </form>
            )}
          </section>

          <aside className="space-y-6">
            <div className="rounded-xl border bg-card">
              <header className="flex items-center gap-2 border-b px-4 py-3 text-sm font-medium">
                <Sparkles className="size-4 text-violet-500" /> Copilot suggestions
              </header>
              <ul className="space-y-2 p-4 text-sm">
                {suggestions.length === 0 ? (
                  <li className="text-muted-foreground">
                    Click "Suggest follow-ups" to generate.
                  </li>
                ) : (
                  suggestions.slice(-8).reverse().map((e) => (
                    <li key={e.id} className="rounded-md border bg-background p-2">
                      {e.content}
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-xl border bg-card">
              <header className="flex items-center gap-2 border-b px-4 py-3 text-sm font-medium">
                <AlertTriangle className="size-4 text-amber-500" /> Red flags
              </header>
              <ul className="space-y-2 p-4 text-sm">
                {redFlags.length === 0 ? (
                  <li className="text-muted-foreground">None surfaced.</li>
                ) : (
                  redFlags.slice(-5).reverse().map((e) => (
                    <li key={e.id} className="rounded-md border bg-background p-2">
                      {e.content}
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-xl border bg-card">
              <header className="border-b px-4 py-3 text-sm font-medium">Activity</header>
              <ul className="space-y-1 p-4 text-xs text-muted-foreground">
                {statuses.slice(-6).reverse().map((e) => (
                  <li key={e.id}>· {e.content}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {scorecard && (
          <section className="mt-10 rounded-xl border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-medium tracking-tight">Scorecard</h2>
              <div className="flex flex-wrap gap-2">
                {!editing && (
                  <>
                    <Button variant="outline" size="sm" onClick={onFinalize} disabled={busy !== null}>
                      <RefreshCw className="size-4" /> {busy === "finalize" ? "Regenerating…" : "Regenerate"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={startEdit}>
                      <Pencil className="size-4" /> Edit
                    </Button>
                  </>
                )}
                {editing && (
                  <>
                    <Button size="sm" onClick={saveEdit} disabled={savingEdit}>
                      {savingEdit ? "Saving…" : "Save"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={savingEdit}>
                      Cancel
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={onToggleShare}>
                  <Share2 className="size-4" />
                  {session.share_token ? "Revoke share link" : "Share link"}
                </Button>
                <Button variant="outline" size="sm" onClick={onCopyMarkdown}>
                  <Copy className="size-4" /> Copy Markdown
                </Button>
                <Button variant="outline" size="sm" onClick={onDownloadMarkdown}>
                  <Download className="size-4" /> Download .md
                </Button>
              </div>
            </div>
            {session.share_token && (
              <p className="mt-2 break-all text-xs text-muted-foreground">
                Public link:{" "}
                <span className="text-primary">
                  {`${typeof window !== "undefined" ? window.location.origin : ""}/share/scorecard/${session.share_token}`}
                </span>
                {session.share_expires_at && (
                  <span className="ml-2 text-muted-foreground">
                    · expires {new Date(session.share_expires_at).toLocaleDateString()}
                  </span>
                )}
              </p>
            )}
            {editing && draft ? (
              <ScorecardEditor draft={draft} setDraft={setDraft} />
            ) : (
              <ScorecardView card={scorecard} />
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function ScorecardView({ card }: { card: ScorecardRow }) {
  return (
    <>
      <div className="mt-4 grid gap-6 md:grid-cols-[200px_1fr]">
        <div>
          <div className="text-5xl font-semibold">{card.overall_rating ?? "—"}/5</div>
          <div className="mt-1 text-sm capitalize text-muted-foreground">
            {(card.recommendation ?? "").replace(/_/g, " ")}
          </div>
        </div>
        <p className="text-sm leading-relaxed">{card.summary}</p>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Strengths</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {asArray(card.strengths).map((s, i) => <li key={i}>· {s}</li>)}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Concerns</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {asArray(card.concerns).map((s, i) => <li key={i}>· {s}</li>)}
          </ul>
        </div>
      </div>
      <div className="mt-6">
        <h3 className="text-sm font-semibold">Competencies</h3>
        <ul className="mt-2 divide-y rounded-md border">
          {asCompetencies(card.competencies).map((c, i) => (
            <li key={i} className="flex items-start justify-between gap-4 p-3">
              <div>
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.notes}</div>
              </div>
              <div className="text-sm font-semibold">{c.rating}/5</div>
            </li>
          ))}
        </ul>
      </div>
      {asArray(card.follow_ups).length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">Follow-up questions</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {asArray(card.follow_ups).map((s, i) => <li key={i}>· {s}</li>)}
          </ul>
        </div>
      )}
    </>
  );
}

function ScorecardEditor({
  draft,
  setDraft,
}: {
  draft: ScorecardRow;
  setDraft: (c: ScorecardRow) => void;
}) {
  const update = (patch: Partial<ScorecardRow>) => setDraft({ ...draft, ...patch });
  const strengths = asArray(draft.strengths);
  const concerns = asArray(draft.concerns);
  const followUps = asArray(draft.follow_ups);
  const comps = asCompetencies(draft.competencies);
  return (
    <div className="mt-4 space-y-6">
      <div className="grid gap-3 md:grid-cols-[200px_1fr]">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Overall rating</label>
          <Input
            type="number"
            min={1}
            max={5}
            value={draft.overall_rating ?? ""}
            onChange={(e) => update({ overall_rating: e.target.value ? Number(e.target.value) : null })}
          />
          <label className="text-xs font-medium text-muted-foreground">Recommendation</label>
          <select
            value={draft.recommendation ?? ""}
            onChange={(e) => update({ recommendation: e.target.value || null })}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">—</option>
            <option value="strong_hire">strong hire</option>
            <option value="hire">hire</option>
            <option value="more_info">more info</option>
            <option value="no_hire">no hire</option>
            <option value="strong_no_hire">strong no hire</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Summary</label>
          <Textarea
            value={draft.summary}
            onChange={(e) => update({ summary: e.target.value })}
            rows={5}
            maxLength={8000}
          />
        </div>
      </div>

      <ListEditor
        label="Strengths"
        items={strengths}
        onChange={(items) => update({ strengths: items })}
      />
      <ListEditor
        label="Concerns"
        items={concerns}
        onChange={(items) => update({ concerns: items })}
      />

      <div>
        <div className="mb-2 text-sm font-semibold">Competencies</div>
        <ul className="space-y-2">
          {comps.map((c, i) => (
            <li key={i} className="grid grid-cols-[1fr_80px_1fr_auto] items-start gap-2">
              <Input
                value={c.name}
                onChange={(e) => {
                  const next = [...comps];
                  next[i] = { ...c, name: e.target.value };
                  update({ competencies: next });
                }}
              />
              <Input
                type="number"
                min={1}
                max={5}
                value={c.rating}
                onChange={(e) => {
                  const next = [...comps];
                  next[i] = { ...c, rating: Math.min(5, Math.max(1, Number(e.target.value) || 1)) };
                  update({ competencies: next });
                }}
              />
              <Input
                value={c.notes}
                onChange={(e) => {
                  const next = [...comps];
                  next[i] = { ...c, notes: e.target.value };
                  update({ competencies: next });
                }}
                placeholder="Notes"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => update({ competencies: comps.filter((_, j) => j !== i) })}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() =>
            update({ competencies: [...comps, { name: "New competency", rating: 3, notes: "" }] })
          }
        >
          <Plus className="size-4" /> Add competency
        </Button>
      </div>

      <ListEditor
        label="Follow-up questions"
        items={followUps}
        onChange={(items) => update({ follow_ups: items })}
      />
    </div>
  );
}

function ListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold">{label}</div>
      <ul className="space-y-2">
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <Textarea
              value={s}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              rows={2}
              maxLength={500}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => onChange([...items, ""])}
      >
        <Plus className="size-4" /> Add
      </Button>
    </div>
  );
}