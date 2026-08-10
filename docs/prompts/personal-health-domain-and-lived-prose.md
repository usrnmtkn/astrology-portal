# Personal & Health domain and lived-prose integration

**Status:** implemented on the report-fulfillment branch, pending review with judge/critique v3
**Owner source:** the 2026 Marie Satori Personal & Health report and generator-logic amendment supplied on 2026-08-09

## Contract

- Add `personal_health` as a fourth report domain in the existing calculation, factor-selection, envelope, checkout, and fulfillment pipeline.
- Reuse one frozen facts bundle per user and report window. The new domain receives an independent tiered factor-selection pass.
- Use `artifacts/marie-satori-personal-health-2026-owner-v1.md` as the owner reference.
- Load `tldr-astro-phrasebank/TLDR-REPORT-LIVED-PROSE-STANDARD-OWNER.md` into every report-generation payload.
- Keep generated reader copy at `needs_review`; the implementation adds no generated prose and performs no model calls.
- Add a fourth complete-unit v3 score pair based on the Personal & Health owner reference.
- The amended generic-article diagnostic is corroborative only and cannot establish a defect or score reduction by itself.

## Domain relevance

The tiered relevance model inspects direct body, health-routine, recovery, privacy, and daily-capacity factors first; home, caregiving, communication, schedule, and public-work condition changers second; and Saturn, Uranus, and Jupiter capacity modifiers third. Each rule carries inspection notes and non-assumption lists. It must not infer diagnosis, illness, medical crisis, permanent incapacity, conventional employment, or voluntary change.

## Governance

The Personal & Health reference is owner-supplied evidence. Calibration degradations remain `needs_review`, `ownerApproved: false`, and `promotionAuthorized: false`. They are never reader-facing copy or positive voice evidence.
