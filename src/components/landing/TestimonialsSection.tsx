const testimonials = [
  {
    quote:
      "Grow shipped 14 senior engineering hires in our first quarter — without a single agency invoice. The Copilot alone saved us weeks of debriefs.",
    name: "Maya Okafor",
    role: "VP People, Vortex",
  },
  {
    quote:
      "It feels like having a tireless senior recruiter who never sleeps and actually understands our roadmap. Time-to-hire dropped from 58 to 19 days.",
    name: "Daniel Reyes",
    role: "Head of Talent, Nimbus",
  },
  {
    quote:
      "The retention predictions are scary accurate. We trust the scorecards more than our own gut now — and we're hiring better because of it.",
    name: "Priya Shah",
    role: "Co-founder & CTO, Prysma",
  },
];

export function TestimonialsSection() {
  return (
    <section className="relative px-6 py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 max-w-2xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Loved by talent teams
          </p>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            Built for the teams shaping what's next.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="liquid-glass flex flex-col justify-between rounded-3xl bg-card/40 p-8"
            >
              <blockquote className="text-base leading-relaxed text-foreground/90">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-8">
                <div className="text-sm font-semibold text-foreground">
                  {t.name}
                </div>
                <div className="text-sm text-muted-foreground">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}