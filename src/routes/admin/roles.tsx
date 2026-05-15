import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { grantAdminByEmail, listAdmins, revokeAdmin } from "@/server/admin.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/roles")({
  head: () => ({
    meta: [{ title: "Admin · Roles — Grow" }, { name: "robots", content: "noindex" }],
  }),
  component: RolesPage,
});

interface AdminRow {
  id: string;
  user_id: string;
  email: string | null;
  created_at: string;
}

function RolesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchAdmins = useServerFn(listAdmins);
  const grantFn = useServerFn(grantAdminByEmail);
  const revokeFn = useServerFn(revokeAdmin);

  const [email, setEmail] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-admins"],
    queryFn: () => fetchAdmins(),
  });
  const rows = (data?.admins ?? []) as AdminRow[];

  const grant = useMutation({
    mutationFn: (e: string) => grantFn({ data: { email: e } }),
    onSuccess: () => {
      toast.success("Admin granted");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Grant failed"),
  });

  const revoke = useMutation({
    mutationFn: (userId: string) => revokeFn({ data: { user_id: userId } }),
    onSuccess: () => {
      toast.success("Admin revoked");
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Revoke failed"),
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Admin access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Grant admin to a user by email. They must have signed up first.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim()) return;
          grant.mutate(email.trim());
        }}
        className="mb-8 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-card/40 p-4"
      >
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="max-w-sm flex-1"
        />
        <Button type="submit" variant="hero" disabled={grant.isPending} className="gap-2">
          {grant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Grant admin
        </Button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/40">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="px-6 py-12 text-center text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load"}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No admins yet.
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {rows.map((r) => {
              const isSelf = r.user_id === user?.id;
              return (
                <li key={r.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {r.email ?? <span className="text-muted-foreground">(unknown email)</span>}
                      {isSelf ? (
                        <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-muted-foreground">
                          you
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Granted {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isSelf || revoke.isPending}
                    onClick={() => {
                      if (confirm(`Revoke admin from ${r.email ?? r.user_id}?`)) {
                        revoke.mutate(r.user_id);
                      }
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}