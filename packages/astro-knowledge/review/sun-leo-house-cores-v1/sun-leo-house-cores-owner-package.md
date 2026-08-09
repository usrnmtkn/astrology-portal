# Owner package: Sun in Leo house cores (12 rows) + "Where it lands for you" render spec

Queue position: THIRD in the Codex scope queue, behind (1) the Moon-sign entries package
(45 rows) and (2) the emergency-row retirement (28 rows deleted). Flight rule v2 applies:
rebase onto current main immediately before merging, regenerate all generated artifacts,
verify approved rows byte-identical.

## Approval record

OWNER EXACT-WORDING APPROVAL: GRANTED 2026-08-08. Owner statement, verbatim: "yes" (given in
direct response to "your exact-wording yes or no is the only remaining move" on the V13 set).
The approved wording is the twelve cards in TLDR-House-Horoscope-Template-and-SunLeo-Pilot.md
(V13 status), extracted byte-identical into TLDR-SunLeo-House-Cores-Staged-Rows.json. These
are settled text under standing governance: no rewriting, ever, without a new owner ruling.
Copy the approval record into packages/astro-knowledge/review/sun-leo-house-cores-v1/ in the
PR; merge = approval per repo convention, but the exact-wording approval above is the
authority.

## The rows

File: TLDR-SunLeo-House-Cores-Staged-Rows.json. Chunk sun-leo-house-cores-v1, 12 rows,
contentKey house-horoscope-core/sun/leo/house-{1..12}, content_role house_horoscope_core,
grammar_frame second_person_block, review_status approved. body_you and body_they are
identical: the core always addresses the chart holder. Rows land verbatim; do not reflow,
relint, or "improve" them. Verification before merge: diff each staged body against the V13
pilot file card; any difference is a hard stop.

## Render spec: "Where it lands for you" (owner-ruled page order, 2026-08-08)

1. Collective placement article: current serving copy, untouched.
2. ASPECTS TO THE PLANET: sky aspects the transiting planet makes, engine-dated, rendered
   above the personal section. Quiet sky = no section (fail closed, no filler).
3. WHERE IT LANDS FOR YOU: the house core for the reader's whole-sign house (transit sign x
   rising sign -> house), second person. ASPECTS TO THE NATAL CHART weave inside this block,
   engine-gated per reader, reusing existing approved transit-to-natal families where they
   exist; no approved family = no aspect line (fail closed).

Gating rules:
- No stored chart / no rising sign: the personalized block does not render at all. The
  collective article still serves. Never guess a house; never serve a generic substitute.
- Only sun/leo keys exist in this pilot. Any other planet-sign lookup is a SOURCE_GAP: render
  nothing personalized, log the gap. Do not fall back across signs or planets (owner ruling:
  sentences are not fungible across placements).
- Anything date-bound belongs to the aspects blocks, never inside a core.
- Renderer must not truncate or re-punctuate cores; render the paragraph as one block.

## Editorial law for any future work on this surface

TLDR-Horoscope-Template-Canonical.md governs: five movements, no-vagueness governor, drafting
pipeline, matrix usage rule, complication rule, construction-variation and mechanical
repetition checks, opening-syntax rule, register benchmark, and the owner-issued EDITORIAL
REASONER (applies to both Codex and Claude). Voice authority is the owner corpus and explicit
owner edits only. Lint everywhere: no em dashes, no "whether".

## Open items (do not resolve in this PR)

- "intimacy and energetic exchange" as the user-facing 8th house label: LATER owner decision.
- Engine aspect-ranking question (Sun-Jupiter conjunction absent from ranked facts).
- Aspect copy specific to this surface, closer variants per core, and extension to other
  planets: future packages, each behind its own exact-wording approval.
