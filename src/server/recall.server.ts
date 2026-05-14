// Server-only Recall.ai helpers. Never import from client code.
import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

const RECALL_BASE = "https://us-east-1.recall.ai/api/v1";

export type Platform = "zoom" | "google_meet" | "microsoft_teams" | "unknown";

export function detectPlatform(url: string): Platform {
  const u = url.toLowerCase();
  if (u.includes("zoom.us") || u.includes("zoom.com")) return "zoom";
  if (u.includes("meet.google.com")) return "google_meet";
  if (u.includes("teams.microsoft.com") || u.includes("teams.live.com")) return "microsoft_teams";
  return "unknown";
}

function getKey() {
  const key = process.env.RECALL_API_KEY;
  if (!key) throw new Error("RECALL_API_KEY is not configured");
  return key;
}

export async function createRecallBot(opts: {
  meetingUrl: string;
  webhookUrl: string;
  botName?: string;
}): Promise<{ id: string }> {
  const res = await fetch(`${RECALL_BASE}/bot/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${getKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      meeting_url: opts.meetingUrl,
      bot_name: opts.botName ?? "Interview Copilot",
      transcription_options: { provider: "meeting_captions" },
      real_time_transcription: {
        destination_url: opts.webhookUrl,
        partial_results: false,
      },
      chat: {
        on_bot_join: {
          send_to: "everyone",
          message: "Interview Copilot has joined to take notes.",
        },
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Recall createBot failed [${res.status}]: ${text}`);
  }
  return res.json();
}

export async function leaveRecallBot(botId: string): Promise<void> {
  const res = await fetch(`${RECALL_BASE}/bot/${botId}/leave_call/`, {
    method: "POST",
    headers: { Authorization: `Token ${getKey()}` },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Recall leaveBot failed [${res.status}]: ${text}`);
  }
}

export function verifyRecallSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RECALL_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
