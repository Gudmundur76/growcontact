import { Button } from "@/components/ui/button";
import { Navbar } from "./Navbar";

export function HeroSection() {
  return (
    <section className="bg-background relative overflow-hidden">
      <Navbar />
      <div className="flex flex-col items-center pt-20 px-4 text-center">
        <h1
          className="font-normal bg-clip-text text-transparent"
          style={{
            fontSize: "clamp(80px, 18vw, 230px)",
            lineHeight: 1.02,
            letterSpacing: "-0.024em",
            fontFamily: "'General Sans', 'Geist Sans', sans-serif",
            backgroundImage: "linear-gradient(223deg, #E8E8E9 0%, #3A7BBF 104.15%)",
          }}
        >
          Grow
        </h1>
        <p className="text-hero-sub text-center text-lg leading-8 max-w-md mt-4 opacity-80">
          The most powerful AI ever deployed
          <br />
          in talent acquisition
        </p>
        <div className="mt-8 mb-[66px]">
          <Button
            variant="heroSecondary"
            className="rounded-full"
            style={{ padding: "24px 29px" }}
          >
            Schedule a Consult
          </Button>
        </div>
      </div>
    </section>
  );
}