import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Briefcase, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import {
  getAshbyConnection,
  connectAshby,
  disconnectAshby,
  setAshbyEnabled,
  listAshbySyncLog,
} from "@/lib/ashby.functions";

export const Route = createFileRoute("/account/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Account — Grow" },
      { name: "description", content: "Activate Ashby and other ATS integrations for your workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountIntegrationsPage,
});

function AccountIntegrationsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Account</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Integrations</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect Grow to your tools. Each integration is off by default — activate the ones your
            workspace needs. Credentials stay private to your account.
          </p>
        </div>
        {user && <AshbyCard />}
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-card/30 p-6 text-sm text-muted-foreground">
          More ATS connectors (Greenhouse, Lever) coming soon.{" "}
          <Link to="/contact" className="text-primary hover:underline">Request one</Link>.
        </div>
      </main>
      <Footer />
    </div>
  );
}

function AshbyCard() {
  const qc = useQueryClient();
  const fetchConn = useServerFn(getAshbyConnection);
  const fetchLog = useServerFn(listAshbySyncLog);
  const connect = useServerFn(connectAshby);
  const disconnect = useServerFn(disconnectAshby);
  const setEnabled = useServerFn(setAshbyEnabled);

  const conn = useQuery({ queryKey: ["ashby-conn"], queryFn: () => fetchConn() });
  const log = useQuery({
    queryKey: ["ashby-log"],
    queryFn: () => fetchLog(),
    enabled: !!conn.data?.connection,
  });

  const [apiKey, setApiKey] = useState("");
  const [defaultJobId, setDefaultJobId] = useState("");

  const connectMut = useMutation({
    mutationFn: async () =>
      connect({ data: { apiKey: apiKey.trim(), defaultJobId: defaultJobId.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Ashby connected");
      setApiKey("");
      qc.invalidateQueries({ queryKey: ["ashby-conn"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to connect Ashby"),
  });

  const enableMut = useMutation({
    mutationFn: async (enabled: boolean) => setEnabled({ data: { enabled } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ashby-conn"] }),
    onError: (e: any) => toast.error(e?.message ?? "Failed to update"),
  });

  const disconnectMut = useMutation({
    mutationFn: async () => disconnect(),
    onSuccess: () => {
      toast.success("Ashby disconnected");
      qc.invalidateQueries({ queryKey: ["ashby-conn"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to disconnect"),
  });

  const c = conn.data?.connection;

  return (
    <article className="rounded-2xl border border-white/10 bg-card/40 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Ashby</h2>
              {c ? (
                c.enabled ? (
                  <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Paused</Badge>
                )
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
            </div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">ATS</p>
          </div>
        </div>
        {c && (
          <Switch
            checked={c.enabled}
            onCheckedChange={(v) => enableMut.mutate(v)}
            disabled={enableMut.isPending}
            aria-label="Enable Ashby sync"
          />
        )}
      </header>

      <p className="mt-4 text-sm text-muted-foreground">
        Push candidates and interview scorecards from Grow into Ashby. Activation is per-user — your
        API key never leaves your account.
      </p>

      {conn.isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : !c ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-white/5 bg-background/60 p-4 text-xs text-muted-foreground">
            Get your API key in Ashby:{" "}
            <span className="text-foreground">Admin → API → Configure → Create API key</span>. Grant
            it <span className="text-foreground">candidate.create</span> and{" "}
            <span className="text-foreground">note.create</span> permissions.{" "}
            <a
              href="https://developers.ashbyhq.com/reference/authentication"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="ashby-key">Ashby API key</Label>
              <Input
                id="ashby-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ashby_live_…"
                autoComplete="off"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ashby-job">Default Job ID (optional)</Label>
              <Input
                id="ashby-job"
                value={defaultJobId}
                onChange={(e) => setDefaultJobId(e.target.value)}
                placeholder="e.g. 8f3c…"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                If set, new candidates are linked to this job by default.
              </p>
            </div>
          </div>
          <Button
            onClick={() => connectMut.mutate()}
            disabled={connectMut.isPending || apiKey.trim().length < 20}
          >
            {connectMut.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…
              </>
            ) : (
              "Activate Ashby"
            )}
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {c.last_error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Last sync error: {c.last_error}</span>
            </div>
          )}
          <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="uppercase tracking-wider">Connected</dt>
              <dd className="text-foreground">{new Date(c.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wider">Last sync</dt>
              <dd className="text-foreground">
                {c.last_synced_at ? new Date(c.last_synced_at).toLocaleString() : "Never"}
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Recent activity
            </h3>
            {log.isLoading ? (
              <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
            ) : log.data?.entries.length ? (
              <ul className="mt-2 divide-y divide-white/5 rounded-lg border border-white/5">
                {log.data.entries.slice(0, 8).map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <span className="truncate">
                      <span className="text-foreground">{e.entity_type}</span>
                      {e.external_id ? (
                        <span className="text-muted-foreground"> → {e.external_id}</span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2">
                      {e.status === "success" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">
                          ok
                        </Badge>
                      ) : (
                        <Badge variant="destructive">error</Badge>
                      )}
                      <span className="text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                No syncs yet. Use “Push to Ashby” from a candidate or scorecard.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Disconnect Ashby? Your API key will be removed.")) {
                  disconnectMut.mutate();
                }
              }}
              disabled={disconnectMut.isPending}
            >
              Disconnect
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}