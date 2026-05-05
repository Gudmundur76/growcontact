import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { searchGithubCandidates, rankCandidates } from "@/server/sourcing.server";

// Cron-callable: re-runs alert-enabled saved searches and emails new candidates.
export const Route = createFileRoute("/api/public/hooks/sourcing-alerts")({
  server: {
    handlers: {
      POST: async () => {
        const now = new Date();
        const { data: searches } = await supabaseAdmin
          .from("sourcing_searches")
          .select("*")
          .eq("alert_enabled", true);
        if (!searches || searches.length === 0) {
          return Response.json({ ok: true, processed: 0 });
        }

        let processed = 0;
        let totalNew = 0;
        for (const s of searches) {
          // Skip if recently alerted (daily=24h, weekly=7d)
          const minHours = s.alert_frequency === "daily" ? 24 : 24 * 7;
          if (s.last_alert_at && now.getTime() - new Date(s.last_alert_at).getTime() < minHours * 3600_000) {
            continue;
          }

          try {
            const filters = (s.filters ?? {}) as {
              location?: string | null;
              language?: string | null;
              minFollowers?: number | null;
              minRepos?: number | null;
            };
            const raw = await searchGithubCandidates({ query: s.query, filters, limit: 12 });
            const ranked = await rankCandidates({
              brief: s.query,
              roleTitle: s.role_title,
              candidates: raw,
              topN: Math.min(raw.length, 8),
            });

            // Filter to candidates the user hasn't seen before
            const externalIds = ranked.map((r) => r.external_id);
            const { data: existing } = await supabaseAdmin
              .from("sourcing_candidates")
              .select("external_id")
              .eq("user_id", s.user_id)
              .in("external_id", externalIds);
            const seen = new Set((existing ?? []).map((e) => e.external_id));
            const fresh = ranked.filter((r) => !seen.has(r.external_id));

            // Persist all so we don't re-alert next run
            if (ranked.length) {
              await supabaseAdmin.from("sourcing_candidates").upsert(
                ranked.map((c) => ({
                  user_id: s.user_id,
                  source: c.source,
                  external_id: c.external_id,
                  name: c.name,
                  headline: c.headline,
                  location: c.location,
                  profile_url: c.profile_url,
                  avatar_url: c.avatar_url,
                  email: c.email,
                  signals: c.signals as never,
                  ai_summary: c.ai_summary,
                  fit_score: c.fit_score,
                  last_search_id: s.id,
                })),
                { onConflict: "user_id,source,external_id" },
              );
            }

            await supabaseAdmin
              .from("sourcing_searches")
              .update({ last_run_at: now.toISOString(), last_alert_at: now.toISOString() })
              .eq("id", s.id);

            totalNew += fresh.length;
            processed += 1;
          } catch (e) {
            console.error("sourcing-alerts failed for search", s.id, e);
          }
        }

        return Response.json({ ok: true, processed, newCandidates: totalNew });
      },
    },
  },
});