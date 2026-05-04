import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Grow" },
      {
        name: "description",
        content:
          "Forgot your Grow password? Enter your email and we'll send you a secure link to set a new one.",
      },
      { property: "og:title", content: "Reset your password — Grow" },
      {
        property: "og:description",
        content: "Send yourself a secure link to choose a new password.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <>
      <Navbar />
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-md">
          <div className="liquid-glass rounded-3xl bg-card/40 p-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Forgot your password?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email and we'll send you a secure link to set a new
              one.
            </p>

            {sent ? (
              <div className="mt-8 space-y-5 text-sm text-muted-foreground">
                <p>
                  If an account exists for that email, a reset link is on its
                  way. Check your inbox (and spam) for a message from Grow.
                </p>
                <Button asChild variant="heroSecondary" className="w-full justify-center">
                  <Link to="/login">Back to sign in</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                <Button
                  type="submit"
                  variant="hero"
                  className="w-full justify-center"
                  disabled={loading}
                >
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Remembered it?{" "}
                  <Link to="/login" className="text-foreground hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}