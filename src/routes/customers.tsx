import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CtaSection } from "@/components/landing/CtaSection";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Grow" },
      {
        name: "description",
        content:
          "How high-growth teams use Grow to source, screen and hire faster — without agency fees.",
      },
      { property: "og:title", content: "Customers — Grow" },
      {
        property: "og:description",
        content:
          "Real results from teams replacing fragmented recruiting tools with Grow.",
      },
    ],
  }),
  component: CustomersPage,
});

const logos = ["Vortex", "Nimbus", "Prysma", "Northwind", "Helios", "Atlas"];

const stories = [
  {
    company: "Vortex",
    industry: "Series C · Infrastructure",
    headline: "14 senior engineering hires in one quarter, zero agency spend.",
    metrics: [
      { value: "14", label: "Senior hires / quarter" },
      { value: "$0", label: "Agency fees" },
      { value: "67%", label: "Faster offer cycle" },
    ],
    quote:
      "Grow shipped 14 senior engineering hires in our first quarter — without a single agency invoice. The Copilot alone saved us weeks of debriefs.",
    person: "Maya Okafor, VP People",
  },
  {
    company: "Nimbus",
    industry: "Series B · Developer tools",
    headline: "Time-to-hire dropped from 58 to 19 days across all roles.",
    metrics: [
      { value: "19d", label: "Median time-to-hire" },
      { value: "3.2×", label: "Pipeline throughput" },
      { value: "92%", label: "Offer acceptance" },
    ],
    quote:
      "It feels like having a tireless senior recruiter who never sleeps and actually understands our roadmap.",
    person: "Daniel Reyes, Head of Talent",
  },
  {
    company: "Prysma",
    industry: "Seed · AI / ML",
    headline: "Calibrated scorecards their team trusts more than gut feel.",
    metrics: [
      { value: "94%", label: "12-mo retention" },
      { value: "5×", label: "Qualified pipeline" },
      { value: "11d", label: "From req to offer" },
    ],
    quote:
      "The retention predictions are scary accurate. We trust the scorecards more than our own gut now — and we're hiring better because of it.",
    person: "Priya Shah, Co-founder & CTO",
  },
];

function CustomersPage() {
  return (
    <>
      <Navbar />
      <section className="relative px-6 pb-20 pt-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Customers
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
            The fastest-moving teams hire on Grow.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            From seed-stage AI labs to Series C infrastructure companies — see
            how teams are turning recruiting from a quarter-long bottleneck
            into a days-long, data-driven workflow.
          </p>
        </div>
      </section>

      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="liquid-glass rounded-3xl bg-card/40 px-8 py-10">
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:grid-cols-6">
              {logos.map((name) => (
                <div
                  key={name}
                  className="text-center text-lg font-semibold tracking-tight text-foreground/70"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-6xl space-y-6">
          {stories.map((s) => (
            <article
              key={s.company}
              className="liquid-glass rounded-3xl bg-card/40 p-8 md:p-12"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-2xl font-semibold tracking-tight text-foreground">
                    {s.company}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {s.industry}
                  </div>
                </div>
                <a
                  href="#"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                >
                  Read case study <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>

              <h2 className="mt-8 max-w-3xl text-2xl font-semibold leading-snug tracking-tight text-foreground md:text-3xl">
                {s.headline}
              </h2>

              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                {s.metrics.map((m) => (
                  <div key={m.label}>
                    <div className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                      {m.value}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>

              <blockquote className="mt-10 max-w-3xl border-l border-white/10 pl-6 text-base leading-relaxed text-foreground/90">
                "{s.quote}"
                <footer className="mt-3 text-sm text-muted-foreground">
                  — {s.person}
                </footer>
              </blockquote>
            </article>
          ))}
        </div>
      </section>

      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
            Want to be the next story?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Most teams ship their first hire on Grow within two weeks of
            kickoff.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
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