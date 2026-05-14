import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CtaSection } from "@/components/landing/CtaSection";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — Grow" },
      {
        name: "description",
        content:
          "Every shipped change to Grow — new models, product surfaces, integrations and fixes.",
      },
      { property: "og:title", content: "Changelog — Grow" },
      {
        property: "og:description",
        content:
          "A running log of what we've shipped across Sourcing AI, Interview Copilot and the Grow platform.",
      },
    ],
  }),
  component: ChangelogPage,
});

type Tag = "New" | "Improved" | "Fixed" | "Model";

type Entry = {
  version: string;
  date: string;
  title: string;
  body: string;
  items: { tag: Tag; text: string }[];
};

const entries: Entry[] = [
  {
    version: "2026.4",
    date: "April 22, 2026",
    title: "Live scorecards and a smarter sourcing model",
    body: "Interview Copilot now drafts structured scorecards while the loop is still in progress, and Sourcing v4 lifts qualified-response rate by 31% across our benchmark cohort.",
    items: [
      { tag: "Model", text: "Sourcing AI v4 with retention-aware ranking." },
      { tag: "New", text: "Real-time scorecards in Interview Copilot." },
      { tag: "New", text: "Calibration drift alerts on every loop." },
      { tag: "Improved", text: "Faster pipeline analytics — p95 under 400ms." },
    ],
  },
  {
    version: "2026.3",
    date: "March 18, 2026",
    title: "Outbound sequences, redesigned",
    body: "A ground-up rewrite of the outbound editor with branching, A/B variants, and per-segment send windows tuned to candidate timezone.",
    items: [
      { tag: "New", text: "Branching sequences with up to 6 steps." },
      { tag: "New", text: "Per-segment send windows by candidate timezone." },
      { tag: "Improved", text: "Greenhouse and Ashby sync latency cut 4×." },
      { tag: "Fixed", text: "Duplicate scorecard rows on multi-panel loops." },
    ],
  },
  {
    version: "2026.2",
    date: "February 11, 2026",
    title: "Retention models, GA",
    body: "12-month retention predictions now ship as a first-class signal across pipelines, scorecards and offer review.",
    items: [
      { tag: "Model", text: "Retention v2 — calibrated on 280k+ hires." },
      { tag: "New", text: "Retention column on every pipeline view." },
      { tag: "Improved", text: "Offer review surfaces top retention drivers." },
    ],
  },
  {
    version: "2026.1",
    date: "January 9, 2026",
    title: "New year, new platform shell",
    body: "Faster navigation, command-K everywhere, and a redesigned candidate profile that puts signal before chronology.",
    items: [
      { tag: "New", text: "Command-K across pipelines, candidates and reports." },
      { tag: "Improved", text: "Candidate profile redesign — signal-first." },
      { tag: "Fixed", text: "Timezone offsets on scheduled interview reminders." },
    ],
  },
];

const tagStyles: Record<Tag, string> = {
  New: "bg-primary/15 text-primary ring-1 ring-inset ring-primary/30",
  Improved: "bg-foreground/10 text-foreground ring-1 ring-inset ring-foreground/15",
  Fixed: "bg-muted/40 text-muted-foreground ring-1 ring-inset ring-muted-foreground/20",
  Model: "bg-accent/20 text-accent-foreground ring-1 ring-inset ring-accent/30",
};

function ChangelogPage() {
  return (
    <>
      <Navbar />

      <section className="relative px-6 pb-16 pt-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Changelog
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
            Every change we ship to Grow.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            New models, product surfaces, integrations, and the fixes in between. Updated whenever
            we deploy — usually a few times a week.
          </p>
        </div>
      </section>

      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <ol className="relative space-y-10 border-l border-white/10 pl-8">
            {entries.map((e) => (
              <li key={e.version} className="relative">
                <span className="absolute -left-[37px] top-2 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                <div className="liquid-glass rounded-3xl bg-card/40 p-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                        v{e.version}
                      </span>
                      <span className="text-sm text-muted-foreground">{e.date}</span>
                    </div>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                    {e.title}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">{e.body}</p>
                  <ul className="mt-6 space-y-3">
                    {e.items.map((it, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tagStyles[it.tag]}`}
                        >
                          {it.tag}
                        </span>
                        <span className="text-sm leading-relaxed text-foreground/90">
                          {it.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaSection />
      <Footer />
    </>
  );
}
