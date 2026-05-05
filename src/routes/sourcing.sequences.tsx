import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  listSequences,
  upsertSequence,
  deleteSequence,
} from "@/server/sourcing.functions";

export const Route = createFileRoute("/sourcing/sequences")({
  component: SequencesPage,
});

type Seq = {
  id: string;
  name: string;
  subject: string;
  body: string;
  sender_name: string | null;
};

function SequencesPage() {
  const [items, setItems] = useState<Seq[]>([]);
  const [editing, setEditing] = useState<Seq | null>(null);

  async function load() {
    setItems((await listSequences()) as Seq[]);
  }
  useEffect(() => { load(); }, []);

  function blank(): Seq {
    return {
      id: "",
      name: "",
      subject: "Quick chat about {{role}}?",
      body:
        "Hi {{name}},\n\nI came across your profile and was impressed by your work. We're hiring a {{role}} and I think you'd be a great fit — open to a 15-min intro this week?\n\n— {{sender}}",
      sender_name: "",
    };
  }
  async function save() {
    if (!editing) return;
    try {
      await upsertSequence({
        data: {
          id: editing.id || undefined,
          name: editing.name,
          subject: editing.subject,
          body: editing.body,
          senderName: editing.sender_name || null,
        },
      });
      toast.success("Saved");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }
  async function remove(id: string) {
    if (!confirm("Delete this sequence?")) return;
    await deleteSequence({ data: { sequenceId: id } });
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sequences</h2>
          <Button size="sm" onClick={() => setEditing(blank())}>New</Button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sequences yet. Create one to send personalized outreach.</p>
        ) : (
          items.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-card/40 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">{s.name}</div>
                <div className="truncate text-xs text-muted-foreground">{s.subject}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing(s)}>Edit</Button>
              <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </section>

      <section>
        {editing ? (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-card/40 p-5">
            <div>
              <Label htmlFor="n">Name</Label>
              <Input id="n" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="s">Subject</Label>
              <Input id="s" value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="b">Body</Label>
              <Textarea
                id="b"
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                className="mt-2 min-h-[260px] font-mono text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use {"{{name}}"}, {"{{role}}"}, {"{{sender}}"}. AI will personalize one specific line per send.
              </p>
            </div>
            <div>
              <Label htmlFor="sn">Sender name</Label>
              <Input id="sn" value={editing.sender_name ?? ""} onChange={(e) => setEditing({ ...editing, sender_name: e.target.value })} className="mt-2" />
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>Save</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Pick a sequence to edit, or create a new one.</p>
        )}
      </section>
    </div>
  );
}