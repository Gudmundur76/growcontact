import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ExternalLink, Plus, Mail, Wand2, AtSign } from "lucide-react";
import { toast } from "sonner";
import {
  runSourcingSearch,
  listShortlists,
  addToShortlist,
  listSequences,
  sendOutreach,
  enrichCandidate,
  findCandidateEmail,
} from "@/server/sourcing.functions";

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
  const [source, setSource] = useState<"github" | "pdl">("github");
  const [query, setQuery] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("");
  const [minFollowers, setMinFollowers] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [skills, setSkills] = useState("");
  const [seniority, setSeniority] = useState("");
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
      const skillList = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await runSourcingSearch({
        data: {
          query: query.trim(),
          roleTitle: roleTitle.trim() || null,
          source,
          filters: {
            location: location.trim() || null,
            ...(source === "github"
              ? {
                  language: language.trim() || null,
                  minFollowers: minFollowers ? Number(minFollowers) : null,
                }
              : {
                  jobTitle: jobTitle.trim() || null,
                  company: company.trim() || null,
                  skills: skillList.length ? skillList : null,
                  seniority: (seniority || null) as
                    | "entry"
                    | "senior"
                    | "manager"
                    | "director"
                    | "vp"
                    | "cxo"
                    | null,
                }),
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
          <Label>Source</Label>
          <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-md border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setSource("github")}
              className={`px-2 py-2 transition-colors ${source === "github" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-white/5"}`}
            >
              GitHub
            </button>
            <button
              type="button"
              onClick={() => setSource("pdl")}
              className={`px-2 py-2 transition-colors ${source === "pdl" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-white/5"}`}
            >
              People Data Labs
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {source === "github"
              ? "Best for engineers + OSS signals."
              : "~3B profiles. Verified emails, work history, skills."}
          </p>
        </div>
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
          <Input
            id="role"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            className="mt-2"
            placeholder="Senior Frontend Engineer"
          />
        </div>
        <div>
          <Label htmlFor="loc">Location</Label>
          <Input
            id="loc"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-2"
            placeholder="Berlin, Remote, USA"
          />
        </div>
        {source === "github" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lang">Language</Label>
              <Input
                id="lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-2"
                placeholder="typescript"
              />
            </div>
            <div>
              <Label htmlFor="fol">Min followers</Label>
              <Input
                id="fol"
                inputMode="numeric"
                value={minFollowers}
                onChange={(e) => setMinFollowers(e.target.value.replace(/\D/g, ""))}
                className="mt-2"
                placeholder="50"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="jt">Job title</Label>
                <Input
                  id="jt"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="mt-2"
                  placeholder="Product Designer"
                />
              </div>
              <div>
                <Label htmlFor="co">Company</Label>
                <Input
                  id="co"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="mt-2"
                  placeholder="Stripe"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="sk">Skills (comma-separated)</Label>
              <Input
                id="sk"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="mt-2"
                placeholder="figma, design systems"
              />
            </div>
            <div>
              <Label htmlFor="sen">Seniority</Label>
              <select
                id="sen"
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="mt-2 w-full rounded-md border border-white/10 bg-background px-2 py-2 text-sm"
              >
                <option value="">Any</option>
                <option value="entry">Entry</option>
                <option value="senior">Senior</option>
                <option value="manager">Manager</option>
                <option value="director">Director</option>
                <option value="vp">VP</option>
                <option value="cxo">C-level</option>
              </select>
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="save">Save as (optional)</Label>
          <Input
            id="save"
            value={saveAs}
            onChange={(e) => setSaveAs(e.target.value)}
            className="mt-2"
            placeholder="EU TS engineers"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Saved searches can be re-run on a schedule with email alerts.
          </p>
        </div>
        <Button
          onClick={onSearch}
          disabled={loading}
          className="w-full rounded-full"
          variant="hero"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {loading ? "Searching…" : "Search & rank"}
        </Button>
      </aside>

      <section className="space-y-4">
        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-card/20 p-10 text-center text-sm text-muted-foreground">
            Describe the role on the left to get a ranked list of candidates from public GitHub
            profiles.
            <br />
            <span className="mt-2 block text-xs opacity-70">
              Tip: add a{" "}
              <Link to="/sourcing/sequences" className="underline">
                sequence
              </Link>{" "}
              first to send outreach in one click.
            </span>
          </div>
        ) : (
          results.map((c) => (
            <CandidateCard
              key={c.id}
              c={c}
              roleTitle={roleTitle}
              onUpdate={(updated) =>
                setResults((cur) =>
                  cur.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)),
                )
              }
            />
          ))
        )}
      </section>
    </div>
  );
}

