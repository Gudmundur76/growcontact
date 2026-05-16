import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { KeyRound, Terminal } from "lucide-react";

export const Route = createFileRoute("/api-docs")({
  head: () => ({
    meta: [
      { title: "API Reference — Grow" },
      {
        name: "description",
        content:
          "Grow public REST API v1 reference — authenticate with an API key, sync candidates, and read interview scorecards.",
      },
      { property: "og:title", content: "API Reference — Grow" },
      {
        property: "og:description",
        content: "Public REST API v1 — candidates and scorecards endpoints.",
      },
    ],
  }),
  component: ApiDocsPage,
});

const BASE = "https://growcontact.lovable.app/api/public/v1";

type Endpoint = {
  method: "GET" | "POST";
  path: string;
  summary: string;
  scope?: string;
  example: string;
};

const endpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/health",
    summary: "Service health check. No authentication required.",
    example: `curl ${BASE}/health`,
  },
  {
    method: "GET",
    path: "/candidates?limit=25&cursor=<iso8601>",
    summary: "List candidates, newest first. Paginate with next_cursor.",
    scope: "candidates:read",
    example: `curl ${BASE}/candidates \\
  -H "Authorization: Bearer gk_live_..."`,
  },
  {
    method: "POST",
    path: "/candidates",
    summary:
      "Create or upsert a candidate by (source, external_id). Returns the stored candidate.",
    scope: "candidates:write",
    example: `curl -X POST ${BASE}/candidates \\
  -H "Authorization: Bearer gk_live_..." \\
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
    method: "GET",
    path: "/scorecards?limit=25&cursor=<iso8601>",
    summary: "List interview scorecards, newest first.",
    scope: "scorecards:read",
    example: `curl ${BASE}/scorecards \\
  -H "Authorization: Bearer gk_live_..."`,
  },
];

function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Developer reference
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Grow Public API <span className="text-muted-foreground">v1</span>
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            A small, focused REST API to sync candidates into Grow and read interview scorecards
            back out. JSON in, JSON out. Authenticate with a personal API key.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="hero" className="rounded-full">
              <Link to="/account/api-keys">
                <KeyRound className="mr-2 size-4" />
                Get an API key
              </Link>
            </Button>
            <Button asChild variant="heroSecondary" className="rounded-full">
              <a href={`${BASE}/health`} target="_blank" rel="noreferrer">
                <Terminal className="mr-2 size-4" />
                Try /health
              </a>
            </Button>
          </div>
        </header>

        <section className="mb-12 rounded-2xl border bg-card/40 p-6">
          <h2 className="text-lg font-medium">Authentication</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Send your key as a bearer token. Each key is scoped — keep them server-side and rotate
            regularly.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-background p-4 text-xs">
            <code>{`Authorization: Bearer gk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</code>
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            Base URL: <code>{BASE}</code>
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-lg font-medium">Endpoints</h2>
          {endpoints.map((e) => (
            <article
              key={`${e.method} ${e.path}`}
              className="rounded-2xl border bg-card/40 p-6"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={
                    "rounded px-2 py-0.5 text-xs font-semibold " +
                    (e.method === "GET"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-blue-500/15 text-blue-400")
                  }
                >
                  {e.method}
                </span>
                <code className="text-sm">{e.path}</code>
                {e.scope && (
                  <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    scope: {e.scope}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{e.summary}</p>
              <pre className="mt-4 overflow-x-auto rounded-lg bg-background p-4 text-xs">
                <code>{e.example}</code>
              </pre>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border bg-card/40 p-6 text-sm text-muted-foreground">
          <h2 className="text-base font-medium text-foreground">Errors</h2>
          <p className="mt-2">All errors return JSON of the form:</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-background p-4 text-xs">
            <code>{`{ "error": { "code": "invalid_api_key", "message": "API key is invalid or revoked." } }`}</code>
          </pre>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li><code>401</code> — missing or invalid API key</li>
            <li><code>403</code> — key missing required scope</li>
            <li><code>400</code> — invalid JSON or validation error</li>
            <li><code>500</code> — internal error (please retry)</li>
          </ul>
        </section>

        <CtaFooter />
      </main>
      <Footer />
    </div>
  );
}

function CtaFooter() {
  return (
    <div className="mt-12 flex items-center justify-between rounded-2xl border bg-card/40 p-6">
      <div>
        <div className="text-sm font-medium text-foreground">Need help?</div>
        <div className="text-xs text-muted-foreground">
          Webhooks, additional endpoints, or rate limits — we&apos;re happy to talk.
        </div>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/contact">Contact us</Link>
      </Button>
    </div>
  );
}