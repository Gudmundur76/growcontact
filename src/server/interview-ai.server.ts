// Server-only: Lovable AI Gateway calls for live suggestions + final scorecard.
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

function getKey() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return key;
}

async function callAI(body: unknown) {
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("AI rate limit exceeded, try again shortly.");
  if (res.status === 402) throw new Error("Lovable AI credits exhausted. Add credits in workspace settings.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI call failed [${res.status}]: ${text}`);
  }
  return res.json();
}

export interface SuggestionsResult {
  follow_ups: string[];
  red_flags: string[];
  signals: string[];
}

export async function generateLiveSuggestions(opts: {
  roleTitle: string;
  jobDescription: string | null;
  candidateName: string;
  transcriptSoFar: string;
  rubric?: { name: string; focus: string | null; competencies: string[] } | null;
}): Promise<SuggestionsResult> {
  const sys = `You are an expert interview copilot helping a hiring manager assess a candidate in real time.
You receive a partial interview transcript and must surface:
- 2-4 sharp follow-up questions to probe deeper
- 0-3 red flags or concerns (only if clearly present)
- 0-3 positive signals (only if clearly present)
Be concise, specific to the role, and never invent facts.`;

  const user = `ROLE: ${opts.roleTitle}
CANDIDATE: ${opts.candidateName}
JOB DESCRIPTION:
${opts.jobDescription || "(none provided)"}

${opts.rubric ? `RUBRIC: ${opts.rubric.name}
FOCUS: ${opts.rubric.focus || "(none)"}
COMPETENCIES TO ASSESS: ${opts.rubric.competencies.join(", ")}

` : ""}
TRANSCRIPT SO FAR:
${opts.transcriptSoFar.slice(-8000)}

Return your output via the suggest_live tool.`;

  const data = await callAI({
    model: MODEL,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "suggest_live",
          description: "Return live interview suggestions",
          parameters: {
            type: "object",
            properties: {
              follow_ups: { type: "array", items: { type: "string" }, maxItems: 4 },
              red_flags: { type: "array", items: { type: "string" }, maxItems: 3 },
              signals: { type: "array", items: { type: "string" }, maxItems: 3 },
            },
            required: ["follow_ups", "red_flags", "signals"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "suggest_live" } },
  });

  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return { follow_ups: [], red_flags: [], signals: [] };
  try {
    const parsed = JSON.parse(args);
    return {
      follow_ups: Array.isArray(parsed.follow_ups) ? parsed.follow_ups : [],
      red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags : [],
      signals: Array.isArray(parsed.signals) ? parsed.signals : [],
    };
  } catch {
    return { follow_ups: [], red_flags: [], signals: [] };
  }
}

export interface ScorecardResult {
  summary: string;
  overall_rating: number;
  recommendation: "strong_hire" | "hire" | "no_hire" | "strong_no_hire" | "more_info";
  strengths: string[];
  concerns: string[];
  competencies: { name: string; rating: number; notes: string; evidence: string[] }[];
  follow_ups: string[];
}

export async function generateScorecard(opts: {
  roleTitle: string;
  jobDescription: string | null;
  candidateName: string;
  transcript: string;
  rubric?: { name: string; focus: string | null; competencies: string[] } | null;
}): Promise<ScorecardResult> {
  const sys = `You are an expert interviewer producing a calibrated post-interview scorecard.
Be honest, specific, evidence-based. Cite behaviors from the transcript. Avoid generic praise.
Rate competencies 1-5 (1=poor, 3=meets bar, 5=exceptional). Overall rating 1-5.
For EACH competency, include 1-3 short verbatim quotes from the transcript as 'evidence' to support the rating. Quotes must be exact substrings of the transcript, ≤200 chars each. If no relevant quote exists, return an empty evidence array.`;

  const user = `ROLE: ${opts.roleTitle}
CANDIDATE: ${opts.candidateName}
JOB DESCRIPTION:
${opts.jobDescription || "(none provided)"}

${opts.rubric ? `RUBRIC: ${opts.rubric.name}
FOCUS: ${opts.rubric.focus || "(none)"}
REQUIRED COMPETENCIES (rate ALL of these): ${opts.rubric.competencies.join(", ")}

` : ""}
FULL TRANSCRIPT:
${opts.transcript.slice(-30000)}

Return your output via the build_scorecard tool.`;

  const data = await callAI({
    model: MODEL,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "build_scorecard",
          description: "Return a structured interview scorecard",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string" },
              overall_rating: { type: "integer", minimum: 1, maximum: 5 },
              recommendation: {
                type: "string",
                enum: ["strong_hire", "hire", "no_hire", "strong_no_hire", "more_info"],
              },
              strengths: { type: "array", items: { type: "string" } },
              concerns: { type: "array", items: { type: "string" } },
              competencies: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    rating: { type: "integer", minimum: 1, maximum: 5 },
                    notes: { type: "string" },
                    evidence: {
                      type: "array",
                      items: { type: "string" },
                      maxItems: 3,
                    },
                  },
                  required: ["name", "rating", "notes", "evidence"],
                  additionalProperties: false,
                },
              },
              follow_ups: { type: "array", items: { type: "string" } },
            },
            required: [
              "summary",
              "overall_rating",
              "recommendation",
              "strengths",
              "concerns",
              "competencies",
              "follow_ups",
            ],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "build_scorecard" } },
  });

  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no scorecard");
  return JSON.parse(args) as ScorecardResult;
}