import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Grow" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardWrapper,
});

function DashboardWrapper() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed out");
      navigate({ to: "/" });
    }
  }

  const displayEmail = user?.email ?? "";
  const displayName =
    (user?.user_metadata?.name as string | undefined) ??
    displayEmail.split("@")[0] ??
    "there";

  return (
    <>
      <Navbar />
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="liquid-glass rounded-3xl bg-card/40 p-10">
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Dashboard
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Welcome back, {displayName}.
            </h1>
            {displayEmail ? (
              <p className="mt-3 text-sm text-muted-foreground">{displayEmail}</p>
            ) : null}

            <div className="mt-10 flex flex-wrap gap-3">
              <Button
                variant="hero"
                onClick={() => navigate({ to: "/interview" })}
              >
                Interview Copilot
              </Button>
              <Button
                variant="heroSecondary"
                onClick={() => navigate({ to: "/sourcing" })}
              >
                AI Sourcing
              </Button>
              <Button
                variant="heroSecondary"
                onClick={() => navigate({ to: "/account" })}
              >
                Account settings
              </Button>
            </div>

            <div className="mt-12 border-t border-white/10 pt-6">
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
