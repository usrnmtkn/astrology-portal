# Writing authority migration audit

Date: 2026-08-21

Scope: the remaining uncommitted authority documents and their older or newer repository counterparts. This is an engineering and governance record, not reader-facing copy and not an approval record.

## Disposition

| Material | Disposition | Reason |
|---|---|---|
| `TLDR-WRITING-AUTHORITY-INDEX.md` working copy | Migrate forward | The working copy matched the original 2026-08-17 index and lacked later Friends, mechanism-first, and natal-house bridge rulings. The newer rules were added; no newer ruling was removed. |
| `TLDR-LILITH-FACT-BOUNDARY-OWNER.md` | Retain and normalize | Its doctrine remains active. Future-tense approval and implementation notes were stale, so the document now distinguishes approved meaning from the completed True Lilith calculation migration. |
| `TLDR-LILITH-REWRITE-PACK-V1-NEEDS-REVIEW.md` | Retain only as a migration ledger | One station line was later approved in Knowledge Matrix v9. The sign-placement candidates were superseded by V5, the house snippets by existing approved full-copy rows, and the remaining candidates were never approved. Unapproved prose was removed to prevent accidental retrieval as owner voice. |
| `TLDR-NATAL-PAGE-CONTRACT-OWNER.md` | Retain and amend | The two-section page contract remains current, but the 2026-08-20 house-bridge ruling changes the internal composition of the house section and the 2026-08-21 human-pattern ruling sharpens its movement. |
| Admin Sky relation changes | Do not duplicate | The feature already exists on `origin/main` in `445b6a1f`. Only the new canonical underscore-key regression is additional work. |
| Owner-correction fixture changes | Do not duplicate | The fixture patch already exists on `origin/main` in `064d6e34`. |

## Knowledge retained in canonical homes

- Lilith doctrine: `tldr-astro-phrasebank/TLDR-LILITH-FACT-BOUNDARY-OWNER.md`.
- True Lilith calculation behavior: `packages/astro-knowledge/review/tldr-astro-lilith-fact-boundary.md` and `packages/astro-knowledge/review/lilith-true-apogee-migration-2026-08-09.md`.
- Lilith station wording: owner-approved Knowledge Matrix v9 key `black moon lilith|any|station`.
- Lilith sign placements: `packages/astro-knowledge/review/lilith-placements-v5/lilith-placements-v5-owner-package.md`.
- Lilith house transits: `authored/transit-house/lilith/{house}` in `apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json`.
- Natal page composition: `TLDR-NATAL-PAGE-CONTRACT-OWNER.md`, amended by the mechanism-first, house-bridge, and human-pattern rulings.

## Material deliberately not migrated

- Unapproved V1 Lilith base, retrograde, direct, house, and natal wording.
- The stale pre-Friends authority index as an active document.
- Duplicate copies of admin and owner-correction patches already present on main.

Nothing in this audit promotes copy, changes a serving row, or infers owner approval.
