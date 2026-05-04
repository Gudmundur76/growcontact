import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Video,
  ShieldCheck,
  Gauge,
  FileText,
  ListChecks,
  Share2,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/interview-copilot")({
  head: () => ({
    meta: [
      { title: "Interview Copilot — Live AI for Zoom, Meet & Teams" },
      {
        name: "description",
        content:
          "An AI copilot that joins your Zoom, Google Meet, and Microsoft Teams interviews. Live transcripts, calibrated follow-ups, and structured scorecards — without changing your workflow.",
      },
      {
        property: "og:title",
        content: "Interview Copilot — Live AI for Zoom, Meet & Teams",
      },
      {
        property: "og:description",
        content:
          "Live transcripts, calibrated follow-ups, and structured scorecards from every interview.",
      },
    ],
  }),
  component: InterviewCopilotMarketing,
});

const features = [
  {
    icon: Video,
    title: "Joins any meeting",
    body: "Drop in a Zoom, Google Meet, or Microsoft Teams link. The bot joins as a polite participant and starts capturing.",
  },
  {
    icon: Gauge,
    title: "Real-time follow-ups",
    body: "Gemini 2.5 Flash watches the transcript and surfaces sharp follow-ups, signals, and red flags as the conversation unfolds.",
  },
  {
    icon: ListChecks,
    title: "Calibrated rubrics",
    body: "Define rubrics per role. The copilot rates every required competency against the same bar, every time.",
  },
  {
    icon: FileText,
    title: "Structured scorecards",
    body: "End the call, get a hire / no-hire recommendation with strengths, concerns, and evidence — ready in seconds.",
  },
  {
    icon: Share2,
    title: "Shareable summaries",
    body: "Generate a read-only link or copy a Markdown summary into Slack, your ATS, or hiring docs.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Recordings are scoped to your account. Share links are revocable. We never train models on your transcripts.",
  },
];

const steps = [
  {
    n: "01",
    title: "Paste the meeting link",
    body: "Add the candidate, role, and (optionally) a rubric. Takes 20 seconds.",
  },
  {
    n: "02",
    title: "Run the interview as you normally would",
    body: "The bot joins silently. Suggestions appear in your copilot panel — keep eye contact, not notes.",
  },
  {
    n: "03",
    title: "Get the scorecard, ship the decision",
    body: "One click generates a calibrated scorecard. Share it with the panel, paste it into your ATS, move on.",
  },
];

const faqs = [
  {
    q: "Which meeting platforms work?",
    a: "Zoom, Google Meet, and Microsoft Teams — all three. Just paste any meeting link.",
  },
  {
    q: "Do candidates know they're being recorded?",
    a: "Yes. The bot joins as a visible participant named 'Interview Copilot' and posts a chat message on join. You should also disclose it verbally.",
  },
  {
    q: "Where does my data live?",
    a: "Transcripts and scorecards are stored in your private workspace with row-level security. Share links are opt-in per interview and revocable in one click.",
  },
  {
    q: "Can I bring my own rubric?",
    a: "Yes. Build per-role rubric templates with custom competencies. The AI rates each one against the same bar in every scorecard.",
  },
];

function InterviewCopilotMarketing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="container mx-auto max-w-5xl px-4 pb-16 pt-32 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3 text-primary" /> New · Interview Copilot
          </span>
          <h1 className="mt-6 text-balance text-5xl font-medium tracking-tight md:text-6xl">
            The AI copilot for{" "}
            <span className="text-primary">live interviews</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
            Joins Zoom, Google Meet, and Microsoft Teams. Transcribes live. Surfaces calibrated
            follow-ups. Ships a structured scorecard the moment the call ends.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/interview/new">
                Start your first interview <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link to="/interview">Open the dashboard</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free during beta · Works with your existing meeting links
          </p>
        </section>

        {/* Product mock */}
        <section className="container mx-auto max-w-5xl px-4">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl">
            <div className="flex items-center gap-2 border-b bg-background/40 px-4 py-3">
              <div className="size-2.5 rounded-full bg-red-500/70" />
              <div className="size-2.5 rounded-full bg-amber-500/70" />
              <div className="size-2.5 rounded-full bg-emerald-500/70" />
              <div className="ml-3 text-xs text-muted-foreground">
                grow.contact / interview / live
              </div>
            </div>
            <div className="grid gap-0 md:grid-cols-[1fr_280px]">
              <div className="space-y-3 border-r p-6">
                <div className="text-xs font-medium text-emerald-500">● Live transcript</div>
                <p className="text-sm">
                  <span className="font-medium">Candidate:</span>{" "}
                  <span className="text-muted-foreground">
                    I led the migration from a monolith to event-driven services over six months…
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium">Interviewer:</span>{" "}
                  <span className="text-muted-foreground">
                    What was the hardest tradeoff you had to defend?
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium">Candidate:</span>{" "}
                  <span className="text-muted-foreground">
                    Choosing Kafka over SQS — we needed replay, but it added on-call load…
                  </span>
                </p>
              </div>
              <div className="space-y-3 p-6">
                <div className="text-xs font-medium text-primary">
                  <Sparkles className="mr-1 inline size-3" /> Copilot
                </div>
                <div className="rounded-md border bg-background p-3 text-xs">
                  Probe on-call burden: how did the team feel about Kafka in month 3?
                </div>
                <div className="rounded-md border bg-background p-3 text-xs">
                  Ask for a metric: throughput delta, or incident count before/after?
                </div>
                <div className="rounded-md border bg-background p-3 text-xs">
                  Strong signal: defended a non-default choice with cost reasoning.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto max-w-6xl px-4 py-24">
          <h2 className="text-center text-3xl font-medium tracking-tight md:text-4xl">
            Everything you need to run a calibrated loop
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6">
                <f.icon className="size-6 text-primary" />
                <h3 className="mt-4 text-lg font-medium">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto max-w-5xl px-4 pb-24">
          <h2 className="text-center text-3xl font-medium tracking-tight md:text-4xl">
            From meeting link to decision in three steps
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-xl border bg-card p-6">
                <div className="text-xs font-mono text-primary">{s.n}</div>
                <h3 className="mt-3 text-lg font-medium">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto max-w-3xl px-4 pb-24">
          <h2 className="text-center text-3xl font-medium tracking-tight md:text-4xl">
            Frequently asked
          </h2>
          <div className="mt-10 divide-y rounded-xl border bg-card">
            {faqs.map((f) => (
              <div key={f.q} className="p-6">
                <h3 className="text-base font-medium">{f.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto max-w-4xl px-4 pb-32 text-center">
          <h2 className="text-balance text-4xl font-medium tracking-tight md:text-5xl">
            Ship better hires, with the same calendar.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Bring the copilot to your next loop. No new tools to learn, no calendar migration.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-full">
            <Link to="/interview/new">
              Start free <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
}