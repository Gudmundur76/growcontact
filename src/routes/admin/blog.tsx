import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, Trash2, Eye, EyeOff, ExternalLink, Loader2 } from "lucide-react";
import {
  generateDraftPost,
  listAdminPosts,
  setPostStatus,
  deletePost,
} from "@/server/blog.functions";

export const Route = createFileRoute("/admin/blog")({
  head: () => ({
    meta: [
      { title: "Admin · Blog — Grow" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminBlogPage,
});

interface PostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  read_time: string;
}

function AdminBlogPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      const admin = !!data;
      setIsAdmin(admin);
      setChecking(false);
      if (!admin) {
        setLoading(false);
        return;
      }
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  async function refresh() {
    setLoading(true);
    try {
      const { posts } = await listAdminPosts();
      setRows(posts as PostRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const draft = await generateDraftPost();
      toast.success(`Draft generated: ${draft.title}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggle(row: PostRow) {
    const next = row.status === "published" ? "draft" : "published";
    try {
      await setPostStatus({ data: { id: row.id, status: next } });
      toast.success(next === "published" ? "Published" : "Unpublished");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function handleDelete(row: PostRow) {
    if (!confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    try {
      await deletePost({ data: { id: row.id } });
      toast.success("Deleted");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (authLoading || checking) {
    return (
      <>
        <Navbar />
        <section className="px-6 py-32 text-center text-muted-foreground">
          Loading…
        </section>
        <Footer />
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <section className="px-6 py-32 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Not authorized
          </h1>
          <p className="mt-3 text-muted-foreground">
            You need admin access to view this page.
          </p>
        </section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <section className="px-6 pb-20 pt-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Admin · Blog
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                AI-authored posts
              </h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Auto-generated twice a week (Mon &amp; Thu, 09:00 UTC). Review
                drafts here, then publish what's good.
              </p>
            </div>
            <Button
              variant="hero"
              onClick={handleGenerate}
              disabled={generating}
              className="gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate draft now
            </Button>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-card/40">
            {loading ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : rows.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                No AI posts yet. Click "Generate draft now" to make the first one.
              </div>
            ) : (
              <ul className="divide-y divide-white/10">
                {rows.map((r) => (
                  <li key={r.id} className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em]">
                        <span
                          className={
                            "rounded-full px-2 py-0.5 " +
                            (r.status === "published"
                              ? "bg-primary/15 text-primary"
                              : "bg-white/10 text-muted-foreground")
                          }
                        >
                          {r.status}
                        </span>
                        <span className="text-muted-foreground">{r.category}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-foreground">
                        {r.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {r.excerpt}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/blog/$slug"
                        params={{ slug: r.slug }}
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Preview
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggle(r)}
                        className="gap-1"
                      >
                        {r.status === "published" ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" /> Unpublish
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" /> Publish
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(r)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}