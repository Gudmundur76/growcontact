import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type Card = {
  summary: string;
  overall_rating: number | null;
  recommendation: string | null;
  strengths: unknown;
  concerns: unknown;
  competencies: unknown;
  follow_ups: unknown;
};
type Payload = {
  candidate_name: string;
  role_title: string;
  ended_at: string | null;
  scorecard: Card;
};

export const Route = createFileRoute("/share/scorecard/$token")({
  head: () => ({
    meta: [
      { title: "Interview scorecard — Grow" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharedScorecard,
});

function asArray(x: unknown): string[] {
  return Array.isArray(x) ? x.map((v) => String(v)) : [];
}
function asCompetencies(x: unknown): { name: string; rating: number; notes: string }[] {
  if (!Array.isArray(x)) return [];
  return x
    .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : null))
    .filter((c): c is Record<string, unknown> => !!c)
    .map((c) => ({
      name: String(c.name ?? ""),
      rating: Number(c.rating ?? 0),
      notes: String(c.notes ?? ""),
    }));
}

function SharedScorecard() {
  const { token } = Route.useParams();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/scorecard/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token]);

  if (error)
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto max-w-2xl px-4 pt-32 text-center">
          <h1 className="text-2xl font-medium">This scorecard isn't available</h1>
          <p className="mt-2 text-muted-foreground">
            The link may have been revoked or the scorecard hasn't been generated yet.
          </p>
        </main>
      </div>
    );
  if (!data)
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto max-w-2xl px-4 pt-32 text-muted-foreground">
          Loading…
        </main>
      </div>
    );

  const card = data.scorecard;
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 pb-24 pt-20">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Interview scorecard
        </div>
        <h1 className="mt-2 text-4xl font-medium tracking-tight">{data.candidate_name}</h1>
        <p className="text-muted-foreground">{data.role_title}</p>
        {data.ended_at && (
          <p className="mt-1 text-xs text-muted-foreground">
            Interviewed {new Date(data.ended_at).toLocaleDateString()}
          </p>
        )}
        <div className="mt-4 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Print / Save as PDF
          </Button>
        </div>

        <section className="mt-8 rounded-xl border bg-card p-6">
          <div className="grid gap-6 md:grid-cols-[200px_1fr]">
            <div>
              <div className="text-5xl font-semibold">{card.overall_rating ?? "—"}/5</div>
              <div className="mt-1 text-sm capitalize text-muted-foreground">
                {(card.recommendation ?? "").replace(/_/g, " ")}
              </div>
            </div>
            <p className="text-sm leading-relaxed">{card.summary}</p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-sm font-semibold">Strengths</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {asArray(card.strengths).map((s, i) => (
                <li key={i}>· {s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-sm font-semibold">Concerns</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {asArray(card.concerns).map((s, i) => (
                <li key={i}>· {s}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-card p-6">
          <h2 className="text-sm font-semibold">Competencies</h2>
          <ul className="mt-2 divide-y rounded-md border">
            {asCompetencies(card.competencies).map((c, i) => (
              <li key={i} className="flex items-start justify-between gap-4 p-3">
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.notes}</div>
                </div>
                <div className="text-sm font-semibold">{c.rating}/5</div>
              </li>
            ))}
          </ul>
        </section>

        {asArray(card.follow_ups).length > 0 && (
          <section className="mt-6 rounded-xl border bg-card p-6">
            <h2 className="text-sm font-semibold">Follow-up questions</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {asArray(card.follow_ups).map((s, i) => (
                <li key={i}>· {s}</li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-12 text-center text-xs text-muted-foreground">
          Generated by Grow Interview Copilot
        </p>
      </main>
      <Footer />
    </div>
  );
}