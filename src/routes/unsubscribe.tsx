import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({
    meta: [{ title: "Unsubscribe — Grow" }, { name: "robots", content: "noindex" }],
  }),
  component: UnsubscribePage,
});

type Status = "loading" | "valid" | "already" | "invalid" | "submitting" | "success" | "error";

function UnsubscribePage() {
  const [status, setStatus] = useState<Status>("loading");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) {
      setStatus("invalid");
      return;
    }
    setToken(t);
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) setStatus("valid");
        else if (data.reason === "already_unsubscribed") setStatus("already");
        else setStatus("invalid");
      })
      .catch(() => setStatus("invalid"));
  }, []);

  const confirm = async () => {
    if (!token) return;
    setStatus("submitting");
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) setStatus("success");
      else if (data.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Navbar />
      <main className="mx-auto flex max-w-xl flex-col items-start px-6 pb-32 pt-32">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Email preferences
        </div>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {status === "success" || status === "already"
            ? "You're unsubscribed."
            : "Unsubscribe from Grow emails."}
        </h1>

        <div className="mt-8 w-full rounded-3xl border border-white/5 bg-card/40 p-8 backdrop-blur-xl">
          {status === "loading" && <p className="text-muted-foreground">Checking your link…</p>}
          {status === "valid" && (
            <>
              <p className="text-muted-foreground">
                Click below to confirm and stop receiving emails from Grow.
              </p>
              <Button variant="hero" className="mt-6 rounded-full" onClick={confirm}>
                Confirm unsubscribe
              </Button>
            </>
          )}
          {status === "submitting" && <p className="text-muted-foreground">Processing…</p>}
          {status === "success" && (
            <p className="text-muted-foreground">
              You won't receive any more emails from Grow at this address.
            </p>
          )}
          {status === "already" && (
            <p className="text-muted-foreground">This address is already unsubscribed.</p>
          )}
          {status === "invalid" && (
            <p className="text-muted-foreground">
              This link is invalid or has expired. If you keep receiving emails, contact
              support@grow.example.
            </p>
          )}
          {status === "error" && (
            <p className="text-muted-foreground">
              Something went wrong. Please try again in a minute.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
