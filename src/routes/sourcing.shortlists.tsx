import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Download, Video } from "lucide-react";
import { toast } from "sonner";
import {
  listShortlists,
  upsertShortlist,
  deleteShortlist,
  getShortlist,
  updateShortlistMember,
  removeFromShortlist,
} from "@/server/sourcing.functions";

export const Route = createFileRoute("/sourcing/shortlists")({
  component: ShortlistsPage,
});

type Shortlist = { id: string; name: string; role_title: string | null };
type Member = {
  id: string;
  stage: string;
  notes: string | null;
  candidate: {
    id: string;
    name: string;
    headline: string | null;
    profile_url: string;
    avatar_url: string | null;
    fit_score: number | null;
    email?: string | null;
    location?: string | null;
  };
};
const STAGES = ["new", "contacted", "replied", "screening", "passed", "rejected"] as const;

function ShortlistsPage() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<Shortlist[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");

  async function load() {
    const res = (await listShortlists()) as Shortlist[];
    setLists(res);
    if (!activeId && res[0]) setActiveId(res[0].id);
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!activeId) return;
    (async () => {
      try {
        const res = await getShortlist({ data: { shortlistId: activeId } });
        setMembers(res.members as Member[]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    })();
  }, [activeId]);

  async function create() {
    if (!name.trim()) return;
    try {
      const { id } = await upsertShortlist({ data: { name, roleTitle: roleTitle || null } });
      setName("");
      setRoleTitle("");
      await load();
      setActiveId(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }
  async function setStage(memberId: string, stage: string) {
    try {
      await updateShortlistMember({ data: { memberId, stage: stage as (typeof STAGES)[number] } });
      setMembers((m) => m.map((x) => (x.id === memberId ? { ...x, stage } : x)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }
  async function removeMember(memberId: string) {
    try {
      await removeFromShortlist({ data: { memberId } });
      setMembers((m) => m.filter((x) => x.id !== memberId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }
  async function startInterviewFor(m: Member) {
    const list = lists.find((l) => l.id === activeId);
    try {
      await updateShortlistMember({ data: { memberId: m.id, stage: "screening" } });
      setMembers((arr) => arr.map((x) => (x.id === m.id ? { ...x, stage: "screening" } : x)));
    } catch {
      // non-fatal — still navigate
    }
    navigate({
      to: "/interview/new",
      search: {
        candidate: m.candidate.name,
        role: list?.role_title ?? undefined,
      },
    });
  }
  async function removeList(id: string) {
    if (!confirm("Delete this shortlist?")) return;
    await deleteShortlist({ data: { shortlistId: id } });
    if (activeId === id) setActiveId(null);
    load();
  }

  function exportCsv() {
    const list = lists.find((l) => l.id === activeId);
    if (!list || members.length === 0) return;
    const headers = [
      "name",
      "stage",
      "fit_score",
      "email",
      "location",
      "headline",
      "profile_url",
      "notes",
    ];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = members.map((m) => [
      m.candidate.name,
      m.stage,
      m.candidate.fit_score ?? "",
      m.candidate.email ?? "",
      m.candidate.location ?? "",
      m.candidate.headline ?? "",
      m.candidate.profile_url,
      m.notes ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${list.name.replace(/[^a-z0-9-_]+/gi, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        <div className="rounded-2xl border border-white/10 bg-card/40 p-4">
          <Label htmlFor="newName">New shortlist</Label>
          <Input
            id="newName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="mt-2"
          />
          <Input
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            placeholder="Role (optional)"
            className="mt-2"
          />
          <Button onClick={create} className="mt-3 w-full" size="sm">
            <Plus className="mr-1 h-3.5 w-3.5" /> Create
          </Button>
        </div>
        <ul className="space-y-1">
          {lists.map((l) => (
            <li key={l.id} className="flex items-center gap-1">
              <button
                onClick={() => setActiveId(l.id)}
                className={`flex-1 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  activeId === l.id
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:bg-white/5"
                }`}
              >
                <div className="font-medium text-foreground">{l.name}</div>
                {l.role_title ? (
                  <div className="text-xs text-muted-foreground">{l.role_title}</div>
                ) : null}
              </button>
              <Button size="icon" variant="ghost" onClick={() => removeList(l.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </aside>

      <section>
        {!activeId ? (
          <p className="text-muted-foreground">Select or create a shortlist.</p>
        ) : members.length === 0 ? (
          <p className="text-muted-foreground">
            No candidates here yet. Add some from the Search tab.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {members.length} candidate{members.length === 1 ? "" : "s"}
              </p>
              <Button size="sm" variant="outline" onClick={exportCsv}>
                <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-card/40 p-4"
              >
                {m.candidate.avatar_url ? (
                  <img src={m.candidate.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/20" />
                )}
                <div className="min-w-0 flex-1">
                  <a
                    href={m.candidate.profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground hover:underline"
                  >
                    {m.candidate.name}
                  </a>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.candidate.headline ?? ""}
                  </p>
                </div>
                <select
                  value={m.stage}
                  onChange={(e) => setStage(m.id, e.target.value)}
                  className="rounded-md border border-white/10 bg-background px-2 py-1.5 text-xs"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startInterviewFor(m)}
                  className="gap-1.5"
                >
                  <Video className="h-3.5 w-3.5" /> Interview
                </Button>
                <Button size="icon" variant="ghost" onClick={() => removeMember(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
