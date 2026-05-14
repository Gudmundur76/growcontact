import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "$499",
    cadence: "/ month",
    description: "For early teams making their first 1–5 hires.",
    features: [
      "AI Sourcing — 200 candidates / mo",
      "Async screening interviews",
      "Shared pipeline & scorecards",
      "Email support",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$2,000",
    cadence: "/ month",
    description: "Replaces a senior recruiter at ~$180k / yr.",
    features: [
      "Unlimited AI Sourcing",
      "Interview Copilot (Zoom/Meet/Teams)",
      "Predictive analytics dashboard",
      "ATS sync (Greenhouse, Ashby, Lever)",
      "Priority Slack support",
    ],
    cta: "Book a demo",
    highlighted: true,
  },
  {
    name: "Scale",
    price: "Custom",
    cadence: "",
    description: "For multi-team orgs with global hiring.",
    features: [
      "Everything in Growth",
      "Custom models on your pipeline",
      "SSO, SCIM & audit logs",
      "Dedicated talent strategist",
      "99.9% SLA",
    ],
    cta: "Talk to sales",
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="relative px-6 py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 max-w-2xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Pricing
          </p>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            One platform. A fraction of a recruiter.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Transparent monthly pricing. Cancel anytime. No per-hire fees, ever.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`liquid-glass flex flex-col rounded-3xl p-8 ${
                plan.highlighted ? "bg-primary/10 ring-1 ring-primary/40" : "bg-card/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                {plan.highlighted && (
                  <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                    Most popular
                  </span>
                )}
              </div>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-semibold tracking-tight text-foreground">
                  {plan.price}
                </span>
                <span className="text-muted-foreground">{plan.cadence}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>

              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-foreground/90">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlighted ? "hero" : "heroSecondary"}
                className="mt-10 w-full justify-center"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
