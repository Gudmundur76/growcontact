import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Grow" },
      {
        name: "description",
        content: "The terms governing use of Grow's talent operating system, APIs and AI features.",
      },
      { property: "og:title", content: "Terms of Service — Grow" },
      {
        property: "og:description",
        content: "The agreement between Grow Labs, Inc. and customers using the Grow platform.",
      },
    ],
  }),
  component: TermsPage,
});

const sections = [
  {
    title: "1. The agreement",
    body: "These Terms govern your use of the Grow platform, APIs, model endpoints and any related services (the “Service”). By signing an order form or clicking to accept, you agree on behalf of your organization (the “Customer”) to be bound by them.",
  },
  {
    title: "2. Your account",
    body: "You are responsible for keeping credentials secure, for the actions of your authorized users, and for ensuring that the data you upload to Grow may lawfully be processed by us as described in our Privacy Policy and DPA.",
  },
  {
    title: "3. Acceptable use",
    body: "Don't use Grow to discriminate against protected classes, to violate candidate rights under applicable employment law, to circumvent platform rate limits, or to reverse engineer model weights. We reserve the right to suspend access for material breach.",
  },
  {
    title: "4. AI outputs",
    body: "Generative outputs are tools, not decisions. Customer remains the controller of all hiring decisions made on its behalf and is responsible for human review of model-generated content (sourcing messages, scorecards, summaries) before acting on it.",
  },
  {
    title: "5. Fees & taxes",
    body: "Fees are set in your order form, billed in advance, and non-refundable except as required by law. Customer is responsible for applicable taxes other than taxes on Grow's net income.",
  },
  {
    title: "6. Term & termination",
    body: "The agreement runs for the period stated in your order form and renews automatically unless either party gives notice 30 days before renewal. Either party may terminate for material, uncured breach with 30 days' written notice.",
  },
  {
    title: "7. Warranty disclaimer & liability",
    body: "Except as expressly stated in your order form, the Service is provided “as is.” To the maximum extent permitted by law, neither party's aggregate liability exceeds the fees paid in the 12 months preceding the claim.",
  },
  {
    title: "8. Governing law",
    body: "These Terms are governed by the laws of the State of Delaware, without regard to conflicts of law principles. Disputes are subject to the exclusive jurisdiction of the state and federal courts located in Wilmington, Delaware.",
  },
];

function TermsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-32 pt-32">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Legal</div>
        <h1 className="mt-4 text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated April 1, 2026</p>
        <p className="mt-8 text-lg text-muted-foreground">
          The standard agreement between Grow Labs, Inc. and customers using the Grow platform. For
          negotiated enterprise terms, talk to your Grow account team.
        </p>

        <div className="mt-16 space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-semibold text-foreground">{s.title}</h2>
              <p className="mt-3 text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
