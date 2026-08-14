# Saturn in Capricorn article V3 sync report

Status: uncommitted and held at the rendered-sample review gate.

## Candidate replacement

- Current candidate: `sky-placement-saturn-capricorn-article-v3`
- Supersedes the V1 completion candidate and the first era-layer sample candidate.
- Planet education is stored separately from the sign article in the candidate record.
- All V3 article paragraphs are preserved in their authoritative order.
- Two mechanical date conversions are recorded field by field in `candidate.json` and resolve to the same dates in the rendered preview.
- The five owner-directed Sky Page address revisions are applied to the thesis, infrastructure, being-needed, strategy, and history ending. Every other paragraph remains byte-identical to its latest owner source.
- `verify-v3.mjs` confirms all 15 source paragraphs against the final editorial pass and the two owner amendments; the rendered article SHA-256 is `79a59780827bef0febdcd885a0941579798b0ddf5d321b420e277822924648ab`.
- The standing Saturn block now keeps the visibility fact and occult threshold together. The 29-year cycle fact moves after the Sagittarius handoff and directly introduces the immediate recurrence.
- The Venus trine Saturn replacement is recorded inside `candidate.json` as `needs_review`, non-serving copy; the approved source row is unchanged.

## Canonical rule sync

The following owner text was copied verbatim into all three mirrored canonical documents:

- final standing slow-mover law and inheritance boundary;
- four standing slow-mover questions;
- historical-layer rules;
- source-fidelity note;
- occult depth layers;
- site-wide `In astrology` framing ban;
- recurrence library rule.

Updated mirrors:

- `docs/writing/ASTROLOGY_CONTRACT.md`
- `docs/writing/LITERAL_LANGUAGE_RULES.md`
- `packages/astro-knowledge/review/writing-harness-v1/TLDR-Horoscope-Template-Canonical.md`

The site-wide framing ban was also copied verbatim into `docs/writing/BANNED_LANGUAGE.md`.

The 2026-08-12 Sky Page address ruling was copied verbatim into all three canonical mirrors. It supersedes third-person-only Sky Placement register: direct address is allowed and wanted, third-person lived observation remains available, and narrator commentary or fourth-wall breaks remain excluded.

## Register evidence

- The already governed owner-published `Saturn enters Aries 2025` article is classified as Sky Placement register gold.
- Seven supplied PASS fixtures were preserved in `data/writing/SKY_PAGE_REGISTER_GOLD_SATURN_ARIES.jsonl` and added as positive retrieval evidence.
- The article excerpt containing `I'll be honest with you` and commentary about writing Saturn transits remains preserved but is excluded from positive retrieval under the new ruling.
- Voice index: 7,695 -> 7,702 total entries; 7,198 -> 7,204 positive evidence entries; 3,844 -> 3,845 contextual evidence entries; 3,816 -> 3,823 Sky Placement entries.

## Recurrence library

Created `packages/astro-knowledge/data/sky-placement-recurrence-library.json` with:

- the 2017-2020 Saturn-in-Capricorn memory paragraph;
- the final 1929-33, 1959-62, and 1989-92 historical paragraph;
- internal historical sources;
- no visible attribution in candidate reader copy;
- `needs_review`, `ownerApproved: false`, and `renderEligible: false` while the rendered-sample gate remains open.

## Render behavior

- The standing Saturn education block renders before the sign article when an approved row eventually exists; a missing block renders nothing.
- The slow-mover era layer requires all four prose fields and complete engine facts. Incomplete facts fail closed.
- Year-aware previous-sign and prior-residency tokens preserve the 2044-2047 and 2017-2020 ranges.
- Aspects without approved write-ups retain their aspect name and orb only. No generic prose is substituted.

## State

- Billed calls: 0
- Staged rows: 0
- Serving rows: 0
- Approval changes: 0
- Package-version changes: 0
- Generated-artifact changes: 0
- Exact-source validation: PASS
- Evidence index: PASS (7 register-gold fixtures; 1 fourth-wall excerpt excluded from positive retrieval)
- Web typecheck: PASS
- Sky-placement integration and engine contracts: PASS
- Slow-mover era renderer regression: PASS
- Slow-mover engine-facts regression: PASS (Pluto's pre-1800 prior occurrence remains an honest source gap)
- Astro-writing harness: PASS
