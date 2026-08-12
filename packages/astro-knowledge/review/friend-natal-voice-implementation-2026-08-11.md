# Friend natal voice implementation and review wall

Date: 2026-08-11  
Status: **READY FOR OWNER REVIEW — no candidate wording is approved or serving**

Authority:

- `packages/astro-knowledge/review/friend-natal-pronoun-audit-2026-08-10.md`
- `tldr-astro-phrasebank/TLDR-FRIEND-NATAL-VOICE-RULING-OWNER.md`
- `tldr-astro-phrasebank/TLDR-REPORT-LIVED-PROSE-STANDARD-OWNER.md`

## Implemented runtime contract

The Node and browser fallback resolvers now select vocabulary by person. For friend voice, an eligible `body_they` wins; a pronoun-neutral canonical body may be reused; an ungoverned second-person body fails closed with `SOURCE_GAP`. Friend `body_they` hooks also fail closed on second-person leakage, and the final composed friend paragraph has a second defensive person check. Disguised-advice forms are enforced as a build-time ratchet and candidate gate: historically approved rows remain serving until the owner approves exact replacements, while new additions fail the test baseline.

The candidate sources are separate from the canonical approved source:

- `source-rows/friend-natal-vocabulary-they-candidates-v1.json`
- `source-rows/friend-natal-row-level-candidates-v1.json`

Every candidate is `needs_review`, `ownerApproved: false`, and `promotionAuthorized: false`. Canonical self copy and approved source rows were not edited. Candidate rows inherit all source references and non-copy metadata from the matching canonical key.

## Scope ruling

The source contains 40 vocabulary rows with second person. Only 26 are referenced by friend-natal composition and received `body_they` candidates:

- 5 `house-jurisdiction`
- 9 planet function/productive/excess rows used by natal composition
- 1 `house-pressure`
- 11 Chiron `placement-gerund` rows

Fourteen rows remain deliberately outside this pass:

- 7 `dodont-*` rows: daily/action-item person contract
- 7 `sky-planet-function/*` rows: Current Sky person contract

Those 14 were not rewritten because the owner ruling explicitly excludes daily and Current Sky families from friend-natal scope.

Annual profection hooks and transit activation hooks are also excluded because they are forecast/transit surfaces, not natal portrait copy. The earlier review-only `profection-year/4` candidate was removed. Six natal aspect-pattern renders were added to the composed audit. The 16 `element-pattern/*` records are compatibility rows that combine reader address with `{{other_name}}`; despite the descriptive family name, their exact stored contract conflicts with the ruling's synastry/comparison exclusion, so they remain flagged rather than rewritten.

The audit's 769 non-synastry `body_they` second-person hits were scanned in full and retained as a ratcheted baseline. Most belong to daily, Current Sky, lunation, and other reader-addressed families that require separate person-contract rulings. The 14 `element-pattern/*` hits contain relationship placeholders such as `{{other_name}}`; despite the family name, their exact records are relationship-shaped. They are classified:

> AMBIGUOUS PERSON CONTRACT — OWNER RULING REQUIRED

No `element-pattern/*` wording was changed.

## Row-level candidates

The review-only row candidate file contains:

- `fallback-vocab/sign-adverb/cancer` — LIGHT EDIT; removes the composed “feel things ... by feel” repetition.
- `fallback-hook/angle-sign/ascendant/pisces` — LIGHT EDIT; applies the audit's Pisces correction.
- `fallback-hook/placement-sentence/mercury/aries` — REWRITE; uses the owner ruling's worked friend-voice example and removes real-filler, hidden advice, referent ambiguity, and translation-required phrasing.
- `fallback-hook/aspect-type/opposition` — REWRITE; removes the mixed referents in “they sit at opposite ends of them” and turns “The work is balance” into observation.
- `fallback-hook/ruler-method/saturn/cancer` — REWRITE; turns “The work is learning...” into an observed protection pattern.
- 12 additional in-scope hooks with deterministic disguised-advice or non-friend referent collisions — REWRITE; `planet-intro`, placement sign/house, angle, natal aspect, and empty-house families.

The candidate JSON is the item-level review packet: each record supplies the exact key, field, proposed friend copy, grammar frame, governance state, and canonical metadata-inheritance rule. The original self/friend copy remains byte-identical in `fallback-source-rows-v3.json` under the same key.

## Deterministic QA

