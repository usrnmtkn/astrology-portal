# Codex prompt — wire the corpus warmth harvest into aspect write-ups

Copy everything below the line into Codex. This prompt is self-contained except for one repository
file it explicitly references: `docs/editorial-ai/method-corpus-warmth-harvest.md` (the owner-approved
harvest method). No billed calls; this is wiring and spec work only.

---

The owner has approved a repeatable method for grounding reader copy in her published writing: the
corpus warmth harvest, documented at `docs/editorial-ai/method-corpus-warmth-harvest.md`. It is now
required for aspect write-ups on every surface where aspect copy is generated or revised. Implement
the following.

## 1. Harvest step in the aspect generation pipeline

Before any aspect card is written or revised, the packet builder runs the harvest:

- **Core:** each aspect entry's emotional core comes from its existing human-moment beat (the 240
  special-point entries and the classical corpus already have these). If an entry has no human-moment
  beat, the harvest fails closed and the entry is flagged for editorial work; do not invent a core.
- **Search:** match the core's feeling words (not scene nouns) against the owner corpus at
  `voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/reference-surfaces/`, the
  `TLDR-Article-Edition-*-OWNER.md` files, and the VB-005 signature-phrase inventory.
- **Select:** only turn-toward-the-reader lines qualify - lines that name the feeling from inside, or
  give permission or reassurance. Pure observations do not qualify. Selected lines must survive the
  ban list without a fight.
- **Supply:** one to three candidate lines per aspect enter the packet as OWNER FOUNDATION LINES with
  their source-article IDs, under the instruction: "Adapt one of these into the card where it lands
  naturally, keeping its meaning and register. Verbatim is preferred when it fits. Use at most one."
- **No corpus match:** compile with `harvest_mode: none_found`, no foundation lines, and the
  non-blocking `owner-corpus-warmth-none-found` info flag. Keep the register plain and do not invent a
  permission, reassurance, benediction, or turn-toward-the-reader line. Only a missing human-moment
  beat fails closed, because that is aspect editorial-data completeness rather than missing owner
  prose.

## 2. Pronoun handling per surface

- **Sky-to-sky aspect copy (Current Sky):** collective voice; harvest lines containing second person
  are minimally collectivized at packet-build time, and the collectivized form is what enters the
  prompt. The original stays in provenance.
- **Natal and transit-to-natal aspect copy (including angle and point aspects such as
  Jupiter-Ascendant):** second person is allowed on these surfaces, so owner lines may be supplied
  and used verbatim, pronouns intact.
- The existing pronoun lints per surface are unchanged and still run on output.

## 3. Scale rule (from the method file, enforced)

- Full aspect cards with a matched foundation: the warmth beat is at most one sentence, placed after
  the shadow/cost is named - the card's final sentence or the one before it. Under `none_found`, no
  warmth beat is required or invented.
- TLDR lines and short previews: no added beat. The foundation line informs word choice only; the
  packet marks these entries `harvest_mode: vocabulary_only`.
- A card that ends on a warmth beat AND a second conclusion violates the existing stacked-ending rule
  and fails as before.

## 4. Provenance

Every card that uses a foundation line records `warmthSource: {sourceArticleId, originalLine,
usedForm}` in its candidate record. Cards whose warmth line adapts owner corpus material are labeled
owner-corpus-derived. This is evidence-class metadata only; it changes no approval status, and the
normal review gates (lint, judge where authorized, owner exact-wording approval) still apply.

## 5. Judge addition

Add to the aspect judge spec: "The card's turn toward the reader must trace to the supplied owner
foundation lines when present. An invented permission or reassurance line in place of the supplied
material scores 2; a card with no turn toward the reader at all, when foundation lines were supplied,
scores 2. Verbatim or near-verbatim use of a supplied owner line is never penalized as copying - it is
the owner's own writing. Under `harvest_mode: none_found`, require no turn toward the reader and do
not penalize its absence."

## 6. Verify

- Building a packet for an aspect entry with a human-moment beat produces one to three foundation
  lines with source IDs or compiles as `none_found` with a non-blocking flag; an entry without a
  human-moment beat fails closed with an editorial-data flag that never requests owner prose.
- A sky-surface packet shows collectivized lines; a natal-surface packet for Jupiter-Ascendant shows
  the owner's original second-person lines intact.
- A TLDR-line generation packet carries `harvest_mode: vocabulary_only` and no insert instruction.
- A test card using a supplied line records complete warmthSource provenance.
- Owner calibration pieces still score 3.

Out of scope: generating or revising any aspect copy (separately authorized), the placement-article
surface (already wired), and any serving or promotion change.
