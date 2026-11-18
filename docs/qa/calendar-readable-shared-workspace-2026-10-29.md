# Calendar write-up and shared template workspace

Final integration base: `9d0c5250e379f30fb3a45862b230545db485d309`.
Branch: `fix/studio-calendar-release-20261029`.

The owner needs to read the complete write-up alongside its editable template,
rather than encounter only `{{moonWriteup}}`. The former reader pane placed a
large publication-impact panel before the prose, while the complete-template
action and saved source wording required additional disclosures.

The combined workspace places the complete reader prose first, beside the
template on wide screens and above it on narrow screens. Overview and Moon
event prose precede publication metadata. The Template pane opens its editable
structure by default. Edit complete template remains outside that disclosure,
reopens it and focuses the complete pattern. Save draft and Publish passage
remain available when the structure is collapsed.

Complete shared source wording and direct source-edit actions are exposed below
the template controls. Calculated values remain calculated; source editing
opens the complete original row, including an existing saved draft. Published
continues to use published writing. Draft simulates the selected source and
wrapper changes in a private content map, without installing them in reader
caches or changing the publication ledger. Date-only precedence remains intact.
The Sun editorial-preview flag defaults to false for reader callers.

No source prose, review state, publication handler or writing profile is changed.
Generic-template, custom-variable and Sky-phrase editability work remains a
separate candidate with its own verification.

## Acceptance and verification

The combined Calendar matrix retains 21 journeys:

- four actual-handler shared-source editing cases;
- five workspace variants across desktop, mobile and intermediate widths;
- four passage save, reload and publication cases;
- four reader-to-editor entry cases; and
- four Review Queue entry cases.

Workspace assertions retain complete reader text, raw template identity,
reader-first geometry, heading order and computed typography, publication
impact, and unchanged rows/ledger during viewing. They also check initial open
structure, collapse/reopen, complete-field focus, visible save/publication
actions and exact preservation of unsaved wording through collapse/reopen.
Shared-source cases retain exact source versions, saved draft preview isolation,
published reader parity and date-only precedence.

The direct source editor remains mounted during reader refresh. Automatic
refresh applies only to the shared source whose editor is still open; external
notices after close retain the stale-source warning and manual reload. A held
actual-handler refresh verifies uninterrupted visibility and exact source text.

The four source cases also open the actual public Calendar reader, check the
complete original body and exclusion of the saved draft, publish through the
actual isolated handler, and verify the complete new body after reader reload.
Viewing and publishing assertions compare whole passages, including their final
sentences. Test writes use synthetic isolated storage only.

The Calendar-only candidate passed all 21 cases on `87b62e2` with zero failures,
skips, retries or flakes. Earlier failed runs exposed stale-notice and editor
mount-lifetime defects; both are covered by the retained regressions. Those
results are provisional evidence, not verification of this final combined tree.

The final combined release includes the emitted core-editor graph guard and
automatic deployed recovery verification described in
[Studio editor recovery](studio-aspect-editor-loading-2026-10-28.md). Own dependency
setup, knowledge/index builds, Admin and web typechecks, CSS/token and boundary
checks passed after rebasing onto the base above. Final unfiltered API, content,
both production builds, bundle/privacy checks, all 21 Calendar cases, both recovery
entry paths, exact-head hosted checks and deployed verification are recorded on
PR #1373. A deployment claim requires the merged main revision to be READY and
the same rendered journeys to pass against production assets, followed by
read-only owner-workspace inspection.

## Bundle accounting

Independent exact-main and combined builds use own npm-ci dependencies, native
ARM Node 22.20.0, identical locks and synthetic Supabase settings. Final main
`9d0c5250` measures 814871 raw / 236455 gzip entry and 856580 aggregate gzip
bytes; this release measures 814956 / 236463 / 857956, across 83 chunks in both.
The requested Calendar controls cost 85 raw entry, 8 entry gzip and 1376
aggregate gzip bytes. The original check on `a8e89c62` failed by 991 bytes;
that failed result and its original matched measurements remain preserved.
Allocate only 1500 aggregate bytes for this feature, raising the cap from
857000 to 858500 with 544 bytes remaining. Startup and largest-chunk limits
remain unchanged; the complete startup graph is one file. All other boundary,
reader, privacy and runtime gates remain enforced. This accounts for feature
cost and makes no loading-performance improvement claim.

## Final integration

Main advanced through #1374 while the first exact-head hosted run was active.
Its five paths do not overlap this feature's twenty paths. Rebase preserves
the editable calculated Moon-sign introduction and every complete source unit.
The prior `63923e39` API/content/21-case/recovery results remain evidence for
that earlier tree only. Final verification also covers the inherited early
and late sign-change Day/Week journeys; all exact-head results belong on
PR #1373 before merge.
