import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { upsertRubric, deleteRubric, seedRubricTemplates } from "@/server/interviews.functions";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Star, Sparkles } from "lucide-react";

type Rubric = {
  id: string;
  name: string;
  role_title: string | null;
  focus: string | null;
  competencies: string[];
  is_default: boolean;
};

export const Route = createFileRoute("/interview/rubrics")({
  head: () => ({
    meta: [{ title: "Rubrics — Interview Copilot" }, { name: "robots", content: "noindex" }],
  }),
  component: RubricsPage,
});

const STARTER_COMPETENCIES = [
  "Communication",
  "Problem solving",
  "Technical depth",
  "Ownership",
  "Collaboration",
];

function RubricsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [editing, setEditing] = useState<Partial<Rubric> | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  async function load() {
    const { data } = await supabase
      .from("interview_rubrics")
      .select("id, name, role_title, focus, competencies, is_default")
      .order("created_at", { ascending: false });
    setRubrics(
      ((data ?? []) as Array<Omit<Rubric, "competencies"> & { competencies: unknown }>).map(
        (r) => ({
          ...r,
          competencies: Array.isArray(r.competencies)
            ? (r.competencies as unknown[]).map((c) => String(c))
            : [],
        }),
      ),
    );
  }
  useEffect(() => {
    if (user) load();
  }, [user]);

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await upsertRubric({
        data: {
          id: editing.id,
          name: editing.name?.trim() || "",
          roleTitle: editing.role_title || null,
          focus: editing.focus || null,
          competencies: (editing.competencies ?? []).map((c) => c.trim()).filter(Boolean),
          isDefault: !!editing.is_default,
        },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      toast.success("Rubric saved");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this rubric?")) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    await deleteRubric({
      data: { id },
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined,
    });
    toast.success("Rubric deleted");
    load();
  }

  async function seedAll() {
    setSeeding(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const r = await seedRubricTemplates({
        data: { templates: ["engineering", "sales", "product", "design"] },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      toast.success(`Added ${r.count} starter rubrics`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to seed");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 pb-24 pt-32">
        <Link
          to="/interview"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to interviews
        </Link>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-medium tracking-tight">Rubrics</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Define per-role rubrics. The copilot uses them to calibrate live suggestions and the
              final scorecard.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={seedAll} disabled={seeding}>
              <Sparkles className="size-4" /> {seeding ? "Adding…" : "Seed templates"}
            </Button>
            <Button
              onClick={() =>
                setEditing({
                  name: "",
                  role_title: "",
                  focus: "",
                  competencies: STARTER_COMPETENCIES,
                  is_default: rubrics.length === 0,
                })
              }
            >
              <Plus className="size-4" /> New rubric
            </Button>
          </div>
        </div>

        {editing && (
          <div className="mt-8 space-y-4 rounded-xl border bg-card p-6">
            <h2 className="text-lg font-medium">{editing.id ? "Edit rubric" : "New rubric"}</h2>
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={editing.name ?? ""}
                maxLength={200}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Senior Backend Engineer"
              />
            </div>
            <div className="grid gap-2">
              <Label>Role title (optional)</Label>
              <Input
                value={editing.role_title ?? ""}
                maxLength={200}
                onChange={(e) => setEditing({ ...editing, role_title: e.target.value })}
                placeholder="Senior Backend Engineer"
              />
            </div>
            <div className="grid gap-2">
              <Label>Focus / what to probe</Label>
              <Textarea
                value={editing.focus ?? ""}
                maxLength={2000}
                rows={3}
                onChange={(e) => setEditing({ ...editing, focus: e.target.value })}
                placeholder="Distributed systems experience, on-call ownership, ability to defend tradeoffs."
              />
            </div>
            <div className="grid gap-2">
              <Label>Competencies (one per line, max 20)</Label>
              <Textarea
                value={(editing.competencies ?? []).join("\n")}
                rows={6}
                onChange={(e) =>
                  setEditing({ ...editing, competencies: e.target.value.split("\n") })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!editing.is_default}
                onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })}
              />
              Default rubric (auto-selected for new interviews)
            </label>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving || !editing.name?.trim()}>
                {saving ? "Saving…" : "Save rubric"}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="mt-10 rounded-xl border bg-card">
          {rubrics.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No rubrics yet. Create one to calibrate your scorecards.
            </div>
          ) : (
            <ul className="divide-y">
              {rubrics.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      {r.name}
                      {r.is_default && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                          <Star className="size-3" /> default
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {r.role_title || "Any role"} · {r.competencies.length} competenc
                      {r.competencies.length === 1 ? "y" : "ies"}
                    </div>
                    {r.focus && (
                      <p className="mt-1 line-clamp-2 max-w-prose text-xs text-muted-foreground">
                        {r.focus}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(r.id)}
                      aria-label="Delete rubric"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
