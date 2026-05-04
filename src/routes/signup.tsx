import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Start your free trial — Grow" },
      {
        name: "description",
        content:
          "Create your Grow account and start hiring with the AI talent operating system. 14-day free trial, no credit card required.",
      },
      { property: "og:title", content: "Start your free trial — Grow" },
      {
        property: "og:description",
        content:
          "Create your Grow account in seconds. 14-day trial, no credit card.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <Navbar />
      <section className="relative px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-16 md:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Start free
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
              Hire your next 10 people with Grow.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              14-day trial. No credit card. Cancel anytime. Bring your roles —
              we'll bring the candidates.
            </p>
            <ul className="mt-10 space-y-3 text-sm text-foreground/90">
              <li>• Unlimited AI sourcing during trial</li>
              <li>• Interview Copilot on every call</li>
              <li>• ATS sync with Greenhouse, Ashby, Lever</li>
            </ul>
          </div>

          <div className="liquid-glass rounded-3xl bg-card/40 p-8">
            {submitted ? (
              <div className="flex h-full flex-col items-start justify-center">
                <h2 className="text-2xl font-semibold text-foreground">
                  You're on the list.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Check your inbox — we just sent a magic link to finish setting
                  up your workspace.
                </p>
                <Link
                  to="/"
                  className="mt-8 text-sm font-medium text-primary hover:underline"
                >
                  ← Back to home
                </Link>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(true);
                }}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full rounded-xl bg-white/5 px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-white/10 focus:ring-primary"
                    placeholder="Ada Lovelace"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    Work email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-xl bg-white/5 px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-white/10 focus:ring-primary"
                    placeholder="ada@company.com"
                  />
                </div>
                <div>
                  <label
                    htmlFor="company"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    Company
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    required
                    className="w-full rounded-xl bg-white/5 px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-white/10 focus:ring-primary"
                    placeholder="Vortex"
                  />
                </div>
                <Button type="submit" variant="hero" className="w-full justify-center">
                  Start free trial
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  By signing up you agree to our Terms and Privacy policy.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}