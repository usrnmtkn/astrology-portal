# Sign-off sheet: Sun + Venus fact boundaries (24) and Chiron/Nodes serving promotion

Two decisions. Approving a section approves the exact changes shown. Prepared 2026-08-04 (night push).

## Section A: 24 Sun and Venus fact-boundary rows - mark REVIEWED with six fixes

All 24 rows are structurally complete with coherent gift/challenge splits. Bodies are natal second
person, which the packet's natal-source guard already handles. Verified against the ban list: exactly
two token hits. Verified against the dignity table: three rows note their dignity (venus-virgo fall,
venus-pisces exalted, venus-libra home), four omit theirs.

Fixes to apply before marking REVIEWED:

1. sun-libra challenge: replace "People-pleasing" with "Approval-seeking" (people ban; matches the
   mercury-libra and mars-libra fixes).
2. venus-libra challenge: same replacement.
3. sun-aries body: note the dignity - append to the first sentence "The Sun is exalted in Aries, so
   this self-trust runs deep."
4. sun-libra body: append "The Sun is in fall in Libra, so the sense of self builds through others
   before it stands alone."
5. sun-aquarius body: append "The Sun is in detriment in Aquarius, so identity forms against the
   group as much as within it."
6. venus-aries body: append "Venus is in detriment in Aries, so wanting comes easier than waiting."

Decision A: apply the six fixes, mark all 24 rows REVIEWED. ______

## Section B: Chiron in Aries + Nodes in Aquarius/Leo serving promotion

Both articles carry exact owner approval (batch 4). Their fact rows (chiron-aries,
north-node-aquarius, south-node-leo) are REVIEWED; the only remaining gate is runtimeEligible: false,
set when the rows first entered bundles before wiring existed. The wiring now exists and is deployed.

Promotion: set the three fact rows runtimeEligible: true, and add the two article keys
(fallback-hook/sky-sign-copy/chiron/aries and the combined nodes/aquarius-leo key) to the serving
set via the standard serving-manifest transition with the recorded deployment evidence.

Decision B: promote both to serving. ______

## After sign-off: the night-push sequence (one consolidated Codex run)

1. Apply Section A, preflight all 24 Sun/Venus packets with self-lint.
2. Run all 24 authorized Sol-xhigh writer calls in one run (writer-only, no Terra), push the owner
   review sheet to the repo.
3. Editorial review, then one owner sitting for line edits and approval.
4. Apply edits and approvals, then one serving diff covering the approved Sun/Venus keys plus the
   Section B promotion, one merge, one production deploy, one evidence record.

Venus in Taurus note: the old dinner-language unit is superseded by this regeneration; no separate
fix needed.
