# Sky Placement emergency-row retirement

Owner ruling, 2026-08-08:

> Retire the sky-placement-you and sky-placement-practice slot families entirely. Remove the renderer's requirement on them in both renderTransitSynastry.mjs and renderTransitSynastry.browser.ts (the SOURCE_GAP checks and the ?? fallback substitutions) so a missing per-sign row fails closed and hides, never substitutes. Delete all 28 rows. Per-sign coverage is complete, so no rendered output changes; add a regression assertion that no placement render path can reach non-owner-approved copy. Held diff, PR, owner merges.

Implementation scope:

- delete the 14 `sky-placement-you` and 14 `sky-placement-practice` approved emergency rows;
- remove both renderer paths that read or substitute those families;
- leave the approved per-planet/per-sign placement rows unchanged;
- fail closed with `SOURCE_GAP` when an approved per-sign placement is absent.
