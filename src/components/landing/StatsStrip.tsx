const stats = [
  { value: "3×", label: "Faster time-to-hire" },
  { value: "60%", label: "Recruiter cost saved" },
  { value: "94%", label: "Screening accuracy" },
  { value: "12mo", label: "Retention predicted" },
];

export function StatsStrip() {
  return (
    <section className="relative px-6 py-8" aria-label="Outcomes">
      <div className="mx-auto max-w-5xl">
        <div className="liquid-glass grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-card/30 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card/30 px-6 py-7 text-center">
              <div className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                {s.value}
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
