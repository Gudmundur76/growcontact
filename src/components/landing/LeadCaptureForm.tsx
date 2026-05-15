import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, "Name must be under 100 characters")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(255, "Email must be under 255 characters"),
});

interface LeadCaptureFormProps {
  source?: string;
  className?: string;
}

export function LeadCaptureForm({ source = "landing", className }: LeadCaptureFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = leadSchema.safeParse({ name, email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("leads").insert({
        email: parsed.data.email,
        name: parsed.data.name ? parsed.data.name : null,
        source,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      });
      if (error) throw error;
      setSubmitted(true);
      setName("");
      setEmail("");
      toast.success("You're on the list — we'll be in touch.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit, try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        className={`mx-auto flex max-w-lg items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-300 ${className ?? ""}`}
      >
        <CheckCircle2 className="h-4 w-4" />
        Thanks — we'll reach out shortly.
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`mx-auto flex w-full max-w-lg flex-col gap-2 sm:flex-row ${className ?? ""}`}
    >
      <Input
        type="text"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name (optional)"
        maxLength={100}
        className="sm:max-w-[40%]"
        disabled={submitting}
      />
      <Input
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        maxLength={255}
        disabled={submitting}
      />
      <Button type="submit" variant="hero" disabled={submitting} className="shrink-0">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get early access"}
      </Button>
    </form>
  );
}