# TLDR Batch Editorial Standard V2

Status: owner-directed editorial standard for review workbooks. Editorial output remains a draft until the owner records a verdict. This standard does not authorize serving, approval, auto-publish, or writer promotion.

## Passage shape

Build the passage around one observable idea:

1. behavior;
2. why the behavior happens in this aspect, placement, or house context;
3. the lived consequence;
4. the strongest final sentence.

Stop when the point lands. Do not append a summary, lesson, permission statement, or coaching conclusion.

## Prohibited editorial habits

- No summary endings built from “the gift is,” “the advantage is,” “the lesson is,” “growth becomes,” or “deeper path.”
- No generator cadence built from “can feel,” “can become,” “may come naturally,” “familiar,” “teacher,” “guidance,” or “meaning.” Use concrete behavior and consequence instead. A phrase may survive only when it is literal and indispensable, never as connective filler.
- No clinical language: “nervous system,” “emotional maturity,” “emotional deprivation,” “inner support,” or “regulate you.”
- Do not invent childhood, parental, trauma, or attachment history.
- No em dashes.
- No “whether.”
- No “real” as an intensifier.
- No permission endings.
- No coaching conclusions.

“Things” is explicitly allowed when it is the cleanest ordinary word.

## Fidelity requirements

- Preserve the aspect mechanism and direction.
- Preserve the roles of both planets.
- Preserve the relevant house or sign context.
- Keep possibility as possibility. Do not turn a tendency into a fact.
- If the available source cannot support a concrete passage without fabrication, mark `SOURCE_GAP`.
- Do not rewrite copy that already works. Variety is a feature. The 47 `AS_IS` rows in `TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V2.xlsx` are the calibration reference.

## Editorial dispositions

- `AS_IS`: keep current copy; revised copy must be blank.
- `LIGHT_EDIT`: provide the complete revised passage.
- `REWRITE`: provide the complete revised passage.
- `SOURCE_GAP`: provide no revised passage and do not fabricate one.

Every row requires an editorial note. Editorial dispositions and revised passages remain advisory drafts until the owner supplies a complete, hash-valid verdict workbook.

## Deterministic pre-owner gates

Batch generation fails before an owner workbook is emitted when any effective passage contains:

- an em dash;
- “whether”;
- “real” or “really” used as an intensifier;
- a permission ending;
- a listed clinical term;
- a listed summary scaffold;
- an invented-biography reference; or
- the same normalized opening three-word construction as the neighboring row.

These checks are a tripwire, not a substitute for editorial judgment. Sentence quality, whole-passage coherence, fidelity, and the owner verdict still control.
