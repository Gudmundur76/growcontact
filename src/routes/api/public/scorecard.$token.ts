import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/scorecard/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = String(params.token ?? "");
        if (!/^[a-f0-9]{32,64}$/.test(token)) {
          return new Response("Invalid token", { status: 400 });
        }
        const { data: session } = await supabaseAdmin
          .from("interview_sessions")
          .select("id, candidate_name, role_title, ended_at, share_expires_at, deleted_at")
          .eq("share_token", token)
          .maybeSingle();
        if (!session) return new Response("Not found", { status: 404 });
        if (session.deleted_at) return new Response("Not found", { status: 404 });
        if (session.share_expires_at && new Date(session.share_expires_at) < new Date()) {
          return new Response("Link expired", { status: 410 });
        }

        const { data: card } = await supabaseAdmin
          .from("interview_scorecards")
          .select("summary, overall_rating, recommendation, strengths, concerns, competencies, follow_ups")
          .eq("session_id", session.id)
          .maybeSingle();
        if (!card) return new Response("Scorecard not ready", { status: 404 });

        return Response.json({
          candidate_name: session.candidate_name,
          role_title: session.role_title,
          ended_at: session.ended_at,
          scorecard: card,
        });
      },
    },
  },
});