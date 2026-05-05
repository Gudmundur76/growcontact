import { createFileRoute } from "@tanstack/react-router";
import { posts as staticPosts } from "@/content/blog-posts";
import { fetchPublishedPosts } from "@/server/blog.server";

const SITE = "https://grow.contact";
const TITLE = "Grow — Talent operating system";
const DESCRIPTION =
  "Essays, benchmarks and playbooks on hiring, interviewing and talent operations from the Grow team.";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        const dbPosts = await fetchPublishedPosts().catch(() => []);
        const merged = [
          ...dbPosts.map((p) => ({
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt,
            category: p.category,
            author: p.author,
            date: p.date,
          })),
          ...staticPosts.map((p) => ({
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt,
            category: p.category as string,
            author: p.author,
            date: p.date,
          })),
        ];

        const seen = new Set<string>();
        const items = merged
          .filter((p) => (seen.has(p.slug) ? false : (seen.add(p.slug), true)))
          .slice(0, 50)
          .map((p) => {
            const url = `${SITE}/blog/${p.slug}`;
            return `<item>
  <title>${xmlEscape(p.title)}</title>
  <link>${url}</link>
  <guid isPermaLink="true">${url}</guid>
  <pubDate>${toRfc822(p.date)}</pubDate>
  <category>${xmlEscape(p.category)}</category>
  <author>noreply@grow.contact (${xmlEscape(p.author)})</author>
  <description>${xmlEscape(p.excerpt)}</description>
</item>`;
          })
          .join("\n");

        const now = new Date().toUTCString();
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xmlEscape(TITLE)}</title>
  <link>${SITE}/blog</link>
  <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
  <description>${xmlEscape(DESCRIPTION)}</description>
  <language>en-us</language>
  <lastBuildDate>${now}</lastBuildDate>
${items}
</channel>
</rss>`;

        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});