# TLDR Astro Lilith fact boundary

Status: approved owner ruling
Date: 2026-08-09

- The product uses true/osculating Black Moon Lilith, matching the calculation identified by the owner for CHANI parity.
- True Lilith replaces mean Lilith everywhere: natal charts, synastry, transits, current sky, sky placements, stations, and sign-residency facts.
- True Lilith can station retrograde and direct roughly monthly. Those stations are dated events.
- Sign residency is multi-pass. A placement `exitDate` means the final exit after the current residency's re-entry passes, not the end of the current contiguous pass.
- A surface that cannot establish the final exit honestly must fail closed and report the missing fact.
- Natal Lilith positions can change sign, house, degree, aspects, and motion during this migration. That is expected and correct.
- Dark Moon or Waldemath Lilith remains excluded because it is a different hypothetical point.

## Merge flight rule

This work is queued behind PR #129. It may be developed and reviewed now, but it must merge only after #129 merges or closes. Rebase and regenerate derived artifacts at merge time. Generated artifacts do not merge across branches; overlap is judged on source files only.
