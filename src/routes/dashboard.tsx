import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn as useSF } from "@tanstack/react-start";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getDashboardOverview, type DashboardRange } from "@/server/dashboard.functions";
import { Search, Users, Calendar, Mail, FileText, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Grow" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardWrapper,
});

function DashboardWrapper() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchOverview = useSF(getDashboardOverview);
  const [range, setRange] = useState<DashboardRange>("7d");
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-overview", user?.id, range],
    queryFn: () => fetchOverview({ data: { range } }),
    enabled: !!user,
  });

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed out");
      navigate({ to: "/" });
    }
  }

  const displayEmail = user?.email ?? "";
  const displayName =
    (user?.user_metadata?.name as string | undefined) ?? displayEmail.split("@")[0] ?? "there";

  const kpis = data?.kpis;
  const rangeLabel = range === "7d" ? "7d" : range === "30d" ? "30d" : "all time";
  const kpiCards = [
    { label: "Open searches", value: kpis?.openSearches ?? 0, icon: Search, to: "/sourcing/searches" as const },
    { label: "Shortlisted candidates", value: kpis?.shortlistedCandidates ?? 0, hint: `${kpis?.shortlists ?? 0} shortlists`, icon: Users, to: "/sourcing/shortlists" as const },
    { label: "Upcoming interviews", value: kpis?.upcomingInterviews ?? 0, icon: Calendar, to: "/interview" as const },
    { label: `Outreach (${rangeLabel})`, value: kpis?.outreachInRange ?? 0, icon: Mail, to: "/sourcing/activity" as const },
  ];

  return (
    <>
      <Navbar />
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Dashboard
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                Welcome back, {displayName}.
              </h1>
              {displayEmail ? (
                <p className="mt-2 text-sm text-muted-foreground">{displayEmail}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="hero" onClick={() => navigate({ to: "/interview/new" })}>
                New interview
              </Button>
              <Button variant="heroSecondary" onClick={() => navigate({ to: "/sourcing" })}>
                AI Sourcing
              </Button>
            </div>
          </div>

          {/* Range selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Range</span>
            <div className="inline-flex rounded-full border border-white/10 bg-card/40 p-1">
              {(["7d", "30d", "all"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    range === r
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r === "all" ? "All time" : r === "7d" ? "Last 7 days" : "Last 30 days"}
                </button>
              ))}
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {kpiCards.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.label}
                  to={c.to}
                  className="liquid-glass group rounded-2xl bg-card/40 p-5 transition hover:bg-card/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {c.label}
                    </span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : c.value}
                  </div>
                  {c.hint ? (
                    <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
                  ) : null}
                </Link>
              );
            })}
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Couldn't load dashboard: {(error as Error).message}
            </div>
          ) : null}

          {/* Two-column activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Upcoming interviews */}
            <div className="liquid-glass rounded-2xl bg-card/40 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Upcoming interviews</h2>
                <Link to="/interview" className="text-xs text-muted-foreground hover:text-foreground">
                  View all <ArrowRight className="ml-1 inline h-3 w-3" />
                </Link>
              </div>
              {isLoading ? (
                <SkeletonRows />
              ) : (data?.upcomingInterviews.length ?? 0) === 0 ? (
                <EmptyState
                  icon={Calendar}
                  text="No interviews scheduled."
                  cta={{ label: "Schedule one", to: "/interview/new" }}
                />
              ) : (
                <ul className="space-y-3">
                  {data!.upcomingInterviews.map((i) => (
                    <li key={i.id} className="flex items-start justify-between gap-3 border-t border-white/5 pt-3 first:border-0 first:pt-0">
                      <div>
                        <Link
                          to="/interview/$id"
                          params={{ id: i.id }}
                          className="text-sm font-medium text-foreground hover:underline"
                        >
                          {i.candidate_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{i.role_title}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {i.started_at ? new Date(i.started_at).toLocaleString() : "—"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent scorecards */}
            <div className="liquid-glass rounded-2xl bg-card/40 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Recent scorecards</h2>
                <Link to="/interview" className="text-xs text-muted-foreground hover:text-foreground">
                  View all <ArrowRight className="ml-1 inline h-3 w-3" />
                </Link>
              </div>
              {isLoading ? (
                <SkeletonRows />
              ) : (data?.recentScorecards.length ?? 0) === 0 ? (
                <EmptyState icon={FileText} text="No scorecards yet." />
              ) : (
                <ul className="space-y-3">
                  {data!.recentScorecards.map((s) => (
                    <li key={s.id} className="border-t border-white/5 pt-3 first:border-0 first:pt-0">
                      <Link
                        to="/interview/$id"
                        params={{ id: s.session_id }}
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {s.candidate_name ?? "Candidate"}
                      </Link>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{s.summary}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        {s.recommendation ?? "—"} · {new Date(s.created_at).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent outreach */}
            <div className="liquid-glass rounded-2xl bg-card/40 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Recent outreach</h2>
                <Link to="/sourcing/activity" className="text-xs text-muted-foreground hover:text-foreground">
                  View all <ArrowRight className="ml-1 inline h-3 w-3" />
                </Link>
              </div>
              {isLoading ? (
                <SkeletonRows />
              ) : (data?.recentSends.length ?? 0) === 0 ? (
                <EmptyState icon={Mail} text="No outreach sent yet." cta={{ label: "Start sourcing", to: "/sourcing" }} />
              ) : (
                <ul className="space-y-3">
                  {data!.recentSends.map((s) => (
                    <li key={s.id} className="border-t border-white/5 pt-3 first:border-0 first:pt-0">
                      <p className="text-sm font-medium text-foreground">{s.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        To {s.recipient_email} · {new Date(s.sent_at).toLocaleDateString()} · {s.status}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent interview activity */}
            <div className="liquid-glass rounded-2xl bg-card/40 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Recent interview activity</h2>
                <Link to="/interview" className="text-xs text-muted-foreground hover:text-foreground">
                  View all <ArrowRight className="ml-1 inline h-3 w-3" />
                </Link>
              </div>
              {isLoading ? (
                <SkeletonRows />
              ) : (data?.recentInterviews.length ?? 0) === 0 ? (
                <EmptyState icon={Users} text="No recent activity." />
              ) : (
                <ul className="space-y-3">
                  {data!.recentInterviews.map((i) => (
                    <li key={i.id} className="flex items-start justify-between gap-3 border-t border-white/5 pt-3 first:border-0 first:pt-0">
                      <div>
                        <Link
                          to="/interview/$id"
                          params={{ id: i.id }}
                          className="text-sm font-medium text-foreground hover:underline"
                        >
                          {i.candidate_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{i.role_title} · {i.status}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(i.updated_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Sign out */}
          <div className="border-t border-white/10 pt-6">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleSignOut}
            >
              Sign out
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  text,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  cta?: { label: string; to: "/interview/new" | "/sourcing" };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="mb-2 h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{text}</p>
      {cta ? (
        <Link
          to={cta.to}
          className="mt-3 text-xs font-medium text-primary hover:underline"
        >
          {cta.label} →
        </Link>
      ) : null}
    </div>
  );
}
