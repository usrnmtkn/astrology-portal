# Codex prompt — generate Jupiter–Ascendant card drafts for owner review

Copy everything below the line into Codex. This is the first billed writing step to run against the
corpus warmth harvest (PR #47, PR #49) and the newly stored Jupiter–Ascendant human-moment beats
(`codex/jupiter-ascendant-human-moments`). It produces owner review candidates only. It does not
approve, promote, or serve anything, and it does not touch the legacy serving copy.

Billed-call budget, owner-authorized for this step: exactly three Sol writer calls (one draft per
target, no retries without stopping for direction) and exactly three Terra judge calls. Nothing
else billed.

---

Jupiter–Ascendant still serves legacy metaphor-heavy copy ("pure fuel," "runs a size larger,"
"friction builds muscle"). The governed entries now carry owner-approved human-moment beats and all
three targets compile through the warmth harvest. Generate replacement card drafts for owner
review, following the same three-card grouping used for the resolved Mars–Ascendant and
Uranus–Ascendant pairs: conjunction, hard, soft.

Branch off `main` only after `codex/jupiter-ascendant-human-moments` (`026e4d29`) has merged; the
beats and schema registration are prerequisites. Suggest `codex/jupiter-ascendant-card-drafts`.

## 1. Build the packets (deterministic, unbilled)

Run `packages/astro-knowledge/scripts/build-aspect-writing-packet.js` with
`--surface synastry-aspect --format full-card` against each governed entry in
`packages/astro-knowledge/data/synastry/aspects/`:

| Target | Entry | Expected |
|---|---|---|
| Conjunction | `A-jupiter_B-ascendant_conjunction.json` | `ready`, `matched`, 1–3 foundation lines |
| Hard | `A-jupiter_B-ascendant_square.json` | `ready`, `matched`, 1–3 foundation lines |
| Soft | `A-jupiter_B-ascendant_trine.json` | `ready`, `none_found`, non-blocking corpus-miss flag |

If any packet deviates from this, stop and report; do not edit beats, corpus, or matcher to force a
different mode.

## 2. Write one draft per target (billed: 3 Sol calls)

Use the marie-satori-writer contract and the packet's `promptBlock` as supplied. Constraints that
must reach the writer:

- Direction is fixed: {{holder1}}'s Jupiter acting on {{holder2}}'s Ascendant.
- Source boundary (already established; do not re-research): Jupiter supplies confidence,
  encouragement, optimism, support, advice, tolerance, goodwill, appetite for possibility. The
  Ascendant is outward presentation, first approach, entry into situations, freedom to show up
  naturally. Conjunction: close constant contact, improved mood, relaxation, shared aspirations,
  possible overreliance or overindulgence. Hard: encouragement becoming pressure, overpromising,
  misleading advice, overconfidence, carelessness, extravagance, overreliance. Soft: benefit of the
  doubt, optimism, easy support, low friction.
- Excluded by the source boundary: literal luck or improved odds, guaranteed fortunate events,
  invitations or introductions arriving through the relationship, bills, food, portions, or literal
  size, scorekeeping, guaranteed successful plans, any claim that the Ascendant holder must perform
  confidence.
- Second person is allowed on this surface. Match the row shape and placeholder conventions
  (`body_you` / `body_they`, `{{holder1Poss}}` etc.) used by the shipped Mars–Ascendant and
  Uranus–Ascendant rows so the drafts are shippable without reformatting.
- All Marie Satori editorial decisions apply, including: no em dashes, the morning-reader test,
  no stock closers, and stop when the behavior and cost are clear. The legacy Jupiter–Ascendant
  copy is negative evidence only; never treat it, or any unapproved card, as a format exemplar.
  "Friction builds muscle"-style template closers are specifically what these drafts replace.
- Warmth rules from the packets: conjunction and hard carry supplied owner foundation lines; if a
  warmth beat is used it is exactly one sentence, placed after the shadow or cost, and must trace
  to a supplied line (record `warmthSource` and the `owner-corpus-derived` label). The soft packet
  is `none_found`: keep the register plain and do not invent a permission, reassurance, or warmth
  line. Absence of warmth is acceptable; imitation warmth is not.

## 3. Judge (billed: 3 Terra calls)

Run the aspect judge on each draft after deterministic checks pass. The supplied-foundation-line
addition applies to conjunction and hard; under `none_found`, the soft draft is not penalized for
having no turn toward the reader, but invented imitation warmth still scores 2.

## 4. Output for owner review

Write a review packet under `packages/astro-knowledge/review/jupiter-ascendant-card-drafts-v1/`
containing, per target: the compiled writing packet, the draft (all row variants), deterministic
check results, judge verdict, and full provenance for any warmth line used. Include a short
markdown summary listing the three drafts side by side with the legacy copy they would replace
(quoted for comparison only).

Status of all drafts is candidate / `needs_review`. Only the owner approves exact wording; better,
good, or high judge scores do not grant approval or promotion.

## 5. Verify

- No governed entry, beat, schema, corpus, matcher, or policy file is modified.
- `fallback-source-rows-v3.json`, resolver files, bundled manifests, and all serving content are
  untouched; reader-facing content contract passes unchanged.
- Pinned corpus counts unchanged: 240 targets, 198 matched / 0 none_found ready, 42 fail-closed,
  225 owner calibration entries.
- Billed-call count is exactly six (3 Sol, 3 Terra); log them.
- `git diff --check` is clean.

## Out of scope

- Approval, promotion, serving priority, dashboard rows, production content.
- Any edit to legacy serving copy — shipping approved wording is a separate step following the
  Mars/Uranus pattern (PR #44 / #45), after owner exact approval.
- Opposition and sextile governed entries, all other factor pairs, and the wider legacy corpus
  (stock closers, duplicated copy, approval provenance) — separate governed sequence.
- `FEELING_FAMILIES` inflection coverage (separate prompt).
