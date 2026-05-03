# Dark Hero Landing Page

Build a dark-themed landing page with a hero section, looping background video, and brand marquee, following the exact spec provided.

## Setup
- Install `@fontsource/geist-sans` (weights 400/500/600/700 imported in `src/styles.css`).
- Add a placeholder `src/assets/logo.png` (simple generated mark) for the navbar.

## Theme & Tokens (`src/styles.css`)
- Replace current oklch tokens with the HSL spec provided (background, foreground, card, primary purple `262 83% 58%`, etc.).
- Add `--hero-heading` and `--hero-sub` tokens.
- Map all tokens through `@theme inline` so Tailwind v4 utilities (`bg-background`, `text-hero-sub`, etc.) work.
- Add `text-hero-heading` / `text-hero-sub` color utilities.
- Add `@layer utilities` `.liquid-glass` class with the gradient border `::before` pseudo-element exactly as specified.
- Define `@keyframes marquee` (0% → -50% translateX) and `animate-marquee` 20s linear infinite via `@theme` animation extension.
- Set body font stack to `'Geist Sans', 'Inter', system-ui, sans-serif`.

Note: project uses Tailwind v4 (CSS-first, no `tailwind.config.ts`). Color groups + animation will be registered via `@theme` in `styles.css` — equivalent to the requested config.

## Button Variants (`src/components/ui/button.tsx`)
Add to existing CVA variants:
- `hero`: solid primary, rounded-full, px-6 py-3.
- `heroSecondary`: `liquid-glass` + rounded-full + hover bg-white/5.

## Components
- `src/components/landing/Navbar.tsx` — logo (left), centered nav buttons (Features ▾, Solutions, Plans, Learning ▾) using lucide `ChevronDown`, Sign Up button (heroSecondary, sm). Followed by a 1px gradient divider.
- `src/components/landing/HeroSection.tsx` — wraps Navbar + centered content. Headline "Grow" at 230px with the specified linear-gradient text fill, subtext two lines, CTA "Schedule a Consult" (heroSecondary, custom padding).
- `src/components/landing/SocialProofSection.tsx` — full-width section with:
  - `<video>` autoplay/muted/playsInline, absolute cover, starts at `opacity: 0`.
  - rAF loop reading `currentTime`/`duration` to fade in over first 0.5s and fade out over last 0.5s.
  - `onEnded` → opacity 0 → 100ms timeout → reset `currentTime=0` and `play()`.
  - Top/bottom gradient overlays from `background`.
  - Content layer: 40-height spacer, then marquee row at `max-w-5xl` with left label "Relied on by brands / across the globe" and right side scrolling logos (Vortex, Nimbus, Prysma, Cirrus, Kynder, Halcyn — duplicated). Each logo = 24px liquid-glass square with first letter + brand name.

## Page (`src/routes/index.tsx`)
Replace the placeholder with:
```tsx
<>
  <HeroSection />
  <SocialProofSection />
</>
```
Update route `head()` title/description to match the landing page.

## Technical Notes
- Tailwind v4 has no `tailwind.config.ts` in this project; the requested keyframes, color groups, and animations are added in `styles.css` via `@theme` + `@keyframes` (functionally identical).
- General Sans isn't in @fontsource bundle requested; the headline will declare `'General Sans', sans-serif` in inline style as specified — falls back to Geist/system if unavailable. (Can add via CDN if you want guaranteed loading — let me know.)
- Video fade loop uses a single rAF tied to component lifecycle, cleaned up on unmount.
