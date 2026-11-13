# House Transit and Natal publishing recovery

Integrated base: `099957b198bff58c9bad5373f8c08089b5ae5f0d` (#1460 and #1461).
Original acceptance base: `988c17cf7dccad62c01180fd4273bd5c2caebe60`.
The final commit and exact-head release results belong in the PR. This document
records isolated acceptance, not production publication evidence.

## Reproduced defects and resulting behavior

- Natal placement and empty-house previews had no retry after an initial 503,
  and an unanswered fetch could keep loading indefinitely. Both now use the
  existing bounded read-only transport and an explicit retry. Same-context
  refresh failures retain the last assembled reading; changing context clears it.
- Natal sect comparisons now share one 45-second deadline across both requests
  and their response bodies. Retry remains explicit, and a superseded response
  cannot replace the current comparison.
- An approved-source recovery plan became stale after retire/publish-again,
  leaving its correctly rejected 409 unrecoverable in the UI. A definite
  precommit rejection now offers a new read-only review. Restoration still
  requires confirmation of the fresh plan. Uncertain-operation status/cancel
  handling is preserved.
- Natal's preview treated an explicit installed-baseline reset as a missing
  pinned override. It now recognizes the existing reset marker. Retired sources
  and missing or mismatched pinned versions remain unavailable.
- Saving a private Natal editorial edit changed the published row to DRAFT,
  withdrawing its public reading. Eligible reusable editorial sources now use
  the existing separate private-revision transaction. Public A stays unchanged
  through draft/review/reload; explicit publication promotes complete B.

## Acceptance evidence

All write tests use synthetic passages in isolated storage. Public-reader
eligibility is checked through actual handlers and publication migrations,
not inferred from LIVE labels. Rendered checks compare full paragraphs or all
assembled parts, including the final paragraph.

| Flow | Evidence |
| --- | --- |
| House core/sign and Natal intro/sign lifecycle | Six mobile/desktop cases cover publish A, private B, reload, publish B, archive, restore as non-serving draft, republish, retire, publish again, stale-plan rejection, fresh recovery, complete inherited baseline, preserved history and unrelated House source. |
| Natal editorial library | Eight mobile/desktop cases cover rulership, chart sect, general planetary sect and placement-specific sect; private save/reload keeps A, explicit publish promotes B, identity facts remain exact, archive/draft restore/republish survives reload. |
| Preview recovery | Eight placement/empty-house cases cover initial 503 and abort-aware stalled fetch at both widths; retry renders complete copy without a write or page error. |
| Sect comparison | Sixteen existing comparison cases remain covered; the mobile light Jupiter/day case additionally stalls each endpoint independently and retries. |
| Lost recovery acknowledgement | Four existing width/theme cases retain status-only resolution and preservation. |
| Friend publication | Both existing widths retain complete separate You/Friend wording and reload. |
| API and SQL controls | Six new actual-handler editorial flows; 19 PostgreSQL target/replay/conflict cases, including private/public identity, stale versions, package/personal exclusions, and unchanged function ACL/SECDEF. Existing Calendar controls exercise 77 SQL targets, including Article/Guide/Astro101. |

Failed evidence is retained locally: the original loading, stale-plan, baseline
reset and private-save defects; initial browser fixture omissions; and the
fixture's missing ordering before limit. Correcting storage ordering made the
unchanged client reopen the newest private editorial revision.

## Database and release requirements

Migration `20261112205425_natal_editorial_private_revisions.sql` adds only the
typed Natal target branch to the existing private-revision function. It verifies
the unique predecessor guard before replacement. Existing locks, receipts, CAS,
transaction bodies, grants and all other target branches are preserved. It adds
no table, backfill or source-data write. Reusable key/audience/placement facts,
source system, proposal identity and package exclusions are enforced in SQL;
personal chart readings keep their existing lifecycle.

The migration is not yet applied to production. Release requires the required
exact-head affected API/browser gates, privacy hooks and public-asset scan,
review of current schema/ACL/history, an idle coordinated DDL window, and Git
main deployment. Verify deployment commit and complete source/reader behavior
before calling this live. Native mutable QA additionally requires fresh target
qualification, preservation checks and supported cleanup; isolated storage
evidence does not establish native production publication or restoration.

## Bundle measurement

Separate locked installs and ordinary native Admin builds used identical
visual-smoke Supabase placeholders and knowledge inputs. Main measured
843,397 raw / 245,252 gzip startup bytes and 926,777 aggregate gzip bytes.
The initial candidate failed existing caps at 845,466 / 245,975 startup and
927,463 aggregate. Deferring the strict Natal classifier into the existing
editorial library reduced startup to 844,008 / 245,411, with 927,870 aggregate
across the same 81 JavaScript files; the old caps still failed.

The measured correctness allowance adds 768 raw startup/largest-chunk bytes,
256 startup gzip bytes and 1,280 aggregate gzip bytes to the inherited caps.
Remaining headroom is 266 raw / 174 gzip startup and 290 aggregate gzip bytes.
No dependency, CSS, Web startup, deferred-group, payload, graph-counting or
lazy-boundary guard is relaxed.

Matched ordinary Web builds measured 3,771,607 aggregate gzip bytes on main and
3,772,405 on the candidate, with the same 303 JavaScript files. The old aggregate
cap failed by 592 bytes. A separate 768-byte aggregate allowance sets the cap to
3,772,581 and leaves 176 bytes. Reader startup, CSS and individual chunk caps are
unchanged; the earlier failure is retained. Earlier failed measurements remain recorded.

## Final-base integration

Integration preserves the dated Moon fact/version guard, Natal identity guard,
private-revision routing, detailed Moon recovery errors, and general recovery
retry while leaving unsupported generic recovery hidden. Isolated migrations
include both dated migrations and the Natal extension in timestamp order.
All upstream API commands and budget allocations are retained.

The revision-bound plan selects 102 API commands and 117 browser specs; there
is no conservative whole-catalog fallback. Publication PostgreSQL is selected;
Weekly PostgreSQL and variable contracts are not selected. Exact final-head
affected and privacy results belong in the PR. Earlier acceptance above is
historical until confirmed on the integrated candidate.

Native ARM64 Node 22.20.0 ordinary builds and server types pass. Web measures
3,776,974 aggregate JavaScript gzip bytes across 307 files, below the
3,777,593 integrated limit by 619 bytes. This preserves #1460 and #1461
allocations and adds only the existing 768-byte House/Natal allowance. Admin
measures 844,017 startup raw / 245,431 startup gzip and 927,638 aggregate
gzip bytes across 81 files; all existing guards pass.

Two preliminary build attempts failed because a Python-launched npm child
selected x64 against the checkout's ARM64 esbuild installation. Direct native
shell builds passed with the same locked dependencies; these setup failures
remain recorded and are not application or passing-build evidence. No reinstall,
dependency change, additional allowance or production action was needed.

## Visible private-save receipts

The integrated receipt predicate also accepts the existing dated-lunation
family before its Calendar/Natal branches. All returned target IDs, expected
versions, modes, event types and status checks remain enforced. The dated
owner's three-file checkpoint `d959c9e767fff2ac2e180c6be82eb734d6b63a3a`
provides this one-line correction, its visible-save regression, and route-drain
teardown in the existing lunar workspace tests. The neighboring Natal
eligibility branch is retained.

House/Natal lifecycle and editorial tests now explicitly require the visible
private-save acknowledgement and disabled Save draft control before closing or
reloading, alongside absence of the false save error and complete public-A
preservation. Successful persistence alone is not treated as a successful editor
interaction. These final combined assertions remain pending on the frozen head.

After the combined receipt change, both fresh native builds and budget guards
pass again: Web 3,776,933 aggregate gzip bytes/307 files (660 bytes
under the unchanged integrated limit); Admin 844,067 startup raw /
245,447 startup gzip and 927,593 aggregate gzip bytes/81 files.
The focused combined browser discovery contains 60 cases: the 44 House/Natal
cases, four dated recovery variants and 12 lunar workspace cases. Both dated
files were already in the 117-spec affected plan; API selection remains 102.

The dated owner's source qualification on checkpoint `d959c9e7` passed its
complete standalone lunar Studio job: 44 cases, zero retries, 4.8 minutes.
Its visible Save assertion reproduced the deployed failure and passed all four
fixed variants. This bounded source qualification is retained separately from
the combined candidate's pending exact-head checks.

## Receipt-contract fixture correction

Hosted API shard 2 on `1d47dcc6` failed the Article receipt contract fixture: its
extracted real Dashboard guard referenced two new Natal bindings that the
`new Function` fixture had not supplied. The unchanged source reproduced the
`natalEditorialTools` ReferenceError at the wrong-ID negative control. The
fixture now receives the real Natal helper and extracts the actual
`natalPrivateRevision` initializer alongside the Calendar initializer. All
existing wrong-ID, body, source/version and mutation assertions remain intact.
The corrected public fixture passes all 109 actual-handler/in-memory-SQL
controls; it reads no protected references and performs no production writes.

The holder's prior local run passed pretest and 34-command shard 1; shard 2
exited 1 after 76.189 seconds and shard 3 was not reached. Its 204.164-second
run had stable source/dependencies and clean teardown. The local cause remains
unassigned because its raw output was discarded; the hosted failure and public
red/green reproduction establish the fixture defect separately. Hosted shards 1
and 3 passed. Refreshed built-asset privacy passed.

This correction changes only the API fixture and this record. The delta selector
identifies that single API command and zero browser cases. Application source,
build inputs and browser test inputs remain identical to the successful
60-case frozen run. Reuse that success and the bundle evidence, with final-head
required hosted gates and remaining selected API coverage still mandatory.
