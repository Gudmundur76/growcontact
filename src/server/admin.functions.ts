import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [posts, contacts, subs, roles] = await Promise.all([
      supabaseAdmin.from("blog_posts").select("status", { count: "exact", head: false }),
      supabaseAdmin.from("contact_submissions").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("newsletter_subscribers").select("status", { count: "exact", head: false }),
      supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin"),
    ]);
    const postRows = (posts.data ?? []) as { status: string }[];
    const subRows = (subs.data ?? []) as { status: string }[];
    return {
      posts: {
        total: posts.count ?? postRows.length,
        published: postRows.filter((p) => p.status === "published").length,
        drafts: postRows.filter((p) => p.status !== "published").length,
      },
      contacts: contacts.count ?? 0,
      subscribers: {
        total: subs.count ?? subRows.length,
        active: subRows.filter((s) => s.status === "active").length,
      },
      admins: roles.count ?? 0,
    };
  });

export const listSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, email, source, status, confirmed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw dbError(error, "admin.functions");
    return { subscribers: data ?? [] };
  });

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: false });
    if (error) throw dbError(error, "admin.functions");

    const userIds = (roles ?? []).map((r) => r.user_id);
    const emailMap = new Map<string, string>();
    if (userIds.length) {
      // Page through auth users to resolve emails (small admin lists in practice).
      let page = 1;
      const perPage = 1000;
      // Cap at 5 pages (5000 users) to be safe.
      while (page <= 5) {
        const { data: usersPage, error: uErr } =
          await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (uErr) break;
        for (const u of usersPage.users) {
          if (userIds.includes(u.id) && u.email) emailMap.set(u.id, u.email);
        }
        if (usersPage.users.length < perPage) break;
        page++;
      }
    }

    return {
      admins: (roles ?? []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        email: emailMap.get(r.user_id) ?? null,
        created_at: r.created_at,
      })),
    };
  });

export const GrantSchema = z.object({ email: z.string().email().max(255) });

export const grantAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GrantSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const target = data.email.trim().toLowerCase();

    // Find user by paging auth users.
    let foundId: string | null = null;
    let page = 1;
    const perPage = 1000;
    while (page <= 5 && !foundId) {
      const { data: usersPage, error } =
        await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error("Could not look up users");
      for (const u of usersPage.users) {
        if (u.email?.toLowerCase() === target) {
          foundId = u.id;
          break;
        }
      }
      if (usersPage.users.length < perPage) break;
      page++;
    }
    if (!foundId) throw new Error("No user with that email. Ask them to sign up first.");

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: foundId, role: "admin" });
    if (insErr && !/duplicate key/i.test(insErr.message)) {
      throw dbError(insErr, "admin.functions");
    }
    return { ok: true, user_id: foundId };
  });

export const RevokeSchema = z.object({ user_id: z.string().uuid() });

export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RevokeSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    if (data.user_id === context.userId) {
      throw new Error("You can't revoke your own admin role.");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "admin");
    if (error) throw dbError(error, "admin.functions");
    return { ok: true };
  });