import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="relative px-6 py-32">
      <div className="mx-auto max-w-5xl">
        <div className="liquid-glass relative overflow-hidden rounded-[2rem] bg-card/40 px-8 py-20 text-center md:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-60"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 0%, hsl(var(--primary) / 0.35) 0%, transparent 70%)",
            }}
          />
          <h2 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
            Hire your next 10 people with one platform.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Start a 14-day trial. No credit card. Cancel anytime.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="hero">Start free trial</Button>
            <Button variant="heroSecondary">Book a demo</Button>
          </div>
        </div>
      </div>
    </section>
  );
}