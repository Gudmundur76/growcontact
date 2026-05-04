import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { PricingSection } from "@/components/landing/PricingSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Grow" },
      {
        name: "description",
        content:
          "Transparent monthly pricing for Grow's talent operating system. Starter, Growth, and Scale plans. No per-hire fees.",
      },
      { property: "og:title", content: "Pricing — Grow" },
      {
        property: "og:description",
        content:
          "Replace a senior recruiter for a fraction of the cost. See Grow's plans.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <>
      <Navbar />
      <PricingSection />
      <CtaSection />
      <Footer />
    </>
  );
}