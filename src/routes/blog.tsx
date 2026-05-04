import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CtaSection } from "@/components/landing/CtaSection";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Grow" },
      {
        name: "description",
        content:
          "Field notes on hiring, calibration and building the modern talent operating system.",
      },
      { property: "og:title", content: "Blog — Grow" },
      {
        property: "og:description",
        content:
          "Essays, benchmarks and product updates from the team building Grow.",
      },
    ],
  }),
  component: BlogPage,
});

type Post = {
  title: string;
  excerpt: string;
  category: "Essay" | "Benchmark" | "Product" | "Playbook";
  author: string;
  date: string;
  readTime: string;
  featured?: boolean;
};

const posts: Post[] = [
  {
    title: "The end of the resume funnel",
    excerpt:
      "Why we stopped optimizing for application volume and started optimizing for calibrated, time-bound shortlists — and what changed in our pipelines six months in.",
    category: "Essay",
    author: "Maya Okafor",
    date: "April 18, 2026",
    readTime: "9 min read",
    featured: true,
  },
  {
    title: "Q1 2026 hiring benchmarks: time-to-hire by stage",
    excerpt:
      "We analyzed 41,200 hires across 280 high-growth teams. Median time-to-hire dropped 22% YoY — but the variance between top and bottom quartile widened.",
    category: "Benchmark",
    author: "Grow Research",
    date: "April 9, 2026",
    readTime: "12 min read",
  },
  {
    title: "Interview Copilot now drafts scorecards in real time",
    excerpt:
      "Our newest model writes structured, signal-anchored scorecards while the interview is still happening. Here's the shape of the system.",
    category: "Product",
    author: "Engineering at Grow",
    date: "March 27, 2026",
    readTime: "6 min read",
  },
  {
    title: "How Vortex hired 14 engineers in 47 days without an agency",
    excerpt:
      "A play-by-play of the sourcing strategy, calibration loop and offer cadence that took Vortex from Series A to fully staffed platform team.",
    category: "Playbook",
    author: "Liam Chen",
    date: "March 14, 2026",
    readTime: "11 min read",
  },
  {
    title: "Calibrated, not vibes: writing rubrics that actually predict",
    excerpt:
      "A practical guide to behaviorally-anchored rating scales for technical and GTM roles, with templates from teams running them in production.",
    category: "Playbook",
    author: "Priya Raman",
    date: "February 28, 2026",
    readTime: "14 min read",
  },
  {
    title: "Retention is a hiring metric",
    excerpt:
      "Why we report 12-month retention on every hire — and how surfacing it inside the loop changed the calibration conversations leadership teams actually have.",
    category: "Essay",
    author: "Maya Okafor",
    date: "February 6, 2026",
    readTime: "8 min read",
  },
];

function BlogPage() {
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p !== featured);

  return (
    <>
      <Navbar />

      <section className="relative px-6 pb-16 pt-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Blog
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
            Field notes from the talent operating system.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Essays, benchmarks and product dispatches from the team building
            Grow — and from the leaders running it inside their hiring loops.
          </p>
        </div>
      </section>

      <section className="relative px-6 pb-20">
        <div className="mx-auto max-w-6xl">
          <a
            href="#"
            className="liquid-glass group block overflow-hidden rounded-3xl bg-card/40 p-8 transition-colors hover:bg-card/60 md:p-12"
          >
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-primary">
              <span>Featured</span>
              <span className="h-px w-8 bg-primary/40" />
              <span className="text-muted-foreground">{featured.category}</span>
            </div>
            <h2 className="mt-6 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
              {featured.title}
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {featured.excerpt}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="text-foreground">{featured.author}</span>
                <span className="mx-2">·</span>
                {featured.date}
                <span className="mx-2">·</span>
                {featured.readTime}
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:text-primary/80">
                Read essay <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </a>
        </div>
      </section>

      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Latest writing
            </h2>
            <Link
              to="/about"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              About the team →
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <a
                key={p.title}
                href="#"
                className="liquid-glass group flex h-full flex-col rounded-3xl bg-card/40 p-7 transition-colors hover:bg-card/60"
              >
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  {p.category}
                </div>
                <h3 className="mt-4 text-xl font-semibold leading-snug text-foreground">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {p.excerpt}
                </p>
                <div className="mt-auto pt-8 text-xs text-muted-foreground">
                  <span className="text-foreground">{p.author}</span>
                  <span className="mx-2">·</span>
                  {p.date}
                  <span className="mx-2">·</span>
                  {p.readTime}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
      <Footer />
    </>
  );
}