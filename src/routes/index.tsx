import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsStrip } from "@/components/landing/StatsStrip";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Grow — The talent operating system for high-growth teams",
      },
      {
        name: "description",
        content:
          "Source, screen, interview and hire your next 10 people from one calibrated AI platform. 14-day free trial, no credit card.",
      },
      {
        property: "og:title",
        content: "Grow — The talent operating system",
      },
      {
        property: "og:description",
        content: "Source, screen, interview and hire from one calibrated AI platform.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <StatsStrip />
      <SocialProofSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <CtaSection />
      <Footer />
    </>
  );
}
