import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
} from "@/lib/api-keys.functions";
import { Copy, KeyRound, Trash2, Ban } from "lucide-react";

export const Route = createFileRoute("/account/api-keys")({
  head: () => ({
    meta: [
      { title: "API Keys — Grow" },
      { name: "description", content: "Manage API keys for the Grow public API." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApiKeysPage,
});

const ALL_SCOPES = [
  { id: "candidates:read", label: "Read candidates" },
  { id: "candidates:write", label: "Create / upsert candidates" },
  { id: "scorecards:read", label: "Read scorecards" },
] as const;

function ApiKeysPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  const listFn = useServerFn(listApiKeys);
  const createFn = useServerFn(createApiKey);
  const revokeFn = useServerFn(revokeApiKey);
  const deleteFn = useServerFn(deleteApiKey);

  const { data, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => listFn({}),
    enabled: !!user,
  });

  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["candidates:read", "scorecards:read"]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (input: { name: string; scopes: string[] }) =>
      createFn({ data: input as { name: string; scopes: typeof ALL_SCOPES[number]["id"][] } }),
    onSuccess: (res) => {
      setCreatedKey(res.plaintext);
      setName("");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Key revoked");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Key deleted");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const keys = useMemo(() => data?.keys ?? [], [data]);

  function toggleScope(id: string) {
    setScopes((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10">
          <div className="flex items-center gap-3">
            <KeyRound className="size-6 text-primary" />
            <h1 className="text-3xl font-semibold">API Keys</h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Use these keys to authenticate against the Grow public REST API. Treat them like
            passwords — they grant access to your account&apos;s data.
          </p>
        </header>

        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-medium">Create a new key</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                placeholder="e.g. Production server"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div>
              <Label>Scopes</Label>
              <div className="mt-2 space-y-2">
                {ALL_SCOPES.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={scopes.includes(s.id)}
                      onCheckedChange={() => toggleScope(s.id)}
                    />
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{s.id}</code>
                    <span className="text-muted-foreground">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button
              disabled={!name.trim() || scopes.length === 0 || createMut.isPending}
              onClick={() => createMut.mutate({ name: name.trim(), scopes })}
            >
              {createMut.isPending ? "Creating…" : "Create key"}
            </Button>
          </div>
        </section>

        {createdKey && (
          <section className="mt-6 rounded-lg border border-primary/40 bg-primary/5 p-6">
            <h3 className="text-base font-medium">Your new API key</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Copy it now — you won&apos;t be able to see it again.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-background px-3 py-2 font-mono text-sm">
                {createdKey}
              </code>
              <Button size="icon" variant="outline" onClick={() => copy(createdKey)}>
                <Copy className="size-4" />
              </Button>
            </div>
            <Button variant="ghost" className="mt-3" onClick={() => setCreatedKey(null)}>
              I&apos;ve saved it
            </Button>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-medium">Your keys</h2>
          {isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          ) : keys.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No keys yet.</p>
          ) : (
            <ul className="mt-4 divide-y rounded-lg border bg-card">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{k.name}</span>
                      {k.revoked_at && (
                        <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                          revoked
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      <code>{k.key_prefix}…</code> · {k.scopes.join(", ")}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Created {new Date(k.created_at).toLocaleDateString()}
                      {k.last_used_at &&
                        ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!k.revoked_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revokeMut.mutate(k.id)}
                        disabled={revokeMut.isPending}
                      >
                        <Ban className="mr-1 size-3.5" /> Revoke
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMut.mutate(k.id)}
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}