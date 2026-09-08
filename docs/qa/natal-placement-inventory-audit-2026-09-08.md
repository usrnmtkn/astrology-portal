# Natal placement inventory audit — 2026-09-08

The 194-row assertion in `scripts/test-natal-placement-sign-house-composition.mjs`
was stale. The current governed inventory contains 195 rows. The only addition
since the gate was last updated in `16ec8bbe` is
`fallback-hook/natal-you-placement-sign-final/uranus/scorpio`; the preceding
194 governed rows are unchanged, with no removals.

Audited in the isolated `codex/fix-composite-writeups` worktree at `66fc28e3`,
after refreshing origin. At audit time it was two commits ahead of
`origin/main` (`7f9e35a7`) and zero behind.

## Provenance and integrity

- Introduced on main by `2ae101be`, PR #655, on September 7, 2026.
- Exact owner source: `docs/content-management/owner-copy/uranus-in-scorpio-2026-09-07.txt`.
- Adjacent JSON receipt identifies owner task `01a07b0b-8090-7f11-81de-cfeefbe5644c`,
  the dated update instruction, and the complete You-view sign passage scope.
- The source row is `review_status: approved`, `owner_approved: true`,
  `reader_only: true`, and `render_policy: reader-only-exact-lived-v1`.
- The receipt, row approval, and exact 256-word body agree on SHA-256
  `06c6cd212215749bd6cbad6a858a4ee4850e885cca61a9e118799ad16acd1ef7`.
- The row is present in the generated deferred core rows and both core and
  full manifests. No new serving approval is needed or granted by this audit.

The passage uses single newlines between its four paragraphs. The existing
test counts only blank-line-separated bodies (`\n{2,}`), so its multiparagraph
gate correctly remains 183. The audit preserves the owner text and formatting.

## Verification and correction

`node --import tsx scripts/test-uranus-scorpio-owner-copy.mjs` passes. It checks
the source hash and word count, then compares Node, browser source, and shipped
artifact output for sign-only and all 12 houses, in direct and retrograde motion.
Each result preserves the complete owner passage and selects the recorded key.

Update the inventory gate to 195 and add assertions tying the one added row to
its exact source body, approval state, hash, and word count. No source content,
approval record, generated package, or renderer is changed.

The corrected placement composition test passes: 195 governed rows, 183
blank-line-separated bodies, and Node/browser/shipped-dist parity. The deferred
runtime row also matches the source row exactly, with one occurrence in each.

Continuing the content suite passes the natal aspect fact boundary and duplicate
key gates, then stops at `scripts/test-friends-owner-signoff-ruling.mjs:161`:
the reader payload hashes to
`84bcb9343e221991b2efe9f363d75aeaf926212319896c82a7c8878484acf4ee`, while the
historical approval record expects
`9ae494a7998e4441a03799c477e8e0819028e0822908a7a3ca4aeafb1e1415f5`.
The identical failure reproduces in the clean main baseline at `6a7621fb`.
This separate approval-payload discrepancy has not been audited or waived;
the full content suite is not green.
