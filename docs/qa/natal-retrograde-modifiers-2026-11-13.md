# Natal retrograde modifiers: local verification

Owner request: [November 13 chat](thread:01a1d6f0-ad90-7d52-afbd-adcc9539b867).
Branch: `codex/natal-retrograde-house-modifiers-20261113`, based on refreshed
`origin/main` at `61a60346e09b72ba6b70774740f238e2f402cd76`.
This records an uncommitted local implementation, not a merge or deployment.
Its isolated worktree has its own `npm ci` installation.

## Behavior

- 12 supported retrograde bodies/points × 12 houses give 144 independent
  modifier identities, with separate You and Friend copy across all signs.
- The modifier adds a complete third reader part without replacing either base
  paragraph. Actual App normalization retains its retrograde section and source
  key. Multi-paragraph modifier copy remains complete.
- Direct placements, other planets and other houses cannot select that modifier.
  Missing or unapproved modifiers do not use the former shared retrograde sentence.
- Exact planet/sign/house/motion full write-ups retain verbatim precedence and
  do not acquire another appended modifier. Retrograde override labels name motion.
- No owner content was imported, generated, changed or published. All write
  tests use isolated storage and synthetic prose.

## Executed checks

Passed:

- `test-natal-retrograde-modifiers.mts`: all 144 identities, creation, save/reopen,
  incomplete-publication rejection, variable validation, stale-write refusal,
  explicit Friend approval, public reader transport, Node/browser/shipped bundle
  selection, sign independence, direct/planet/house isolation, missing and
  unapproved copy, full-copy precedence and actual App normalization.
- Existing natal motion, source finder, dependency hydration, preview API,
  dynamic-key, Friend publication and 8,112-placement introduction checks.
- Existing exact-copy routing, Friends runtime, full-detail preservation, cache
  contract and refresh wiring checks; reader-copy boundary and drafting-note audit.
- Web and admin typechecks; CSS/token/Studio architecture audits.
- Fresh web and standalone admin builds; web and admin bundle budgets; admin lazy
  boundary and hook-catalog packaging contracts.
- Six fresh-build Playwright cases: new modifier creation, persistence, publication
  and reader previews at 390/1440 pixels in light/dark, plus existing complete
  Friend publication at both widths. The four final modifier screenshots were
  visually inspected. Computed heading metrics match the existing source headings.
- Source and admin-asset privacy checks with the existing protected policy.

Preserved failures and corrections:

- The legacy `verify-fallback-architecture.mjs` reports 240 failures. Running it
  on unchanged main and this candidate produced identical failure lines. It is
  not recorded as passing.
- Initial test setup imported a styled React module into Node and then omitted
  API event metadata and complete draft fields. The pure draft builder and fixture
  payloads were corrected before the integration check passed.
- The initial admin aggregate exceeded its existing gzip budget by 374 bytes.
  Redundant new text and a duplicate body list were removed; the unchanged budget
  passes. The first web graph also pulled Studio tools through the shared identity;
  assigning that pure helper to the existing reader eligibility chunk fixed the
  boundary, and the final fresh build passes the original web budget.
- The first privacy invocation lacked a local policy. Verification was rerun with
  the existing protected policy; no policy contents were copied or logged.

The implementation-stage evidence above predates the release follow-up below.
Production content was not changed; deployment verification remains pending.

Release follow-up: PR #1472 initially failed the social contract because the
package version update made the tracked knowledge-index source hashes stale.
The canonical generator refreshed 330 source hashes and their derived content
hash without changing index records or prose. The previously failing generated-report judge contract
then passed locally; the phrase index remained current. New exact-head release
checks and production verification are required before reporting deployment.

The next CI run exposed the corresponding stale deterministic Sky comparison
artifact and the inventory endpoint's prohibition on direct web-library imports.
The comparison generator refreshed hash metadata with zero provider calls; the
modifier identity now loads through the endpoint's existing lazy write library.
The comparison, fast-inventory, natal publication and generated-report judge
contracts passed locally after those corrections.

API shard 1 then exposed a missing emitted dependency in the Calendar plain-Node
fixture. Adding the shared modifier identity to its explicit entry-point list
made the complete Calendar save/reopen/publication/reader contract pass locally.

The next full CI candidate passed all API/browser jobs except Sky Studio's admin
build budget. Its synthetic-auth profile exceeded startup by 584 raw / 199 gzip
bytes and aggregate JavaScript by 57 gzip bytes, before browser tests ran.
Deferred regrouping increased aggregate cost and was discarded. The final
correction keeps the existing graph, shortens repeated natal editor guidance,
and derives the opposite sign from the existing zodiac order rather than a
second lookup table. Source identities, authored reader copy, and budget ceilings
remain unchanged. The natal source mapping, dependency, publication, introduction
matrix and fresh-browser checks are rerun for the integrated candidate.

Integrated candidate `48cef8f2515649f68218b66deb73ab48f044e28a` rebases onto
main `b3bfc14ea` without conflicts. Its CI synthetic-auth build passes unchanged
ceilings: startup 844,564 raw / 245,633 gzip bytes; aggregate 928,094 gzip bytes.
All 14 fresh-browser natal publication/recovery cases pass, including all four
modifier width/theme combinations; final screenshots were visually inspected.
The source/dependency contracts, 144 modifier identities and publication flow,
and 8,112-placement introduction matrix pass. This note-only amendment follows
those checks; exact-head CI and production verification remain pending.
