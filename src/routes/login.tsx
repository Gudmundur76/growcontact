import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Grow" },
      {
        name: "description",
        content: "Sign in to your Grow account.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/" });
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <>
      <Navbar />
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-md">
          <div className="liquid-glass rounded-3xl bg-card/40 p-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to continue to Grow.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <Button
                type="button"
                variant="heroSecondary"
                className="w-full justify-center"
                onClick={handleGoogle}
              >
                Continue with Google
              </Button>
              <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
                <span className="h-px flex-1 bg-white/10" />
                or
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-xl bg-white/5 px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-white/10 focus:ring-primary"
                  placeholder="ada@company.com"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full rounded-xl bg-white/5 px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-white/10 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>
              <Button
                type="submit"
                variant="hero"
                className="w-full justify-center"
                disabled={loading}
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                No account yet?{" "}
                <Link to="/signup" className="text-foreground hover:underline">
                  Start free trial
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}