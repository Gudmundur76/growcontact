import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Grow" },
      {
        name: "description",
        content: "Set a new password for your Grow account.",
      },
      { property: "og:title", content: "Choose a new password — Grow" },
      {
        property: "og:description",
        content: "Set a new password for your Grow account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase appends recovery tokens to the URL hash and fires
    // PASSWORD_RECOVERY once the session is established.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
          setReady(true);
        }
      },
    );

    // If the user already has a session (e.g. landed back here), allow update.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // If after a short delay we still have no recovery context, surface an error.
    const timeout = setTimeout(() => {
      if (!ready) {
        // Don't block — just warn if hash didn't carry recovery tokens.
        if (!window.location.hash.includes("type=recovery") && !ready) {
          setError(
            "This reset link is invalid or has expired. Request a new one to continue.",
          );
        }
      }
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }
    toast.success("Password updated. You're signed in.");
    navigate({ to: "/" });
  }

  return (
    <>
      <Navbar />
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-md">
          <div className="liquid-glass rounded-3xl bg-card/40 p-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Choose a new password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick something strong — at least 8 characters.
            </p>

            {error ? (
              <div className="mt-8 space-y-5 text-sm text-muted-foreground">
                <p>{error}</p>
                <Button asChild variant="heroSecondary" className="w-full justify-center">
                  <Link to="/forgot-password">Request a new link</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    New password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    className="w-full rounded-xl bg-white/5 px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-white/10 focus:ring-primary"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    name="confirm"
                    type="password"
                    required
                    minLength={8}
                    className="w-full rounded-xl bg-white/5 px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-white/10 focus:ring-primary"
                    placeholder="••••••••"
                  />
                </div>
                <Button
                  type="submit"
                  variant="hero"
                  className="w-full justify-center"
                  disabled={loading || (!ready && !window.location.hash.includes("type=recovery"))}
                >
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}