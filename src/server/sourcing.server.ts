// Server-only: GitHub-backed talent search with hybrid AI re-ranking.
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const GH_SEARCH = "https://api.github.com/search/users";
const GH_USER = "https://api.github.com/users";
const PDL_BASE = "https://api.peopledatalabs.com/v5";

export interface RawCandidate {
  source: "github" | "pdl";
  external_id: string;
  name: string;
  headline: string | null;
  location: string | null;
  profile_url: string;
  avatar_url: string | null;
  email: string | null;
  signals: Record<string, unknown>;
}

export interface RankedCandidate extends RawCandidate {
  ai_summary: string;
  fit_score: number;
}

function ghHeaders() {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "grow-sourcing/1.0",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** Build a GitHub user-search query string from a natural-language brief + filters. */
export function buildGithubQuery(opts: {
  query: string;
  location?: string | null;
  language?: string | null;
  minFollowers?: number | null;
  minRepos?: number | null;
}) {
  const parts: string[] = [];
  const q = opts.query.trim();
  if (q) parts.push(q);
  if (opts.location) parts.push(`location:"${opts.location}"`);
  if (opts.language) parts.push(`language:${opts.language}`);
  if (opts.minFollowers && opts.minFollowers > 0) parts.push(`followers:>=${opts.minFollowers}`);
  if (opts.minRepos && opts.minRepos > 0) parts.push(`repos:>=${opts.minRepos}`);
  parts.push("type:user");
  return parts.join(" ");
}

export async function searchGithubCandidates(opts: {
  query: string;
  filters?: {
    location?: string | null;
    language?: string | null;
    minFollowers?: number | null;
    minRepos?: number | null;
  };
  limit?: number;
}): Promise<RawCandidate[]> {
  const q = buildGithubQuery({ query: opts.query, ...(opts.filters ?? {}) });
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 25);
  const url = `${GH_SEARCH}?q=${encodeURIComponent(q)}&per_page=${limit}&sort=followers&order=desc`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 403) throw new Error("GitHub rate limit hit. Add a GITHUB_TOKEN secret to raise the limit.");
  if (!res.ok) throw new Error(`GitHub search failed [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as { items?: { login: string; id: number; html_url: string; avatar_url: string }[] };
  const items = json.items ?? [];

  // Fetch full profiles in parallel for richer signals
  const profiles = await Promise.all(
    items.map(async (it) => {
      try {
        const r = await fetch(`${GH_USER}/${it.login}`, { headers: ghHeaders() });
        if (!r.ok) return null;
        return (await r.json()) as {
          login: string;
          id: number;
          name: string | null;
          company: string | null;
          blog: string | null;
          location: string | null;
          email: string | null;
          bio: string | null;
          public_repos: number;
          followers: number;
          following: number;
          html_url: string;
          avatar_url: string;
          created_at: string;
        };
      } catch {
        return null;
      }
    }),
  );

  return profiles.filter((p): p is NonNullable<typeof p> => !!p).map((p) => ({
    source: "github",
    external_id: String(p.id),
    name: p.name || p.login,
    headline: p.bio ?? (p.company ? `at ${p.company}` : null),
    location: p.location,
    profile_url: p.html_url,
    avatar_url: p.avatar_url,
    email: p.email,
    signals: {
      login: p.login,
      followers: p.followers,
      following: p.following,
      public_repos: p.public_repos,
      company: p.company,
      blog: p.blog,
      created_at: p.created_at,
    },
  }));
}

// ---------------- People Data Labs ----------------

function pdlKey() {
  const k = process.env.PDL_API_KEY;
  if (!k) {
    throw new Error(
      "PDL_API_KEY is not configured. Add it in project secrets to enable People Data Labs sourcing.",
    );
  }
  return k;
}

/** Translate a natural-language brief + filters into a PDL Elasticsearch query. */
export function buildPdlQuery(opts: {
  query: string;
  filters?: {
    location?: string | null;
    jobTitle?: string | null;
    skills?: string[] | null;
    company?: string | null;
    seniority?: string | null;
  };
}) {
  const must: Record<string, unknown>[] = [];
  const should: Record<string, unknown>[] = [];
  const q = opts.query.trim();
  if (q) {
    should.push({ match: { job_title: q } });
    should.push({ match: { headline: q } });
    should.push({ match: { skills: q } });
    should.push({ match: { summary: q } });
  }
  const f = opts.filters ?? {};
  if (f.jobTitle) must.push({ match: { job_title: f.jobTitle } });
  if (f.company) must.push({ match: { job_company_name: f.company } });
  if (f.seniority) must.push({ term: { job_title_levels: f.seniority.toLowerCase() } });
  if (f.location) must.push({ match: { location_name: f.location } });
  for (const s of f.skills ?? []) {
    if (s.trim()) must.push({ term: { skills: s.trim().toLowerCase() } });
  }
  return {
    query: {
      bool: {
        must: must.length ? must : undefined,
        should: should.length ? should : undefined,
        minimum_should_match: should.length ? 1 : undefined,
      },
    },
  };
}

interface PdlPerson {
  id?: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  job_company_name?: string | null;
  job_company_size?: string | null;
  job_company_industry?: string | null;
  job_company_founded?: number | null;
  job_company_employee_count?: number | null;
  job_title_levels?: string[] | null;
  headline?: string | null;
  summary?: string | null;
  skills?: string[] | null;
  location_name?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  twitter_url?: string | null;
  work_email?: string | null;
  personal_emails?: string[] | null;
  emails?: { address: string; type?: string }[] | null;
  experience?: unknown;
}

function pdlToCandidate(p: PdlPerson): RawCandidate {
  const name =
    p.full_name ||
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    "Unknown";
  const email =
    p.work_email ||
    p.personal_emails?.[0] ||
    p.emails?.find((e) => e.type === "professional")?.address ||
    p.emails?.[0]?.address ||
    null;
  const profile =
    p.linkedin_url ||
    p.github_url ||
    p.twitter_url ||
    (p.id ? `https://app.peopledatalabs.com/profile/${p.id}` : "");
  const headline =
    p.headline ||
    [p.job_title, p.job_company_name].filter(Boolean).join(" at ") ||
    p.summary?.slice(0, 160) ||
    null;
  return {
    source: "pdl",
    external_id: p.id ?? `${name}-${email ?? profile}`,
    name,
    headline,
    location: p.location_name ?? null,
    profile_url: profile,
    avatar_url: null,
    email,
    signals: {
      job_title: p.job_title,
      job_title_levels: p.job_title_levels,
      company: p.job_company_name,
      company_size: p.job_company_size,
      company_industry: p.job_company_industry,
      company_founded: p.job_company_founded,
      company_employees: p.job_company_employee_count,
      skills: p.skills?.slice(0, 20) ?? [],
      linkedin_url: p.linkedin_url,
      github_url: p.github_url,
    },
  };
}

