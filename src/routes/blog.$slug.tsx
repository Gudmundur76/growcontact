import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CtaSection } from "@/components/landing/CtaSection";
import { ArrowLeft, Linkedin, Link2, Twitter, Check } from "lucide-react";
import { getPost, posts } from "@/content/blog-posts";
import { getPublishedPosts } from "@/server/blog.functions";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const staticPost = getPost(params.slug);
    if (staticPost) {
      const others = posts
        .filter((p) => p.slug !== staticPost.slug)
        .slice(0, 3)
        .map((p) => ({
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          category: p.category as string,
          date: p.date,
          readTime: p.readTime,
        }));
      return { post: staticPost, others };
    }
    const { posts: dbPosts } = await getPublishedPosts();
    const found = dbPosts.find((p) => p.slug === params.slug);
    if (!found) throw notFound();
    const others = [
      ...dbPosts.filter((p) => p.slug !== found.slug),
      ...posts.map((p) => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        category: p.category as string,
        date: p.date,
        readTime: p.readTime,
      })),
    ].slice(0, 3);
    return { post: found, others };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return { meta: [{ title: "Post not found — Grow" }] };
    const url = `https://grow.contact/blog/${post.slug}`;
    const isoDate = (() => {
      const d = new Date(post.date);
      return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    })();
    return {
      meta: [
        { title: `${post.title} — Grow Blog` },
        { name: "description", content: post.excerpt },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.excerpt },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "article:published_time", content: isoDate },
        { property: "article:author", content: post.author },
        { property: "article:section", content: post.category },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: post.title },
        { name: "twitter:description", content: post.excerpt },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.excerpt,
            datePublished: isoDate,
            dateModified: isoDate,
            author: {
              "@type": "Person",
              name: post.author,
              jobTitle: post.authorRole,
            },
            publisher: {
              "@type": "Organization",
              name: "Grow",
              url: "https://grow.contact",
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            articleSection: post.category,
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <>
      <Navbar />
      <section className="px-6 py-32 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Post not found
        </h1>
        <p className="mt-3 text-muted-foreground">
          We couldn't find that essay.
        </p>
        <Link
          to="/blog"
          className="mt-8 inline-flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to the blog
        </Link>
      </section>
      <Footer />
    </>
  ),
  errorComponent: ({ error }) => (
    <>
      <Navbar />
      <section className="px-6 py-32 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-3 text-muted-foreground">{error.message}</p>
      </section>
      <Footer />
    </>
  ),
  component: BlogPostPage,
});

function renderBody(body: string) {
  const blocks = body.split(/\n\n+/);
  return blocks.map((block, i) => {
    if (block.startsWith("## ")) {
      const heading = block.replace(/^##\s+/, "");
      const id = slugifyHeading(heading);
      return (
        <h2
          key={i}
          id={id}
          className="mt-12 text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
        >
          {heading}
        </h2>
      );
    }
    if (block.startsWith("- ")) {
      const items = block.split("\n").map((l) => l.replace(/^-\s+/, ""));
      return (
        <ul
          key={i}
          className="mt-6 list-disc space-y-2 pl-6 text-base leading-relaxed text-foreground/90"
        >
          {items.map((it, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />
          ))}
        </ul>
      );
    }
    return (
      <p
        key={i}
        className="mt-6 text-base leading-relaxed text-foreground/90 md:text-lg"
        dangerouslySetInnerHTML={{ __html: renderInline(block) }}
      />
    );
  });
}

function renderInline(text: string) {
  // bold **text**
  return text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function slugifyHeading(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function extractHeadings(body: string): { id: string; text: string }[] {
  return body
    .split(/\n\n+/)
    .filter((b) => b.startsWith("## "))
    .map((b) => {
      const text = b.replace(/^##\s+/, "");
      return { id: slugifyHeading(text), text };
    });
}

function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, (scrolled / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed left-0 right-0 top-0 z-50 h-0.5 bg-transparent">
      <div
        className="h-full bg-primary transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const tw = `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`;
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }
  const cls =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-card/40 text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground";
  return (
    <div className="flex items-center gap-2">
      <a href={tw} target="_blank" rel="noreferrer noopener" aria-label="Share on Twitter" className={cls}>
        <Twitter className="h-4 w-4" />
      </a>
      <a href={li} target="_blank" rel="noreferrer noopener" aria-label="Share on LinkedIn" className={cls}>
        <Linkedin className="h-4 w-4" />
      </a>
      <button type="button" onClick={copy} aria-label="Copy link" className={cls}>
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

function authorInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}

function BlogPostPage() {
  const { post, others } = Route.useLoaderData();
  const headings = useMemo(() => extractHeadings(post.body), [post.body]);
  const url = `https://grow.contact/blog/${post.slug}`;

  return (
    <>
      <ReadingProgress />
      <Navbar />

      <article className="relative px-6 pb-20 pt-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_minmax(0,720px)_1fr]">
          <div className="hidden lg:block" />
          <div>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All posts
          </Link>

          <div className="mt-8 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-primary">
            <span>{post.category}</span>
            <span className="h-px w-8 bg-primary/40" />
            <span className="text-muted-foreground">{post.date}</span>
          </div>

          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
            {post.title}
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <div
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold uppercase tracking-wider text-primary"
              >
                {authorInitials(post.author)}
              </div>
              <div>
                <div className="text-foreground">{post.author}</div>
                <div className="text-xs">
                  {post.authorRole} · {post.readTime}
                </div>
              </div>
            </div>
            <ShareButtons url={url} title={post.title} />
          </div>

          <div className="mt-12">{renderBody(post.body)}</div>
          </div>

          <aside className="hidden lg:block">
            {headings.length > 0 && (
              <div className="sticky top-24">
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  On this page
                </p>
                <ul className="space-y-2 border-l border-white/10 pl-4 text-sm">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className="block text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </article>

      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">
            Keep reading
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {others.map((p: { slug: string; title: string; excerpt: string; category: string; date: string; readTime: string }) => (
              <Link
                key={p.slug}
                to="/blog/$slug"
                params={{ slug: p.slug }}
                className="liquid-glass group flex h-full flex-col rounded-3xl bg-card/40 p-7 transition-colors hover:bg-card/60"
              >
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                  {p.category}
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-snug text-foreground">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {p.excerpt}
                </p>
                <div className="mt-auto pt-6 text-xs text-muted-foreground">
                  {p.date} · {p.readTime}
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