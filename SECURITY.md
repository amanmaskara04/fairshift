# Security policy

FairShift handles wages, safety reports and anonymous feedback from workers who may fear retaliation, so privacy failures are treated as security bugs.

## Reporting a vulnerability

Please open a private security advisory on GitHub (Security → Advisories → *Report a vulnerability*) rather than a public issue. Include steps to reproduce; we aim to respond within 72 hours.

## Design guarantees we test for

- Feedback and co-signed issues never store a worker id; double voting/signing is blocked with one-way HMAC keys.
- Management never sees a feedback group or issue below 5 participants.
- Every mutation checks the session role and organisation, validates input with Zod and is rate-limited where abuse is possible.
- Share links (skill passport, work certificate) are HMAC-signed, kind-bound and (for passports) expiring.
- No secrets in the repository; production refuses to start without them.

See the *Privacy and security by design* section of the [README](README.md) for details and code pointers.
