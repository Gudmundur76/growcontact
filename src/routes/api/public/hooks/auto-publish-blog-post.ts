import { createFileRoute } from "@tanstack/react-router";
import { generateBlogDraft } from "@/server/blog.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/hooks/auto-publish-blog-post")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const draft = await generateBlogDraft();
          const { error } = await supabaseAdmin
            .from("blog_posts")
            .update({ status: "published", published_at: new Date().toISOString() })
            .eq("id", draft.id);
          if (error) throw dbError(error, "auto-publish-blog-post");
          return new Response(JSON.stringify({ ok: true, slug: draft.slug, title: draft.title }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("auto-publish-blog-post failed:", message);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
