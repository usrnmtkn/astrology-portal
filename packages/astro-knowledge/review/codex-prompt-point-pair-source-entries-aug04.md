# Codex prompt — governed source entries for Chiron, Lilith, and Node Ascendant pairs

Copy everything below the line into Codex. This is source review and governed-entry drafting
only: no billed model calls, no reader copy, no beats, no serving change. It produces review
candidates for owner approval, following the pattern the Jupiter–Ascendant source review set.

---

Four Ascendant pairs serve legacy cards but have no governed synastry aspect entries and
therefore no source authority: Chiron, Lilith (Black Moon Lilith), North Node, and South Node,
each against the Ascendant. Before any beat or draft work, they need what every completed pair
has: bounded, source-backed meanings in `packages/astro-knowledge/data/synastry/aspects/`.
Work on a fresh branch off `main` (suggest `codex/point-pair-ascendant-source-entries`).

## 1. Source review, per point

Use only source material already present in the repository (existing governed point data in
`data/points/`, `data/synastry/point-contacts/`, the reviewed pair-source material for
Chiron/Lilith/Nodes used by the sky-exact corpus, and any owner-authored corpus content). Do not
fetch or import third-party astrology sources; if repository sources are insufficient to bound a
meaning, say so in the review notes rather than inventing or importing.

For each point, establish and record:
- the point's functions as the acting party ({{holder1}}'s point acting on {{holder2}}'s
  Ascendant presentation and entry into situations);
- conjunction, hard (square), and soft (trine) meanings at that contact;
- an explicit exclusion boundary in the style of the existing pairs (no luck, guaranteed
  outcomes, third-party arrivals, literal size/food/bills, scorekeeping, required confidence),
  plus any point-specific exclusions the sources require (for example: Chiron is not a promise
  of healing; the Nodes are not destiny or fate claims; Lilith is not a sexualized shorthand).

## 2. Draft the governed entries

Fifteen files may be expected by convention (conjunction, square, trine per pair are required;
add sextile and opposition only if the source material genuinely bounds them — do not pad).
Each entry follows the existing `synastry-aspect.schema.json` shape exactly:
`A-chiron_B-ascendant_conjunction.json` and so on, with `id`, `kind: "interaspect"`, `planetA`,
`planetB: "ascendant"`, `aspect`, `plainTranslation`, `policy` (copy the standard synastry-policy
string), `voiceNeutral: true`, `status: "DRAFT"`, `authoringStatus: "draft"`, `summaryShort`,
`summaryDeep`. No `humanMoment` — beats are a separate owner step.

Register `chiron`, `lilith`, `north-node`, and `south-node` as valid `planetA` values wherever
validation constrains them, if it does.

Writing constraints for `plainTranslation` / `summaryShort` / `summaryDeep`: match the register
of the existing entries (plain, literal, second person toward the Ascendant holder), no em
dashes, no advice beyond the level the existing `summaryDeep` texts use, and every claim
traceable to the reviewed sources.

## 3. Review packet

Write a source-review document per pair under
`packages/astro-knowledge/review/point-pair-ascendant-sources-v1/` recording: sources used (with
repository paths), the bounded meanings, the exclusion boundary, and any gaps where source
material was insufficient. The owner reviews these alongside the draft entries.

## 4. Verify

- Schema validation passes with no new errors.
- The packet builder run against each new entry fails closed with `missing-human-moment-beat`
  and `generationAllowed: false` — that is the correct state for entries without beats; it
  proves the entries wire into the pipeline and nothing can generate from them yet.
- Pinned sky-exact corpus counts untouched; no serving row, resolver, or bundled artifact
  changes.
- `git diff --check` clean.

Open the PR and stop for owner review of the entries and source documents. Entry approval is an
owner step; beats, drafts, and shipping follow later under separate authorization.

## Out of scope

- Any `humanMoment`, beat, draft, billed call, or serving change.
- The 41 dedupe pairs (separate stream).
- Midheaven pairs and non-Ascendant point contacts.
