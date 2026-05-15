import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminOverview } from "@/server/admin.functions";
import { FileText, Inbox, Mail, Shield } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin · Overview — Grow" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const fetchOverview = useServerFn(getAdminOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading overview…</p>;
  if (error)
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load overview"}
      </p>
    );

  const cards = [
    {
      to: "/admin/blog" as const,
      label: "Blog",
      icon: FileText,
      primary: data?.posts.published ?? 0,
      primaryLabel: "published",
      secondary: `${data?.posts.drafts ?? 0} drafts`,
    },
    {
      to: "/admin/contacts" as const,
      label: "Contacts",
      icon: Inbox,
      primary: data?.contacts ?? 0,
      primaryLabel: "submissions",
      secondary: "Inbound from /contact",
    },
    {
      to: "/admin/subscribers" as const,
      label: "Subscribers",
      icon: Mail,
      primary: data?.subscribers.active ?? 0,
      primaryLabel: "active",
      secondary: `${data?.subscribers.total ?? 0} total`,
    },
    {
      to: "/admin/roles" as const,
      label: "Admins",
      icon: Shield,
      primary: data?.admins ?? 0,
      primaryLabel: "with access",
      secondary: "Grant or revoke",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Link
          key={c.to}
          to={c.to}
          className="group rounded-2xl border border-white/10 bg-card/40 p-5 transition-colors hover:bg-card/60"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {c.label}
            </span>
            <c.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-foreground">
              {c.primary}
            </span>
            <span className="text-xs text-muted-foreground">{c.primaryLabel}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{c.secondary}</p>
        </Link>
      ))}
    </div>
  );
}