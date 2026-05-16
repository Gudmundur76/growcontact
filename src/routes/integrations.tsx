import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CtaSection } from "@/components/landing/CtaSection";
import { Button } from "@/components/ui/button";
import {
  Video,
  Linkedin,
  Mail,
  MessageSquare,
  Calendar,
  Building2,
  Users,
  Briefcase,
  Code2,
  ArrowRight,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Grow" },
      {
        name: "description",
        content:
          "Grow connects to the tools your hiring team already uses — Zoom, Teams, Google Meet, LinkedIn, Resend, Greenhouse, Slack and more.",
      },
      { property: "og:title", content: "Integrations — Grow" },
      {
        property: "og:description",
        content:
          "Deep integrations with video, ATS, HRIS, sourcing and outreach tools — no workflow change required.",
      },
    ],
  }),
  component: IntegrationsPage,
});

const core = [
  {
    name: "Microsoft Teams",
    category: "Video Interviews",
    icon: Video,
    blurb:
      "Interview Copilot joins your Teams calls automatically — no bot invite needed. Live transcription, AI question prompts and automatic scorecards run in-session.",
    items: [
      "Automatic meeting join via calendar link",
      "Live interview transcription",
      "Real-time question suggestions",
      "Post-interview scorecard generation",
    ],
  },
  {
    name: "Zoom",
    category: "Video Interviews",
    icon: Video,
    blurb:
      "Full Interview Copilot support for Zoom — identical capabilities to Teams. Works with any Zoom link, no special configuration required.",
    items: [
      "Automatic meeting join",
      "Live transcription and AI prompts",
      "Scorecard generation",
      "Recording sync (optional)",
    ],
  },
  {
    name: "Google Meet",
    category: "Video Interviews",
    icon: Video,
    blurb:
      "Interview Copilot for Google Meet. Grow joins via the meet link and provides the same live AI assistance as on Teams and Zoom.",
    items: [
      "Auto-join via Google Calendar events",
      "Live transcription",
      "Real-time coaching prompts",
      "Automatic scorecard on call end",
    ],
  },
  {
    name: "LinkedIn",
    category: "Sourcing",
    icon: Linkedin,
    blurb:
      "Grow connects to LinkedIn Recruiter and public profiles to build candidate long-lists, enrich profiles, and trigger outreach — without manual copy-paste.",
    items: [
      "LinkedIn Recruiter sync",
      "Profile enrichment and ranking",
      "Automated InMail sequences",
      "Candidate deduplication",
    ],
  },
  {
    name: "Resend",
    category: "Outreach & Email",
    icon: Mail,
    blurb:
      "All candidate email outreach in Grow is powered by Resend — ensuring deliverability, tracking and personalization at scale without going to spam.",
    items: [
      "Personalized outreach sequences",
      "Open and reply tracking",
      "Custom sender domains",
      "Bounce and unsubscribe handling",
    ],
  },
];

const more: {
  name: string;
  category: string;
  status: "Available" | "Coming soon";
  icon: typeof MessageSquare;
}[] = [
  { name: "Greenhouse", category: "ATS", status: "Available", icon: Briefcase },
  { name: "Slack", category: "Notifications", status: "Available", icon: MessageSquare },
  { name: "Ashby", category: "ATS", status: "Available", icon: Briefcase },
  { name: "Lever", category: "ATS", status: "Coming soon", icon: Briefcase },
  { name: "Workday", category: "HRIS", status: "Coming soon", icon: Building2 },
  { name: "BambooHR", category: "HRIS", status: "Coming soon", icon: Users },
  { name: "Calendly", category: "Scheduling", status: "Coming soon", icon: Calendar },
  { name: "Rippling", category: "HRIS", status: "Coming soon", icon: Building2 },
];

function IntegrationsPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative px-6 pb-16 pt-12 md:pt-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Integrations</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            Works where your team works.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Grow connects with the tools you already use — video conferencing, LinkedIn, your ATS,
            and email infrastructure — without forcing a workflow change.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="hero" size="lg" className="rounded-full">
              <Link to="/signup">
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="heroSecondary" size="lg" className="rounded-full">
              <Link to="/contact">Talk to us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Core integrations */}
      <section className="relative px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Core integrations
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Deep integrations, not surface-level connectors.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {core.map((c) => {
              const Icon = c.icon;
              return (
                <article
                  key={c.name}
                  className="liquid-glass rounded-2xl border border-white/5 bg-card/40 p-7"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-foreground">{c.name}</div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {c.category}
                      </div>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{c.blurb}</p>
                  <div className="mt-6 border-t border-white/5 pt-5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                      What's included
                    </div>
                    <ul className="mt-3 space-y-2">
                      {c.items.map((it) => (
                        <li
                          key={it}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* More integrations */}
      <section className="relative px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              More integrations
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Your ATS, HRIS, and scheduling tools.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {more.map((m) => {
              const Icon = m.icon;
              const available = m.status === "Available";
              return (
                <div
                  key={m.name}
                  className="rounded-2xl border border-white/5 bg-card/40 p-5 transition-colors hover:bg-card/60"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-foreground/80">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={
                        "rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider " +
                        (available
                          ? "bg-primary/15 text-primary"
                          : "bg-white/5 text-muted-foreground")
                      }
                    >
                      {m.status}
                    </span>
                  </div>
                  <div className="mt-4 text-sm font-semibold text-foreground">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.category}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Custom integration */}
      <section className="relative px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="liquid-glass rounded-3xl border border-white/5 bg-card/40 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Code2 className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Need a custom integration?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Grow has a full REST API and webhooks. Connect any tool in your stack — ATS, HRIS,
              scheduling, identity, or internal tooling.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild variant="hero" className="rounded-full">
                <Link to="/account/integrations">Activate integrations</Link>
              </Button>
              <Button asChild variant="heroSecondary" className="rounded-full">
                <Link to="/api-docs">View API docs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <CtaSection />
      <Footer />
    </div>
  );
}