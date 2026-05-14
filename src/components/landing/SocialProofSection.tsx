import { useEffect, useRef } from "react";

const brands = ["Vortex", "Nimbus", "Prysma", "Cirrus", "Kynder", "Halcyn"];

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260308_114720_3dabeb9e-2c39-4907-b747-bc3544e2d5b7.mp4";

const FADE = 0.5;

export function SocialProofSection() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let raf = 0;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      const d = video.duration;
      const t = video.currentTime;
      if (d && Number.isFinite(d)) {
        let opacity = 1;
        if (t < FADE) opacity = t / FADE;
        else if (t > d - FADE) opacity = Math.max(0, (d - t) / FADE);
        video.style.opacity = String(Math.max(0, Math.min(1, opacity)));
      }
      raf = requestAnimationFrame(tick);
    };

    const handleEnded = () => {
      video.style.opacity = "0";
      resetTimer = setTimeout(() => {
        video.currentTime = 0;
        void video.play();
      }, 100);
    };

    video.addEventListener("ended", handleEnded);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (resetTimer) clearTimeout(resetTimer);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  const logoRow = (
    <div className="flex items-center gap-16 shrink-0 pr-16">
      {brands.map((brand) => (
        <div key={brand} className="flex items-center gap-3 shrink-0">
          <div className="liquid-glass w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-semibold text-foreground">
            {brand.charAt(0)}
          </div>
          <span className="text-base font-semibold text-foreground whitespace-nowrap">{brand}</span>
        </div>
      ))}
    </div>
  );

  return (
    <section className="relative w-full overflow-hidden bg-background">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        src={VIDEO_URL}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0 }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      <div className="relative z-10 flex flex-col items-center pt-16 pb-24 px-4 gap-20">
        <div className="h-40" />
        <div className="w-full max-w-5xl flex items-center gap-8">
          <p className="text-foreground/50 text-sm whitespace-nowrap shrink-0">
            Relied on by brands
            <br />
            across the globe
          </p>
          <div className="flex-1 overflow-hidden relative">
            <div className="flex w-max animate-marquee">
              {logoRow}
              {logoRow}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
