import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Startup",
    price: "$499",
    cadence: "/ month",
    description: "For lean teams making their first 5–10 hires.",
    features: [
      "Up to 3 active roles",
      "AI sourcing & async screening",
      "Interview Copilot (5 interviews/mo)",
      "Basic analytics dashboard",
      "Email support",
    ],
    cta: "Get started",
    href: "/signup" as const,
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$1,499",
    cadence: "/ month",
    description: "For scaling teams hiring across multiple functions.",
    features: [
      "Up to 15 active roles",
      "Everything in Startup",
      "Unlimited Interview Copilot",
      "Predictive analytics",
      "ATS integrations",
      "Slack notifications",
      "Priority support",
    ],
    cta: "Start free trial",
    href: "/signup" as const,
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    description: "For high-volume teams with custom security and compliance needs.",
    features: [
      "Unlimited roles",
      "Everything in Growth",
      "SSO / SAML",
      "Custom AI calibration",
      "Dedicated CSM",
      "SLA + uptime guarantee",
      "Custom contracts",
    ],
    cta: "Talk to sales",
    href: "/contact" as const,
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
                asChild
                variant={plan.highlighted ? "hero" : "heroSecondary"}
                className="mt-10 w-full justify-center"
              >
                <Link to={plan.href}>{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
