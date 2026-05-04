import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyRecallSignature } from "@/server/recall.server";

export const Route = createFileRoute("/api/public/recall-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const sessionId = url.searchParams.get("session_id");
        const rawBody = await request.text();

        // Fail closed: require a configured webhook secret AND a valid signature.
        if (!process.env.RECALL_WEBHOOK_SECRET) {
          return new Response("Webhook secret not configured", { status: 503 });
        }
        const sig =
          request.headers.get("x-recall-signature") ??
          request.headers.get("svix-signature");
        if (!verifyRecallSignature(rawBody, sig)) {
          return new Response("Invalid signature", { status: 401 });
        }

        if (!sessionId) return new Response("Missing session_id", { status: 400 });

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const eventType = String(payload.event ?? payload.type ?? "");
        const data = (payload.data ?? {}) as Record<string, unknown>;

        // Status updates
        if (eventType.startsWith("bot.")) {
          const statusMap: Record<string, string> = {
            "bot.in_call_recording": "in_call",
            "bot.in_call_not_recording": "in_call",
            "bot.call_ended": "completed",
            "bot.done": "completed",
            "bot.fatal": "failed",
            "bot.joining_call": "joining",
          };
          const next = statusMap[eventType];
          if (next) {
            await supabaseAdmin
              .from("interview_sessions")
              .update({
                status: next,
                ...(next === "completed" ? { ended_at: new Date().toISOString() } : {}),
              })
              .eq("id", sessionId);
          }
          await supabaseAdmin.from("interview_events").insert({
            session_id: sessionId,
            kind: "status",
            content: eventType.replace("bot.", "").replace(/_/g, " "),
          });
          return new Response("ok");
        }

        // Transcript chunks (Recall real-time transcription)
        if (eventType === "transcript.data" || data.words) {
          const words = (data.words ?? []) as Array<{ text?: string }>;
          const text = words.map((w) => w.text ?? "").join(" ").trim();
          const speaker =
            (data.participant as { name?: string } | undefined)?.name ?? "Speaker";
          if (text) {
            await supabaseAdmin.from("interview_events").insert({
              session_id: sessionId,
              kind: "transcript",
              speaker,
              content: text,
            });
          }
          return new Response("ok");
        }

        // Unknown event — log and accept
        await supabaseAdmin.from("interview_events").insert({
          session_id: sessionId,
          kind: "status",
          content: `Webhook event: ${eventType || "unknown"}`,
          metadata: payload as never,
        });
        return new Response("ok");
      },
    },
  },
});