# Synastry legacy corpus — audit map

Date: 2026-08-04
Basis: `origin/main` at `3a13f036` (`fallback-source-rows-v3.json`, `hookRows` section,
`fallback-hook/synastry-pair/*` keys). All counts computed deterministically; no billed calls.
This is a map for planning the governed review-and-rewrite sequence. Nothing in this document
changes any status, approval, or serving content.

## Corpus shape

- 483 serving rows: 161 factor pairs × 3 aspect groups (conjunction, hard, soft), each with
  `body_you` / `body_they` variants.
- 14 of the 161 pairs are planet–Ascendant pairs; the rest are planet–planet.
- Every one of the 483 rows carries `review_status: "approved"` and all are reader-eligible.

## Findings

### 1. Approval provenance: 354 of 483 rows have none

The approval model is `review_status` (the only field the resolver reads) plus an optional
free-text `approved_via` note. 129 rows carry an `approved_via` (owner chat sign-offs dated
2026-07-21/22, plus the six Mars/Uranus–Ascendant rows shipped via PR #44/#45); **354 rows are
marked approved with no provenance of any kind.**

Structural gap behind the count: no serving row anywhere links to an approval record. The exact-
approval convention that exists in the writer pipeline (`approvalLevel: exact_owner_approved`,
SHA-256 of approved payload, `sourcePaths`, revocation records) never reaches serving rows —
`approved_via` is an unvalidated sentence no script checks. Even the six resolved Mars/Uranus rows
carry only free text. Until rows can reference approval records, "approved" in this file is a
claim, not evidence.

### 2. Stock closers: 339 rows end on one of three templates

Closer-signature analysis (final sentence, placeholder-normalized):

- 113 hard rows end "…until the friction builds muscle."
- 113 soft rows end "…the same side without trying."
- 113 conjunction rows end "…running as one instinct." (with a one-word slot varied)

That is exactly 339 rows — 113 per aspect group, i.e. every row except the resolved and
otherwise-differentiated ones — whose endings are a fill-in-the-blank template, the exact
construction the editorial decisions reject ("stop when the behavior and cost are clear", no
swappable taglines).

### 3. Duplicated copy: 41 pairs serve identical text for all three aspects

41 factor pairs (123 rows) have byte-identical body copy for conjunction, hard, and soft — the
aspect distinction is served but not written. These are heavily concentrated in the classical
planet–planet grid (sun/sun, sun/moon, moon/venus, mercury/mercury, …). Corpus-wide, the 483 rows
contain only 401 unique texts.

### 4. Confirmed resolved vs. confirmed legacy

- Resolved with provenance: `mars/ascendant` and `uranus/ascendant` (6 rows, per-card contract
  tests in `scripts/`).
- Confirmed legacy and next in queue: `jupiter/ascendant` — conjunction still serves "runs a size
  larger", hard serves "pure fuel" and "friction builds muscle", none of the three rows has
  provenance. Draft generation is specified in
  `codex-prompt-jupiter-ascendant-card-drafts-aug04.md` (blocked on the beats branch merging).
- Remaining planet–Ascendant pairs (11): sun, moon, mercury, venus, saturn, neptune, pluto,
  chiron, lilith, north-node, south-node — all against ascendant, all without provenance.

## Recommended sequence

1. **Provenance re-status (schema, before any mass rewrite).** Add a structured approval reference
   to serving rows (pointer to a review-record id, following the existing exact-approval
   convention) and a validation script. Re-status the 354 provenance-free rows honestly: rows the
   owner actually signed off keep `approved` with a backfilled reference; the rest become
   `reviewed` (still reader-eligible, no serving change) so `approved` regains meaning. No copy
   changes in this step.
2. **Jupiter–Ascendant pilot** (already specified) — validates the writing pipeline end-to-end on
   legacy copy and produces the first real cost/quality numbers.
3. **Dedupe pass.** The 41 identical-copy pairs are 123 serving rows but at most 41 real writing
   targets (and each needs aspect-differentiated copy, so plan 3 cards per pair with shared
   research). Sequence them after the pilot proves the per-card process.
4. **Closer repair vs. full rewrite triage.** For rows whose body is serviceable but whose ending
   is a stock template, a closer-only revision may be sufficient; the audit's closer signatures
   give the exact row lists. Owner decides per batch which tier each group gets.
5. **Remaining Ascendant pairs** in owner-priority order, using the human-moment-beat →
   harvest-packet → draft → exact-approval path now established.

## Row-list availability

The signature analysis can emit exact `contentKey` lists per category (stock-closer rows,
duplicate pairs, provenance-free rows) on request; they are deterministic re-derivations of the
counts above.
