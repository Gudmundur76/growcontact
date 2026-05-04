import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CtaSection } from "@/components/landing/CtaSection";
import { ShieldCheck, Lock, KeyRound, FileCheck2, Server, Eye } from "lucide-react";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — Grow" },
      {
        name: "description",
        content:
          "How Grow protects customer and candidate data — certifications, controls, encryption and AI safeguards.",
      },
      { property: "og:title", content: "Security — Grow" },
      {
        property: "og:description",
        content:
          "SOC 2 Type II, ISO 27001, GDPR-ready. Tenant isolation, zero-retention AI, and audited subprocessors.",
      },
    ],
  }),
  component: SecurityPage,
});

const certs = [
  { name: "SOC 2 Type II", note: "Audited annually by an independent firm." },
  { name: "ISO 27001", note: "Information security management certified." },
  { name: "GDPR & UK GDPR", note: "DPA and SCCs available on request." },
  { name: "CCPA / CPRA", note: "Honors consumer rights for California residents." },
];

const pillars = [
  {
    icon: Lock,
    title: "Encryption everywhere",
    body: "AES-256 at rest, TLS 1.3 in transit, customer-managed keys available on Enterprise plans.",
  },
  {
    icon: Server,
    title: "Tenant isolation",
    body: "Logical isolation by default, dedicated infrastructure for regulated industries.",
  },
  {
    icon: KeyRound,
    title: "SSO & SCIM",
    body: "SAML 2.0, OIDC and SCIM 2.0 included on Business and Enterprise. Enforce MFA org-wide.",
  },
  {
    icon: Eye,
    title: "Zero-retention AI",
    body: "Model providers are bound by zero-retention agreements. Prompts never train shared models.",
  },
  {
    icon: FileCheck2,
    title: "Audit logs",
    body: "Immutable audit trail of every read, write and admin action — exportable via API.",
  },
  {
    icon: ShieldCheck,
    title: "Vulnerability management",
    body: "Continuous scanning, quarterly third-party penetration tests, public bug bounty.",
  },
];

function SecurityPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Navbar />
      <main className="px-6 pt-32">
        <header className="mx-auto max-w-3xl text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Security
          </div>
          <h1 className="mt-4 text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Built to be trusted with your most sensitive data.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Hiring data is some of the most personal data in your company.
            Grow's security program is designed around that responsibility from
            day one — not bolted on for procurement.
          </p>
        </header>

        <section className="mx-auto mt-20 max-w-5xl">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {certs.map((c) => (
              <div
                key={c.name}
                className="rounded-2xl border border-white/5 bg-card/30 p-5 backdrop-blur-xl"
              >
                <div className="text-sm font-semibold text-foreground">{c.name}</div>
                <p className="mt-2 text-xs text-muted-foreground">{c.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-6xl">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="rounded-3xl border border-white/5 bg-card/40 p-6 backdrop-blur-xl"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <p.icon className="h-5 w-5" />
                </div>
                <div className="mt-5 text-lg font-semibold text-foreground">
                  {p.title}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-3xl rounded-3xl border border-white/5 bg-card/30 p-8 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-foreground">
            Reporting a vulnerability
          </h2>
          <p className="mt-3 text-muted-foreground">
            Found something? Email{" "}
            <a href="mailto:security@grow.example" className="text-foreground underline-offset-4 hover:underline">
              security@grow.example
            </a>{" "}
            with reproduction steps. We acknowledge reports within one business
            day and reward valid findings through our bug bounty program.
          </p>
        </section>

        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}

const subprocessors = [
  { name: "AWS", purpose: "Primary infrastructure & data hosting", region: "US-East, EU-Central" },
  { name: "Cloudflare", purpose: "Edge network, WAF, DDoS protection", region: "Global" },
  { name: "Supabase", purpose: "Managed Postgres & auth", region: "US, EU" },
  { name: "OpenAI", purpose: "LLM inference (zero-retention)", region: "US" },
  { name: "Google Cloud", purpose: "Gemini inference (zero-retention)", region: "US, EU" },
  { name: "Resend", purpose: "Transactional email delivery", region: "US, EU" },
  { name: "Stripe", purpose: "Billing & payments", region: "US, EU" },
  { name: "Datadog", purpose: "Application monitoring & logs", region: "US" },
];

const dataPractices = [
  {
    title: "Customer data ownership",
    body: "You own all data you upload. We process it solely to provide the service, never to train shared models.",
  },
  {
    title: "Candidate data minimization",
    body: "We collect only what's needed for the role. Public profile data is refreshed on a 90-day cycle and purged on candidate request within 30 days.",
  },
  {
    title: "Retention & deletion",
    body: "Production data is retained for the life of your contract plus 30 days. Backups roll off after 35 days. Hard-delete on request, with audit receipt.",
  },
  {
    title: "Regional data residency",
    body: "EU and US data residency available on Scale. Data never leaves the elected region for storage or primary processing.",
  },
];

function _SecurityExtras() {
  // Reserved for future inline embeds — kept to avoid unused-warning on data tables.
  return { subprocessors, dataPractices };
}