# Lunation Studio publication follow-up — 2026-10-30

This captures the initial local verification after the [full chart wiring audit](content-studio-chart-wiring-audit-2026-10-29.md).
The [release verification](ratm-lunation-release-2026-10-30.md) records the later integration with current main.
Branch: `codex/ratm-lunation-horoscopes-20261029`, based on `02599d697` from
`origin/main` (zero commits ahead or behind at the final refresh). The latest
Daily edition changes were retained through the fast-forward and three-file
merge. At this initial verification, changes were local, uncommitted and undeployed.

## Repairs

- Regenerated the book-card source provenance with the existing builder. The
  only change to that source file is its top-level source-file hash. All 288
  complete protected records, including approval metadata, remain unchanged.
- Replaced an obsolete source-code regular-expression assertion with an actual
  shipped-runtime test: published Studio copy overrides the local book, while
  an unapproved revision does not. The protected source and deferred-packaging
  assertions remain.
- Provisioned the ignored local ingress and report evidence stores through the
  documented private-storage paths. Ingress bodies match current pinned
  metadata hashes; report records pass their integrity checks. No evidence was
  added to Git, public assets, test attachments or a deployment.
- Added an explicit owner revision-publication path for all 42 released eclipse
  components: twelve openings, twelve evergreen units, six shared lunar
  sections, and twelve solar house layers. The twelve held complete eclipse
  card drafts remain excluded.
- Publication retains `packageOriginalRecord`, preserves the complete edited
  body, issues a new exact-body hash/count receipt, and uses the existing
  authenticated version-checked action and atomic publication ledger. Ordinary
  saves cannot mint this receipt. Invalid identities, stale writes and corrupt
  body/receipt pairs fail.
- The public transport now includes the neutral integrity fields required by
  these reader revisions. Original records, pending drafts, omission text and
  private notes remain excluded. The actual reader withholds corrupt revisions.
  Each approval reference binds the source identity and exact body hash using
  `studio:lunation/<encoded-key>#<sha256>`; the public resolver has no admin API
  route dependency. A mismatched reference fails validation.
- The shared loader admits the registered published revisions. Node, browser
  source, the shipped artifact and the app renderer preserve complete units.
  Matching-cycle variables keep paragraph whitespace. Independently approved
  eclipse units stay pinned to their original book edition when an ordinary
  book passage is later revised.
- Rebuilt the browser resolver from `resolver/index.browser.ts`, bumped its
  version to `v3-2026-10-30-lunation`, updated pinned tests and regenerated the
  manifests and knowledge provenance index. Approved source prose did not change.
- Kept the RATM panel and twelve-document loading/retry in a lazy source
  workspace. Related lunar writing tools share a deferred chunk. The shared
  publication contract uses the shipped implementation. Public reader startup
  remains outside the Studio editor graph. No budget ceiling was raised here;
  the current main branch's existing allocations are retained.

## Where to edit

Open **Content Studio → Composition → Sky Horoscopes**, then use **Source
family** or **Search composition sources**. The eclipse families are
`authored/lunation-eclipse-section` and `authored/lunation-eclipse-house-layer`.
Open the selected source, save the complete draft, and use **Save & publish**
for the explicit owner decision. The RATM family and house-horoscope sources
remain available in this same map and their Sky write-up source panels.

## Verification

| Criterion | Evidence |
| --- | --- |
| Book preservation | All 288 protected records equal the pre-change records; no approved source prose changed. |
| Complete lunar integrity suite | `npm run test:lunation-book` passes, including the previously blocked provenance and obsolete-assertion checks. |
| Eclipse source/API/runtime journey | `scripts/test-lunation-eclipse-studio.mts`: all 42 sources discover, save, reopen, explicitly publish, report Live, preserve originals/hashes/whitespace, reject stale writes, and reach 24 lunar/solar contexts across all renderer variants. |
| Cross-version dependency | Actual ordinary-book publication leaves the separately approved eclipse unit intact; the Node reference, browser source and shipped renderer select the correct independent versions. |
| Reader integrity/privacy | Actual public endpoint withholds a corrupt revision; public projection excludes private sentinel fields; the complete reader privacy suite passes. |
| Shipped build and budgets | Fresh web/admin builds and unchanged budget gates pass. Web startup: 396,788 bytes gzip; reader including awaited CSS: 455,140; aggregate JS: 3,682,500. Studio startup: 814,114 raw / 236,189 gzip; aggregate JS: 860,038 under the current main allocation of 860,100. |
| Source and asset privacy | Source scan: 11,678 files; web build: 408 files; Studio build: 103 files. All pass. Protected documents and the privacy policy remain ignored. |
| Other release checks | Web/admin/server typechecks, CSS/token audit, real Rollup editor/lazy boundaries, generated manifest/index checks, source wiring status, relation routing, package-cache contract and refresh wiring pass. The default dev-port guard's live 5173/5174 probes were sandbox-limited; fresh preview ports are exercised separately in the browser runs. |
| Chart and Studio browsers | 205 distinct cases pass across the broad run and four corrected-entry reruns: Sky sources/composition, natal You/Friend placements and aspects, empty houses, rulership/day-night, synastry/compatibility, composite, and exact owner publication. Five optional private-snapshot cases remain skipped. |
| RATM browsers | All 12 cases pass on the integrated build: complete guest new/full-moon passages and Studio discovery, retry, edit, save, reload and publication, in 390/1440px light/dark variants. |
| Lunar writing browsers | All 12 cases pass: reusable and dated workspaces, saved readings, guidance/plan persistence, asynchronous generation recovery with simulated providers, manual copy protection, source changes, rejection and stale edits. No paid calls. |
| Full API gate | `npm run test:content-studio-api` passes unfiltered on the integrated working tree, including current main's Daily/edition tests and the new lunar source regressions. The local command used `caffeinate -is` and exited 0; the final 64-source Friction/Flow handler/publication/reader test also passed. |

The 229 browser passes are distinct cases. The corrected runner selects
`/admin/content` for the public web build. Polling assertions retain their three
required checks and allow the existing one-second/five-second cadence to run.
The slow-chunk regression targets both standalone and shared lunar chunk names.
The natal reload checks wait for document readiness and still assert complete
opening/ending passages and unchanged surrounding sections; optional external
font completion is not their readiness criterion.

Affected runs interrupted by Mac sleep were excluded from the final evidence.
The repeated API and dated-writer runs use process-scoped wake assertions, which
end with the command. Application save deadlines and retry budgets are unchanged.

The tested working-source fingerprint is
`e5a09b50a41ae1bd6d312eaf8ec21891a84dfc356ac8599ead65afcd4764d130`
across 56 changed API/app/shared/script/package files; the private verification
record stores each path and hash. Documentation and browser-runner-only edits
are outside that product-source fingerprint.

All content writes and publication tests use isolated fixtures and the actual
handlers/publication functions. No owner content, production publication,
generation profile, paid model call, Git commit or deployment was changed.
Production freshness and hosted CI remain unverified for these uncommitted
changes. The previous bulk production API scan remains unperformed.

Private logs are under `/private/tmp/tldr-wiring-full-pass-20261029/`, using the
`20261030` suffix. Local protected evidence and the privacy policy stay ignored.
