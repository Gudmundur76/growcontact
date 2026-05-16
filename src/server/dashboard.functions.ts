import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dbError } from "./db-errors";

export const getDashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const nowIso = new Date().toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

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
      supabase
        .from("interview_sessions")
        .select("id, candidate_name, role_title, status, updated_at")
        .eq("user_id", userId)
        .gte("updated_at", sevenDaysAgo)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("sourcing_sends")
        .select("id, recipient_email, subject, sent_at, status")
        .eq("user_id", userId)
        .order("sent_at", { ascending: false })
        .limit(5),
      supabase
        .from("interview_scorecards")
        .select("id, session_id, summary, recommendation, created_at, interview_sessions!inner(user_id, candidate_name)")
        .eq("interview_sessions.user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    for (const r of [searches, shortlists, shortlistMembers, upcomingInterviews, recentInterviews, recentSends, recentScorecards]) {
      if (r.error) throw dbError(r.error, "dashboard.functions");
    }

    const sendsCount = (recentSends.data ?? []).length;
    const { count: totalSends } = await supabase
      .from("sourcing_sends")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("sent_at", sevenDaysAgo);

    return {
      kpis: {
        openSearches: searches.count ?? 0,
        shortlists: shortlists.count ?? 0,
        shortlistedCandidates: shortlistMembers.count ?? 0,
        upcomingInterviews: (upcomingInterviews.data ?? []).length,
        outreachLast7d: totalSends ?? sendsCount,
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