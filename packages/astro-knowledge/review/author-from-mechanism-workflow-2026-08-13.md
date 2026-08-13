# Author-from-mechanism workflow record — 2026-08-13

## Authority

- Owner ruling: `tldr-astro-phrasebank/TLDR-AUTHOR-FROM-MECHANISM-RULING-OWNER.md`
- Owner-ruling SHA-256: `b68255fca1e49c716250d924c7cb5544e1ee8005baaa82cf1f2b82a6cef2e8c8`
- Governing sentence: “The AstrologySupport field is the source. The existing prose is not the draft.”

## Defect

The earlier harness could receive an existing candidate as part of the drafting context. That made sentence-level paraphrase the easiest response even when the underlying writing movement was abstract personality description. Correct astrological doctrine could therefore remain reader-distant, generic, therapy-coded, or archetypal.

## Workflow boundary

The governed authoring source is now exactly:

1. source row key;
2. `AstrologySupport`;
3. source constraints.

The source validator rejects candidate-prose fields. Prior copy is withheld from the meaning planner, context retrieval, writer, and reviser. It may enter only the downstream contextual review and deterministic validation steps, where it is comparison evidence for the blocking `paraphrase_of_prior` check.

The current row is also excluded from owner-example retrieval by row key so an approved or indexed copy cannot silently re-enter the writer prompt as a style example.

## Blocking checks added

- `photograph_test`: requires an observable action, situation, exchange, object, time, place, or consequence.
- `trait_entry`: rejects openings that describe the reader from across the room.
- `interchangeable`: rejects copy that does not materially express the supplied mechanism.
- `astrology_summary`: rejects generic horoscope, personality-profile, therapy-workbook, or spiritual-social-post prose.
- `archetype_soup`: rejects imagery standing in for behavior.
- `paraphrase_of_prior`: rejects deterministic structural correspondence with the prior candidate.

The deterministic photograph/trait/summary/archetype checks activate only for meaning plans carrying the governed `AstrologySupport` source. Existing unrelated validation call sites retain their prior behavior. Prior-copy correspondence activates only when downstream comparison evidence is explicitly supplied.

## Governance

- No reader copy was authored or changed.
- No serving source, generated serving artifact, approval state, voice index, auto-publish setting, or writer-promotion state was changed.
- The owner benchmark passages are calibration evidence only and were not imported as serving copy.
- No billed model call was made.
- All future output from this harness remains `needs_review` and requires exact owner approval before any promotion or serving transition.

## Verification

- The owner ruling is hash-pinned in the writing-harness regression suite.
- The harness refuses missing `AstrologySupport`, missing constraints, and prose-bearing authoring sources before any provider call.
- Regression fixtures cover the five owner-identified “describing you from across the room” sentences, archetype soup, prior-copy reproduction, and the three owner benchmark passages.
- The writer-input fixture confirms the support source is present, the prior prose is absent, and the downstream reviewer alone receives the prior comparison.
