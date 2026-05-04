import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CtaSection } from "@/components/landing/CtaSection";
import { ArrowLeft } from "lucide-react";
import { getPost, posts } from "@/content/blog-posts";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return { meta: [{ title: "Post not found — Grow" }] };
    return {
      meta: [
        { title: `${post.title} — Grow Blog` },
        { name: "description", content: post.excerpt },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.excerpt },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
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
      return (
        <h2
          key={i}
          className="mt-12 text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
        >
          {block.replace(/^##\s+/, "")}
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

function BlogPostPage() {
  const { post } = Route.useLoaderData();
  const others = posts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <Navbar />

      <article className="relative px-6 pb-20 pt-24">
        <div className="mx-auto max-w-3xl">
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

          <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6 text-sm text-muted-foreground">
            <div>
              <div className="text-foreground">{post.author}</div>
              <div className="text-xs">
                {post.authorRole} · {post.readTime}
              </div>
            </div>
          </div>

          <div className="mt-12">{renderBody(post.body)}</div>
        </div>
      </article>

      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">
            Keep reading
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {others.map((p) => (
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