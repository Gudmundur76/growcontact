import { createFileRoute } from "@tanstack/react-router";
import { generateBlogDraft } from "@/server/blog.server";

export const Route = createFileRoute("/api/public/hooks/generate-blog-post")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const draft = await generateBlogDraft();
          return new Response(JSON.stringify({ ok: true, draft }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("generate-blog-post failed:", message);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
