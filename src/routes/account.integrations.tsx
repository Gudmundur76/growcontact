import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import {
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Slack,
  Webhook,
  Leaf,
  MessageSquare,
  Building2,
  FileText,
  Sheet,
  Hash,
} from "lucide-react";
import {
  getAshbyConnection,
  connectAshby,
  disconnectAshby,
  setAshbyEnabled,
  listAshbySyncLog,
} from "@/lib/ashby.functions";
import {
  listConnections,
  setProviderEnabled,
  disconnectProvider,
  listProviderSyncLog,
  connectGreenhouse,
  connectSlack,
  connectWebhook,
  sendWebhookTest,
  connectTeams,
  connectHubspot,
  connectNotion,
  connectSheets,
  connectDiscord,
  type ProviderKey,
} from "@/lib/integrations.functions";

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
        {user && (
          <div className="space-y-6">
            <AshbyCard />
            <GreenhouseCard />
            <HubspotCard />
            <SlackCard />
            <TeamsCard />
            <DiscordCard />
            <NotionCard />
            <SheetsCard />
            <WebhookCard />
          </div>
        )}
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

// -------- Generic provider card --------

type ConnRow = {
  id: string;
  provider: string;
  enabled: boolean;
  settings: Record<string, any> | null;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
};

function ProviderShell({
  provider,
  title,
  category,
  icon,
  description,
  notConnectedChildren,
  connectedDetails,
  testAction,
}: {
  provider: ProviderKey;
  title: string;
  category: string;
  icon: React.ReactNode;
  description: string;
  notConnectedChildren: React.ReactNode;
  connectedDetails?: (c: ConnRow) => React.ReactNode;
  testAction?: { label: string; run: () => Promise<void>; busy: boolean };
}) {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listConnections);
  const fetchLog = useServerFn(listProviderSyncLog);
  const setEnabled = useServerFn(setProviderEnabled);
  const disconnect = useServerFn(disconnectProvider);

  const all = useQuery({ queryKey: ["integrations"], queryFn: () => fetchAll() });
  const c = all.data?.connections.find((x: any) => x.provider === provider) as ConnRow | undefined;

  const log = useQuery({
    queryKey: ["integration-log", provider],
    queryFn: () => fetchLog({ data: { provider } }),
    enabled: !!c,
  });

  const enableMut = useMutation({
    mutationFn: async (enabled: boolean) => setEnabled({ data: { provider, enabled } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
    onError: (e: any) => toast.error(e?.message ?? "Failed to update"),
  });
  const disconnectMut = useMutation({
    mutationFn: async () => disconnect({ data: { provider } }),
    onSuccess: () => {
      toast.success(`${title} disconnected`);
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to disconnect"),
  });

  return (
    <article className="rounded-2xl border border-white/10 bg-card/40 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{title}</h2>
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
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{category}</p>
          </div>
        </div>
        {c && (
          <Switch
            checked={c.enabled}
            onCheckedChange={(v) => enableMut.mutate(v)}
            disabled={enableMut.isPending}
            aria-label={`Enable ${title}`}
          />
        )}
      </header>

      <p className="mt-4 text-sm text-muted-foreground">{description}</p>

      {all.isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : !c ? (
        <div className="mt-6 space-y-4">{notConnectedChildren}</div>
      ) : (
        <div className="mt-6 space-y-4">
          {c.last_error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Last error: {c.last_error}</span>
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
          {connectedDetails?.(c)}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Recent activity
            </h3>
            {log.isLoading ? (
              <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
            ) : log.data?.entries.length ? (
              <ul className="mt-2 divide-y divide-white/5 rounded-lg border border-white/5">
                {log.data.entries.slice(0, 6).map((e: any) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                    <span className="truncate">
                      <span className="text-foreground">{e.entity_type}</span>
                      {e.external_id ? (
                        <span className="text-muted-foreground"> → {e.external_id}</span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2">
                      {e.status === "success" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">ok</Badge>
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
              <p className="mt-2 text-xs text-muted-foreground">No activity yet.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {testAction && (
              <Button size="sm" variant="outline" onClick={testAction.run} disabled={testAction.busy}>
                {testAction.busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                {testAction.label}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(`Disconnect ${title}? Stored credentials will be removed.`)) {
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

function GreenhouseCard() {
  const qc = useQueryClient();
  const connect = useServerFn(connectGreenhouse);
  const [apiKey, setApiKey] = useState("");
  const [onBehalfOf, setOnBehalfOf] = useState("");
  const connectMut = useMutation({
    mutationFn: async () => connect({ data: { apiKey: apiKey.trim(), onBehalfOf: onBehalfOf.trim() } }),
    onSuccess: () => {
      toast.success("Greenhouse connected");
      setApiKey("");
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to connect Greenhouse"),
  });
  return (
    <ProviderShell
      provider="greenhouse"
      title="Greenhouse"
      category="ATS"
      icon={<Leaf className="h-5 w-5" />}
      description="Push sourced candidates into Greenhouse via the Harvest API. Each user activates with their own Harvest key."
      notConnectedChildren={
        <>
          <div className="rounded-lg border border-white/5 bg-background/60 p-4 text-xs text-muted-foreground">
            Create a Harvest API key in Greenhouse:{" "}
            <span className="text-foreground">Configure → Dev Center → API Credential Management</span>. Grant
            it <span className="text-foreground">Post: Candidates</span> permission, then provide your
            Greenhouse user ID for <span className="text-foreground">On-Behalf-Of</span>.{" "}
            <a
              href="https://developers.greenhouse.io/harvest.html#authentication"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="gh-key">Harvest API key</Label>
              <Input
                id="gh-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ghv2_…"
                autoComplete="off"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="gh-obo">On-Behalf-Of user ID</Label>
              <Input
                id="gh-obo"
                value={onBehalfOf}
                onChange={(e) => setOnBehalfOf(e.target.value)}
                placeholder="e.g. 4080392"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The Greenhouse user that will own created candidates.
              </p>
            </div>
          </div>
          <Button
            onClick={() => connectMut.mutate()}
            disabled={connectMut.isPending || apiKey.trim().length < 20 || !onBehalfOf.trim()}
          >
            {connectMut.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</>
            ) : "Activate Greenhouse"}
          </Button>
        </>
      }
      connectedDetails={(c) => (
        <p className="text-xs text-muted-foreground">
          On-Behalf-Of: <span className="text-foreground">{c.settings?.onBehalfOf ?? "—"}</span>
        </p>
      )}
    />
  );
}

function SlackCard() {
  const qc = useQueryClient();
  const connect = useServerFn(connectSlack);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channelLabel, setChannelLabel] = useState("");
  const connectMut = useMutation({
    mutationFn: async () =>
      connect({ data: { webhookUrl: webhookUrl.trim(), channelLabel: channelLabel.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Slack connected — sent a test message");
      setWebhookUrl("");
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to connect Slack"),
  });
  return (
    <ProviderShell
      provider="slack"
      title="Slack"
      category="Notifications"
      icon={<Slack className="h-5 w-5" />}
      description="Get a Slack ping in your hiring channel every time a scorecard is published. Uses an Incoming Webhook — no admin install required."
      notConnectedChildren={
        <>
          <div className="rounded-lg border border-white/5 bg-background/60 p-4 text-xs text-muted-foreground">
            Create an Incoming Webhook in Slack and paste the URL below.{" "}
            <a
              href="https://api.slack.com/messaging/webhooks"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="slack-url">Webhook URL</Label>
              <Input
                id="slack-url"
                type="password"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/…"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="slack-label">Channel label (optional)</Label>
              <Input
                id="slack-label"
                value={channelLabel}
                onChange={(e) => setChannelLabel(e.target.value)}
                placeholder="#hiring-eng"
              />
            </div>
          </div>
          <Button
            onClick={() => connectMut.mutate()}
            disabled={connectMut.isPending || !webhookUrl.trim().startsWith("https://hooks.slack.com/")}
          >
            {connectMut.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</>
            ) : "Activate Slack"}
          </Button>
        </>
      }
      connectedDetails={(c) =>
        c.settings?.channelLabel ? (
          <p className="text-xs text-muted-foreground">
            Channel: <span className="text-foreground">{c.settings.channelLabel}</span>
          </p>
        ) : null
      }
    />
  );
}

function WebhookCard() {
  const qc = useQueryClient();
  const connect = useServerFn(connectWebhook);
  const test = useServerFn(sendWebhookTest);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [testing, setTesting] = useState(false);
  const connectMut = useMutation({
    mutationFn: async () => connect({ data: { url: url.trim(), secret: secret.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Webhook connected");
      setUrl("");
      setSecret("");
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to connect webhook"),
  });
  async function runTest() {
    setTesting(true);
    try {
      await test();
      toast.success("Test event delivered");
      qc.invalidateQueries({ queryKey: ["integration-log", "webhook"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Test failed");
    } finally {
      setTesting(false);
    }
  }
  return (
    <ProviderShell
      provider="webhook"
      title="Custom Webhook"
      category="Outbound"
      icon={<Webhook className="h-5 w-5" />}
      description="Stream Grow events to any URL — Zapier, Make, n8n, or your own service. Signed with an optional shared secret."
      notConnectedChildren={
        <>
          <div className="rounded-lg border border-white/5 bg-background/60 p-4 text-xs text-muted-foreground">
            We POST JSON to your endpoint with an <span className="text-foreground">X-Grow-Signature</span> header
            (if a secret is set). Must return any 2xx/3xx/4xx — only 5xx fails the handshake.
          </div>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="wh-url">Endpoint URL</Label>
              <Input
                id="wh-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/…"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="wh-secret">Shared secret (optional)</Label>
              <Input
                id="wh-secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="any-string"
                autoComplete="off"
              />
            </div>
          </div>
          <Button
            onClick={() => connectMut.mutate()}
            disabled={connectMut.isPending || !/^https?:\/\//.test(url.trim())}
          >
            {connectMut.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Pinging…</>
            ) : "Activate Webhook"}
          </Button>
        </>
      }
      connectedDetails={(c) => (
        <p className="break-all text-xs text-muted-foreground">
          URL: <span className="text-foreground">{c.settings?.url ?? "—"}</span>
        </p>
      )}
      testAction={{ label: "Send test event", run: runTest, busy: testing }}
    />
  );
}

function TeamsCard() {
  const qc = useQueryClient();
  const connect = useServerFn(connectTeams);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channelLabel, setChannelLabel] = useState("");
  const connectMut = useMutation({
    mutationFn: async () =>
      connect({ data: { webhookUrl: webhookUrl.trim(), channelLabel: channelLabel.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Microsoft Teams connected — sent a test message");
      setWebhookUrl("");
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to connect Teams"),
  });
  const valid = /^https:\/\/[a-z0-9-]+\.webhook\.office\.com\/(webhookb2|workflows)\//i.test(
    webhookUrl.trim(),
  );
  return (
    <ProviderShell
      provider="teams"
      title="Microsoft Teams"
      category="Notifications"
      icon={<MessageSquare className="h-5 w-5" />}
      description="Post a card to a Teams channel every time a scorecard is published. Uses an Incoming Webhook or Workflows URL — no tenant-wide install required."
      notConnectedChildren={
        <>
          <div className="rounded-lg border border-white/5 bg-background/60 p-4 text-xs text-muted-foreground">
            In Teams, open the target channel →{" "}
            <span className="text-foreground">Workflows → Post to a channel when a webhook request is received</span>{" "}
            (or the classic Incoming Webhook connector), then paste the generated URL below.{" "}
            <a
              href="https://learn.microsoft.com/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="teams-url">Webhook URL</Label>
              <Input
                id="teams-url"
                type="password"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://<tenant>.webhook.office.com/webhookb2/…"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="teams-label">Channel label (optional)</Label>
              <Input
                id="teams-label"
                value={channelLabel}
                onChange={(e) => setChannelLabel(e.target.value)}
                placeholder="Hiring / Engineering"
              />
            </div>
          </div>
          <Button onClick={() => connectMut.mutate()} disabled={connectMut.isPending || !valid}>
            {connectMut.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</>
            ) : "Activate Microsoft Teams"}
          </Button>
        </>
      }
      connectedDetails={(c) =>
        c.settings?.channelLabel ? (
          <p className="text-xs text-muted-foreground">
            Channel: <span className="text-foreground">{c.settings.channelLabel}</span>
          </p>
        ) : null
      }
    />
  );
}
function HubspotCard() {
  const qc = useQueryClient();
  const connect = useServerFn(connectHubspot);
  const [token, setToken] = useState("");
  const [pipelineLabel, setPipelineLabel] = useState("");
  const connectMut = useMutation({
    mutationFn: async () =>
      connect({ data: { token: token.trim(), pipelineLabel: pipelineLabel.trim() || undefined } }),
    onSuccess: () => {
      toast.success("HubSpot connected");
      setToken("");
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to connect HubSpot"),
  });
  return (
    <ProviderShell
      provider="hubspot"
      title="HubSpot CRM"
      category="CRM"
      icon={<Building2 className="h-5 w-5" />}
      description="Push shortlisted candidates into HubSpot as contacts. Activation is per-user with your own Private App access token."
      notConnectedChildren={
        <>
          <div className="rounded-lg border border-white/5 bg-background/60 p-4 text-xs text-muted-foreground">
            In HubSpot:{" "}
            <span className="text-foreground">Settings → Integrations → Private Apps → Create</span>.
            Grant <span className="text-foreground">crm.objects.contacts.write</span> and{" "}
            <span className="text-foreground">crm.objects.owners.read</span> scopes.{" "}
            <a
              href="https://developers.hubspot.com/docs/api/private-apps"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="hs-token">Private App access token</Label>
              <Input
                id="hs-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="pat-na1-…"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="hs-pipeline">Pipeline label (optional)</Label>
              <Input
                id="hs-pipeline"
                value={pipelineLabel}
                onChange={(e) => setPipelineLabel(e.target.value)}
                placeholder="Sourcing — Engineering"
              />
            </div>
          </div>
          <Button
            onClick={() => connectMut.mutate()}
            disabled={connectMut.isPending || token.trim().length < 20}
          >
            {connectMut.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</>
            ) : "Activate HubSpot"}
          </Button>
        </>
      }
      connectedDetails={(c) =>
        c.settings?.pipelineLabel ? (
          <p className="text-xs text-muted-foreground">
            Pipeline: <span className="text-foreground">{c.settings.pipelineLabel}</span>
          </p>
        ) : null
      }
    />
  );
}

function NotionCard() {
  const qc = useQueryClient();
  const connect = useServerFn(connectNotion);
  const [token, setToken] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const connectMut = useMutation({
    mutationFn: async () =>
      connect({ data: { token: token.trim(), databaseId: databaseId.trim() } }),
    onSuccess: () => {
      toast.success("Notion connected");
      setToken("");
      setDatabaseId("");
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to connect Notion"),
  });
  return (
    <ProviderShell
      provider="notion"
      title="Notion"
      category="Knowledge"
      icon={<FileText className="h-5 w-5" />}
      description="Create a Notion page in your hiring database every time a scorecard is published. Per-user activation with your own Internal Integration token."
      notConnectedChildren={
        <>
          <div className="rounded-lg border border-white/5 bg-background/60 p-4 text-xs text-muted-foreground">
            Create an Internal Integration at{" "}
            <span className="text-foreground">notion.so/profile/integrations</span>, then open your
            hiring database → <span className="text-foreground">… → Connections → invite your
            integration</span>. Copy the database ID from its URL.{" "}
            <a
              href="https://developers.notion.com/docs/create-a-notion-integration"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="notion-token">Integration token</Label>
              <Input
                id="notion-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="secret_… or ntn_…"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="notion-db">Database ID</Label>
              <Input
                id="notion-db"
                value={databaseId}
                onChange={(e) => setDatabaseId(e.target.value)}
                placeholder="32-char ID from the database URL"
              />
            </div>
          </div>
          <Button
            onClick={() => connectMut.mutate()}
            disabled={connectMut.isPending || token.trim().length < 20 || databaseId.trim().length < 20}
          >
            {connectMut.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</>
            ) : "Activate Notion"}
          </Button>
        </>
      }
      connectedDetails={(c) =>
        c.settings?.databaseId ? (
          <p className="break-all text-xs text-muted-foreground">
            Database: <span className="text-foreground">{c.settings.databaseId}</span>
          </p>
        ) : null
      }
    />
  );
}

function SheetsCard() {
  const qc = useQueryClient();
  const connect = useServerFn(connectSheets);
  const [url, setUrl] = useState("");
  const [sheetLabel, setSheetLabel] = useState("");
  const connectMut = useMutation({
    mutationFn: async () =>
      connect({ data: { url: url.trim(), sheetLabel: sheetLabel.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Google Sheets connected — sent a test row");
      setUrl("");
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to connect Google Sheets"),
  });
  const valid = /^https:\/\/script\.google\.com\/(macros|a\/macros)\/[^/]+\/s\/[A-Za-z0-9_-]+\/exec\b/.test(
    url.trim(),
  );
  return (
    <ProviderShell
      provider="sheets"
      title="Google Sheets"
      category="Spreadsheet"
      icon={<Sheet className="h-5 w-5" />}
      description="Append a row to your sheet every time a scorecard is published. Uses a 5-line Apps Script Web App you deploy from your own Google account — no OAuth, no admin install."
      notConnectedChildren={
        <>
          <div className="rounded-lg border border-white/5 bg-background/60 p-4 text-xs text-muted-foreground">
            <p className="mb-2 text-foreground">Apps Script (Extensions → Apps Script):</p>
            <pre className="overflow-x-auto rounded bg-background/80 p-2 text-[11px] leading-snug">
{`function doPost(e){
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const body = JSON.parse(e.postData.contents);
  sheet.appendRow(body.row || []);
  return ContentService.createTextOutput("ok");
}`}
            </pre>
            <p className="mt-2">
              Deploy → New deployment → <span className="text-foreground">Web app</span>, run as
              you, access <span className="text-foreground">Anyone</span>. Paste the{" "}
              <code>/exec</code> URL below.
            </p>
          </div>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="sheets-url">Web App URL</Label>
              <Input
                id="sheets-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/…/exec"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="sheets-label">Sheet label (optional)</Label>
              <Input
                id="sheets-label"
                value={sheetLabel}
                onChange={(e) => setSheetLabel(e.target.value)}
                placeholder="Hiring tracker"
              />
            </div>
          </div>
          <Button onClick={() => connectMut.mutate()} disabled={connectMut.isPending || !valid}>
            {connectMut.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</>
            ) : "Activate Google Sheets"}
          </Button>
        </>
      }
      connectedDetails={(c) =>
        c.settings?.sheetLabel ? (
          <p className="text-xs text-muted-foreground">
            Sheet: <span className="text-foreground">{c.settings.sheetLabel}</span>
          </p>
        ) : null
      }
    />
  );
}

function DiscordCard() {
  const qc = useQueryClient();
  const connect = useServerFn(connectDiscord);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channelLabel, setChannelLabel] = useState("");
  const connectMut = useMutation({
    mutationFn: async () =>
      connect({ data: { webhookUrl: webhookUrl.trim(), channelLabel: channelLabel.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Discord connected — sent a test message");
      setWebhookUrl("");
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to connect Discord"),
  });
  const valid = /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/i.test(
    webhookUrl.trim(),
  );
  return (
    <ProviderShell
      provider="discord"
      title="Discord"
      category="Notifications"
      icon={<Hash className="h-5 w-5" />}
      description="Post a message to a Discord channel every time a scorecard is published. Uses an Incoming Webhook — no bot install required."
      notConnectedChildren={
        <>
          <div className="rounded-lg border border-white/5 bg-background/60 p-4 text-xs text-muted-foreground">
            In Discord: open the channel →{" "}
            <span className="text-foreground">Edit Channel → Integrations → Webhooks → New Webhook</span>,
            copy the URL.{" "}
            <a
              href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="discord-url">Webhook URL</Label>
              <Input
                id="discord-url"
                type="password"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/…"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="discord-label">Channel label (optional)</Label>
              <Input
                id="discord-label"
                value={channelLabel}
                onChange={(e) => setChannelLabel(e.target.value)}
                placeholder="#hiring"
              />
            </div>
          </div>
          <Button onClick={() => connectMut.mutate()} disabled={connectMut.isPending || !valid}>
            {connectMut.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</>
            ) : "Activate Discord"}
          </Button>
        </>
      }
      connectedDetails={(c) =>
        c.settings?.channelLabel ? (
          <p className="text-xs text-muted-foreground">
            Channel: <span className="text-foreground">{c.settings.channelLabel}</span>
          </p>
        ) : null
      }
    />
  );
}
