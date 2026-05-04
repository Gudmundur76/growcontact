import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — Grow" },
      { name: "description", content: "Manage your Grow profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, company")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) toast.error(error.message);
      setName(data?.name ?? "");
      setCompany(data?.company ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const trimmedName = name.trim().slice(0, 100);
    const trimmedCompany = company.trim().slice(0, 200);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: trimmedName, company: trimmedCompany })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else navigate({ to: "/" });
  }

  return (
    <>
      <Navbar />
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Your account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Update your profile details. Signed in as{" "}
              <span className="text-foreground">{user?.email}</span>.
            </p>
          </div>

          <div className="liquid-glass rounded-3xl bg-card/40 p-8">
            {authLoading || loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-white/5 px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-white/10 focus:ring-primary"
                    placeholder="Ada Lovelace"
                  />
                </div>
                <div>
                  <label
                    htmlFor="company"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    Company
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    maxLength={200}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full rounded-xl bg-white/5 px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-white/10 focus:ring-primary"
                    placeholder="Acme Inc."
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    className="w-full rounded-xl bg-white/5 px-4 py-3 text-muted-foreground outline-none ring-1 ring-white/10"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Contact support to change your email.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="hero"
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                  <div className="flex items-center gap-3">
                    <Link
                      to="/forgot-password"
                      className="text-sm text-foreground/80 hover:underline"
                    >
                      Reset password
                    </Link>
                    <Button
                      type="button"
                      variant="heroSecondary"
                      onClick={handleSignOut}
                    >
                      Sign out
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}