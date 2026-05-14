import { createFileRoute } from "@tanstack/react-router";
import { posts as staticPosts } from "@/content/blog-posts";
import { fetchPublishedPosts } from "@/server/blog.server";

const SITE = "https://grow.contact";

const STATIC_ROUTES: { path: string; changefreq: string; priority: number }[] = [
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/about", changefreq: "monthly", priority: 0.7 },
  { path: "/pricing", changefreq: "monthly", priority: 0.9 },
  { path: "/customers", changefreq: "monthly", priority: 0.7 },
  { path: "/careers", changefreq: "weekly", priority: 0.6 },
  { path: "/changelog", changefreq: "weekly", priority: 0.6 },
  { path: "/security", changefreq: "monthly", priority: 0.5 },
  { path: "/contact", changefreq: "monthly", priority: 0.6 },
  { path: "/interview-copilot", changefreq: "monthly", priority: 0.8 },
  { path: "/blog", changefreq: "daily", priority: 0.9 },
  { path: "/privacy", changefreq: "yearly", priority: 0.3 },
  { path: "/terms", changefreq: "yearly", priority: 0.3 },
];

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const dbPosts = await fetchPublishedPosts().catch(() => []);
        const now = new Date().toISOString();

        const urls: string[] = [];

        for (const r of STATIC_ROUTES) {
          urls.push(
            `<url><loc>${SITE}${r.path}</loc><lastmod>${now}</lastmod><changefreq>${r.changefreq}</changefreq><priority>${r.priority.toFixed(1)}</priority></url>`,
          );
        }

        const seen = new Set<string>();
        for (const p of dbPosts) {
          if (seen.has(p.slug)) continue;
          seen.add(p.slug);
          urls.push(
            `<url><loc>${SITE}/blog/${xmlEscape(p.slug)}</loc><lastmod>${parseDate(p.date)}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
          );
        }
        for (const p of staticPosts) {
          if (seen.has(p.slug)) continue;
          seen.add(p.slug);
          urls.push(
            `<url><loc>${SITE}/blog/${xmlEscape(p.slug)}</loc><lastmod>${parseDate(p.date)}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
          );
        }

        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
