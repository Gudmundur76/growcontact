import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CtaSection } from "@/components/landing/CtaSection";
import { ArrowUpRight } from "lucide-react";
import { posts } from "@/content/blog-posts";

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
          <Link
            to="/blog/$slug"
            params={{ slug: featured.slug }}
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
          </Link>
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
              <Link
                key={p.slug}
                to="/blog/$slug"
                params={{ slug: p.slug }}
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
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
      <Footer />
    </>
  );
}