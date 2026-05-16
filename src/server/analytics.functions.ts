import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dbError } from "./db-errors";

const CACHE_TTL_MS = 60 * 60 * 1000;

export interface RoleForecast {
  role: string;
  totalInterviews: number;
  hired: number;
  avgDaysToHire: number | null;
  forecastDays: number | null;
}

export interface CandidateForecast {
  sessionId: string;
  candidate: string;
  role: string;
  rating: number | null;
  recommendation: string | null;
  offerAcceptanceProbability: number;
  retentionRisk12mo: number;
  signal: string;
}

export interface PredictiveAnalytics {
  generatedAt: string;
  cached: boolean;
  overall: {
    avgDaysToHire: number | null;
    avgOfferAcceptance: number;
    avgRetention12mo: number;
    pipeline: number;
    hires: number;
  };
  roleForecasts: RoleForecast[];
  topCandidates: CandidateForecast[];
}

function daysBetween(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000;
}

function recommendationScore(rec: string | null | undefined): number {
  switch ((rec ?? "").toLowerCase()) {
    case "strong_hire":
    case "strong_advance":
      return 0.92;
    case "hire":
    case "advance":
      return 0.78;
    case "more_info":
    case "no_decision":
      return 0.55;
    case "no_hire":
    case "decline":
      return 0.22;
    default:
      return 0.5;
  }
}

function retentionRisk(rating: number | null, rec: string | null): number {
  // 0 = low risk, 1 = high risk
  const r = rating ?? 3;
  const recPenalty =
    (rec ?? "").toLowerCase().includes("no") || (rec ?? "").toLowerCase() === "decline"
      ? 0.35
      : 0;
  const base = Math.max(0, Math.min(1, (5 - r) / 5));
  return Math.round((base * 0.7 + recPenalty) * 100) / 100;
}