function CandidateCard({
  c,
  roleTitle,
  onUpdate,
}: {
  c: Candidate;
  roleTitle: string;
  onUpdate: (c: Partial<Candidate> & { id: string }) => void;
}) {
  const followers = (c.signals as { followers?: number })?.followers ?? 0;
  const repos = (c.signals as { public_repos?: number })?.public_repos ?? 0;
  const company = (c.signals as { company?: string })?.company;
  const skills = (c.signals as { skills?: string[] })?.skills ?? [];
  const score = c.fit_score ?? 0;
  const [enriching, setEnriching] = useState(false);
  const [findingEmail, setFindingEmail] = useState(false);

  async function onEnrich() {
    setEnriching(true);
    try {
      const res = await enrichCandidate({ data: { candidateId: c.id } });
      if (!res.ok) {
        toast.message("No PDL match found for this profile.");
      } else {
        toast.success("Enriched");
        onUpdate({ id: c.id, email: res.email, signals: { ...(c.signals ?? {}), ...res.signals } });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enrich failed");
    } finally {
      setEnriching(false);
    }
  }
  async function onFindEmail() {
    setFindingEmail(true);
    try {
      const res = await findCandidateEmail({ data: { candidateId: c.id } });
      if (!res.email) toast.message("No email found.");
      else {
        toast.success(`Found ${res.email}`);
        onUpdate({ id: c.id, email: res.email });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setFindingEmail(false);
    }
  }

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
            <a
              href={c.profile_url}
              target="_blank"
              rel="noreferrer"
              className="text-base font-semibold text-foreground hover:underline"
            >
              {c.name}
            </a>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="secondary" className="ml-auto">
              {score} fit
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {c.headline ?? "(no bio)"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {c.location ? <span>📍 {c.location}</span> : null}
            {followers ? <span>👥 {followers}</span> : null}
            {repos ? <span>📦 {repos}</span> : null}
            {company ? <span>🏢 {company}</span> : null}
            {c.email ? <span>✉ {c.email}</span> : null}
          </div>
          {skills.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {skills.slice(0, 8).map((s) => (
                <Badge key={s} variant="outline" className="text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
          ) : null}
          {c.ai_summary ? (
            <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground/90">
              <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
              {c.ai_summary}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <AddToShortlistButton candidateId={c.id} />
            <SendOutreachButton candidate={c} roleTitle={roleTitle} />
            <Button size="sm" variant="outline" onClick={onEnrich} disabled={enriching}>
              <Wand2 className="mr-1 h-3.5 w-3.5" /> {enriching ? "Enriching…" : "Enrich (PDL)"}
            </Button>
            {!c.email ? (
              <Button size="sm" variant="outline" onClick={onFindEmail} disabled={findingEmail}>
                <AtSign className="mr-1 h-3.5 w-3.5" /> {findingEmail ? "Finding…" : "Find email"}
              </Button>
            ) : null}
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
            <Link
              to="/sourcing/shortlists"
              className="block px-3 py-2 text-sm text-muted-foreground hover:bg-white/5"
            >
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
            <Link
              to="/sourcing/sequences"
              className="block text-sm text-muted-foreground underline"
            >
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
