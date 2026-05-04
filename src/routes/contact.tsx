import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Grow" },
      {
        name: "description",
        content:
          "Get in touch with Grow — sales, support, partnerships and press.",
      },
      { property: "og:title", content: "Contact — Grow" },
      {
        property: "og:description",
        content:
          "Talk to a Grow specialist about hiring at scale, integrations or partnerships.",
      },
    ],
  }),
  component: ContactPage,
});

const channels = [
  {
    title: "Sales",
    body: "Talk to a Grow specialist about pricing, security and rollouts for teams of 50+.",
    contact: "sales@grow.example",
  },
  {
    title: "Support",
    body: "Existing customers — open a ticket from inside the app or email us directly.",
    contact: "support@grow.example",
  },
  {
    title: "Partnerships",
    body: "ATS, payroll and assessment partners — co-build with the Grow platform team.",
    contact: "partners@grow.example",
  },
  {
    title: "Press",
    body: "Story tips, briefings and analyst inquiries.",
    contact: "press@grow.example",
  },
];

const offices = [
  { city: "San Francisco", address: "548 Market St, Suite 41207" },
  { city: "New York", address: "228 Park Ave S, PMB 71290" },
  { city: "London", address: "1 Finsbury Ave, EC2M 2PF" },
];

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  team_size: z.string().trim().max(50).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(1, "Please add a short message")
    .max(5000, "Message is too long"),
});

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const raw = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      company: String(formData.get("company") ?? ""),
      team_size: String(formData.get("size") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    const parsed = contactSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }
    } catch (err) {
      console.error("contact submit error", err);
      setSubmitting(false);
      toast.error("Could not send your message. Please try again.");
      return;
    }
    setSubmitting(false);

    toast.success("Message sent — we'll be in touch shortly.");
    setSubmitted(true);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pb-32 pt-32">
        <header className="max-w-2xl">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Contact
          </div>
          <h1 className="mt-4 text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Talk to the team building the talent OS.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Whether you're hiring your tenth engineer or your thousandth, we'll
            help you figure out if Grow is the right fit — usually inside 48 hours.
          </p>
        </header>

        <div className="mt-20 grid gap-12 lg:grid-cols-[1.1fr_1fr]">
          <form
            onSubmit={onSubmit}
            className="rounded-3xl border border-white/5 bg-card/40 p-8 backdrop-blur-xl"
          >
            {submitted ? (
              <div className="flex h-full flex-col items-start justify-center gap-3">
                <div className="text-2xl font-semibold text-foreground">
                  Message sent.
                </div>
                <p className="text-muted-foreground">
                  A Grow specialist will reach out within one business day.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" required placeholder="Alex Chen" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Work email</Label>
                    <Input id="email" type="email" required placeholder="alex@company.com" />
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" placeholder="Acme Inc." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="size">Team size</Label>
                    <Input id="size" placeholder="50–200" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">What can we help with?</Label>
                  <Textarea id="message" rows={5} placeholder="A few sentences about your hiring goals…" />
                </div>
                <Button
                  type="submit"
                  variant="hero"
                  className="rounded-full"
                  disabled={submitting}
                >
                  {submitting ? "Sending…" : "Send message"}
                </Button>
              </div>
            )}
          </form>

          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {channels.map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-white/5 bg-card/30 p-5 backdrop-blur-xl"
                >
                  <div className="text-sm font-semibold text-foreground">{c.title}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
                  <a
                    href={`mailto:${c.contact}`}
                    className="mt-3 inline-block text-sm text-foreground underline-offset-4 hover:underline"
                  >
                    {c.contact}
                  </a>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/5 bg-card/30 p-6 backdrop-blur-xl">
              <div className="text-sm font-semibold text-foreground">Offices</div>
              <ul className="mt-4 space-y-3">
                {offices.map((o) => (
                  <li key={o.city} className="flex items-baseline justify-between gap-6 text-sm">
                    <span className="text-foreground">{o.city}</span>
                    <span className="text-right text-muted-foreground">{o.address}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}