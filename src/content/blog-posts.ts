export type PostCategory = "Essay" | "Benchmark" | "Product" | "Playbook";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: PostCategory;
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  featured?: boolean;
  /** Body in lightweight markdown-ish form: paragraphs separated by blank lines.
   *  Lines starting with "## " render as section headings. */
  body: string;
}

export const posts: BlogPost[] = [
  {
    slug: "end-of-the-resume-funnel",
    title: "The end of the resume funnel",
    excerpt:
      "Why we stopped optimizing for application volume and started optimizing for calibrated, time-bound shortlists — and what changed in our pipelines six months in.",
    category: "Essay",
    author: "Maya Okafor",
    authorRole: "Co-founder & CEO, Grow",
    date: "April 18, 2026",
    readTime: "9 min read",
    featured: true,
    body: `For fifteen years, the dominant metric in talent acquisition was applications-per-req. It was easy to count, easy to chart, and easy to brag about in a board deck. It was also, quietly, the wrong number.

The teams we work with — Series B through public-stage — have spent the last decade pouring money into the top of the funnel. Job boards. Programmatic ads. Recruiter outreach measured by InMails sent. The result was a pipeline that looked impressive on a dashboard and felt miserable to operate.

## What we measure now

Six months ago we cut applications-per-req from our internal scorecards entirely. We replaced it with one number: time-to-calibrated-shortlist. How long does it take, from req opened, until a hiring manager has five candidates they would genuinely move to onsite?

The shift was immediate. Sourcers stopped optimizing for volume and started optimizing for fit. Hiring managers stopped skimming and started reading. The average loop got shorter because the candidates entering it were better.

## The unlock is calibration

None of this works without a shared definition of "good." That's the boring part nobody wants to do. We make every hiring manager write a one-page rubric before the req opens — five behaviorally-anchored signals, each with a 1–5 scale and example evidence at every level.

It takes 45 minutes. It saves about 40 hours of misaligned interviews per req.

## What's next

We're convinced the resume funnel is a 20th-century artifact. The next decade of hiring belongs to teams that treat candidates like a high-trust, low-volume relationship — and treat calibration like the operating system it always should have been.`,
  },
  {
    slug: "q1-2026-hiring-benchmarks",
    title: "Q1 2026 hiring benchmarks: time-to-hire by stage",
    excerpt:
      "We analyzed 41,200 hires across 280 high-growth teams. Median time-to-hire dropped 22% YoY — but the variance between top and bottom quartile widened.",
    category: "Benchmark",
    author: "Grow Research",
    authorRole: "Data team, Grow",
    date: "April 9, 2026",
    readTime: "12 min read",
    body: `Every quarter we publish anonymized benchmarks from the teams running their hiring on Grow. This quarter's dataset: 41,200 hires across 280 companies, ranging from 25-person seed-stage teams to 4,000-person public companies.

## Headline numbers

Median time-to-hire across all roles: 28 days, down from 36 a year ago. The improvement is real, but it isn't evenly distributed. Top-quartile teams now close in 18 days. Bottom-quartile teams sit at 61.

The gap is widening, not closing. The teams that adopted structured calibration in 2024 have compounded their advantage; everyone else is still debating whether to standardize their loops.

## By function

Engineering hires move fastest at the top of the market — 22 days median for IC roles at top-quartile teams. GTM hires (sales, CS) trail at 31 days, dragged down mostly by panel scheduling rather than candidate quality.

Design and product remain the slowest functions, with median time-to-hire of 38 and 41 days respectively. The bottleneck in both cases is portfolio review: hiring managers want to see "more work" instead of running a calibrated exercise.

## What changed YoY

Two things. First, async screen-to-onsite conversion is up 14 points — teams are getting better at filtering before they spend panel time. Second, offer-acceptance rates are up across the board, which we attribute to faster, more transparent loops rather than higher comp.

## How to read this

If your numbers are below median, the lever is almost always calibration, not sourcing. We'll publish the full methodology and per-function breakdowns in next month's report.`,
  },
  {
    slug: "interview-copilot-real-time-scorecards",
    title: "Interview Copilot now drafts scorecards in real time",
    excerpt:
      "Our newest model writes structured, signal-anchored scorecards while the interview is still happening. Here's the shape of the system.",
    category: "Product",
    author: "Engineering at Grow",
    authorRole: "Platform team, Grow",
    date: "March 27, 2026",
    readTime: "6 min read",
    body: `The single most-skipped step in any interview loop is the scorecard. Interviewers run the conversation, intend to write it up after, and then a 1:1 runs long, lunch happens, and by the time they sit down they're reconstructing signal from memory.

We've shipped Interview Copilot v2 to fix this directly. While the interview is happening, Copilot listens (with consent), maps what it hears to the rubric the hiring manager defined for the req, and drafts a structured scorecard live.

## What it actually does

Copilot doesn't decide. It evidences. For each rubric signal, it surfaces the candidate's own words — verbatim quotes — that map to that signal, and proposes a rating with a confidence score.

The interviewer reviews, edits, and submits. The whole post-interview write-up takes about 90 seconds instead of 20 minutes.

## What we got wrong in v1

v1 tried to summarize. Interviewers hated it — summaries flatten nuance and quietly inject bias. v2 keeps the candidate's voice front and center, and reduces the model's job to retrieval and structured tagging.

## Privacy

Copilot only runs when both parties consent. Recordings are encrypted in transit and at rest, never used for model training, and deleted on a configurable schedule.`,
  },
  {
    slug: "vortex-14-engineers-47-days",
    title: "How Vortex hired 14 engineers in 47 days without an agency",
    excerpt:
      "A play-by-play of the sourcing strategy, calibration loop and offer cadence that took Vortex from Series A to fully staffed platform team.",
    category: "Playbook",
    author: "Liam Chen",
    authorRole: "Head of Talent, Grow",
    date: "March 14, 2026",
    readTime: "11 min read",
    body: `Vortex closed their Series A in January and needed to triple their platform team before the end of Q1. No retained search, no agency budget, one in-house recruiter. Here's exactly how they did it.

## Week 0: calibration

Before a single req went live, the engineering leadership spent two days writing rubrics. Five rubrics, one per role family. Each one was reviewed by an IC engineer at the target level to make sure the bar reflected real work, not aspirational hand-waving.

## Weeks 1–2: sourcing

The recruiter ran a single saved search in Sourcing AI per role family, with retention-aware ranking turned on. They reviewed 40 profiles per day and personally wrote the first message to every shortlist candidate. No automation on first touch.

Response rate landed at 38%, well above the 22% benchmark for their stage.

## Weeks 3–5: loops

Every loop was four stages, capped at four hours of candidate time total. Scorecards due within 24 hours, no exceptions. Hiring committee met twice a week and made decisions in the meeting — not async after.

## Weeks 6–7: offers

Offers went out within 48 hours of the final round. Comp bands were public to the candidate from the first call. Acceptance rate: 87%.

## What to copy

Calibration first. Personal first touch. Tight loops. Fast offers. None of it is novel — the discipline is the moat.`,
  },
  {
    slug: "calibrated-not-vibes-rubrics",
    title: "Calibrated, not vibes: writing rubrics that actually predict",
    excerpt:
      "A practical guide to behaviorally-anchored rating scales for technical and GTM roles, with templates from teams running them in production.",
    category: "Playbook",
    author: "Priya Raman",
    authorRole: "Calibration lead, Grow",
    date: "February 28, 2026",
    readTime: "14 min read",
    body: `Most interview rubrics are vibes with a number stapled to them. "Communication: 4/5." Compared to what? Anchored on what behavior? Predictive of what outcome?

A behaviorally-anchored rating scale (BARS) fixes this by defining, for each signal, what a 1, 3, and 5 actually look like in candidate behavior — with examples.

## The structure

For every role, pick five signals. No more. Five is the upper bound on what a panel can hold in working memory across a loop.

For each signal, write three anchors:

- **1 (Below bar):** A specific behavior you'd see from someone who can't do the job.
- **3 (At bar):** What "good enough to hire" looks like in evidence, not adjectives.
- **5 (Exceeds):** What you'd see from someone you'd build a team around.

Skip 2 and 4 — interviewers will interpolate.

## A worked example: senior backend engineer

Signal: "Designs systems under ambiguity."

- **1:** Asks for a fully specified problem. Cannot proceed without one.
- **3:** Names the two or three biggest unknowns, proposes a path that reduces them, and ships a defensible v1.
- **5:** Reframes the problem so the team realizes they were optimizing for the wrong outcome, then ships v1.

## What changes when you do this

Calibration meetings get shorter — there's less to argue about because the evidence is anchored. Inter-rater agreement goes up. And, most importantly, the rubric becomes a living document: when a hire works out (or doesn't), you go back and update the anchors.

## Templates

We maintain open-source BARS templates for the most common engineering, product, design and GTM roles. They're free to copy. Steal them, edit them, make them yours.`,
  },
  {
    slug: "retention-is-a-hiring-metric",
    title: "Retention is a hiring metric",
    excerpt:
      "Why we report 12-month retention on every hire — and how surfacing it inside the loop changed the calibration conversations leadership teams actually have.",
    category: "Essay",
    author: "Maya Okafor",
    authorRole: "Co-founder & CEO, Grow",
    date: "February 6, 2026",
    readTime: "8 min read",
    body: `Hiring teams are measured on the wrong end of the funnel. We obsess over offer-accept rate and time-to-hire, then go silent the moment someone signs. Whether that hire is still around — and thriving — at 12 months is treated as someone else's problem.

It isn't.

## The loop closes at 12 months

A hire is not "done" at start date. A hire is done when we know whether the calibration that produced them was right. That answer arrives somewhere between month 6 and month 12, and if you're not reading it, you're not learning.

## What we ship

Every Grow customer gets a retention column on every pipeline view. For every hire, we surface 12-month retention probability based on the rubric scores, the loop composition and the role context.

It's not a verdict. It's a prompt — a reason to ask, "did the signals we trusted actually predict?"

## What changes

The leadership conversations get more honest. "We hired six PMs last year and three are gone" stops being a quiet HR data point and starts being a calibration discussion. The rubrics get sharper. The loops get tighter. The next cohort is better.

Retention is a hiring metric. We report it because we believe what gets measured gets calibrated.`,
  },
  {
    slug: "ats-is-not-a-strategy",
    title: "Your ATS is not a hiring strategy",
    excerpt:
      "Applicant tracking systems were built to be systems of record, not systems of decision. Here's where the boundary should sit — and what belongs above it.",
    category: "Essay",
    author: "Daniel Reyes",
    authorRole: "Head of Talent Ops, Grow",
    date: "January 22, 2026",
    readTime: "7 min read",
    body: `Every few years, a hiring leader walks into a vendor evaluation convinced that the next ATS will fix the problem. It won't. Not because the ATS is bad — most of them are fine — but because the ATS was never the layer where the problem lives.

## What an ATS is for

An ATS is a system of record. It stores candidates, statuses, stages, dispositions and audit trails. It is excellent at compliance and reporting and middling at everything else, which is exactly the right scope for a system of record.

## What an ATS is not for

Calibration. Sourcing prioritization. Interviewer enablement. Loop design. Offer modeling. None of these belong in a system of record — they belong in a system of decision that sits above the ATS and writes back to it.

## The pattern that works

Treat the ATS as the durable layer. Treat the talent operating system as the live layer. Read from the ATS for state. Write back to it for compliance. Keep the daily work — the calibration meetings, the panel scorecards, the sourcing reviews — in a tool that was built for it.

The teams that get this right stop arguing about ATSes entirely. The ATS becomes plumbing. The work happens above it.`,
  },
  {
    slug: "remote-loops-that-actually-work",
    title: "Designing remote interview loops that actually predict",
    excerpt:
      "Five anti-patterns we see in remote-first interview loops, and the structural fixes that took our customers' offer-acceptance rates from 61% to 84%.",
    category: "Playbook",
    author: "Priya Raman",
    authorRole: "Calibration lead, Grow",
    date: "January 9, 2026",
    readTime: "10 min read",
    body: `Remote loops fail in predictable ways. Here are the five we see most often, and the fixes that move the numbers.

## 1. The marathon onsite

A six-hour back-to-back over Zoom is not an onsite. It is a stress test of bandwidth and bladder capacity. Cap candidate time at four hours, split across two days if you must.

## 2. The silent panel

Remote panels go quiet between rounds. Interviewers forget to debrief, then write scorecards in isolation. Build a 15-minute synchronous debrief into the loop calendar. Non-negotiable.

## 3. The vague take-home

"Build something interesting" is not a brief. Specify the problem, the time budget, and the rubric the work will be scored against. Pay for the candidate's time when the budget exceeds two hours.

## 4. The mystery interviewer

Candidates show up to a Zoom with someone whose name they Googled in the elevator. Send a one-paragraph bio of every interviewer 24 hours before. It costs nothing and signals competence.

## 5. The drifting offer

Remote teams take longer to align on offers because the hallway conversation doesn't exist. Pre-commit comp bands and decision authority before the loop starts. Cut offer turnaround from 5 days to 48 hours.

## What it adds up to

These aren't novel. They're the boring discipline that distinguishes loops that predict from loops that perform. Fix all five and offer-accept rates climb 15-20 points.`,
  },
  {
    slug: "sourcing-ai-retention-aware-ranking",
    title: "Inside Sourcing AI: how retention-aware ranking works",
    excerpt:
      "A look at the model architecture behind our retention-aware ranker — what signals it uses, what it deliberately ignores, and why fairness audits ship with every release.",
    category: "Product",
    author: "Engineering at Grow",
    authorRole: "Platform team, Grow",
    date: "December 12, 2025",
    readTime: "8 min read",
    body: `Most sourcing tools rank candidates on relevance — how closely a profile matches a job description. Relevance is a useful signal. It is also an incomplete one.

## Why we rank on retention

The cost of a bad hire isn't the failed interview loop. It's the 9-month tenure that ends in a backfill and a damaged team. So we rank on the signal that actually matters to the customer: the probability that, conditional on hire, this candidate is still in the role and performing at month 12.

## What the model uses

Public, role-relevant signals only: career trajectory, tenure patterns, skill graph proximity, and explicit candidate preferences when available. Every input is documented and inspectable inside the product.

## What the model ignores

Demographic proxies. Names. Photos. School prestige. Anything that an audit would flag as a fairness risk gets stripped from the input layer before scoring. The model has never seen these features and cannot use them.

## How we audit

Every release ships with a fairness report: outcome rates by gender, ethnicity, age band and disability status across the eval set. If any cell drifts more than 3 points, the release is held until we understand why.

## What's next

We're publishing the eval methodology this quarter so customers and external researchers can reproduce it. Trustworthy AI in hiring isn't a marketing claim — it's a public method.`,
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}
