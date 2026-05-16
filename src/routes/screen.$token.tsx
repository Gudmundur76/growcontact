import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getPublicScreener, submitScreening } from "@/server/screening.functions";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/screen/$token")({
  head: () => ({ meta: [{ title: "Screening — Grow" }, { name: "robots", content: "noindex" }] }),
  component: PublicScreen,
});

function PublicScreen() {
  const { token } = Route.useParams();
  const fetchFn = useServerFn(getPublicScreener);
  const submitFn = useServerFn(submitScreening);
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-screener", token],
    queryFn: () => fetchFn({ data: { token } }),
    retry: false,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const m = useMutation({
    mutationFn: submitFn,
    onSuccess: () => setDone(true),
    onError: (e) => toast.error((e as Error).message),
  });

  function handleSubmit() {
    if (!name.trim()) return toast.error("Please enter your name");
    const questions = (data?.questions as { id: string; prompt: string }[]) ?? [];
    const payload = questions.map((q) => ({ questionId: q.id, answer: (answers[q.id] ?? "").trim() }));
    if (payload.some((a) => !a.answer)) return toast.error("Please answer every question");
    m.mutate({ data: { token, candidateName: name.trim(), candidateEmail: email.trim() || null, answers: payload } });
  }

  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-2xl">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <div className="liquid-glass rounded-2xl bg-card/40 p-8 text-center">
            <h1 className="text-xl font-semibold text-foreground">Screener unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p>
          </div>
        ) : done ? (
          <div className="liquid-glass rounded-2xl bg-card/40 p-10 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">Thanks, {name}!</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your responses were submitted. The team will be in touch.</p>
          </div>
        ) : data ? (
          <>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{data.role_title ?? "Screening"}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{data.name}</h1>
            {data.description ? <p className="mt-3 text-base text-muted-foreground">{data.description}</p> : null}

            <div className="mt-8 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="cn">Your name</Label><Input id="cn" value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="ce">Email (optional)</Label><Input id="ce" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              </div>
              {(data.questions as { id: string; prompt: string }[]).map((q, i) => (
                <div key={q.id} className="space-y-2">
                  <Label htmlFor={q.id}>{i + 1}. {q.prompt}</Label>
                  <Textarea
                    id={q.id}
                    rows={5}
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  />
                </div>
              ))}
              <Button variant="hero" className="w-full justify-center" onClick={handleSubmit} disabled={m.isPending}>
                {m.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit responses
              </Button>
              <p className="text-center text-xs text-muted-foreground">Powered by Grow</p>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