export const getPredictiveAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { force?: boolean } | undefined) => ({ force: !!i?.force }))
  .handler(async ({ context, data }): Promise<PredictiveAnalytics> => {
    const { supabase, userId } = context;

    // Check cache
    if (!data.force) {
      const { data: cached } = await supabase
        .from("analytics_forecasts")
        .select("payload, generated_at")
        .eq("user_id", userId)
        .eq("kind", "time_to_hire")
        .gt("expires_at", new Date().toISOString())
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached?.payload) {
        return { ...(cached.payload as unknown as PredictiveAnalytics), cached: true };
      }
    }

    // Pull last 180d of sessions + scorecards
    const sinceIso = new Date(Date.now() - 180 * 86_400_000).toISOString();
    const [sessionsRes, scorecardsRes] = await Promise.all([
      supabase
        .from("interview_sessions")
        .select("id, candidate_name, role_title, status, created_at, ended_at, started_at")
        .eq("user_id", userId)
        .gte("created_at", sinceIso)
        .limit(500),
      supabase
        .from("interview_scorecards")
        .select(
          "id, session_id, overall_rating, recommendation, created_at, interview_sessions!inner(user_id, candidate_name, role_title, status, created_at, ended_at)",
        )
        .eq("interview_sessions.user_id", userId)
        .gte("created_at", sinceIso)
        .limit(500),
    ]);
    if (sessionsRes.error) throw dbError(sessionsRes.error, "analytics.sessions");
    if (scorecardsRes.error) throw dbError(scorecardsRes.error, "analytics.scorecards");

    const sessions = sessionsRes.data ?? [];
    const cards = (scorecardsRes.data ?? []) as Array<{
      id: string;
      session_id: string;
      overall_rating: number | null;
      recommendation: string | null;
      created_at: string;
      interview_sessions: {
        candidate_name: string;
        role_title: string;
        status: string;
        created_at: string;
        ended_at: string | null;
      };
    }>;

    // Group by role
    const byRole = new Map<string, { total: number; hired: number; daysToHire: number[] }>();
    for (const s of sessions) {
      const r = s.role_title || "Unspecified";
      const bucket = byRole.get(r) ?? { total: 0, hired: 0, daysToHire: [] };
      bucket.total += 1;
      const hired =
        s.status === "hired" ||
        s.status === "completed" ||
        cards.some(
          (c) =>
            c.session_id === s.id &&
            (c.recommendation ?? "").toLowerCase() === "strong_hire",
        );
      if (hired) {
        bucket.hired += 1;
        const end = s.ended_at ?? new Date().toISOString();
        bucket.daysToHire.push(daysBetween(s.created_at, end));
      }
      byRole.set(r, bucket);
    }

    const roleForecasts: RoleForecast[] = [...byRole.entries()]
      .map(([role, b]) => {
        const avg = b.daysToHire.length
          ? b.daysToHire.reduce((a, c) => a + c, 0) / b.daysToHire.length
          : null;
        const forecast = avg !== null ? Math.round(avg * 0.85 * 10) / 10 : null;
        return {
          role,
          totalInterviews: b.total,
          hired: b.hired,
          avgDaysToHire: avg !== null ? Math.round(avg * 10) / 10 : null,
          forecastDays: forecast,
        };
      })
      .sort((a, b) => b.totalInterviews - a.totalInterviews)
      .slice(0, 8);

    // Candidate forecasts from latest scorecards
    const topCandidates: CandidateForecast[] = cards
      .slice()
      .sort((a, b) => (b.overall_rating ?? 0) - (a.overall_rating ?? 0))
      .slice(0, 8)
      .map((c) => {
        const accept = recommendationScore(c.recommendation);
        const ratingBoost = ((c.overall_rating ?? 3) - 3) * 0.05;
        const acceptanceProb = Math.max(0.05, Math.min(0.98, accept + ratingBoost));
        return {
          sessionId: c.session_id,
          candidate: c.interview_sessions.candidate_name,
          role: c.interview_sessions.role_title,
          rating: c.overall_rating,
          recommendation: c.recommendation,
          offerAcceptanceProbability: Math.round(acceptanceProb * 100) / 100,
          retentionRisk12mo: retentionRisk(c.overall_rating, c.recommendation),
          signal:
            c.overall_rating && c.overall_rating >= 4
              ? "Strong signal — accelerate to offer"
              : c.overall_rating && c.overall_rating >= 3
                ? "Mixed — schedule technical deep-dive"
                : "Weak signal — confirm fit before advancing",
        };
      });

    // Overall rollup
    const allDays = roleForecasts.flatMap((r) =>
      r.avgDaysToHire !== null ? [r.avgDaysToHire] : [],
    );
    const overall = {
      avgDaysToHire: allDays.length
        ? Math.round((allDays.reduce((a, c) => a + c, 0) / allDays.length) * 10) / 10
        : null,
      avgOfferAcceptance: topCandidates.length
        ? Math.round(
            (topCandidates.reduce((a, c) => a + c.offerAcceptanceProbability, 0) /
              topCandidates.length) *
              100,
          ) / 100
        : 0,
      avgRetention12mo: topCandidates.length
        ? Math.round(
            (1 -
              topCandidates.reduce((a, c) => a + c.retentionRisk12mo, 0) /
                topCandidates.length) *
              100,
          ) / 100
        : 0,
      pipeline: sessions.filter((s) => !["completed", "hired", "rejected"].includes(s.status))
        .length,
      hires: roleForecasts.reduce((a, r) => a + r.hired, 0),
    };

    const payload: PredictiveAnalytics = {
      generatedAt: new Date().toISOString(),
      cached: false,
      overall,
      roleForecasts,
      topCandidates,
    };

    // Cache (1h)
    await supabase
      .from("analytics_forecasts")
      .delete()
      .eq("user_id", userId)
      .eq("kind", "time_to_hire");
    await supabase.from("analytics_forecasts").insert({
      user_id: userId,
      kind: "time_to_hire",
      payload: payload as unknown as never,
      expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    });

    return payload;
  });