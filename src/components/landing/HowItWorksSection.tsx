const steps = [
  {
    step: "01",
    title: "Discover",
    description:
      "Define the role and let Grow build a live talent map ranked by fit, momentum and reachability.",
  },
  {
    step: "02",
    title: "Engage",
    description:
      "Personalized outreach sequences and async screens move qualified candidates into your pipeline 24/7.",
  },
  {
    step: "03",
    title: "Hire",
    description:
      "Interview Copilot and predictive scorecards help your team make confident, calibrated offers — fast.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative px-6 py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              How it works
            </p>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
              From open req to signed offer in days, not quarters.
            </h2>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map(({ step, title, description }) => (
            <div key={step} className="liquid-glass rounded-3xl bg-card/40 p-8">
              <div className="text-sm font-medium text-primary">{step}</div>
              <h3 className="mt-4 text-2xl font-semibold text-foreground">{title}</h3>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