`scripts/test-friend-natal-pronoun-contract.mjs` now checks:

- exact 40-row audit baseline;
- exact 26-row friend-natal candidate scope and 14-row exclusion;
- candidate governance fields;
- candidate second-person, disguised-advice, real-filler, and translation-required gates;
- approved source rows were not given in-place `body_they` mutations;
- fail-closed serving behavior when a governed friend variant is missing;
- Node/browser preview parity;
- all 793 composed placement, angle, natal-aspect, natal-aspect-pattern, empty-house, and house-glossary renders;
- zero second-person or deterministic disguised-advice hits across those 793 preview renders;
- pronoun-grammar heuristic review. Fourteen heuristic hits remain, all reviewed false positives involving valid relative clauses such as “rewards they fully earned” and “the people who love them would.” New shapes fail the gate.

The shared prose gate now detects `real-filler` and `translation-required` in deterministic lint. The Sky card, Sky placement, and long-form article judges receive the same two named rules. Exact previously approved copy is flagged for owner re-review without being silently de-approved.

The machine-readable review packet is `packages/astro-knowledge/review/friend-natal-voice-audit-v1.json`. It records all 793 composed triage results, every one of the 43 edited candidate items, original and proposed copy, metadata hashes, exact scope/exclusions, SHA-256 drift evidence, finding codes, composition samples, and a reproducible representative sample. Normal content tests byte-compare this artifact; regeneration requires an explicit `--write-audit` run and review of the resulting diff.

## Broader editorial audit still open

The composed scan confirms that the targeted pronoun/advice defect is closed in review preview, but the existing approved friend frames are **not yet a complete implementation of the broader friend-register rewrite**. Across 793 composed preview renders, deterministic triage produces 303 `AS IS`, 198 `LIGHT EDIT`, and 292 `REWRITE` results. It still finds:

- 378 renders with existing globally banned vocabulary, including vague `things`, `whether`, generic `real`, judge/grade language, and astrology-`asks` shorthand;
- 146 renders using a known repeating skeleton such as `Pushed too far` / `At their best`;
- 49 renders triggering the new real-filler frequency/pattern audit;
- 3 renders triggering the current deterministic translation-required phrase set.
- 144 empty-house renders with source-facing `Timing:` transit language embedded in the natal composition.

These are existing approved source lines. They were not rewritten or unapproved without exact owner wording approval. They require a separately reviewed friend-copy batch before the entire friend surface can be called register-complete.

## Focused candidate review sample

All samples below are admin/review preview renders, not serving authorization.

1. **Mercury in Aries, 3rd house** — candidate sentence: “Their wit is quick and so is their temper. The idea they drop in irritation today is often the one they wish they had kept once they have cooled off.” Pronoun/advice/grammar QA: PASS.
2. **Moon in Cancer, 6th house** — candidate composition now reads “They feel things protectively, tenderly, and on instinct.” Pronoun/advice/grammar QA: PASS. The wider approved frame still needs friend-register review.
3. **Pisces Ascendant** — candidate close: “Regular time to come back to themselves keeps this gift from emotionally draining them.” Pronoun/advice/grammar QA: PASS.
4. **Mars trine Jupiter** — candidate portrait removes the non-friend referent in “more often than they should” and describes the consequence as becoming underchallenged. Pronoun/advice/grammar QA: PASS.
5. **Sun in Leo, 1st house** — the vocabulary leak is removed with “needing attention to feel important.” Pronoun/advice/grammar QA: PASS. The surrounding approved frame still contains `whether` and repeating-skeleton language, so the full passage remains queued for the broader friend-register rewrite.

The representative random sample required by the ruling is stored verbatim in the machine-readable review packet. It selects the lowest SHA-256 rank in each of six in-scope families using the fixed seed `friend-natal-owner-review-2026-08-11`; the current keys are `placement:lilith/capricorn`, `angle:midheaven/pisces`, `aspect:mars/square/saturn`, `aspect-pattern:grand_square`, `empty:1/taurus`, and `glossary:9`.

## Promotion wall

- Auto-publish: OFF
- Writer promotion: not authorized
- Candidate serving state: none
- Canonical self-copy drift: none
- Required next authority: exact owner approval of selected candidate wording, followed by a separately scoped rewrite/review of the remaining 378 banned-vocabulary, 146 skeleton, 49 real-filler, 3 translation-required, and 144 source-facing composed findings.
