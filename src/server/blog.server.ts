import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CATEGORIES = ["Essay", "Benchmark", "Product", "Playbook"] as const;
type Cat = (typeof CATEGORIES)[number];

const THEMES = [
  "behaviorally-anchored interview rubrics",
  "reducing time-to-hire without lowering the bar",
  "calibrating hiring committees across distributed teams",
  "structured interviewing vs. unstructured pattern-matching",
  "retention-aware sourcing and what it changes",
  "designing technical loops that actually predict performance",
  "fairness audits in AI-assisted hiring",
  "panel debrief rituals that compress decision time",
  "comp transparency and offer-acceptance rates",
  "the economics of bad hires at Series B and beyond",
  "async screens vs. live screens — when each wins",
  "internal mobility as a hiring channel",
  "the dying art of the recruiter intake meeting",
  "scoring take-home exercises without bias drift",
  "sourcing in a thin market: signal over volume",
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function pickTheme(recentTitles: string[]): string {
  const seen = new Set(recentTitles.map((t) => t.toLowerCase()));
  const fresh = THEMES.filter((t) => !Array.from(seen).some((s) => s.includes(t.split(" ")[0])));
  const pool = fresh.length ? fresh : THEMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

interface DraftJson {
  title: string;
  excerpt: string;
  category: Cat;
  body: string;
  read_time: string;
}

export async function generateBlogDraft(): Promise<{
  id: string;
  slug: string;
  title: string;
}> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  // Avoid topical repetition by looking at recent titles
  const { data: recent } = await supabaseAdmin
    .from("blog_posts")
    .select("title")
    .order("created_at", { ascending: false })
    .limit(20);
  const recentTitles = (recent ?? []).map((r) => r.title as string);
  const theme = pickTheme(recentTitles);

  const system = `You are a senior editor at Grow, a talent operating system used by high-growth tech companies. You write the way a confident operator writes: declarative, specific, allergic to clichés. You never use words like "leverage", "synergy", "robust", "delve", or "in today's fast-paced world". You favor concrete numbers, named anti-patterns, and short paragraphs. Audience: heads of talent, founders, hiring managers at Series B–public companies.`;

  const user = `Write a fresh blog post for the Grow blog about: "${theme}".

Constraints:
- 700–900 words, opinionated, evidence-flavored.
- Use 2–4 "## " section headings (markdown style, just the line "## Heading").
- Paragraphs separated by a blank line. Plain text, no images, no links.
- Do NOT repeat any of these recent titles: ${recentTitles.slice(0, 12).join(" | ") || "(none)"}.
- Pick the most natural category for the piece.

Return ONLY a JSON object via the tool call.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "publish_post",
            description: "Return a complete, on-brand blog post draft.",
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Headline, sentence case, no clickbait, ≤80 chars.",
                },
                excerpt: {
                  type: "string",
                  description: "1–2 sentences, ≤220 chars, no marketing speak.",
                },
                category: { type: "string", enum: CATEGORIES as unknown as string[] },
                body: { type: "string", description: "Markdown-ish body as specified." },
                read_time: { type: "string", description: "e.g. '7 min read'" },
              },
              required: ["title", "excerpt", "category", "body", "read_time"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "publish_post" } },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI rate limit — try again shortly");
    if (res.status === 402)
      throw new Error("AI credits exhausted — top up in Settings → Workspace → Usage");
    throw new Error(`AI gateway error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const call = json?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("AI returned no tool call");
  let draft: DraftJson;
  try {
    draft = JSON.parse(call.function.arguments);
  } catch {
    throw new Error("AI returned malformed JSON");
  }

  // Build a unique slug
  let slug = slugify(draft.title);
  if (!slug) slug = `post-${Date.now()}`;
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const { data: existing } = await supabaseAdmin
      .from("blog_posts")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!existing) {
      slug = candidate;
      break;
    }
    suffix++;
    if (suffix > 20) {
      slug = `${slug}-${Date.now()}`;
      break;
    }
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("blog_posts")
    .insert({
      slug,
      title: draft.title.slice(0, 180),
      excerpt: draft.excerpt.slice(0, 280),
      category: draft.category,
      body: draft.body,
      read_time: draft.read_time || "6 min read",
      status: "draft",
    })
    .select("id, slug, title")
    .single();

  if (error) throw dbError(error, "blog.server:insert");
  return inserted as { id: string; slug: string; title: string };
}

export interface PublicPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  body: string;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function fetchPublishedPosts(): Promise<PublicPost[]> {
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select(
      "slug, title, excerpt, category, author, author_role, body, read_time, published_at, created_at",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) return [];
  return (data ?? []).map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    author: p.author,
    authorRole: p.author_role,
    date: fmtDate((p.published_at as string) ?? (p.created_at as string)),
    readTime: p.read_time,
    body: p.body,
  }));
}
