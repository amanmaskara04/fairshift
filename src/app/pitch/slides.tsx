import type { ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  BadgeCheck,
  Bot,
  Bug,
  Building2,
  ClipboardList,
  Cpu,
  FileText,
  Fingerprint,
  Gauge,
  HardHat,
  Languages,
  Lightbulb,
  Lock,
  Mic,
  QrCode,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TestTube2,
  UserRound,
  WifiOff,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Arrow, Flow, Node } from "./flow";

export interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  body: ReactNode;
}

const REPO = "https://github.com/amanmaskara04/fairshift";

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-worker border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-admin bg-accent text-accent-foreground">{icon}</span>
        <h3 className="font-display text-lg leading-tight font-extrabold">{title}</h3>
      </div>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col border-l-4 border-accent pl-3">
      <span className="figure text-4xl font-semibold md:text-5xl">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function Prompt({ children }: { children: ReactNode }) {
  return <li className="rounded-admin border border-border bg-card px-3 py-2 text-sm leading-snug italic">“{children}”</li>;
}

export const SLIDES: Slide[] = [
  {
    id: "title",
    eyebrow: "Prompt Wars 2026 × ACM SRMIST · UN SDG 8",
    title: "Fair work. Fair pay. Your voice.",
    body: (
      <div className="flex flex-col gap-8">
        <BrandMark className="text-4xl md:text-5xl" />
        <p className="max-w-3xl text-xl md:text-2xl">
          A voice-first, multilingual app that gives shift workers proof of their hours, a payslip they can hear, and a safe way to report danger — and gives
          employers an early warning before people get hurt or quit.
        </p>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat value="4" label="languages, read aloud" />
          <Stat value="2+" label="industries, one codebase" />
          <Stat value="141" label="automated tests" />
          <Stat value="0" label="accessibility violations" />
        </div>
      </div>
    ),
  },
  {
    id: "problem",
    eyebrow: "The problem",
    title: "“Ramesh worked 4 hours of overtime last week. Nobody wrote it down.”",
    body: (
      <div className="grid gap-4 md:grid-cols-2">
        <Card icon={<Scale className="size-5" />} title="Opaque pay">
          Paper registers and WhatsApp groups. Overtime goes uncounted; the payslip is unreadable.
        </Card>
        <Card icon={<Fingerprint className="size-5" />} title="Fear of being identified">
          Workers stay silent about bad supervisors or conditions because complaints can be traced back.
        </Card>
        <Card icon={<HardHat className="size-5" />} title="Unreported hazards">
          A shaking scaffold or exposed wire is ignored until someone is injured.
        </Card>
        <Card icon={<ClipboardList className="size-5" />} title="Lost career history">
          No record of skills, so every new job starts from zero. Employers can&apos;t see who is overworked or about to quit.
        </Card>
      </div>
    ),
  },
  {
    id: "users",
    eyebrow: "Who it is for",
    title: "Four users, one platform",
    body: (
      <div className="grid gap-4 md:grid-cols-2">
        <Card icon={<UserRound className="size-5" />} title="Shift worker">
          Mason, ward attendant, cleaner. Budget Android, patchy data, may not read well, speaks Tamil, Hindi or Telugu.
        </Card>
        <Card icon={<Building2 className="size-5" />} title="Site manager">
          Needs to see who is on site, who is exhausted, which hazards are open, and export payroll.
        </Card>
        <Card icon={<QrCode className="size-5" />} title="Gate kiosk">
          A spare phone at the gate shows a QR code that changes every 30 seconds — photos of it stop working.
        </Card>
        <Card icon={<BadgeCheck className="size-5" />} title="Next employer">
          Opens a signed link to verify a worker&apos;s skills — and nothing else about them.
        </Card>
      </div>
    ),
  },
  {
    id: "thinking",
    eyebrow: "How I approached it",
    title: "From the brief to a solution",
    body: (
      <div className="flex flex-col gap-6">
        <Flow
          steps={[
            <Node key="1">Read the brief + rubric line by line</Node>,
            <Node key="2">Studied past Prompt Wars winners</Node>,
            <Node key="3" tone="accent">
              Designed for Ramesh&apos;s ₹6,000 phone
            </Node>,
            <Node key="4">Smallest feature set that hits every rubric row</Node>,
            <Node key="5" tone="brand">
              Tests + security from day one
            </Node>,
          ]}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Card icon={<Lightbulb className="size-5" />} title="Insight from winners">
            Top projects were judged on code quality, security, efficiency, testing, accessibility and alignment — not just features.
          </Card>
          <Card icon={<Cpu className="size-5" />} title="The core idea">
            Let the AI <em>understand</em> messy speech; let tested code <em>compute</em> every rupee and hour.
          </Card>
          <Card icon={<Smartphone className="size-5" />} title="Hard constraints">
            Low literacy, regional languages, 3G, cheap phones — so voice, icons, offline and tiny pages.
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: "flow",
    eyebrow: "User flow",
    title: "A worker's day, and what the manager sees",
    body: (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Worker</p>
          <Flow
            steps={[
              <Node key="a">Pick language (own script)</Node>,
              <Node key="b">Code + PIN keypad</Node>,
              <Node key="c" tone="accent">
                Home: today&apos;s hours
              </Node>,
              <Node key="d">Scan gate QR (works offline)</Node>,
              <Node key="e">Speak a hazard / hear payslip / speak up</Node>,
            ]}
          />
        </div>
        <div className="flex justify-center">
          <Arrow vertical label="MongoDB · real time" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Manager</p>
          <Flow
            steps={[
              <Node key="f" tone="ink">
                Needs attention
              </Node>,
              <Node key="g">Hazard board → Start work → Fixed</Node>,
              <Node key="h" tone="brand">
                Worker sees the update
              </Node>,
              <Node key="i">Fatigue + quit-risk reasons</Node>,
              <Node key="j">Payroll CSV</Node>,
            ]}
          />
        </div>
      </div>
    ),
  },
  {
    id: "architecture",
    eyebrow: "Architecture",
    title: "The AI understands. The code computes.",
    body: (
      <div className="flex flex-col gap-4">
        <Flow
          steps={[
            <Node key="1">
              Worker phone · PWA
              <span className="block text-xs font-normal">offline queue · service worker</span>
            </Node>,
            <Node key="2" tone="ink">
              proxy.ts
              <span className="block text-xs font-normal">nonce CSP · auth</span>
            </Node>,
            <Node key="3">
              Server Actions
              <span className="block text-xs font-normal">roles · Zod · rate limits</span>
            </Node>,
            <Node key="4" tone="brand">
              Google Cloud Run
              <span className="block text-xs font-normal">Next.js 16 · Mumbai</span>
            </Node>,
          ]}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <Node tone="accent">
            core/ — pure TypeScript
            <span className="block text-xs font-normal">IST time · 2× overtime · payslip · fatigue · quit risk · QR · k-anonymity</span>
          </Node>
          <Node>
            ai/ — Gemini 3.5 Flash-Lite
            <span className="block text-xs font-normal">speech → JSON · reword pay · weekly brief · fallbacks</span>
          </Node>
          <Node>
            repos/ — one interface
            <span className="block text-xs font-normal">MongoDB Atlas (Mumbai) · in-memory seed for tests</span>
          </Node>
        </div>
        <p className="text-muted-foreground">
          Gemini never produces a number. If it is down, a keyword classifier and template text take over — the demo cannot break.
        </p>
      </div>
    ),
  },
  {
    id: "novelty",
    eyebrow: "Why FairShift stands out",
    title: "Six things nobody else ships together",
    body: (
      <div className="grid gap-4 md:grid-cols-3">
        <Card icon={<Mic className="size-5" />} title="Speak, don't type">
          Report danger in Tamil, Hindi or Telugu. Gemini turns speech into a structured report the worker confirms.
        </Card>
        <Card icon={<Scale className="size-5" />} title="Numbers you can trust">
          Pay is computed by tested code. AI rewording is rejected if a single number changes.
        </Card>
        <Card icon={<Lock className="size-5" />} title="Anonymous by design">
          No worker id stored on feedback, day-level timestamps, names redacted, groups of 5+ only.
        </Card>
        <Card icon={<WifiOff className="size-5" />} title="Works offline">
          Check-ins queue on the phone and sync later, without duplicates.
        </Card>
        <Card icon={<Sparkles className="size-5" />} title="Explainable alerts">
          Every quit-risk score shows its reasons — a prompt to talk, not a black box.
        </Card>
        <Card icon={<Languages className="size-5" />} title="Built for real phones">
          Read-aloud on every screen, 48 px targets, menus two levels deep, tiny pages.
        </Card>
      </div>
    ),
  },
  {
    id: "demo",
    eyebrow: "Live demo",
    title: "Try it right here",
    body: (
      <div className="grid items-start gap-6 md:grid-cols-[320px_1fr]">
        <div className="mx-auto w-[300px] rounded-[2.2rem] border-[10px] border-foreground bg-foreground shadow-xl">
          <iframe src="/login" title="Worker app demo" className="h-[560px] w-full rounded-[1.5rem] bg-background" loading="lazy" />
        </div>
        <div className="flex flex-col gap-4">
          <ol className="flex flex-col gap-3">
            {[
              "Tap “Ramesh” → Home shows today's hours and a rest warning.",
              "Check in → “Demo: scan site QR” → ✓ checked in.",
              "My pay → hear the payslip, tap “Why this amount?”.",
              "Report danger → tap an icon → Send. It lands on the manager board.",
              "Log in as Priya in another tab → Hazards → Start work → Ramesh sees “In progress”.",
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="figure flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">{i + 1}</span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-3">
            <a href="/login" target="_blank" rel="noreferrer" className="rounded-admin border-2 border-ink bg-accent px-4 py-2 font-bold text-accent-foreground">
              Open worker app ↗
            </a>
            <a href="/login" target="_blank" rel="noreferrer" className="rounded-admin border-2 border-ink bg-card px-4 py-2 font-bold">
              Open manager dashboard ↗
            </a>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "prompts-1",
    eyebrow: "My prompts · part 1 — discover & plan",
    title: "How the idea was shaped",
    body: (
      <div className="grid gap-6 md:grid-cols-2">
        <ul className="flex flex-col gap-2">
          <Prompt>Check GitHub, LinkedIn and the internet for the best past Prompt Wars projects and what they did; read my docs to learn what we must do to win.</Prompt>
          <Prompt>Make proper build docs on a Next.js architecture — research the UI, research the architecture, make a build plan, put it in the docs folder, and verify everything.</Prompt>
          <Prompt>Use the animations folder I added to make the app look great.</Prompt>
        </ul>
        <div className="flex flex-col gap-3">
          <Card icon={<FileText className="size-5" />} title="What came out">
            Six planning docs: past-winner research, product spec, UI/UX research for low-literacy users, architecture, phased build plan, and a verification log
            with every library version checked against the registry.
          </Card>
          <Card icon={<Gauge className="size-5" />} title="Key decision">
            Of the animation library, only the lightweight canvas “Waves” made it in — the WebGL effects were too heavy for a ₹6,000 phone.
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: "prompts-2",
    eyebrow: "My prompts · part 2 — build, polish & ship",
    title: "How the product was sharpened",
    body: (
      <div className="grid gap-6 md:grid-cols-2">
        <ul className="flex flex-col gap-2">
          <Prompt>Delegate the whole build to Antigravity, phase by phase.</Prompt>
          <Prompt>I don&apos;t like the UI theme — make it distinctive and human-designed, not an AI template; keep it accessible and fast.</Prompt>
          <Prompt>Switch to MongoDB and deploy; follow the submission guide and push to GitHub.</Prompt>
          <Prompt>Button clicks feel delayed — add hover effects and fix the click issue on every page.</Prompt>
          <Prompt>There is no user flow or architecture diagram — show who our users are, why we stand out, and build the pitch.</Prompt>
        </ul>
        <div className="flex flex-col gap-3">
          <Card icon={<Sparkles className="size-5" />} title="What came out">
            The “worksite ledger” design system, MongoDB behind one data interface, Cloud Run deployment per the guide, a 100× faster database path, and this deck.
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: "agy",
    eyebrow: "From prompt to agent",
    title: "Build phases became precise Antigravity briefs",
    body: (
      <div className="flex flex-col gap-5">
        <Flow
          steps={[
            <Node key="1">My prompt (one line, often Hinglish)</Node>,
            <Node key="2" tone="accent">
              Spec docs: what, why, constraints
            </Node>,
            <Node key="3" tone="ink">
              Antigravity task brief
            </Node>,
            <Node key="4">Agent works through the phase</Node>,
            <Node key="5" tone="brand">
              Verified: build + tests + review
            </Node>,
          ]}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <pre className="figure overflow-x-auto rounded-admin border border-ink bg-foreground p-4 text-xs leading-relaxed text-background md:text-sm">
            {`# Task A — FairShift: foundations + core engine
You are working in D:/promptwars/fairshift …

## Read first, fully
1. docs/02-product-spec.md
2. docs/04-architecture.md …

## Decisions (already made — do not deviate)
- Sessions: HMAC-signed httpOnly cookie …
- Money in integer paise; Gemini never computes

## Deliver   ## Not your job
## Done means
- lint, typecheck, test, build all pass`}
          </pre>
          <div className="flex flex-col gap-3">
            <Card icon={<Bot className="size-5" />} title="Why briefs, not chats">
              An agent starts cold. A brief fixes the decisions up front, lists exactly what to deliver, says what is <em>not</em> its job, and defines “done” as
              passing checks.
            </Card>
            <Card icon={<BadgeCheck className="size-5" />} title="Trust, but verify">
              Agent output was never committed on faith: every phase had to pass lint, types, unit and end-to-end tests first.
            </Card>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "decisions",
    eyebrow: "Prompts → decisions",
    title: "How my prompts changed the build",
    body: (
      <table className="w-full text-left text-sm md:text-base">
        <thead className="text-muted-foreground">
          <tr>
            <th className="border-b border-ink py-2 pr-4 font-semibold">Prompt</th>
            <th className="border-b border-ink py-2 font-semibold">Building decision it caused</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Study past winners", "Treat security, tests and accessibility as features — they are scored."],
            ["Follow the submission guide", "Google Cloud Run + Docker + Secret Manager; one branch, public .git repo."],
            ["UI looks AI-generated", "Original paper / ink / marigold system; every colour pair computed for WCAG AA."],
            ["Clicks feel slow", "Measured 200 ms per DB query → moved servers to Mumbai (2 ms), added skeletons and spinners."],
            ["Use the animations folder", "Kept one light canvas effect; skipped WebGL for low-end phones."],
            ["Switch to MongoDB", "One data interface, so storage changed without touching a single page."],
          ].map(([prompt, decision]) => (
            <tr key={prompt}>
              <td className="border-b border-border py-2 pr-4 font-semibold">{prompt}</td>
              <td className="border-b border-border py-2">{decision}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
  {
    id: "testing",
    eyebrow: "Testing while vibecoding",
    title: "AI writes code fast — and bugs confidently",
    body: (
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          {[
            ["Unit · 117", "Pure engine: IST time, overtime, payslip, fatigue, risk, QR tokens — 99% line coverage."],
            ["Integration", "Services + repositories: check-in idempotency, anonymity, payroll."],
            ["End-to-end · 21", "Real browser (phone + desktop) through every flow, with axe accessibility checks."],
            ["CI on every push", "Lint, types, tests, security audit, Docker build and smoke test."],
          ].map(([name, text]) => (
            <div key={name} className="rounded-admin border border-border bg-card p-3">
              <p className="font-display font-extrabold">{name}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
        <Card icon={<Bug className="size-5" />} title="Real bugs the tests caught">
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>Overtime capped once per month instead of per week — workers underpaid.</li>
            <li>Seeded shifts 5½ hours off on a UTC server.</li>
            <li>Keypad and PIN field shared a screen-reader label.</li>
            <li>“Thank you” screen swallowed by a page refresh.</li>
            <li>Security policy silently blocking chart styles.</li>
          </ul>
        </Card>
      </div>
    ),
  },
  {
    id: "security",
    eyebrow: "Security while vibecoding",
    title: "Fast code still has to be safe code",
    body: (
      <div className="grid gap-4 md:grid-cols-3">
        <Card icon={<ShieldCheck className="size-5" />} title="Caught in review">
          A helper exported from a server-action file would have become a public endpoint leaking QR secrets. Moved to server-only code.
        </Card>
        <Card icon={<Bot className="size-5" />} title="Prompt injection">
          Speech and text are fenced as untrusted; output must match a strict schema; code decides final severity.
        </Card>
        <Card icon={<Lock className="size-5" />} title="Anonymity is a security property">
          No identity on feedback, one-way guards, redaction — so a manager cannot unmask a worker.
        </Card>
        <Card icon={<Fingerprint className="size-5" />} title="Accounts">
          Hashed PINs, signed sessions, role checks on every action, login rate limits.
        </Card>
        <Card icon={<FileText className="size-5" />} title="Secrets">
          Only in Secret Manager — never in the repo, the image or the browser.
        </Card>
        <Card icon={<TestTube2 className="size-5" />} title="Headers & deps">
          Nonce-based script policy, HSTS, no framing; 0 known vulnerabilities.
        </Card>
      </div>
    ),
  },
  {
    id: "impact",
    eyebrow: "Why FairShift deserves the top spot",
    title: "Every rubric line, with proof",
    body: (
      <div className="grid gap-3">
        {[
          ["Real-world impact", "Unpaid overtime visible; hazards reach managers in seconds and updates return to the worker."],
          ["SDG 8", "8.5 fair pay (2× overtime, readable payslips) · 8.8 safe workplaces (hazards, anonymous voice, fatigue rules)."],
          ["Inclusivity", "4 languages, voice in and out, offline, big targets, axe 0 violations."],
          ["Technical", "Strict TypeScript, nonce CSP, signed sessions, 141 tests, green CI."],
          ["Feasibility", "Construction and hospital from one codebase; Cloud Run autoscaling; MongoDB."],
        ].map(([k, v]) => (
          <div key={k} className="grid gap-1 border-b border-border pb-3 md:grid-cols-[220px_1fr]">
            <span className="font-display font-extrabold">{k}</span>
            <span className="text-muted-foreground">{v}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "thanks",
    eyebrow: "Thank you",
    title: "Fairer, safer work — for the people who build and care for our cities.",
    body: (
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
        <div className="rounded-admin border-2 border-ink bg-white p-3">
          <QRCodeSVG value={REPO} size={160} title="FairShift GitHub repository" />
        </div>
        <div className="flex flex-col gap-2">
          <a href={REPO} className="font-bold text-brand underline underline-offset-4">
            github.com/amanmaskara04/fairshift
          </a>
          <p className="text-muted-foreground">Built with Google Antigravity · Gemini · Google Cloud Run · Next.js · MongoDB</p>
        </div>
      </div>
    ),
  },
];
