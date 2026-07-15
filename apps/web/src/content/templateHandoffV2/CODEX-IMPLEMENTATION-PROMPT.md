# Controlling Codex implementation prompt

Work only on the TLDR Astro fallback/template rendering and admin-preview parity task defined by this archive. Do not resume or modify the accepted calculation/API checkpoint. Do not redesign Dashboard IA, navigation, courses, audio, or unrelated styling.

Read `START-HERE.md`, `TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md`, and all required contracts before editing. Treat this file as controlling. Do not combine it with prompts from older ZIPs.

## First: audit, do not generate

Before changing content, trace the current reader and admin path for one fixture in each required surface. Report the resolved template ID, source tier, record ID, rendered fields, target components, and provenance. Identify strings that are duplicated, bypass the new model, or came from instructions/diagnostics.

Remove any reader copy copied from chat feedback, implementation prompts, audit reports, status messages, or screenshots of TLDR Astro failures. These are prohibited sources.

## Implement contracts, not example prose

Make `contracts/SURFACE-RESOLUTION-MATRIX.json`, `contracts/EXECUTABLE-TEMPLATE-CONTRACT.json`, and the literal layouts in `TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md` executable in the repository. Reuse existing correct runtime models where possible. Do not paste the wording of examples or status reports into records. The Mustache file is the interpolation authority: preserve its fact slots, interpretive slots, optional sections, and surface variants. Its filled examples are fixtures, not universal reader copy.

Required behavior:

1. Resolve surface before resolving prose.
2. Separate compact card copy from expanded detail copy.
3. Map each output field to exactly one reader component.
4. Use exact-combination reviewed sources first.
5. Use planet, sign, house, dignity, sect, timing, and transit-principle records only as supporting constraints unless a contract assigns a specific slot.
6. Never concatenate raw keywords or generic source-bank rows into sentences.
7. Suppress optional slots that repeat the preceding thought.
8. Return `SOURCE_GAP` when a required lived-situation source is absent.
9. Keep technical astrology in a factual footer when the surface requires it.
10. Keep dates in the timing component, not buried or repeated in narrative prose.

## Personalized transit detail

Retain the correct exact-pair-first behavior already implemented for Saturn square natal Venus. Implement the render anatomy, not a rigid six-paragraph formula:

- factual event title;
- editorial headline when a reviewed headline exists;
- date range and short/long-term label;
- one recognizable lived situation;
- an interpretive bridge only if it advances the same situation;
- an optional proportionate response;
- optional pass/long-term context only when relevant;
- one factual astrology footer.

Do not require stock transitions such as `You may be noticing`, `Maybe you`, or `This transit reveals`. Reject them when mechanical or repetitive.

## Required focused fixtures

Implement final rendered-output fixtures for:

- Saturn square natal Venus, long-term;
- Mars conjunct natal Ascendant, short-term, expected to produce `SOURCE_GAP` unless the repository contains a separately reviewed eligible exact-pair record;
- collective Sky Sun in Cancer;
- Home planetary horoscope Sun in Cancer for Gemini rising, resolving Cancer to the 2nd house;
- Moon phase and Moon sign as separate modules;
- natal Sun in Aquarius in the 9th house with eligible day-chart sect;
- a night-chart sect case;
- missing/unreliable birth-time sect suppression;
- a missing exact aspect-pair source producing `SOURCE_GAP`.

For every fixture assert template ID/version, fact inputs, primary source, supporting sources, source tier, rendered field map, initial/hydrated parity, and final visible strings.

## Duplication and safety gates

Tests must fail if:

- expanded narrative appears in the hero or TLDR component;
- Overview equals the complete expanded body;
- any normalized sentence appears twice on one page;
- timing appears in both timing UI and narrative only to restate dates;
- `The astro:` appears more than once;
- compact copy equals expanded copy;
- an instruction/report/status string reaches a reader field;
- a generic transit-house formula is used as a primary interpretation;
- a supporting source becomes an independently concatenated keyword sentence;
- collective Sky and Home planetary-horoscope outputs resolve to the same template;
- Moon phase and Moon sign resolve to the same content body;
- sect copy renders without reliable horizon/birth-time inputs.

## Admin requirements

Admin preview must use the same surface resolver, template version, source selection, field composition, and final renderer as the reader. It may show evidence-only rows, but label them `EVIDENCE_ONLY` or `REFERENCE_SCAFFOLD`; never `READY` merely because a key exists. Persisted reviewed rows may override generated rows by explicit precedence, but preview and reader must show the same final output for the same record.

## Completion standard

Do not report counts of READY records as proof of quality. Completion requires all acceptance gates, route fixtures, final visible-output assertions, duplication checks, hydration parity, typecheck, and build to pass. If the evidence does not cover every combination, report exact `SOURCE_GAP` inventory and leave those combinations unpublished.

At handoff, list only files changed for this focused task, commands run, fixture results, remaining source gaps, and any blocked acceptance gate. Do not call the broader package complete while a required gate is missing.
