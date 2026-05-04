import { Radar, ClipboardCheck, Headphones, LineChart } from "lucide-react";

const features = [
  {
    icon: Radar,
    title: "AI Sourcing",
    description:
      "Continuously scans 600M+ profiles, repos and signals to surface hidden talent and flight-risk candidates before your competitors do.",
  },
  {
    icon: ClipboardCheck,
    title: "Smart Screening",
    description:
      "Adaptive async interviews that probe real competencies — not buzzwords — and produce calibrated scorecards in minutes.",
  },
  {
    icon: Headphones,
    title: "Interview Copilot",
    description:
      "Live in-call assistance: real-time follow-ups, structured rubrics, and red-flag detection across Zoom, Meet and Teams.",
  },
  {
    icon: LineChart,
    title: "Predictive Analytics",
    description:
      "Forecast time-to-hire, offer-acceptance and 12-month retention with models trained on your pipeline.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative px-6 py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 max-w-2xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            The Platform
          </p>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            A complete talent operating system.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Replace fragmented tools and senior recruiter overhead with one
            intelligent platform that sources, screens and predicts.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="liquid-glass group rounded-3xl bg-card/40 p-8 transition-colors hover:bg-card/60"
            >
              <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">{title}</h3>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}