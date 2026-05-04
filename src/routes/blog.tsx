import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CtaSection } from "@/components/landing/CtaSection";
import { ArrowUpRight, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { posts, type PostCategory } from "@/content/blog-posts";
import { toast } from "sonner";

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
  const [activeCat, setActiveCat] = useState<PostCategory | "All">("All");
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");

  const categories: (PostCategory | "All")[] = useMemo(() => {
    const set = new Set<PostCategory>();
    posts.forEach((p) => set.add(p.category));
    return ["All", ...Array.from(set)];
  }, []);

  const rest = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts
      .filter((p) => p.slug !== featured.slug)
      .filter((p) => activeCat === "All" || p.category === activeCat)
      .filter(
        (p) =>
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q),
      );
  }, [activeCat, query, featured.slug]);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    toast.success("Subscribed — we'll send the next dispatch your way.");
    setEmail("");
  }

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
          <div className="mb-10 flex flex-col gap-6">
            <div className="flex items-end justify-between">
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

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setActiveCat(c)}
                    className={
                      "rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.16em] transition-colors " +
                      (activeCat === c
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-white/10 bg-card/30 text-muted-foreground hover:border-white/20 hover:text-foreground")
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="relative md:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search essays, authors…"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {rest.length === 0 ? (
            <div className="liquid-glass rounded-3xl bg-card/40 p-12 text-center">
              <p className="text-base text-muted-foreground">
                No essays match that filter yet. Try clearing the search or
                picking a different category.
              </p>
            </div>
          ) : (
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
          )}
        </div>
      </section>

      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <div className="liquid-glass relative overflow-hidden rounded-3xl bg-card/40 p-8 md:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 opacity-50"
              style={{
                background:
                  "radial-gradient(60% 60% at 100% 0%, hsl(var(--primary) / 0.25) 0%, transparent 70%)",
              }}
            />
            <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  <Mail className="h-3.5 w-3.5" /> The Calibration Memo
                </div>
                <h3 className="text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">
                  One essay every other Tuesday. No tracking, no clickbait.
                </h3>
                <p className="mt-3 text-sm text-muted-foreground md:text-base">
                  Field notes from the team building Grow and the leaders
                  running it inside their hiring loops. Unsubscribe in one
                  click.
                </p>
              </div>
              <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
                <Input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="submit" variant="hero" className="w-full">
                  Subscribe
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  10,400+ talent leaders subscribed.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <CtaSection />
      <Footer />
    </>
  );
}