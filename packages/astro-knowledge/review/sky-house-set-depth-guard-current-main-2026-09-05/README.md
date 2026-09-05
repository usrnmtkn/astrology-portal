# Sky Placement house-set depth guard — current-main rebuild

Date: 2026-09-05

This rebuild replaces the still-needed safety behavior from stale PR #471 without importing its 23-file generated/runtime history.

## Rule

A Sky Placement rising-sign horoscope set may serve when it is editorially uniform:

- no owner-authored full-house rows exist for the placement, so the existing compact-only 12-house set may continue to serve; or
- all 12 owner-authored house passages are approved **and** the bundled 12 reader rows match those approved bodies byte-for-byte.

If an owner-authored placement is partial, or the owner source reaches 12/12 before the reader bundle has been regenerated to the same bodies, the entire house-horoscope set is omitted rather than mixing full owner prose with compact cores.

## Current consequence

Jupiter in Leo has seven approved owner-authored full passages (houses 5, 7, 8, 9, 10, 11, 12), so its 12-house rising-sign set fails closed. PR #537 stages houses 1, 2, 3, 4, and 6 for owner review only. The guard will not release Jupiter/Leo until those five are approved, promoted into the owner-authored source, and the bundled reader rows are regenerated to match.

## Scope

The guard lives at the deferred Sky Placement bundle boundary. It does not rewrite, shorten, paraphrase, promote, or change review status for any passage. It filters only the reader-visible house-row set when a mixed-depth condition exists.
