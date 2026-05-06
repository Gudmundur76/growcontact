import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/sourcing")({
  head: () => ({
    meta: [
      { title: "AI Sourcing — Grow" },
      {
        name: "description",
        content:
          "Search public profiles and OSS signals, save searches with alerts, build shortlists, and send personalized outreach.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SourcingLayout,
});

const tabs: { to: "/sourcing" | "/sourcing/searches" | "/sourcing/shortlists" | "/sourcing/sequences" | "/sourcing/activity"; label: string }[] = [
  { to: "/sourcing", label: "Search" },
  { to: "/sourcing/searches", label: "Saved" },
  { to: "/sourcing/shortlists", label: "Shortlists" },
  { to: "/sourcing/sequences", label: "Sequences" },
  { to: "/sourcing/activity", label: "Activity" },
];

function SourcingLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 pt-10">
        <div className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          AI Sourcing
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Find and reach out to candidates.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Searches public profiles and open-source signals. Hybrid AI ranking surfaces
          the strongest matches for your role.
        </p>
        <nav className="mt-8 flex gap-1 border-b border-white/10">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: t.to === "/sourcing" }}
              className="rounded-t-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              activeProps={{
                className: "border-b-2 border-primary text-foreground bg-white/5",
              }}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}