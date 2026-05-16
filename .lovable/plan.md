# Close the gap with grow.contact

Three workstreams, executed in order. Each ships independently so you can preview as we go.

---

## 1. Marketing parity (small, fast)

Update the public site to match grow.contact copy and tiers.

- `/pricing` — three tiers exactly as advertised:
  - **Startup $499/mo** — up to 3 active roles, AI sourcing & async screening, Interview Copilot (5/mo), basic analytics, email support
  - **Growth $1,499/mo** — up to 15 roles, everything in Startup, unlimited Copilot, predictive analytics, ATS integrations, Slack, priority support (marked "Most popular")
  - **Enterprise — Custom** — unlimited roles, SSO/SAML, custom AI calibration, dedicated CSM, SLA, custom contracts
- Landing page stats strip: `3× faster time-to-hire · 60% recruiter cost saved · 94% screening accuracy · 12mo retention predicted`
- Landing customer logos: Vortex, Nimbus, Prysma, Cirrus, Kynder, Halcyn (marquee), plus testimonial section: Acme Corp, Velocity AI, Stackr, Meridian, Pluto HQ with the three quotes from the site.
- Add the **four-module solution section** (Sourcing / Async Screening / Interview Copilot / Predictive Analytics) with the marketing bullet points.

## 2. Async Screening module

New `/screening` area with end-to-end flow.

User stories:
- Recruiter creates a "screener" tied to a role (questions + rubric + format: text or video).
- Recruiter shares a public link `/screen/$token` with a candidate.
- Candidate answers without logging in (anonymous, token-gated).
- AI scores each response against the rubric and produces a summary + recommendation.
- Recruiter sees a ranked list of submissions per screener.

Tables (new):
- `screening_screeners` — per user_id: name, role_title, format (text|video), questions (jsonb), rubric (jsonb), share_token, expires_at
- `screening_submissions` — per screener_id: candidate_name, candidate_email, answers (jsonb), ai_score, ai_summary, ai_recommendation, status (pending|scored|reviewed), submitted_at
- All RLS scoped to `user_id` on screeners; submissions joined through screeners.

Server (TanStack server functions in `src/server/screening.functions.ts`):
- `createScreener`, `updateScreener`, `listScreeners`, `getScreener`
- Public `submitScreening({ token, candidate, answers })` (no auth, validates token)
- `scoreSubmission` — calls Lovable AI (`google/gemini-3-flash-preview`) with rubric + answers, stores structured result via tool calling
- `listSubmissions(screenerId)` ranked by ai_score

Routes:
- `/screening` (index — list screeners + create)
- `/screening/$id` (detail — questions, rubric, share link, ranked submissions)
- `/screen/$token` (public candidate form — text answers v1; video noted as v2)

Note: Video recording is heavier; v1 ships **text + code challenge formats**, with video as a follow-up so you have a working module today.

## 3. Predictive Analytics module

New `/analytics` dashboard with three forecasts.

Inputs we already have: `interview_sessions`, `interview_scorecards`, `sourcing_sends`, `sourcing_searches`. We'll seed predictions from these signals via Lovable AI.

Server function `getPredictiveAnalytics()`:
- **Time-to-hire forecast** per active role — based on session count, scorecard recommendations, outreach volume in last 30 days.
- **Offer-acceptance probability** per candidate with a scorecard — derived from scorecard rating, recommendation, role seniority.
- **12-month retention risk** per hire — from rubric coverage + competency scores.
- Implementation: a single AI call per panel with a JSON schema (tool calling), cached for 1h in a new `analytics_forecasts` table to avoid hammering the gateway.

Tables (new):
- `analytics_forecasts` — kind (time_to_hire|offer_acceptance|retention), entity_id, payload (jsonb), generated_at, expires_at

Routes:
- `/analytics` — three panels with forecast tiles, list of candidates per panel, "Refresh forecast" button (rate-limited to 1/hr per user).

## Execution order

1. Migration: `screening_screeners`, `screening_submissions`, `analytics_forecasts` (with RLS).
2. Marketing parity (Pricing + landing stats/logos/testimonials + four-module section).
3. Async Screening: server functions → recruiter UI → public candidate form → AI scoring.
4. Predictive Analytics: server function with cache → dashboard UI.
5. Verify each workstream in the preview before moving on.

## Out of scope (flagging now)

- Video screening capture (browser MediaRecorder + storage upload) — v2.
- ATS integrations (Greenhouse, Lever) — keep as marketing bullet, no code yet.
- Actually charging $499/$1,499 — pricing is display-only unless you want me to wire Stripe.
- SSO/SAML provisioning — Enterprise marketing only.
