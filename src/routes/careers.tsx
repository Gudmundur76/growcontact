import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CtaSection } from "@/components/landing/CtaSection";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, MapPin, Briefcase } from "lucide-react";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — Grow" },
      {
        name: "description",
        content:
          "Join Grow and help build the talent operating system for the next generation of high-growth companies.",
      },
      { property: "og:title", content: "Careers — Grow" },
      {
        property: "og:description",
        content:
          "We're hiring engineers, designers and recruiters reinventing how teams hire.",
      },
    ],
  }),
  component: CareersPage,
});

const values = [
  {
    title: "Calibrated, not loud",
    body: "We measure ourselves on outcomes — hires shipped, retention 12 months out — not vanity metrics.",
  },
  {
    title: "Builders first",
    body: "Every team has shipping autonomy. PMs, designers and engineers move as one pod from kickoff to GA.",
  },
  {
    title: "Bar over speed",
    body: "We'd rather wait two more weeks for the right hire than carry a wrong one for two years.",
  },
];

const perks = [
  "Fully remote, async-first across 11 timezones",
  "Quarterly team offsites in Lisbon, Tokyo & NYC",
  "Top-of-market salary + meaningful equity",
  "100% covered health, dental & vision",
  "$3,000 / yr learning & home office stipend",
  "16 weeks parental leave, all parents",
];

const roles = [
  {
    title: "Staff Software Engineer, Sourcing AI",
    team: "Engineering",
    location: "Remote · Americas / EU",
  },
  {
    title: "Senior Product Designer, Interview Copilot",
    team: "Design",
    location: "Remote · Global",
  },
  {
    title: "Founding Forward-Deployed Engineer",
    team: "Engineering",
    location: "New York or San Francisco",
  },
  {
    title: "Senior Recruiter, GTM",
    team: "Talent",
    location: "Remote · Americas",
  },
  {
    title: "Machine Learning Engineer, Retention Models",
    team: "Engineering",
    location: "Remote · Global",
  },
  {
    title: "Head of Customer Success",
    team: "Go-to-market",
    location: "New York",
  },
];

function CareersPage() {
  return (
    <>
      <Navbar />

      <section className="relative px-6 pb-20 pt-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Careers
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
            Build the system that decides who gets hired next.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            We're a small, senior team rethinking recruiting from the model
            layer up. If you've shipped products people rely on every day, we
            want to talk.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild variant="hero">
              <a href="#open-roles">See open roles</a>
            </Button>
            <Button asChild variant="heroSecondary">
              <Link to="/about">About Grow</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              How we work
            </p>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
              A team built the way we think teams should be built.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="liquid-glass rounded-3xl bg-card/40 p-8">
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
        <div className="mx-auto max-w-6xl">
          <div className="liquid-glass rounded-3xl bg-card/40 p-8 md:p-12">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Benefits & perks
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {perks.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-3 text-base text-foreground/90"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="open-roles" className="relative px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-xl">
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Open roles
              </p>
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
                {roles.length} positions open today.
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Don't see your role? Email{" "}
              <a
                href="mailto:join@grow.dev"
                className="text-foreground underline-offset-4 hover:underline"
              >
                join@grow.dev
              </a>
              .
            </p>
          </div>

          <div className="liquid-glass overflow-hidden rounded-3xl bg-card/40">
            <ul className="divide-y divide-white/5">
              {roles.map((r) => (
                <li key={r.title}>
                  <a
                    href="#"
                    className="group flex flex-col gap-3 px-6 py-6 transition-colors hover:bg-white/[0.03] md:flex-row md:items-center md:justify-between md:px-8"
                  >
                    <div>
                      <div className="text-lg font-semibold text-foreground">
                        {r.title}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5" />
                          {r.team}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {r.location}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:text-primary/80">
                      Apply <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <CtaSection />
      <Footer />
    </>
  );
}
