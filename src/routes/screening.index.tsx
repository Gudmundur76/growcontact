import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  ClipboardCheck,
  Plus,
  Loader2,
  Trash2,
  ExternalLink,
  Users,
  Star,
} from "lucide-react";
import { createScreener, listScreeners } from "@/server/screening.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/screening")({
  head: () => ({
    meta: [{ title: "Async Screening — Grow" }, { name: "robots", content: "noindex" }],
  }),
  component: ScreeningWrapper,
});

function ScreeningWrapper() {
  return (
    <ProtectedRoute>
      <ScreeningIndex />
    </ProtectedRoute>
  );
}

function ScreeningIndex() {
  const fetchScreeners = useServerFn(listScreeners);
  const { data, isLoading, error } = useQuery({
    queryKey: ["screeners"],
    queryFn: () => fetchScreeners(),
  });
  const [open, setOpen] = useState(false);

  return (
    <>
      <Navbar />
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Async Screening
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                Screen 10× more candidates.
              </h1>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground">
                Send a screener link — candidates answer on their schedule. AI scores responses
                against your rubric and ranks summaries automatically.
              </p>
            </div>
            <Button variant="hero" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New screener
            </Button>
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {(error as Error).message}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (data?.screeners.length ?? 0) === 0 ? (
            <div className="liquid-glass flex flex-col items-center justify-center rounded-3xl bg-card/40 p-16 text-center">
              <ClipboardCheck className="mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">No screeners yet</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Create your first screener with the questions and rubric for a role, then share
                the link with candidates.
              </p>
              <Button variant="heroSecondary" className="mt-6" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create screener
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data!.screeners.map((s) => {
                const c = data!.counts[s.id] ?? { total: 0, scored: 0, avg: null };
                return (
                  <Link
                    key={s.id}
                    to="/screening/$id"
                    params={{ id: s.id }}
                    className="liquid-glass group rounded-2xl bg-card/40 p-6 transition hover:bg-card/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{s.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {s.role_title ?? "Untitled role"} · {s.format}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                          s.is_active
                            ? "bg-primary/15 text-primary"
                            : "bg-white/5 text-muted-foreground"
                        }`}
                      >
                        {s.is_active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4" /> {c.total} submission{c.total === 1 ? "" : "s"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Star className="h-4 w-4" />{" "}
                        {c.avg !== null ? `${c.avg} avg` : "—"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <Footer />
      <CreateScreenerDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function CreateScreenerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createFn = useServerFn(createScreener);
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<"text" | "code" | "video">("text");
  const [questionsText, setQuestionsText] = useState(
    "Walk me through a recent project you're proud of.\nWhat's the hardest technical decision you made in the last 6 months?\nHow do you approach learning a new technology?",
  );
  const [rubricText, setRubricText] = useState("Technical depth\nCommunication\nOwnership");

  const m = useMutation({
    mutationFn: createFn,
    onSuccess: (row) => {
      toast.success("Screener created");
      qc.invalidateQueries({ queryKey: ["screeners"] });
      onOpenChange(false);
      navigate({ to: "/screening/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function handleSubmit() {
    const questions = questionsText
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean)
      .map((q, i) => ({ id: `q${i + 1}`, prompt: q }));
    const rubric = rubricText
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    if (!name.trim()) return toast.error("Name is required");
    if (questions.length === 0) return toast.error("Add at least one question");
    m.mutate({
      data: {
        name: name.trim(),
        roleTitle: roleTitle.trim() || null,
        description: description.trim() || null,
        format,
        questions,
        rubric,
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New screener</DialogTitle>
          <DialogDescription>
            One question per line. Candidates will see a public form — no account required.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="screener-name">Screener name</Label>
              <Input
                id="screener-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Senior PM screening"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="screener-role">Role title</Label>
              <Input
                id="screener-role"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Senior Product Manager"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Format</Label>
            <div className="inline-flex rounded-full border border-white/10 bg-card/40 p-1">
              {(["text", "code", "video"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    format === f
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  disabled={f === "video"}
                  title={f === "video" ? "Coming soon" : undefined}
                >
                  {f === "text" ? "Text" : f === "code" ? "Code challenge" : "Video (soon)"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="screener-desc">Description / context for the candidate</Label>
            <Textarea
              id="screener-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What we're looking for, time expectation, etc."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="screener-questions">Questions (one per line)</Label>
            <Textarea
              id="screener-questions"
              value={questionsText}
              onChange={(e) => setQuestionsText(e.target.value)}
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="screener-rubric">Rubric competencies (one per line)</Label>
            <Textarea
              id="screener-rubric"
              value={rubricText}
              onChange={(e) => setRubricText(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="hero" onClick={handleSubmit} disabled={m.isPending}>
            {m.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create screener
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
