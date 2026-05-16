import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Copy, KeyRound, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/account/api-docs")({
  head: () => ({
    meta: [
      { title: "API Docs — Grow" },
      {
        name: "description",
        content: "Copy-paste curl examples for the Grow public API.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountApiDocsPage,
});

const BASE = "https://growcontact.lovable.app/api/public/v1";

type Snippet = {
  id: string;
  title: string;
  scope: string;
  description: string;
  build: (key: string) => string;
};

const snippets: Snippet[] = [
  {
    id: "list-candidates",
    title: "List candidates",
    scope: "candidates:read",
    description: "Newest first. Paginate with the returned next_cursor.",
    build: (k) => `curl ${BASE}/candidates?limit=25 \\
  -H "Authorization: Bearer ${k}"`,
  },
  {
    id: "create-candidate",
    title: "Create or upsert a candidate",
    scope: "candidates:write",
    description: "Idempotent on (source, external_id).",
    build: (k) => `curl -X POST ${BASE}/candidates \\
  -H "Authorization: Bearer ${k}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "api",
    "external_id": "abc-123",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "headline": "Staff Engineer",
    "location": "London, UK",
    "profile_url": "https://example.com/ada"
  }'`,
  },
  {
    id: "list-scorecards",
    title: "List scorecards",
    scope: "scorecards:read",
    description: "Interview scorecards owned by the API key holder.",
    build: (k) => `curl ${BASE}/scorecards?limit=25 \\
  -H "Authorization: Bearer ${k}"`,
  },
];

function AccountApiDocsPage() {
  const { user, loading } = useAuth();
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [loading, user]);

  const keyForCurl = apiKey.trim() || "gk_live_YOUR_API_KEY";

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Your account
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
            API quickstart
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Paste your API key below and the curl examples will update with it.
            Keys are kept in your browser only — never sent anywhere from this page.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="hero" className="rounded-full">
              <Link to="/account/api-keys">
                <KeyRound className="mr-2 size-4" />
                Manage API keys
              </Link>
            </Button>
            <Button asChild variant="heroSecondary" className="rounded-full">
              <Link to="/api-docs">
                <ExternalLink className="mr-2 size-4" />
                Full reference
              </Link>
            </Button>
          </div>
        </header>

        <section className="mb-8 rounded-2xl border bg-card/40 p-6">
          <label
            htmlFor="api-key-input"
            className="text-sm font-medium text-foreground"
          >
            Your API key
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Starts with <code>gk_live_</code>. Used only to fill the snippets below.
          </p>
          <input
            id="api-key-input"
            type="text"
            spellCheck={false}
            autoComplete="off"
            placeholder="gk_live_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="mt-3 w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </section>

        <section className="space-y-6">
          {snippets.map((s) => {
            const code = s.build(keyForCurl);
            return (
              <article key={s.id} className="rounded-2xl border bg-card/40 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-medium text-foreground">
                      {s.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    scope: {s.scope}
                  </span>
                </div>
                <div className="relative mt-4">
                  <pre className="overflow-x-auto rounded-lg bg-background p-4 pr-12 text-xs">
                    <code>{code}</code>
                  </pre>
                  <button
                    type="button"
                    onClick={() => copy(code, s.title)}
                    className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border bg-card/60 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    aria-label={`Copy ${s.title} command`}
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-10 rounded-2xl border bg-card/40 p-6 text-sm text-muted-foreground">
          <h2 className="text-base font-medium text-foreground">Tips</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Keep keys server-side — never ship them to a browser.</li>
            <li>Each key is scoped; create separate keys per integration.</li>
            <li>Revoke a key from <Link to="/account/api-keys" className="underline">API keys</Link> if it&apos;s ever exposed.</li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}