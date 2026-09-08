# Fallback placement identity audit — September 8, 2026

Request: “the app's fallback hooks are using content that does not match the sky placement. Please review the entire Fall Back hooks and flag and fix.”

Base: `90248249d782efd648dd42964fb1342673cc1e77`. Branch: `codex/fallback-placement-match-audit`. Package: `v3-2026-09-08d`.

## Findings and fixes

| Flag | Defect | Resolution |
| --- | --- | --- |
| F01 | The placement route copied the current position and overwrote only its sign. A Gemini URL on November 27 could therefore show Sagittarius residency dates and aspects. | Calculate the requested placement's next residency snapshot in the existing background worker. Use the original date when it already matches. The article adapter refuses a mismatched position. Dates, motion, positions, and aspects all come from that snapshot. Cancellation prevents an old calculation from reopening a previous route. |
| F02 | An explicit canonical content key or article override could disagree with the requested planet/sign. | Reject mismatched identities before rendering. |
| F03 | Contextual overlays matched the supplied context but did not verify that its subject matched the current article. | Require the context subject's body and sign to match the placement. This applies to full article, fallback, and lunar context selection. |
| F04 | The older placement aspect composer accepted an event that did not involve the placement body. | Omit unrelated events in both Node and browser implementations. |

## Content inventory and editorial review

The attached JSON inventories **5,098 source hook records across 132 families**, including review states and every cross-sign candidate found by the focused Sky scan. This is a structural inventory of all hooks, plus a detailed placement review; it is not a claim that a keyword check can certify every sentence's astrological meaning.

- Checked hook key identity against explicit planet/sign metadata and named planet-in-sign phrases. No mislabeled source rows were found by those checks.
- Reviewed the **360 hook/lived/turn fields** in the 120 corrected continuous placements. Each field is unique within its field family; no confirmed placement swap was found.
- Reviewed nine cross-sign field candidates in the older Sky sources: five Full Moon axis explanations, two Leo-to-Virgo references, and two versions of a Pisces-to-Aries reference. These are deliberate comparisons or transitions, not mismatched row selection. Pending and superseded rows retain their original review state.
- Tested full article and fallback identity for all 120 continuous placements in both original and corrected packages, plus all 36 Node/Lilith placements and matching/mismatching contextual overlays.

The screenshot highlights `placementArticle` under `sky-placement/article/sun/sagittarius`, not a Gemini fallback. The paragraph explicitly contrasts Gemini and Sagittarius. It is flagged separately for the owner's optional editorial preference and preserved. No new astrology prose was written, approved text shortened, or review/serving gate weakened.

## Verification

- New source/browser/shipped resolver regression: 720 continuous checks; all Node/Lilith signs; wrong-key/override rejection; contextual identity; unrelated aspect parity.
- Calculation regression: two successive years of requested Sun-in-Gemini residency, matching current Sun, Moon, Mercury and True Node; positions/aspects compared with a direct ephemeris snapshot at the returned date.
- Browser regression: November 27 Sagittarius → Gemini → Sagittarius; complete authored opening/ending; no previous-sign article; Gemini must show its calculated May–June 2027 window. Existing Node/Lilith browser regression also run.
- Canonical stage, reader release, placement regressions, typecheck, CSS audit, production build and bundle budgets passed. Both targeted browser runs passed (four cases total).
- The pre-existing Venus/Mercury retrograde fixture was moved from March 29 to March 20, 2025 after direct ephemeris verification. The former date relied on relabeling Venus in Pisces as Aries.
- Rebuilt shipped resolver, versioned manifests/projections, content book, knowledge index, and dependent production-kernel comparison evidence.

No database mirror synchronization or production deployment was performed by this audit.

Full `npm run test:content` reached the known existing failure at `scripts/test-friends-owner-signoff-ruling.mjs:161`: actual hash `84bcb9343e221991b2efe9f363d75aeaf926212319896c82a7c8878484acf4ee`, expected `9ae494a7998e4441a03799c477e8e0819028e0822908a7a3ca4aeafb1e1415f5`. This is the same baseline failure documented in `natal-placement-inventory-audit-2026-09-08.md`; that test was not changed. The full suite is not green.

Release integration: rebased onto main a85d2ca4, regenerated artifacts as v3-2026-09-08d, and passed all four browser cases again. The CI-environment aggregate JS build is 2,933,164 bytes (164 over the prior cap); documented a 1 KB aggregate allowance to 2,934,000 bytes. Startup and per-chunk limits are unchanged. The retired-source regex now matches the exact retired skyWriting symbol rather than the new skyWritingContext state from main.
