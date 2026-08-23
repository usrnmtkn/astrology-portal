# TLDR Astro — Phrase Bank & Production Library

Built from the `tldr-astro-template-handoff-v2` (2.0.1) evidence corpus. Aligns to that package's contracts (`SURFACE-RESOLUTION-MATRIX`, `EXECUTABLE-TEMPLATE-CONTRACT`, `SOURCE-CLASSIFICATION`, `SECT-ELIGIBILITY`, voice spec). Nothing here replaces the calc/API checkpoint, dashboard IA, navigation, courses, or audio.

## Canonical content and workbook export

The repository is the canonical source for governed content. The former hand-maintained canonical-workbook contract is retired. The complete content inventory and deterministic export process live in [`data/content-inventory/`](../data/content-inventory/README.md): JSONL is the byte-reproducible artifact of record, its content fingerprint binds sorted keys, exact wording, and governance status, and XLSX is a generated review view only. The workbook is never imported into production and is never evidence for the writer or judge.

## What's here

```
copy/TLDR-ASTRO-PRODUCTION-LIBRARY.md   The consolidated production library (15 sections + tables + 8 deliverables).
                                        Article-type taxonomy, event templates, personalized natal layer,
                                        sign/house/planet/aspect banks (provenance-tagged), phrase/hook/fallback
                                        libraries, surface variants, validation rules, source registry, open gaps.

phrasebank/reviewed-clauses.json        Reader-ready AUTHORED clauses in Marie Satori voice, keyed by surface +
                                        template family, with source_keys provenance. Every required fixture:
                                        Saturn square Venus, collective Sun-in-Cancer vs Gemini-rising 2nd-house,
                                        moon phase vs moon sign, natal placement (day-sect / suppressed), sky
                                        aspect, retrograde phases, daily. Includes an intended SOURCE_GAP.
phrasebank/houses.json                  House scene/refine bank (context lane).
phrasebank/cc-aspect-pair-reviewed.json All 84 cc/aspect-pair rows PROMOTED from EVIDENCE_ONLY_UNTIL_REVIEWED to
                                        REVIEWED_CLAUSE: voiced, decomposed into transit-template slots, seam-cleared,
                                        valence + recommended template tagged. Feeds the §4 transit templates.
sources/moon-compatibility-library.json 144 resolved directional Moon-to-Moon compatibility records. Feeds
                                        phrasebank/cc-compatibility-writeups.json via tests/build_compatibility_writeups.py.
                                        Records with `format: "multi-paragraph"` render only on `\n\n` paragraph
                                        breaks; never split sentences or semicolons.
MOON-COMPATIBILITY-CARDS-RESOLVED.md    Editorial-readable companion to the resolved Moon library, with coverage and
                                        source-review CSVs alongside it.
TLDR-Compatibility-No-BirthTime-Spec.md  Certainty check and picker flow for no-birth-time compatibility charts,
                                        especially ambiguous Moon sign dates.
REVIEW-QUEUE-REPORT.md                  Status of the aspect-pair review queue: what was promoted, how, verification,
                                        editorial sign-off note, and the remaining SOURCE_GAP surface (angles, outer->personal).

resolver/surface_resolver.py            Resolves surface -> source-slot recipe. Proves Sky collective !=
                                        Home rising-house-personalized != natal.
resolver/lane_priority.py               Exact -> context -> keyword lane order; SOURCE_GAP; optional-slot suppression.
resolver/seam_filter.py                 Rejects keyword seams ("X moves through Y circumstances", "brings",
                                        "meets", comma keyword-runs) and stock summary openers that only restate.
resolver/sect.py                        Day/night sect eligibility; Mercury calculated; sect copy suppressed
                                        without birth time + horizon; transit sect-weighting flag OFF (experimental).
resolver/schema.json                    Per-entry schema (lane, surface_scope, card/detail, publication state).

tests/build_banks.py                    Regenerates library sections 5-8 from the source corpus (needs SRC_DIR).
tests/validate.py                       Verification: resolver divergence, seam filter over every authored slot,
                                        compact != expanded, provenance integrity, SOURCE_GAP hygiene, fixtures.
tests/build_aspect_reviews.py           Authors + emits the 84 reviewed aspect-pair clauses.
tests/render_harness.py                 Extracts the mad-libs Mustache templates, renders every reviewed clause,
                                        runs each output through the seam filter + 10-point acceptance test.
```

## Run the checks

```bash
export SRC_DIR=/path/to/tldr-astro-template-handoff-v2/sources
python3 tests/validate.py                 # 17/17 checks
python3 tests/build_aspect_reviews.py     # writes 84 reviewed aspect-pair clauses
export MADLIBS=/path/to/TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md
python3 tests/render_harness.py           # 84/84 rendered + validated; SOURCE_GAP path proven
python3 tests/build_banks.py > banks.md   # regenerate the vocabulary banks
```

## Core invariants enforced

- Resolve the surface before selecting any prose source.
- Compatibility records with `format: "multi-paragraph"` render paragraph breaks only where `\n\n` appears. Do not split on sentences or semicolons; replace `{friend}` with the display name every time.
- Exact planet-in-sign / aspect-pair source first; a house locates the scene, it never emits a keyword paragraph.
- Sources are evidence; the reader only meets the voiced layer. Compact card copy differs from expanded detail.
- Missing exact source -> `SOURCE_GAP`. Never compose prose from keywords, prompts, feedback, reports, or raw CC copy.
- Sect content only with reliable birth time + horizon. Transit sect-weighting stays off (experimental).
```
