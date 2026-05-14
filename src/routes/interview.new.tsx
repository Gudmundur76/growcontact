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
import { startInterview } from "@/server/interviews.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/interview/new")({
  head: () => ({
    meta: [{ title: "Start interview — Grow" }, { name: "robots", content: "noindex" }],
  }),
  component: NewInterviewPage,
});

function NewInterviewPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [candidateName, setCandidateName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rubrics, setRubrics] = useState<{ id: string; name: string; is_default: boolean }[]>([]);
  const [rubricId, setRubricId] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("interview_rubrics")
        .select("id, name, is_default")
        .order("created_at", { ascending: false });
      const list = (data ?? []) as { id: string; name: string; is_default: boolean }[];
      setRubrics(list);
      const def = list.find((r) => r.is_default);
      if (def) setRubricId(def.id);
    })();
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const result = await startInterview({
        data: {
          candidateName,
          roleTitle,
          jobDescription: jobDescription || null,
          meetingUrl,
          rubricId: rubricId || null,
        },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      if (!result.botDispatched) {
        toast.message("Session created", {
          description:
            "error" in result && result.error
              ? result.error
              : "Recall.ai key not configured yet — bot was not dispatched.",
        });
      } else {
        toast.success("Bot dispatched to the meeting");
      }
      navigate({ to: "/interview/$id", params: { id: result.sessionId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start interview");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-2xl px-4 pb-24 pt-32">
        <h1 className="text-4xl font-medium tracking-tight">Start an interview</h1>
        <p className="mt-2 text-muted-foreground">
          The bot will join the meeting, transcribe live, and surface AI follow-ups in your copilot
          view.
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-6 rounded-xl border bg-card p-6">
          <div className="grid gap-2">
            <Label htmlFor="candidate">Candidate name</Label>
            <Input
              id="candidate"
              required
              maxLength={200}
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Alex Rivera"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              required
              maxLength={200}
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="Senior Frontend Engineer"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="jd">Job description (optional)</Label>
            <Textarea
              id="jd"
              maxLength={20000}
              rows={6}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the JD or rubric. The copilot uses this to calibrate suggestions."
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rubric">Rubric (optional)</Label>
              <Link to="/interview/rubrics" className="text-xs text-primary hover:underline">
                Manage rubrics →
              </Link>
            </div>
            <select
              id="rubric"
              value={rubricId}
              onChange={(e) => setRubricId(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">No rubric</option>
              {rubrics.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.is_default ? " · default" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">Meeting link</Label>
            <Input
              id="url"
              required
              type="url"
              maxLength={2000}
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/j/… · https://meet.google.com/… · https://teams.microsoft.com/…"
            />
            <p className="text-xs text-muted-foreground">
              Zoom, Google Meet, and Microsoft Teams are auto-detected.
            </p>
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Dispatching bot…" : "Start interview"}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
