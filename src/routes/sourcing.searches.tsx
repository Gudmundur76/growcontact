import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Bell } from "lucide-react";
import {
  listSourcingSearches,
  toggleSearchAlert,
  deleteSourcingSearch,
  runSourcingSearch,
} from "@/server/sourcing.functions";

export const Route = createFileRoute("/sourcing/searches")({
  component: SavedSearchesPage,
});

type Search = {
  id: string;
  name: string;
  query: string;
  role_title: string | null;
  alert_enabled: boolean;
  alert_frequency: string;
  last_run_at: string | null;
  created_at: string;
};

function SavedSearchesPage() {
  const [items, setItems] = useState<Search[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setItems((await listSourcingSearches()) as Search[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(id: string, enabled: boolean) {
    try {
      await toggleSearchAlert({ data: { searchId: id, enabled } });
      setItems((s) => s.map((it) => (it.id === id ? { ...it, alert_enabled: enabled } : it)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }
  async function rerun(it: Search) {
    toast.info("Re-running…");
    try {
      await runSourcingSearch({
        data: { query: it.query, roleTitle: it.role_title, searchId: it.id },
      });
      toast.success("Updated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }
  async function remove(id: string) {
    if (!confirm("Delete this saved search?")) return;
    try {
      await deleteSourcingSearch({ data: { searchId: id } });
      setItems((s) => s.filter((x) => x.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (items.length === 0)
    return (
      <p className="text-muted-foreground">
        No saved searches yet. Run a search and use the “Save as” field to store it.
      </p>
    );

  return (
    <div className="space-y-3">
      {items.map((s) => (
        <div
          key={s.id}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-card/40 p-5 md:flex-row md:items-center"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium text-foreground">{s.name}</h3>
              {s.role_title ? (
                <span className="text-xs text-muted-foreground">· {s.role_title}</span>
              ) : null}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.query}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {s.last_run_at ? `Last run ${new Date(s.last_run_at).toLocaleString()}` : "Never run"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bell className="h-3.5 w-3.5" />
              <Switch
                checked={s.alert_enabled}
                onCheckedChange={(v) => toggle(s.id, v)}
              />
              {s.alert_frequency}
            </label>
            <Button size="sm" variant="outline" onClick={() => rerun(s)}>
              Re-run
            </Button>
            <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}