export async function searchPdlCandidates(opts: {
  query: string;
  filters?: {
    location?: string | null;
    jobTitle?: string | null;
    skills?: string[] | null;
    company?: string | null;
    seniority?: string | null;
  };
  limit?: number;
}): Promise<RawCandidate[]> {
  const key = pdlKey();
  const size = Math.min(Math.max(opts.limit ?? 12, 1), 25);
  const body = {
    ...buildPdlQuery({ query: opts.query, filters: opts.filters }),
    size,
    pretty: false,
  };
  const res = await fetch(`${PDL_BASE}/person/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": key,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401 || res.status === 403)
    throw new Error("PDL rejected the API key. Verify PDL_API_KEY is correct and active.");
  if (res.status === 402)
    throw new Error("PDL credits exhausted. Top up the People Data Labs account.");
  if (res.status === 429)
    throw new Error("PDL rate limit hit. Wait a moment and retry.");
  if (!res.ok) throw new Error(`PDL search failed [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as { data?: PdlPerson[] };
  return (json.data ?? []).map(pdlToCandidate);
}

/** Enrich a single person — used to top up missing fields (email, current role) on a candidate. */
export async function enrichPdlPerson(opts: {
  email?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  name?: string | null;
  company?: string | null;
}): Promise<PdlPerson | null> {
  const key = pdlKey();
  const params = new URLSearchParams();
  if (opts.email) params.set("email", opts.email);
  if (opts.linkedinUrl) params.set("profile", opts.linkedinUrl);
  if (opts.githubUrl) params.append("profile", opts.githubUrl);
  if (opts.name) params.set("name", opts.name);
  if (opts.company) params.set("company", opts.company);
  params.set("min_likelihood", "6");
  const res = await fetch(`${PDL_BASE}/person/enrich?${params.toString()}`, {
    headers: { "X-Api-Key": key },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`PDL enrich failed [${res.status}]: ${await res.text()}`);
  const json = (await res.json()) as { status?: number; data?: PdlPerson };
  if (json.status !== 200 || !json.data) return null;
  return json.data;
}

/** Find a verified work email for a candidate via PDL. */
export async function findPdlEmail(opts: {
  linkedinUrl?: string | null;
  name?: string | null;
  company?: string | null;
}): Promise<string | null> {
  const person = await enrichPdlPerson(opts);
  if (!person) return null;
  return (
    person.work_email ||
    person.personal_emails?.[0] ||
    person.emails?.find((e) => e.type === "professional")?.address ||
    person.emails?.[0]?.address ||
    null
  );
}

/** Pull company signals (size, industry, funding stage) for context in fit scoring. */
export async function fetchPdlCompany(name: string): Promise<Record<string, unknown> | null> {
  const key = pdlKey();
  const params = new URLSearchParams({ name });
  const res = await fetch(`${PDL_BASE}/company/enrich?${params.toString()}`, {
    headers: { "X-Api-Key": key },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const json = (await res.json()) as { status?: number; [k: string]: unknown };
  if (json.status !== 200) return null;
  return json;
}

/** Rule-based pre-score (0-50) from raw GitHub signals + keyword overlap with brief. */
function ruleScore(c: RawCandidate, brief: string): number {
  const s = c.signals as {
    followers?: number;
    public_repos?: number;
    job_title_levels?: string[];
    company_employees?: number;
    skills?: string[];
  };
  let score = 0;
  if (c.source === "github") {
    const followers = s.followers ?? 0;
    const repos = s.public_repos ?? 0;
    score += Math.min(20, Math.log2(followers + 1) * 3);
    score += Math.min(15, Math.log2(repos + 1) * 2);
  } else {
    // PDL: reward seniority signals + skill overlap
    const levels = s.job_title_levels ?? [];
    if (levels.includes("senior") || levels.includes("manager")) score += 8;
    if (levels.includes("director") || levels.includes("vp") || levels.includes("cxo")) score += 12;
    score += Math.min(10, Math.log2((s.company_employees ?? 0) + 1));
  }
  const blob = `${c.name} ${c.headline ?? ""} ${c.location ?? ""} ${(s.skills ?? []).join(" ")}`.toLowerCase();
  const tokens = brief.toLowerCase().split(/[^a-z0-9+#.]+/).filter((t) => t.length > 2);
  const hits = tokens.filter((t) => blob.includes(t)).length;
  score += Math.min(15, hits * 3);
  return Math.round(score);
}

async function callAI(body: unknown) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("AI rate limit exceeded, try again shortly.");
  if (res.status === 402) throw new Error("Lovable AI credits exhausted.");
  if (!res.ok) throw new Error(`AI call failed [${res.status}]: ${await res.text()}`);
  return res.json();
}

/** Hybrid ranking: rule pre-score narrows the pool, AI re-ranks the top N with explanations. */
export async function rankCandidates(opts: {
  brief: string;
  roleTitle?: string | null;
  candidates: RawCandidate[];
  topN?: number;
}): Promise<RankedCandidate[]> {
  const topN = Math.min(opts.topN ?? 10, opts.candidates.length);
  const pre = opts.candidates
    .map((c) => ({ c, s: ruleScore(c, `${opts.roleTitle ?? ""} ${opts.brief}`) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, topN);

  if (pre.length === 0) return [];

  const sys = `You are an expert technical recruiter. For each candidate, write ONE crisp sentence (max 28 words) on fit for the role and assign a fit_score 0-100. Be honest — penalise weak matches. Never invent facts beyond the provided signals.`;
  const user = `ROLE: ${opts.roleTitle ?? "(unspecified)"}
BRIEF: ${opts.brief}

CANDIDATES (JSON):
${JSON.stringify(
  pre.map(({ c }, i) => ({
    i,
    name: c.name,
    headline: c.headline,
    location: c.location,
    signals: c.signals,
  })),
)}

Respond with ONLY a JSON object: { "ranked": [ { "i": number, "summary": string, "fit_score": number } ] }`;

  const json = await callAI({
    model: MODEL,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });
  const content = json?.choices?.[0]?.message?.content ?? "{}";
  let parsed: { ranked?: { i: number; summary: string; fit_score: number }[] } = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }
  const byIdx = new Map((parsed.ranked ?? []).map((r) => [r.i, r]));
  return pre
    .map(({ c }, i) => {
      const r = byIdx.get(i);
      return {
        ...c,
        ai_summary: r?.summary ?? "",
        fit_score: Math.max(0, Math.min(100, Math.round(r?.fit_score ?? 0))),
      };
    })
    .sort((a, b) => b.fit_score - a.fit_score);
}

/** Generate a personalized outreach email body using the candidate signals + sequence template. */
export async function personalizeOutreach(opts: {
  template: { subject: string; body: string };
  candidate: { name: string; headline: string | null; signals: Record<string, unknown>; ai_summary?: string | null };
  roleTitle: string;
  senderName?: string | null;
}): Promise<{ subject: string; body: string }> {
  const sys = `You write short, warm, specific recruiter outreach. Keep the original template's voice and structure. Replace placeholders {{name}}, {{role}}, {{sender}} verbatim. You may add ONE specific personal line (max 24 words) referencing a real signal. Never invent facts.`;
  const user = `TEMPLATE SUBJECT: ${opts.template.subject}
TEMPLATE BODY:
${opts.template.body}

CANDIDATE: ${opts.candidate.name}
HEADLINE: ${opts.candidate.headline ?? "(none)"}
SIGNALS: ${JSON.stringify(opts.candidate.signals)}
AI NOTES: ${opts.candidate.ai_summary ?? "(none)"}
ROLE: ${opts.roleTitle}
SENDER: ${opts.senderName ?? "the hiring team"}

Respond ONLY with JSON: { "subject": string, "body": string }`;

  const json = await callAI({
    model: MODEL,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });
  const content = json?.choices?.[0]?.message?.content ?? "{}";
  try {
    const p = JSON.parse(content) as { subject?: string; body?: string };
    return {
      subject: (p.subject ?? opts.template.subject).slice(0, 200),
      body: (p.body ?? opts.template.body).slice(0, 8000),
    };
  } catch {
    return opts.template;
  }
}