import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/hooks/use-is-admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Grow" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLayout,
});

const tabs: {
  to:
    | "/admin"
    | "/admin/blog"
    | "/admin/contacts"
    | "/admin/subscribers"
    | "/admin/emails"
    | "/admin/roles";
  label: string;
}[] = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/blog", label: "Blog" },
  { to: "/admin/contacts", label: "Contacts" },
  { to: "/admin/subscribers", label: "Subscribers" },
  { to: "/admin/emails", label: "Email analytics" },
  { to: "/admin/roles", label: "Roles" },
];

function AdminLayout() {
  const { user, isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 pt-10">
        <div className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Admin
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Internal control panel
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Manage editorial, inbound contacts, the newsletter list, and who gets admin access.
        </p>
        <nav
          aria-label="Admin sections"
          className="mt-8 -mx-6 flex gap-1 overflow-x-auto border-b border-white/10 px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        >
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: t.to === "/admin" }}
              className="shrink-0 whitespace-nowrap rounded-t-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
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
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !user ? null : !isAdmin ? (
          <div className="rounded-2xl border border-white/10 bg-card/40 p-8 text-center">
            <h2 className="text-xl font-semibold text-foreground">Not authorized</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You need admin access to view this area.
            </p>
          </div>
        ) : (
          <Outlet />
        )}
      </div>
      <Footer />
    </div>
  );
}