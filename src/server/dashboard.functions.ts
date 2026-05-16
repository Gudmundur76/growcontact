import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dbError } from "./db-errors";

const RANGES = { "7d": 7, "30d": 30, all: null } as const;
export type DashboardRange = keyof typeof RANGES;

export const getDashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { range?: DashboardRange } | undefined) => ({
    range: (input?.range && input.range in RANGES ? input.range : "7d") as DashboardRange,
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const nowIso = new Date().toISOString();
    const days = RANGES[data.range];
    const sinceIso = days == null ? null : new Date(Date.now() - days * 86_400_000).toISOString();
    const applySince = <T extends { gte: (col: string, v: string) => T }>(q: T, col: string) =>
      sinceIso ? q.gte(col, sinceIso) : q;

    const [
      searches,
      shortlists,
      shortlistMembers,
      upcomingInterviews,
      recentInterviews,
      recentSends,
      recentScorecards,
    ] = await Promise.all([
      supabase
        .from("sourcing_searches")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("sourcing_shortlists")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("sourcing_shortlist_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("interview_sessions")
        .select("id, candidate_name, role_title, started_at, status, meeting_url")
        .eq("user_id", userId)
        .in("status", ["pending", "scheduled", "in_progress"])
        .gte("started_at", nowIso)
        .order("started_at", { ascending: true })
        .limit(5),
      applySince(supabase
        .from("interview_sessions")
        .select("id, candidate_name, role_title, status, updated_at")
        .eq("user_id", userId), "updated_at")
        .order("updated_at", { ascending: false })
        .limit(5),
      applySince(supabase
        .from("sourcing_sends")
        .select("id, recipient_email, subject, sent_at, status")
        .eq("user_id", userId), "sent_at")
        .order("sent_at", { ascending: false })
        .limit(5),
      applySince(supabase
        .from("interview_scorecards")
        .select("id, session_id, summary, recommendation, created_at, interview_sessions!inner(user_id, candidate_name)")
        .eq("interview_sessions.user_id", userId), "created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    for (const r of [searches, shortlists, shortlistMembers, upcomingInterviews, recentInterviews, recentSends, recentScorecards]) {
      if (r.error) throw dbError(r.error, "dashboard.functions");
    }

    const sendsCount = (recentSends.data ?? []).length;
    let totalSendsQuery = supabase
      .from("sourcing_sends")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (sinceIso) totalSendsQuery = totalSendsQuery.gte("sent_at", sinceIso);
    const { count: totalSends } = await totalSendsQuery;

    return {
      range: data.range,
      kpis: {
        openSearches: searches.count ?? 0,
        shortlists: shortlists.count ?? 0,
        shortlistedCandidates: shortlistMembers.count ?? 0,
        upcomingInterviews: (upcomingInterviews.data ?? []).length,
        outreachLast7d: totalSends ?? sendsCount,
        outreachInRange: totalSends ?? sendsCount,
      },
      upcomingInterviews: upcomingInterviews.data ?? [],
      recentInterviews: recentInterviews.data ?? [],
      recentSends: recentSends.data ?? [],
      recentScorecards: (recentScorecards.data ?? []).map((s: any) => ({
        id: s.id,
        session_id: s.session_id,
        summary: s.summary,
        recommendation: s.recommendation,
        created_at: s.created_at,
        candidate_name: s.interview_sessions?.candidate_name ?? null,
      })),
    };
  });