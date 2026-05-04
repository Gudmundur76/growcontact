import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { PricingSection } from "@/components/landing/PricingSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Grow" },
      {
        name: "description",
        content:
          "Transparent monthly pricing for Grow's talent operating system. Starter, Growth, and Scale plans. No per-hire fees.",
      },
      { property: "og:title", content: "Pricing — Grow" },
      {
        property: "og:description",
        content:
          "Replace a senior recruiter for a fraction of the cost. See Grow's plans.",
      },
    ],
  }),
  component: PricingPage,
});

type Tier = "Starter" | "Growth" | "Scale";

const compareGroups: {
  group: string;
  rows: { feature: string; values: Record<Tier, string | boolean> }[];
}[] = [
  {
    group: "Sourcing AI",
    rows: [
      { feature: "Candidates surfaced / month", values: { Starter: "200", Growth: "Unlimited", Scale: "Unlimited" } },
      { feature: "Retention-aware ranking", values: { Starter: false, Growth: true, Scale: true } },
      { feature: "Outbound sequences", values: { Starter: "Single-step", Growth: "Branching", Scale: "Branching + A/B" } },
      { feature: "Custom sourcing models", values: { Starter: false, Growth: false, Scale: true } },
    ],
  },
  {
    group: "Interview Copilot",
    rows: [
      { feature: "Live transcription", values: { Starter: false, Growth: true, Scale: true } },
      { feature: "Real-time scorecards", values: { Starter: false, Growth: true, Scale: true } },
      { feature: "Calibration drift alerts", values: { Starter: false, Growth: true, Scale: true } },
      { feature: "Panel debrief synthesis", values: { Starter: false, Growth: false, Scale: true } },
    ],
  },
  {
    group: "Platform & integrations",
    rows: [
      { feature: "ATS sync (Greenhouse, Ashby, Lever)", values: { Starter: false, Growth: true, Scale: true } },
      { feature: "SAML SSO + SCIM", values: { Starter: false, Growth: false, Scale: true } },
      { feature: "Audit logs & data residency", values: { Starter: false, Growth: false, Scale: true } },
      { feature: "Customer-managed keys", values: { Starter: false, Growth: false, Scale: true } },
    ],
  },
  {
    group: "Support",
    rows: [
      { feature: "Email support", values: { Starter: true, Growth: true, Scale: true } },
      { feature: "Priority Slack channel", values: { Starter: false, Growth: true, Scale: true } },
      { feature: "Dedicated success engineer", values: { Starter: false, Growth: false, Scale: true } },
      { feature: "99.9% uptime SLA", values: { Starter: false, Growth: false, Scale: true } },
    ],
  },
];

const faqs = [
  {
    q: "Are there per-hire fees?",
    a: "Never. Grow is flat monthly pricing — no placement fees, no success fees, no surprises at renewal. Hire one person or a hundred for the same price.",
  },
  {
    q: "Can we start with a free trial?",
    a: "Yes. Every plan includes a 14-day trial with full access — no credit card required. Bring real roles and we'll help you calibrate the model on day one.",
  },
  {
    q: "How does Grow compare to a senior recruiter?",
    a: "A senior in-house recruiter in the US averages ~$180k/yr loaded. Growth is $2k/month — about a tenth of the cost — and works 24/7 across every role you have open.",
  },
  {
    q: "Do you support our ATS?",
    a: "Greenhouse, Ashby, and Lever sync bi-directionally on Growth and Scale. Workday, SmartRecruiters and Teamtailor are available on Scale. Talk to us about anything else.",
  },
  {
    q: "What about data and security?",
    a: "SOC 2 Type II and ISO 27001 certified. Encryption everywhere, zero-retention AI agreements with model providers, and tenant isolation by default. See the Security page for details.",
  },
  {
    q: "Can we cancel anytime?",
    a: "Yes. Monthly plans cancel at the end of the billing period, no questions asked. Annual plans get a 15% discount and a renewal reminder 60 days out.",
  },
];

const quotes = [
  {
    body: "We replaced a $180k recruiter and two contractors with Grow Growth. The math wasn't even close.",
    author: "Maya Okafor",
    role: "VP People, Vortex",
  },
  {
    body: "Flat pricing made the procurement conversation 90% shorter. Finance stopped asking what 'per-hire' meant.",
    author: "Daniel Reyes",
    role: "Head of Talent, Nimbus",
  },
  {
    body: "Scale was the first plan we've seen that actually behaves like enterprise software — SSO, audit logs, the whole stack.",
    author: "Priya Shah",
    role: "Co-founder & CTO, Prysma",
  },
];

function PricingPage() {
  return (
    <>
      <Navbar />
      <PricingSection />

      <section className="relative px-6 pb-24 pt-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-2xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Compare plans
            </p>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
              Everything that's included, line by line.
            </h2>
          </div>

          <div className="liquid-glass overflow-hidden rounded-3xl bg-card/40">
            <div className="hidden grid-cols-[1.6fr_1fr_1fr_1fr] gap-4 border-b border-white/5 px-8 py-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:grid">
              <div>Feature</div>
              <div className="text-center">Starter</div>
              <div className="text-center">Growth</div>
              <div className="text-center">Scale</div>
            </div>

            {compareGroups.map((g) => (
              <div key={g.group}>
                <div className="border-b border-white/5 bg-white/[0.02] px-8 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {g.group}
                </div>
                {g.rows.map((row) => (
                  <div
                    key={row.feature}
                    className="grid grid-cols-2 gap-4 border-b border-white/5 px-6 py-4 text-sm md:grid-cols-[1.6fr_1fr_1fr_1fr] md:px-8"
                  >
                    <div className="col-span-2 font-medium text-foreground md:col-span-1">
                      {row.feature}
                    </div>
                    {(["Starter", "Growth", "Scale"] as Tier[]).map((tier) => (
                      <div
                        key={tier}
                        className="flex items-center gap-2 md:justify-center"
                      >
                        <span className="text-xs uppercase tracking-wider text-muted-foreground md:hidden">
                          {tier}:
                        </span>
                        {typeof row.values[tier] === "boolean" ? (
                          row.values[tier] ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Minus className="h-4 w-4 text-muted-foreground/40" />
                          )
                        ) : (
                          <span className="text-foreground/90">
                            {row.values[tier] as string}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-2xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              What teams say
            </p>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
              Pricing that finance and hiring managers both like.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {quotes.map((q) => (
              <figure
                key={q.author}
                className="liquid-glass flex h-full flex-col rounded-3xl bg-card/40 p-7"
              >
                <blockquote className="text-base leading-relaxed text-foreground/90">
                  "{q.body}"
                </blockquote>
                <figcaption className="mt-6 text-sm">
                  <div className="font-semibold text-foreground">{q.author}</div>
                  <div className="text-muted-foreground">{q.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              FAQ
            </p>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
              Pricing questions, answered.
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="liquid-glass group rounded-2xl bg-card/40 px-6 py-5 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-semibold text-foreground">
                  {f.q}
                  <span className="text-2xl leading-none text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/5 bg-card/30 p-8 backdrop-blur-xl">
            <div>
              <div className="text-lg font-semibold text-foreground">
                Still deciding?
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Talk to a Grow specialist about the right plan for your team.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild variant="hero">
                <Link to="/signup">Start free trial</Link>
              </Button>
              <Button asChild variant="heroSecondary">
                <Link to="/contact">Talk to sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <CtaSection />
      <Footer />
    </>
  );
}