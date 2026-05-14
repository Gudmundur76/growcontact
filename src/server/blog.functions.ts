import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateBlogDraft, fetchPublishedPosts, type PublicPost } from "./blog.server";
import { dbError } from "./db-errors";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const generateDraftPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const draft = await generateBlogDraft();
    return draft;
  });

export const listAdminPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .select("id, slug, title, excerpt, category, status, published_at, created_at, read_time")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw dbError(error, "blog.functions");
    return { posts: data ?? [] };
  });

const SetPostStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "published"]),
});
const DeletePostSchema = z.object({ id: z.string().uuid() });

export const setPostStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SetPostStatusSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const patch: { status: "draft" | "published"; published_at?: string } = {
      status: data.status,
    };
    if (data.status === "published") patch.published_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from("blog_posts").update(patch).eq("id", data.id);
    if (error) throw dbError(error, "blog.functions");
    return { ok: true };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeletePostSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", data.id);
    if (error) throw dbError(error, "blog.functions");
    return { ok: true };
  });

export const getPublishedPosts = createServerFn({ method: "GET" }).handler(async () => {
  const posts: PublicPost[] = await fetchPublishedPosts();
  return { posts };
});

export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; source?: string }) => {
    const email = String(d?.email ?? "")
      .trim()
      .toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("Invalid email");
    }
    if (email.length > 254) throw new Error("Email too long");
    const source = String(d?.source ?? "blog").slice(0, 64);
    return { email, source };
  })
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .upsert(
        { email: data.email, source: data.source, status: "active" },
        { onConflict: "email", ignoreDuplicates: true },
      );
    if (error) throw dbError(error, "blog.functions");
    return { ok: true };
  });
