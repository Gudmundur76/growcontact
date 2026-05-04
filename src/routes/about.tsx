import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CtaSection } from "@/components/landing/CtaSection";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Grow" },
      {
        name: "description",
        content:
          "Grow is building the AI-native talent operating system replacing fragmented recruiting tools and senior recruiter overhead.",
      },
      { property: "og:title", content: "About — Grow" },
      {
        property: "og:description",
        content:
          "Why we're building the talent operating system for high-growth teams.",
      },
    ],
  }),
  component: AboutPage,
});

const values = [
  {
    title: "Calibrated, not vibes",
    body: "Every signal we surface — from sourcing to scorecards — is grounded in models trained on real outcomes, not gut feel.",
  },
  {
    title: "Recruiter-grade taste",
    body: "We obsess over the craft of hiring. Our product behaves like the best senior recruiter you've ever worked with.",
  },
  {
    title: "Speed is a feature",
    body: "Great candidates don't wait. We compress weeks of pipeline work into hours so teams move at the speed of opportunity.",
  },
  {
    title: "Transparent by default",
    body: "Flat monthly pricing, no per-hire fees, and explainable model outputs your hiring managers can actually trust.",
  },
];

const stats = [
  { value: "600M+", label: "Profiles continuously indexed" },
  { value: "19 days", label: "Median time-to-hire on Grow" },
  { value: "$0", label: "Per-hire fees, ever" },
];

function AboutPage() {
  return (
    <>
      <Navbar />
      <section className="relative px-6 pb-24 pt-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            About Grow
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
            We're rebuilding hiring around intelligence, not headcount.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Grow started with a simple observation: the best recruiters in the
            world spend most of their day on work a great model can now do
            faster — sourcing, screening, scheduling, debriefing. We set out to
            give every team that recruiter, on tap, for a fraction of the cost.
          </p>
        </div>
      </section>

      <section className="relative px-6 pb-24">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="liquid-glass rounded-3xl bg-card/40 p-8"
            >
              <div className="text-4xl font-semibold tracking-tight text-foreground">
                {s.value}
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-2xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              What we believe
            </p>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
              The principles guiding the product.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {values.map((v) => (
              <div
                key={v.title}
                className="liquid-glass rounded-3xl bg-card/40 p-8"
              >
                <h3 className="text-xl font-semibold text-foreground">
                  {v.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            The team
          </p>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
            Recruiters, ML researchers, and product builders.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            We're a remote team that has previously built talent and ML
            infrastructure at companies like Stripe, Ramp, Scale, and
            Greenhouse. We're backed by founders and operators who've hired
            thousands of people the hard way — and want to make sure no one has
            to do it that way again.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="hero">
              <Link to="/signup">Start free trial</Link>
            </Button>
            <Button asChild variant="heroSecondary">
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <CtaSection />
      <Footer />
    </>
  );
}