import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://grow.contact";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /account
Disallow: /interview
Disallow: /interview/
Disallow: /api/
Disallow: /lovable/

Sitemap: ${SITE}/sitemap.xml
`;
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});