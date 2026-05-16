// Server-only: Lovable AI Gateway calls for screening submission scoring.
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
  if (res.status === 402)
    throw new Error("Lovable AI credits exhausted. Add credits in workspace settings.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI call failed [${res.status}]: ${text}`);
  }
  return res.json();
}

export interface ScreeningScoreResult {
  score: number; // 0-100
  summary: string;
  recommendation: "strong_advance" | "advance" | "more_info" | "decline";
  strengths: string[];
  concerns: string[];
}

export async function scoreScreeningSubmission(opts: {
  roleTitle: string | null;
  screenerName: string;
  description: string | null;
  questions: { id: string; prompt: string }[];
  rubric: { name: string; weight?: number }[];
  candidateName: string;
  answers: { questionId: string; answer: string }[];
}): Promise<ScreeningScoreResult> {
  const sys = `You are an expert technical recruiter scoring an async screening submission.
Be honest, specific, evidence-based. Cite candidate phrasing when relevant.
Score 0-100 where: 0-39 weak, 40-59 borderline, 60-79 solid, 80-100 exceptional.
Return strengths and concerns as short bullet phrases.`;

  const qa = opts.questions
    .map((q, i) => {
      const a = opts.answers.find((x) => x.questionId === q.id);
      return `Q${i + 1}: ${q.prompt}\nA${i + 1}: ${a?.answer?.trim() || "(no answer)"}`;
    })
    .join("\n\n");

  const rubricText = opts.rubric.length
    ? opts.rubric.map((r) => `- ${r.name}${r.weight ? ` (weight ${r.weight})` : ""}`).join("\n")
    : "(no rubric provided — evaluate overall fit for the role)";

  const user = `SCREENER: ${opts.screenerName}
ROLE: ${opts.roleTitle ?? "(unspecified)"}
DESCRIPTION: ${opts.description ?? "(none)"}
CANDIDATE: ${opts.candidateName}

RUBRIC COMPETENCIES:
${rubricText}

CANDIDATE RESPONSES:
${qa}

Return your output via the score_screening tool.`;

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
          name: "score_screening",
          description: "Return a structured screening evaluation",
          parameters: {
            type: "object",
            properties: {
              score: { type: "integer", minimum: 0, maximum: 100 },
              summary: { type: "string" },
              recommendation: {
                type: "string",
                enum: ["strong_advance", "advance", "more_info", "decline"],
              },
              strengths: { type: "array", items: { type: "string" }, maxItems: 5 },
              concerns: { type: "array", items: { type: "string" }, maxItems: 5 },
            },
            required: ["score", "summary", "recommendation", "strengths", "concerns"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "score_screening" } },
  });

  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI returned no scoring result");
  const parsed = JSON.parse(args);
  return {
    score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
    summary: String(parsed.summary ?? ""),
    recommendation: parsed.recommendation,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
    concerns: Array.isArray(parsed.concerns) ? parsed.concerns.map(String) : [],
  };
}
