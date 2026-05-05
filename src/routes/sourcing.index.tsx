import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ExternalLink, Plus, Mail } from "lucide-react";
import { toast } from "sonner";
import { runSourcingSearch, listShortlists, addToShortlist, listSequences, sendOutreach } from "@/server/sourcing.functions";

export const Route = createFileRoute("/sourcing/")({
  component: SearchPage,
});

type Candidate = {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  profile_url: string;
  avatar_url: string | null;
  email: string | null;
  ai_summary: string | null;
  fit_score: number | null;
  signals: Record<string, unknown>;
};

function SearchPage() {
  const [query, setQuery] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("");
  const [minFollowers, setMinFollowers] = useState("");
  const [saveAs, setSaveAs] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Candidate[]>([]);

  async function onSearch() {
    if (query.trim().length < 2) {
      toast.error("Describe the role or skills (min 2 chars).");
      return;
    }
    setLoading(true);
    try {
      const res = await runSourcingSearch({
        data: {
          query: query.trim(),
          roleTitle: roleTitle.trim() || null,
          filters: {
            location: location.trim() || null,
            language: language.trim() || null,
            minFollowers: minFollowers ? Number(minFollowers) : null,
          },
          saveAs: saveAs.trim() || null,
        },
      });
      setResults(res.candidates as Candidate[]);
      toast.success(`Found ${res.candidates.length} candidates`);
      if (saveAs.trim()) setSaveAs("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-4 rounded-2xl border border-white/10 bg-card/40 p-5">
        <div>
          <Label htmlFor="q">What you're hiring</Label>
          <Textarea
            id="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Senior TypeScript engineer with React and Postgres experience, remote EU"
            className="mt-2 min-h-[100px]"
          />
        </div>
        <div>
          <Label htmlFor="role">Role title (optional)</Label>
          <Input id="role" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} className="mt-2" placeholder="Senior Frontend Engineer" />
        </div>
        <div>
          <Label htmlFor="loc">Location</Label>
          <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-2" placeholder="Berlin, Remote, USA" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="lang">Language</Label>
            <Input id="lang" value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-2" placeholder="typescript" />
          </div>
          <div>
            <Label htmlFor="fol">Min followers</Label>
            <Input id="fol" inputMode="numeric" value={minFollowers} onChange={(e) => setMinFollowers(e.target.value.replace(/\D/g, ""))} className="mt-2" placeholder="50" />
          </div>
        </div>
        <div>
          <Label htmlFor="save">Save as (optional)</Label>
          <Input id="save" value={saveAs} onChange={(e) => setSaveAs(e.target.value)} className="mt-2" placeholder="EU TS engineers" />
          <p className="mt-1 text-xs text-muted-foreground">Saved searches can be re-run on a schedule with email alerts.</p>
        </div>
        <Button onClick={onSearch} disabled={loading} className="w-full rounded-full" variant="hero">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {loading ? "Searching…" : "Search & rank"}
        </Button>
      </aside>

      <section className="space-y-4">
        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-card/20 p-10 text-center text-sm text-muted-foreground">
            Describe the role on the left to get a ranked list of candidates from public GitHub profiles.
            <br />
            <span className="mt-2 block text-xs opacity-70">Tip: add a <Link to="/sourcing/sequences" className="underline">sequence</Link> first to send outreach in one click.</span>
          </div>
        ) : (
          results.map((c) => <CandidateCard key={c.id} c={c} roleTitle={roleTitle} />)
        )}
      </section>
    </div>
  );
}

function CandidateCard({ c, roleTitle }: { c: Candidate; roleTitle: string }) {
  const followers = (c.signals as { followers?: number })?.followers ?? 0;
  const repos = (c.signals as { public_repos?: number })?.public_repos ?? 0;
  const score = c.fit_score ?? 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-card/40 p-5 transition-colors hover:bg-card/60">
      <div className="flex items-start gap-4">
        {c.avatar_url ? (
          <img src={c.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-primary/20" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <a href={c.profile_url} target="_blank" rel="noreferrer" className="text-base font-semibold text-foreground hover:underline">
              {c.name}
            </a>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="secondary" className="ml-auto">
              {score} fit
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.headline ?? "(no bio)"}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {c.location ? <span>📍 {c.location}</span> : null}
            <span>👥 {followers}</span>
            <span>📦 {repos}</span>
            {c.email ? <span>✉ {c.email}</span> : null}
          </div>
          {c.ai_summary ? (
            <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground/90">
              <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
              {c.ai_summary}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <AddToShortlistButton candidateId={c.id} />
            <SendOutreachButton candidate={c} roleTitle={roleTitle} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AddToShortlistButton({ candidateId }: { candidateId: string }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const res = await listShortlists();
      setLists(res as { id: string; name: string }[]);
      setOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }
  async function add(shortlistId: string) {
    setLoading(true);
    try {
      await addToShortlist({ data: { shortlistId, candidateId } });
      toast.success("Added to shortlist");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <Button size="sm" variant="outline" onClick={load}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Shortlist
      </Button>
      {open ? (
        <div className="absolute z-10 mt-1 w-56 rounded-md border border-white/10 bg-popover p-1 shadow-lg">
          {lists.length === 0 ? (
            <Link to="/sourcing/shortlists" className="block px-3 py-2 text-sm text-muted-foreground hover:bg-white/5">
              Create a shortlist first →
            </Link>
          ) : (
            lists.map((l) => (
              <button
                key={l.id}
                disabled={loading}
                onClick={() => add(l.id)}
                className="block w-full rounded px-3 py-2 text-left text-sm text-foreground hover:bg-white/5"
              >
                {l.name}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function SendOutreachButton({ candidate, roleTitle }: { candidate: Candidate; roleTitle: string }) {
  const [open, setOpen] = useState(false);
  const [seqs, setSeqs] = useState<{ id: string; name: string }[]>([]);
  const [email, setEmail] = useState(candidate.email ?? "");
  const [seqId, setSeqId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const res = (await listSequences()) as { id: string; name: string }[];
      setSeqs(res);
      if (res[0]) setSeqId(res[0].id);
      setOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }
  async function send() {
    if (!email || !seqId) return;
    setLoading(true);
    try {
      await sendOutreach({
        data: {
          candidateId: candidate.id,
          sequenceId: seqId,
          recipientEmail: email,
          roleTitle: roleTitle || "the role",
        },
      });
      toast.success("Outreach queued");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <Button size="sm" variant="outline" onClick={load}>
        <Mail className="mr-1 h-3.5 w-3.5" /> Outreach
      </Button>
      {open ? (
        <div className="absolute z-10 mt-1 w-72 space-y-2 rounded-md border border-white/10 bg-popover p-3 shadow-lg">
          {seqs.length === 0 ? (
            <Link to="/sourcing/sequences" className="block text-sm text-muted-foreground underline">
              Create a sequence first →
            </Link>
          ) : (
            <>
              <select
                value={seqId}
                onChange={(e) => setSeqId(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-background px-2 py-1.5 text-sm"
              >
                {seqs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Input
                type="email"
                placeholder="candidate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button size="sm" onClick={send} disabled={loading || !email} className="w-full">
                {loading ? "Sending…" : "Personalize & send"}
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}