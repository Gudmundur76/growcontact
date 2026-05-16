import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getScreener, rescoreSubmission, markReviewed, updateScreener } from "@/server/screening.functions";
import { ArrowLeft, Copy, Loader2, RefreshCcw, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/screening/$id")({
  head: () => ({ meta: [{ title: "Screener — Grow" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ProtectedRoute>
      <ScreenerDetail />
    </ProtectedRoute>
  ),
});

function ScreenerDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchOne = useServerFn(getScreener);
  const rescoreFn = useServerFn(rescoreSubmission);
  const reviewFn = useServerFn(markReviewed);
  const toggleFn = useServerFn(updateScreener);
  const { data, isLoading, error } = useQuery({
    queryKey: ["screener", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  const shareUrl =
    typeof window !== "undefined" && data?.screener
      ? `${window.location.origin}/screen/${data.screener.share_token}`
      : "";

  const rescore = useMutation({
    mutationFn: rescoreFn,
    onSuccess: () => {
      toast.success("Rescored");
      qc.invalidateQueries({ queryKey: ["screener", id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const review = useMutation({
    mutationFn: reviewFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["screener", id] }),
  });
  const toggle = useMutation({
    mutationFn: toggleFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["screener", id] }),
  });

  return (
    <>
      <Navbar />
      <section className="relative px-6 py-16">
        <div className="mx-auto max-w-5xl space-y-8">
          <Link to="/screening" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> All screeners
          </Link>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{(error as Error).message}</div>
          ) : !data ? null : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">{data.screener.name}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{data.screener.role_title ?? "Untitled role"} · {data.screener.format}</p>
                </div>
                <Button
                  variant="heroSecondary"
                  onClick={() => toggle.mutate({ data: { id, isActive: !data.screener.is_active } })}
                >
                  {data.screener.is_active ? "Pause" : "Activate"}
                </Button>
              </div>

              <div className="liquid-glass rounded-2xl bg-card/40 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Candidate share link</p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg bg-white/5 px-3 py-2 text-sm text-foreground">{shareUrl}</code>
                  <Button variant="heroSecondary" size="sm" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copied"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="liquid-glass rounded-2xl bg-card/40 p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Questions</h2>
                  <ol className="mt-4 space-y-3 text-sm text-foreground/90">
                    {(data.screener.questions as { id: string; prompt: string }[]).map((q, i) => (
                      <li key={q.id}><span className="text-muted-foreground">{i + 1}.</span> {q.prompt}</li>
                    ))}
                  </ol>
                </div>
                <div className="liquid-glass rounded-2xl bg-card/40 p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Rubric</h2>
                  <ul className="mt-4 space-y-2 text-sm text-foreground/90">
                    {(data.screener.rubric as { name: string }[]).length === 0 ? (
                      <li className="text-muted-foreground">No rubric</li>
                    ) : (
                      (data.screener.rubric as { name: string }[]).map((r) => <li key={r.name}>· {r.name}</li>)
                    )}
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-lg font-semibold text-foreground">Submissions ({data.submissions.length})</h2>
                {data.submissions.length === 0 ? (
                  <div className="liquid-glass rounded-2xl bg-card/40 p-10 text-center text-sm text-muted-foreground">
                    No submissions yet. Share the link above to start collecting responses.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {data.submissions.map((s) => (
                      <li key={s.id} className="liquid-glass rounded-2xl bg-card/40 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold text-foreground">{s.candidate_name}</div>
                            <div className="text-xs text-muted-foreground">{s.candidate_email ?? "no email"} · {new Date(s.submitted_at).toLocaleString()}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            {typeof s.ai_score === "number" ? (
                              <div className="text-right">
                                <div className="text-2xl font-semibold tracking-tight text-foreground">{s.ai_score}</div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.ai_recommendation ?? "—"}</div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">{s.status}</span>
                            )}
                          </div>
                        </div>
                        {s.ai_summary ? <p className="mt-3 text-sm text-foreground/85">{s.ai_summary}</p> : null}
                        {(s.ai_strengths as string[])?.length ? (
                          <div className="mt-3 text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">Strengths:</span> {(s.ai_strengths as string[]).join(" · ")}</div>
                        ) : null}
                        {(s.ai_concerns as string[])?.length ? (
                          <div className="mt-1 text-xs text-muted-foreground"><span className="font-semibold text-foreground/80">Concerns:</span> {(s.ai_concerns as string[]).join(" · ")}</div>
                        ) : null}
                        <div className="mt-4 flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => rescore.mutate({ data: { id: s.id } })} disabled={rescore.isPending}>
                            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Rescore
                          </Button>
                          {s.status !== "reviewed" ? (
                            <Button size="sm" variant="ghost" onClick={() => review.mutate({ data: { id: s.id } })}>
                              <Check className="mr-1.5 h-3.5 w-3.5" /> Mark reviewed
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
