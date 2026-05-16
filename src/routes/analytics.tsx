import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getPredictiveAnalytics } from "@/server/analytics.functions";
import { Loader2, RefreshCcw, TrendingUp, Users, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [{ title: "Predictive Analytics — Grow" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <ProtectedRoute>
      <AnalyticsPage />
    </ProtectedRoute>
  ),
});

function AnalyticsPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getPredictiveAnalytics);
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics-forecast"],
    queryFn: () => fetchFn({ data: { force: false } }),
  });

  const refresh = useMutation({
    mutationFn: () => fetchFn({ data: { force: true } }),
    onSuccess: (d) => {
      qc.setQueryData(["analytics-forecast"], d);
      toast.success("Forecast refreshed");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <>
      <Navbar />
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Predictive Analytics
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                See the hire before it happens.
              </h1>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground">
                Forecasts time-to-hire per role, offer-acceptance probability and 12-month
                retention risk from your interview history. Cached hourly.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {data?.cached ? (
                <span className="text-xs text-muted-foreground">
                  Cached · {new Date(data.generatedAt).toLocaleTimeString()}
                </span>
              ) : null}
              <Button
                variant="heroSecondary"
                onClick={() => refresh.mutate()}
                disabled={refresh.isPending}
              >
                {refresh.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Recompute
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {(error as Error).message}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data ? null : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Kpi
                  icon={Clock}
                  label="Avg time to hire"
                  value={data.overall.avgDaysToHire !== null ? `${data.overall.avgDaysToHire}d` : "—"}
                  hint="Historical baseline"
                />
                <Kpi
                  icon={TrendingUp}
                  label="Offer acceptance"
                  value={`${Math.round(data.overall.avgOfferAcceptance * 100)}%`}
                  hint="Top candidates · weighted"
                />
                <Kpi
                  icon={ShieldCheck}
                  label="12mo retention"
                  value={`${Math.round(data.overall.avgRetention12mo * 100)}%`}
                  hint="Predicted holding rate"
                />
                <Kpi
                  icon={Users}
                  label="Active pipeline"
                  value={`${data.overall.pipeline}`}
                  hint={`${data.overall.hires} hires (180d)`}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="liquid-glass rounded-2xl bg-card/40 p-6">
                  <h2 className="text-lg font-semibold text-foreground">Time-to-hire by role</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Forecast applies a 15% improvement over your current baseline as the funnel matures.
                  </p>
                  {data.roleForecasts.length === 0 ? (
                    <p className="mt-6 text-sm text-muted-foreground">
                      No completed interviews yet — forecasts will appear after your first scorecard.
                    </p>
                  ) : (
                    <ul className="mt-5 space-y-3">
                      {data.roleForecasts.map((r) => (
                        <li
                          key={r.role}
                          className="flex items-center justify-between gap-3 border-t border-white/5 pt-3 first:border-0 first:pt-0"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{r.role}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.totalInterviews} interviews · {r.hired} hires
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-semibold tracking-tight text-foreground">
                              {r.forecastDays !== null ? `${r.forecastDays}d` : "—"}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              forecast · base {r.avgDaysToHire ?? "—"}d
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="liquid-glass rounded-2xl bg-card/40 p-6">
                  <h2 className="text-lg font-semibold text-foreground">Candidate forecasts</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Offer acceptance × 12-month retention risk for your highest-rated candidates.
                  </p>
                  {data.topCandidates.length === 0 ? (
                    <p className="mt-6 text-sm text-muted-foreground">
                      Run an interview with a scorecard to see candidate-level forecasts.
                    </p>
                  ) : (
                    <ul className="mt-5 space-y-3">
                      {data.topCandidates.map((c) => (
                        <li
                          key={c.sessionId}
                          className="border-t border-white/5 pt-3 first:border-0 first:pt-0"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Link
                                to="/interview/$id"
                                params={{ id: c.sessionId }}
                                className="text-sm font-medium text-foreground hover:underline"
                              >
                                {c.candidate}
                              </Link>
                              <p className="text-xs text-muted-foreground">{c.role}</p>
                            </div>
                            <div className="flex gap-3 text-right text-xs">
                              <div>
                                <div className="text-base font-semibold text-foreground">
                                  {Math.round(c.offerAcceptanceProbability * 100)}%
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  accept
                                </div>
                              </div>
                              <div>
                                <div className="text-base font-semibold text-foreground">
                                  {Math.round((1 - c.retentionRisk12mo) * 100)}%
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  retain
                                </div>
                              </div>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">{c.signal}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="liquid-glass rounded-2xl bg-card/40 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}