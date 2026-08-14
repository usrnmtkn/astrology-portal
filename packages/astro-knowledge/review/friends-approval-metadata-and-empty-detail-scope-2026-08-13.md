# Friends transit approval metadata and empty-detail scope

Date: 2026-08-13

## Source boundary

Friends transit details resolve authored article rows from
`apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json`.
Their composed section provenance may also name shared hooks from
`fallback-source-rows-v3.json`, but this PR does not migrate that second corpus.
The fallback-hook reconciliation is a separate queued scope.

The authored-card file contains 2,764 rows. PR #228 added hash-traced
`exact_owner_approved` metadata to 24 Saturn house rows. This reconciliation
preserves those exact approvals and assigns `owner_signoff_untraced` to 1,565
additional rows whose `review_status` is `approved`, whose `approved_via`
explicitly records owner sign-off, and whose family feeds the transit-detail
normalizers covered by this scope.

Reader wording is unchanged. The target reader-payload SHA-256 remains
`9ae494a7998e4441a03799c477e8e0819028e0822908a7a3ca4aeafb1e1415f5`.

## Governed rows

- 1,501 primary article rows: 377 personal transit aspects, 8 returns, 108
  generic house articles, and 1,008 sign-specific house articles.
- 88 supporting rows: 84 house intros, 2 point explainers, and 2 aspect inserts.
- 1,589 total: 24 `exact_owner_approved` plus 1,565
  `owner_signoff_untraced`.

Of the 1,501 primary rows, 1,393 are reachable on Friends: 385 personal/return
rows plus 1,008 sign-specific house rows. The 108 generic house rows carry
self-only bodies and are selected by the Self renderer, not as independent
Friends articles.

## The remaining 1,175 authored rows

No rows were lost during rebase. The 1,175 rows outside the governed set are
different authored families and are untouched:

- 726 `approved` rows with explicit owner evidence in `approved_via`.
- 333 `approved` rows without explicit owner evidence.
- 115 `approved_reuse` rows, which document source reuse rather than exact
  app-copy approval.
- 1 `needs_review` row.

These rows feed compatibility, Sky, career, station, weekly, or other authored
surfaces. None is a primary Friends transit-detail article, so none remains a
dark Friends transit article because of this PR's 1,589-row boundary. The 726
rows with explicit owner evidence are deliberately unclassified here because
their other surfaces require their own approval-boundary audit.

By surface family, the 1,175 are 1,008 compatibility rows, 54 career rows, and
113 Sky/calendar/station/weekly rows.

## Owner ruling and gate

The owner ruled on 2026-08-13 to accept both approval levels. The shared Friends
gate therefore accepts `exact_owner_approved` and `owner_signoff_untraced`, while
keeping the values distinct in metadata. Rows with neither level fail closed.
A suite-wired regression asserts both accepted levels and rejects ungated rows.

## Empty-detail UX

The UI computes eligible sections before enabling a detail action. A row with no
eligible sections is disabled and shows: “Full interpretation unavailable
pending source verification.” Both detail handlers return before opening if no
eligible section survives, covering stale URLs and programmatic calls.

PR #228 separated paragraph provenance, so an ungated optional enrichment hook
does not suppress an approved base article. The shared fallback corpus remains a
separate migration scope, including its 607 hook rows with no accepted approval
level and the pending family rulings in
`TLDR-APPROVAL-RULING-NEEDED-179-ROWS.md`.

## Separate LL V13 row

`saturn|7th house` in the LL V13 matrix is separate from
`fallback-hook/placement-house-sentence/saturn/7`. The matrix row remains
unapproved in WP-1 batch 3; this work does not approve or serve it.
