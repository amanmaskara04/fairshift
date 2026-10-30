# FairShift — Decent Work, Counted Fairly

> **Prompt Wars 2026 × SRM ACM · UN SDG 8 (Decent Work & Economic Growth)**
> A voice-first, four-language workplace app for daily-wage and shift workers, and an honest early-warning dashboard for the employers who want to treat them fairly. One codebase, two working interfaces, **construction sites and hospitals**.

[![CI](https://github.com/amanmaskara04/fairshift/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/amanmaskara04/fairshift/actions/workflows/ci.yml)
![Unit tests](https://img.shields.io/badge/unit%20tests-276%20passing-2e8b57)
![E2E tests](https://img.shields.io/badge/e2e%20tests-35%20passing-2e8b57)
![axe](https://img.shields.io/badge/axe-0%20violations-2e8b57)
![npm audit](https://img.shields.io/badge/npm%20audit-0%20vulnerabilities-2e8b57)
![License: MIT](https://img.shields.io/badge/license-MIT-2e8b57)
![Languages](https://img.shields.io/badge/languages-EN%20·%20हिन्दी%20·%20தமிழ்%20·%20తెలుగు-0f6b5a)
![Gemini](https://img.shields.io/badge/Google-Gemini%203.5%20%2F%203.8-4285F4)
![Cloud Run](https://img.shields.io/badge/Google-Cloud%20Run%20ready-4285F4)

| | |
|---|---|
| **Live demo** | <https://fairshift-ashy.vercel.app> (Mumbai region, MongoDB Atlas Mumbai, live Gemini) |
| **3-minute judge walkthrough** | [`docs/demo-script.md`](docs/demo-script.md) |
| **Pitch deck** | [`/pitch`](https://fairshift-ashy.vercel.app/pitch) in the app |
| **Security model** | [`SECURITY.md`](SECURITY.md): threats, controls, code and tests |
| **Google Cloud Run** | Production container + one-command deploy ([below](#deploy-to-google-cloud-run)); CI builds and smoke-tests the image on every push |

**One tap in, no sign-up.** Open the app and tap a demo person:

| Demo login | Who | Shows |
|---|---|---|
| **Ramesh** · code `1001`, PIN `1234` | Mason, BuildRight Constructions, Chennai · Tamil | QR check-in, *earned so far*, **₹907 possible overtime shortfall**, BOCW progress **72/90 days**, voice hazard report (say “fire” → *Danger now* + **Call 112**), **Help** tab |
| **Sunita** · code `2001`, PIN `1234` | Ward attendant, City Care Hospital, Lucknow · Hindi | Night-shift fatigue warning, feedback faces, **“Me too” on a 4-of-5 issue → escalates live**, ESIC & e-Shram eligibility |
| **Priya** · `priya@buildright.demo` / `demo1234` | Construction employer | **X of 18 on duty**, escalated hazards, FairPay Sentinel + **“Pay the gap”**, co-signed issues, skill and certificate approvals, payroll CSV, QR kiosk |
| **Dr. Arjun** · `arjun@citycare.demo` / `demo1234` | Hospital employer | The same dashboard with hospital rules, wards and escalation chain |

The app runs **with no API key and no cloud account**: seeded data (generated relative to *today*) and a deterministic fallback for every AI feature.

---

## Judging criteria → evidence

| Criterion | Focus | What FairShift does | Try it / read it |
|---|---|---|---|
| **1. Real-World Impact** | Tangible improvement to worker safety and employer visibility | **Safety:** voice/photo hazard reports with severity deadlines and **auto-escalation** (supervisor → site manager → safety officer); fire and other emergencies are always *critical* with a one-tap **Call 112**; a **Help** tab with 8 verified national helplines and AI next steps; sector fatigue rules. **Visibility:** live *on duty* count, escalated hazards first, explainable quit risk, pay shortfalls flagged before they become disputes | Ramesh → Report / Help · Priya → Overview · [`core/hazard-lifecycle.ts`](src/core/hazard-lifecycle.ts) · [`config/helplines.ts`](src/config/helplines.ts) |
| **2. Relevance to SDG 8** | Decent Work and Economic Growth | **Target 8.5** (equal pay for work of equal value): every hour recorded, overtime at 2×, minimum-wage check, **FairPay Sentinel** compares hours with what was paid and **“Pay the gap”** settles it. **Target 8.8** (labour rights, safe workplaces): hazards fixed on deadline, *safe in numbers* co-signed issues, anonymous feedback, welfare-board eligibility and a **signed work certificate** | Ramesh → Pay (₹907) · Priya → Payroll · [Pain point table](#pain-point--feature--code) |
| **3. Inclusivity & Ease of Use** | Regional languages, low literacy, basic phones | **English, हिन्दी, தமிழ், తెలుగు** in native scripts (parity test on every key); **read-aloud on every screen**, voice input, icon-first big buttons (≥48px); **works offline** (check-ins queue in IndexedDB); installable PWA, no app store; SVG-only visuals for a ₹7,000 phone; WCAG AA, **axe: 0 violations** | Landing → *I'm a worker* → தமிழ் · [Accessibility](#accessibility-and-inclusivity) |
| **4. Technical Implementation** | Clean code, security, working dual interfaces | **Worker app (`/w`) and employer dashboard (`/a`)**, both end-to-end tested. Pure, tested rules in [`src/core`](src/core) (95% coverage gate); *AI decides, code computes*; nonce CSP, role + org check on every mutation, Zod, rate limits, HMAC-signed tokens; **276 unit + 35 Playwright tests**, CI on every push | [Architecture](#architecture) · [`SECURITY.md`](SECURITY.md) · [Testing](#testing) |
| **5. Feasibility & Scalability** | Practical adoption across two or more distinct industries | **Construction and hospital** live, with **campus and factory** profiles: every difference (pay basis, roster, fatigue rules, hazard types, escalation chain, welfare schemes) is configuration. Runs without AI or a database; one container, one command to deploy; a site needs only a printed or kiosk QR | [Two sectors, one product](#two-sectors-one-product) · [Feasibility](#feasibility-and-scalability) |

## At a glance

- **Problem.** India's unorganised workers (over 90% of the workforce) cannot prove their hours, cannot read their payslips, fear speaking up, lose their work history when they change jobs, and miss welfare they are entitled to because claiming it needs paperwork they do not have.
- **Solution.** A phone app in their own language that **records every hour, checks every rupee against what was actually paid, lets workers raise issues safely in numbers, gets them help in a crisis, and turns verified attendance into welfare eligibility and a signed work certificate**. Employers get an honest early-warning dashboard.
- **Why it is trustworthy.** *The AI decides meaning, the code computes.* Every rupee, hour, deadline, eligibility and risk score comes from pure, unit-tested TypeScript in [`src/core`](src/core). Gemini understands speech, judges urgency, matches similar complaints, rewords explanations and reads aloud, and each of those has a deterministic fallback.
- **Google technology.** Gemini 3.5 Flash-Lite / 3.8 Flash (structured JSON output), Gemini 3.8 Flash-Lite TTS (Tamil/Telugu read-aloud), Cloud Run, Secret Manager, Cloud Build, Cloud Scheduler, Google Fonts (self-hosted).

## Pain point → feature → code

| Pain point (from the problem statement) | FairShift feature | Where |
|---|---|---|
| Unrecorded hours and unpaid overtime | QR check-in (rotating HMAC token, offline queue), payslip with 2× overtime, *“Why this amount?”* | [`core/overtime.ts`](src/core/overtime.ts) · [`core/pay.ts`](src/core/pay.ts) · [`w/checkin`](src/app/w/checkin) |
| “The payslip says one thing, I was paid another” | **FairPay Sentinel**: compares attendance with what the employer recorded as paid; *Possible shortfall ₹907* with the arithmetic; one-tap review request → dispute workflow. Employers record pay from presets and hour sliders, and **“Pay the gap”** records the top-up (amount computed on the server) so the shortfall disappears for the worker | [`core/pay-check.ts`](src/core/pay-check.ts) · [`services/pay-check.ts`](src/server/services/pay-check.ts) · [`w/pay`](src/app/w/pay/page.tsx) |
| Wages below the legal minimum | Minimum-wage check per state/sector/skill (demo table, clearly labelled) | [`config/minimum-wage.ts`](src/config/minimum-wage.ts) |
| Missed welfare benefits, no proof of days worked | **Benefits Unlocker**: BOCW board, e-Shram, ESIC, PM-SYM eligibility from verified days; progress ring; how-to-apply sheet; **HMAC-signed work certificate** approved by the employer | [`config/schemes.ts`](src/config/schemes.ts) · [`core/eligibility.ts`](src/core/eligibility.ts) · [`certificate/[token]`](src/app/certificate) |
| Fear of retaliation for speaking up | Anonymous weekly feedback (groups of 5+), and **“Safe in numbers”** co-signed issues: invisible to management until 5 workers sign; signers never stored | [`core/cosign.ts`](src/core/cosign.ts) · [`services/issues.ts`](src/server/services/issues.ts) |
| Unsafe sites, hazards ignored for days | Voice/photo hazard reports in 4 languages; **age timers**, severity deadlines, **auto-escalation**; dismiss needs a reason; *“Is it really fixed?”* closes the loop; duplicates merged only for the same danger at the same site; **fire is critical in every sector**, and urgent words (fire, trapped, unconscious…) in 4 languages can only raise severity | [`core/hazard-lifecycle.ts`](src/core/hazard-lifecycle.ts) · [`core/hazard-duplicates.ts`](src/core/hazard-duplicates.ts) · [`core/hazard-urgency.ts`](src/core/hazard-urgency.ts) · [`config/hazard-sla.ts`](src/config/hazard-sla.ts) |
| Nowhere to turn in a crisis | **Help** tab: one-tap 112; verified national helplines (fire 101, ambulance 108, women 181, Tele-MANAS 14416, e-Shram, ESIC, EPFO); *“Tell us the problem”* gives urgency, next steps in the worker's language, the right helpline and where in FairShift to act | [`config/helplines.ts`](src/config/helplines.ts) · [`core/help-triage.ts`](src/core/help-triage.ts) · [`ai/help.ts`](src/ai/help.ts) |
| Fatigue, long shifts, night work | Sector fatigue rules (10h day, 11h rest, 3 nights in a row, 48h week) on the worker home and the manager board | [`core/fatigue.ts`](src/core/fatigue.ts) · [`core/sectors`](src/core/sectors) |
| Lost career history when changing jobs | **Skill passport**: verified work history from attendance; the worker adds a skill and the employer verifies it; the worker chooses what to share through a **signed link that expires in 30 days** | [`core/work-history.ts`](src/core/work-history.ts) · [`services/skills.ts`](src/server/services/skills.ts) · [`core/signed-token.ts`](src/core/signed-token.ts) |
| Employers learn too late | Live **on duty** headcount; explainable individual quit risk (overtime trend, missed days, pay disputes) with **site conditions shown separately** | [`core/risk.ts`](src/core/risk.ts) · [`a/people`](src/app/a/people/page.tsx) |
| Low literacy, many languages, cheap phones | 4 languages in native scripts, read-aloud everywhere (device voice → Gemini TTS fallback), voice input, big targets, offline, light SVG-only visuals | [`messages/`](src/messages) · [`lib/speak.ts`](src/lib/speak.ts) · [`api/tts`](src/app/api/tts/route.ts) |

## Two sectors, one product

| | Construction (BuildRight, Chennai) | Hospital (City Care, Lucknow) |
|---|---|---|
| Pay basis | Daily wage | Monthly salary |
| Roster | Mon–Sat, Sunday rest | Rotating rest day, night shifts |
| Fatigue rules | 10h day, 11h rest, 6 days, 48h week | 3+ nights in a row, 11h rest, 12h day, 48h week |
| Hazard types | Fire, fall, scaffolding, electrical, heat, PPE, machinery | Fire, needle-stick, biohazard, patient aggression, slip, lifting, PPE |
| Escalation chain | Supervisor → site manager → safety officer | Ward in-charge → nursing superintendent → safety officer / HR |
| Welfare schemes | BOCW board (90 days of building work), e-Shram, PM-SYM | ESIC, e-Shram, PM-SYM |

Everything that differs is **configuration** ([`core/sectors`](src/core/sectors), [`config/`](src/config)); campus and factory profiles are included.

## Feasibility and scalability

- **A new industry is a config file**, not a fork: a sector profile sets pay basis, roster, fatigue thresholds, hazard categories, escalation chain and schemes. Four profiles exist; two are seeded end to end.
- **Low adoption cost.** Workers need only a phone browser (installable PWA, no app store, works offline). A site needs a printed QR or any old phone as a kiosk. Employers can import what they paid from a CSV template, so FairShift fits beside existing payroll.
- **Degrades gracefully.** Without `GEMINI_API_KEY` every AI feature falls back to deterministic rules; without `MONGODB_URI` the app runs on an in-memory store. The demo works on a laptop with no accounts.
- **Cheap to run.** Server Components, no chart library, cached TTS, the fastest Gemini model first, and AI only where it adds meaning. One stateless container scales horizontally on Cloud Run; data is org-scoped and indexed.
- **Ready for more languages.** Anek already covers Kannada, Bengali, Marathi and Odia scripts; a new locale is a JSON file checked by the parity test.

## Architecture

```mermaid
flowchart LR
    subgraph Phone["Worker phone · manager laptop"]
        UI["React 19 Server Components<br/>+ small client islands"]
        SW["Service worker<br/>offline page + queue"]
        IDB[("IndexedDB<br/>offline check-ins")]
        TTS1["Device voice"]
    end

    subgraph Run["Google Cloud Run · asia-south1 · Next.js 16"]
        PX["proxy.ts<br/>nonce CSP · headers · auth redirect"]
        SA["Server Actions & API routes<br/>requireRole · Zod · rate limits"]
        CORE["core/ — pure, deterministic, unit-tested<br/>overtime · pay · pay-check · eligibility · co-sign<br/>hazard lifecycle · urgency · duplicates · help triage<br/>risk · signed tokens"]
        CFG["config/ — schemes · minimum wages · SLAs · helplines"]
        AI["ai/ — Gemini client · JSON schemas<br/>fallbacks · PII redaction · TTS cache"]
        REPO["repos/ — one interface<br/>MongoDB or in-memory seed"]
    end

    GEM["Gemini 3.5 Flash-Lite / 3.8 Flash<br/>+ 3.8 Flash-Lite TTS"]
    DB[("MongoDB Atlas · Mumbai")]
    SM["Secret Manager"]
    SCH["Cloud Scheduler<br/>hazard escalation sweep"]

    UI --> PX --> SA
    SW <--> IDB
    SA --> CORE
    CORE --> CFG
    SA --> AI --> GEM
    SA --> REPO --> DB
    SM -. secrets .-> Run
    SCH -- "POST /api/cron/hazards" --> SA
```

Escalation also runs on every hazard page read, so deadlines hold even without the scheduler.

### AI decides meaning, code computes

| AI feature | What Gemini does | If Gemini is unavailable | Guard rail |
|---|---|---|---|
| Voice hazard report | Speech/text → category, severity judged from what is happening, location (JSON schema) | Phone speech recognition + keyword classifier in 4 scripts | Category must be in the sector's list; code can only raise severity: floors in `core/hazard-rules.ts`, urgent words in `core/hazard-urgency.ts` |
| *“Tell us the problem”* (Help) | Urgency, topic, up to 4 next steps in the worker's language, helpline ids, in-app action | Keyword triage + translated template steps | Text PII-scrubbed and never stored; helplines only from the fixed list; digits stripped from model text; an emergency in the words always shows 112 first |
| *“Explain in simple words”* | Rewords the exact payslip sentences | Template sentences (always shown first) | Rejected if a single number changes |
| Weekly brief | 3–5 actions from **totals only** | Deterministic template | No names, comments or per-worker rows are sent |
| “Is it one of these?” | Matches a new issue to existing ones across languages | Keyword-overlap similarity | Only already-scrubbed issue texts are sent |
| Read aloud (Tamil/Telugu on desktop) | Gemini TTS, cached per sentence | “Audio not available on this device” | Public route speaks only language names; everything else needs a session |

Every call is logged (feature, model, latency, fallback, content-free error) **in the database**, so the admin's *AI transparency* panel survives serverless restarts. `GET /api/health` reports `ai: configured | missing_key`.

## Privacy and security by design

Full threat model with code and test pointers: **[`SECURITY.md`](SECURITY.md)**.

- **Groups of 5.** Feedback is shown only for groups of 5+ responses; co-signed issues are invisible to management until 5 workers sign, and *not even a count* leaks below the threshold ([`core/anonymity.ts`](src/core/anonymity.ts), [`core/cosign.ts`](src/core/cosign.ts)).
- **Signers are never stored.** Double voting and double signing are blocked with `HMAC(secret, worker + week/issue)`, a one-way key that is useless without the server secret.
- **PII scrubbing** of names (every worker and admin in the org), phone numbers, emails and long ids before anything is stored or sent to AI ([`ai/redact.ts`](src/ai/redact.ts)).
- **Anonymous hazard reports** get a private tracking reference (`FS-7KQ2MZ`); only its HMAC is stored, so the reporter can confirm a fix without being identifiable.
- **Signed, expiring links.** Skill passports and work certificates use HMAC-SHA256 tokens with the token *kind* bound into the MAC; passports expire after 30 days.
- **Every mutation** is a Server Action or API route with `requireRole` (worker vs admin, org-scoped), **Zod** validation and **rate limits**. Money is always computed on the server (*Pay the gap* never trusts an amount from the browser).
- **Headers.** Per-request nonce CSP with `strict-dynamic`, HSTS, `nosniff`, `frame-ancestors 'self'`, COOP `same-origin`, no `x-powered-by`; same-origin and body-size checks on JSON routes; CSV export neutralises formula injection.
- **Secrets** come from env / Secret Manager only; production refuses to start without them. `npm audit`: 0 vulnerabilities, checked in CI.

## Accessibility and inclusivity

- **Four languages** (English, हिन्दी, தமிழ், తెలుగు), every string translated, enforced by a test that all locale files have the same keys and placeholders. `<html lang>` follows the language; the language menu changes it **in place without a history entry**.
- **Anek**, one multi-script font family, so Latin, Devanagari, Tamil and Telugu look like one brand; Indic text is never split letter by letter in animations (that breaks conjuncts).
- **Read-aloud on every screen** with a server TTS fallback, **voice input** for hazards, help, comments and issues, big targets (≥48px), haptic taps.
- **WCAG AA** contrast verified by [`tests/unit/design/contrast.test.ts`](tests/unit/design/contrast.test.ts); visible focus rings; ARIA radiogroups, menus with full keyboard support, `aria-live` for check-in, reports and reviews; **axe scans in the e2e suite on every key screen**.
- **Motion with care:** only `transform`/`opacity` animate; `prefers-reduced-motion` turns movement into short fades; loops pause when the tab is hidden.
- **Back that behaves like an app:** tabs, steps, sheets and form submissions never add history entries.
- **Honest limit: feature phones.** FairShift needs a smartphone browser; it is built for low-end Android (₹7,000 class), not keypad phones. Workers with keypad phones are not covered yet; **IVR / missed-call reporting** is the first item on the [roadmap](#roadmap). Voice input uses the phone's own speech recognition; where it is missing, every voice step also has a tap or type path.

## Performance on a ₹7,000 phone

Server Components by default; client JS only for interactive islands. The animated scene is **inline SVG + CSS keyframes** (no Lottie, no video, no animation library; page transitions use React 19's native `<ViewTransition>`). Admin charts are server-rendered HTML (no chart library). Fonts are self-hosted with only Latin preloaded. Batched queries avoid N+1 round trips; the menu's live headcount loads off the critical path from a query that reads only open shifts. The service worker precaches the shell; check-ins work offline. Lighthouse (mobile): 96–100 performance, 100 accessibility, best practices and SEO on the main pages.

## Testing

```bash
npm test             # 276 unit tests (Vitest): core engine, services, AI fallbacks, i18n parity, contrast
npm run coverage     # with the ≥95% coverage gate on src/core
npm run e2e          # 35 Playwright tests on a production build, with axe scans
npm run lint && npm run typecheck
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint, typecheck, unit tests with the coverage gate, `npm audit`, the full e2e suite, then **builds the Docker image and smoke-tests the container** (health check + CSP header).

Highlights: overtime underpaid / regular underpaid / below minimum wage / exact match / ₹1 rounding tolerance / missing record · paying the gap clears the shortfall, refuses other organisations and survives pay-record corrections · eligibility at 89, 90, 91 days and the 12-month window · double-sign blocked, the 4→5 threshold, admin sees nothing below it, PII removed · fire is critical in every sector, “fire exit” is not a fire · heat is never merged into scaffolding · hazard deadline boundaries, reopen restarts the timer, dismiss without a reason rejected · help triage never invents a phone number and always puts 112 first in an emergency · expired and tampered tokens rejected, role-escalation payloads rejected · an old demo session cannot hijack *I'm an employer* · the Back-button path (Home → Pay ×2 months → Report → Me and back).

## Engineering quality → evidence

| Area | What we did | Where to look |
|---|---|---|
| **Code quality** | Pure `core/` with no I/O; one repository interface; config over code; typed end to end; Server Actions hold only guarded mutations; ESLint (React Compiler rules) with zero warnings | [`src/core`](src/core), [`src/config`](src/config), [`src/server/repos/types.ts`](src/server/repos/types.ts) |
| **Security** | Nonce CSP, role + org checks on every mutation, Zod everywhere, rate limits, HMAC guards and signed tokens, Secret Manager, 0 audit findings | [`SECURITY.md`](SECURITY.md), [`proxy.ts`](src/proxy.ts), [`server/actions`](src/server/actions) |
| **Efficiency** | Organisation-wide pages load in two batched round trips (payroll, certificates), open-shift-only headcount, idempotent hazard sweep, cached TTS, server-rendered charts, SVG-only visuals | [`services/workforce.ts`](src/server/services/workforce.ts), [`ai/tts.ts`](src/ai/tts.ts) |
| **Testing** | 276 unit + 35 e2e, 95% coverage gate on the core, CI on every push including a container smoke test | [`tests/`](tests), [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| **Accessibility** | AA contrast test, axe in e2e, keyboard menus and radiogroups, live regions, reduced motion, 4 languages + voice | [`tests/e2e`](tests/e2e), [`globals.css`](src/app/globals.css) |
| **Problem alignment** | Worker + employer interfaces, construction + hospital, every pain point in the brief mapped above | [Pain point table](#pain-point--feature--code) |

## Getting started

```bash
npm install
cp .env.example .env.local     # optional: add GEMINI_API_KEY for live AI
npm run dev                    # http://localhost:3000
```

| Script | Does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js development / production build / server |
| `npm test` / `coverage` / `e2e` | Unit tests / with coverage gate / Playwright + axe |
| `npm run lint` / `typecheck` | ESLint (zero warnings) / TypeScript |
| `npm run icons` | Regenerates favicon and PWA icons from the logo geometry |

Every environment variable is documented in [`.env.example`](.env.example). Without `MONGODB_URI` the app uses an in-memory store seeded relative to today. With it, MongoDB is seeded on first connection and, in demo mode, re-seeded once per IST day so the demo never shows a stale week.

## Deploy to Google Cloud Run

The image is a multi-stage, non-root [`Dockerfile`](Dockerfile) using Next.js `output: "standalone"` with a health check; [`.dockerignore`](.dockerignore) and [`.gcloudignore`](.gcloudignore) keep secrets and build output out. CI builds and smoke-tests it on every push.

**One command** (creates secrets in Secret Manager, grants access, builds with Cloud Build, deploys to `asia-south1`, and schedules the hazard escalation sweep every 15 minutes):

```bash
MONGODB_URI='mongodb+srv://…' bash scripts/deploy-cloudrun.sh <gcp-project-id> <gemini-api-key>
```

Or by hand:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com cloudscheduler.googleapis.com
printf '%s' "$GEMINI_API_KEY" | gcloud secrets create fairshift-gemini-key --data-file=-
# …likewise fairshift-mongodb-uri, -session-secret, -feedback-secret, -passport-secret, -cron-secret
gcloud run deploy fairshift --source . --region asia-south1 --allow-unauthenticated \
  --min-instances 1 --memory 1Gi --set-env-vars DEMO_MODE=true \
  --set-secrets GEMINI_API_KEY=fairshift-gemini-key:latest,MONGODB_URI=fairshift-mongodb-uri:latest,SESSION_SECRET=fairshift-session-secret:latest,FEEDBACK_HMAC_SECRET=fairshift-feedback-secret:latest,PASSPORT_SECRET=fairshift-passport-secret:latest,CRON_SECRET=fairshift-cron-secret:latest
curl https://<service-url>/api/health   # {"status":"ok","db":"mongodb","ai":"configured",…}
```

The live demo above runs the same build on Vercel (`bom1`, Mumbai) with `vercel deploy --prod`.

## Project structure

```
src/
  core/        Pure, deterministic rules: time, overtime, pay, pay-check, eligibility, co-sign,
               hazard lifecycle, urgency & duplicates, help triage, risk, fatigue, signed tokens,
               work history, nav stack
  config/      Data, not code: welfare schemes, minimum wages, hazard deadlines & escalation
               chains, verified helplines
  ai/          Gemini client, prompts, JSON schemas, fallbacks, PII redaction, TTS, AI log
  server/      Server Actions (Zod + requireRole + rate limits), services, repositories, seed
  app/         Routes: (entry) landing·language·login · w/ worker · a/ admin · passport ·
               certificate · pitch · api
  components/  UI: design-system primitives, worker & admin pieces, welcome, entry scene, logo
  messages/    en · hi · ta · te
tests/         unit (Vitest) · e2e (Playwright + axe)
docs/          demo-script.md
```

## Roadmap

- **IVR / missed-call reporting** for feature phones: a missed call to a site number logs a hazard callback in the worker's language.
- **WhatsApp bot** for payslips, shortfall alerts and issue signing.
- **More languages** (Kannada, Bengali, Marathi, Odia; Anek already covers their scripts).
- Live minimum-wage and scheme rules per state from official notifications; direct e-Shram/BOCW application hand-off.
- Union and NGO view: aggregate, k-anonymous trends across employers.

## Limitations and disclosure

- Minimum-wage figures and scheme rules are **demo values**, labelled as such in the UI and in [`config/`](src/config); verify per state before real use. Helpline numbers were checked against official sources in October 2026.
- FairShift checks pay; it does not move money. *Pay the gap* records a payment the employer made.
- Demo mode exposes one-tap logins and re-seeds data daily; turn it off for a real deployment.
- Built with AI-assisted development (Claude Code); every rule is covered by tests and reviewed against the brief.

## License

[MIT](LICENSE).
