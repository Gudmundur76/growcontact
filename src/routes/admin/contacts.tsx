import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/contacts")({
  head: () => ({
    meta: [{ title: "Admin · Contact submissions — Grow" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminContactsPage,
});

interface Submission {
  id: string;
  name: string;
  email: string;
  company: string | null;
  team_size: string | null;
  message: string;
  created_at: string;
  user_agent: string | null;
}

function AdminContactsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      if (error) toast.error(error.message);
      const admin = !!data;
      setIsAdmin(admin);
      setChecking(false);
      if (!admin) {
        setLoading(false);
        return;
      }
      const { data: subs, error: subsError } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (subsError) toast.error(subsError.message);
      setRows((subs ?? []) as Submission[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  return (
    <>
      <Navbar />
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Contact submissions
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isAdmin
                ? `${rows.length} ${rows.length === 1 ? "submission" : "submissions"}, newest first.`
                : "Restricted area."}
            </p>
          </div>

          <div className="liquid-glass rounded-3xl bg-card/40 p-6">
            {authLoading || checking || loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !isAdmin ? (
              <p className="text-sm text-muted-foreground">You don't have access to this page.</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <div className="space-y-4">
                {rows.map((row) => (
                  <article
                    key={row.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <h2 className="text-base font-medium text-foreground">
                          {row.name}
                          {row.company ? (
                            <span className="text-muted-foreground"> · {row.company}</span>
                          ) : null}
                        </h2>
                        <a
                          href={`mailto:${row.email}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {row.email}
                        </a>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                        {row.team_size ? ` · ${row.team_size}` : ""}
                      </div>
                    </header>
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">{row.message}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
