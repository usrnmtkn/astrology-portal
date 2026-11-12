# Calendar planetary write-up revisions

Published planetary ingress and exact station write-ups keep serving while an
editor saves a draft or marks changes reviewed. Those actions create a private
revision of the opened source. Explicit publication atomically replaces the
same published row and archives the proposal. A newer source version blocks
publication and retains the pending writing.

This applies to the existing sign-specific planetary Calendar identities:
canonical and dated ingresses, their legacy aliases, and direct or retrograde
stations, including saved legacy rows with a null block type. Other block types,
packages and non-serving originals do not gain revision publication authority.
Generic cards, ongoing retrograde passages, Moon transitions and Sun
seasons retain their separate workflows. No source writing or event calculations
change.

The dated Sky event reads the same complete eligible event unit as its Calendar
card. Dated ingress writing precedes reusable writing. The selected row must
match the calculated event, source identity and current publication version.
Retired or stale rows cannot supply a cached event reading. An explicitly dated
exact ingress or station unit must match the requested occurrence on both the
Calendar card and Sky detail. Legitimately undated reusable units remain reusable;
other families retain their existing date rules. Independent Sky
articles remain available when no exact Calendar unit is published.

Exact governed imports can predate the manual `calendar_event` marker. Their
Calendar cards also retain the complete source body when no separate summary
exists. A separately authored summary remains its own card unit, while the Sky
detail retains the complete body. Generic card fallbacks and other event families
keep their existing selection behavior.

Reader-originated Edit links name the selected exact source and event date/zone.
They open complete saved ingress and station documents in their Calendar
workspace, including after ordinary editor reload. A pending plain revision is
selected only when its source key, target row and opened target version match
the published source. An unrelated draft does not replace it. Governed sources
retain the package editor and publication controls; missing or failed complete
source loads keep the editor closed and offer retry.

Pinless date-bound rows follow the canonical reader protocol only after a
successful fresh exact-key response. Cached objects and offline/aborted reads
cannot authorize them. The matching calculated date and event facts still gate
selection; explicit retirement, reset and any mismatched publication pin remain
authoritative. Each cold route batches and deduplicates all missing exact and
companion keys once. Already-current pinned sources need no extra reader request.
The focused browser case records canonical request counts and opening time.

## Migration and rollout

`20261112020848_calendar_event_private_revisions.sql` extends only the target
guard in the existing server-only revision publication function. It admits
`sky` / `feed` targets with supported exact keys and either `calendar_event` or
the original legacy null block. It rejects packages, reference lanes and review
holds, and requires matching proposal surface, block type and event slots.
The existing Article, Guide and
Astro 101 branches remain intact. The migration fails closed if its expected
guard is missing or ambiguous.

The migration replaces the function definition without a table rewrite,
backfill, content update or privilege change. Its original row locks, actor
checks, compare-and-swap checks and receipt handling remain unchanged. Apply it
in a coordinated idle publishing window before deploying the new API and editor;
the previous API remains compatible with the extended guard.

## Verification

- `scripts/test-calendar-planetary-revisions.mts` runs the actual handler and
  PostgreSQL publication/lifecycle functions for ingress and both station
  directions with current and legacy null blocks. It checks source preservation,
  private reload, review, conflicts,
  publication, archive, draft restoration and explicit republication. Direct SQL
  checks cover 77 valid targets across all ten supported planets, both block
  variants, legacy and dated identities and retained article targets. Rejected
  targets, unchanged function privileges and body
  outside the guard, microsecond version checks and idempotent replay. PGlite
  cases are sequential; the existing full API gate retains its separate
  PostgreSQL session/concurrency checks.
- `scripts/test-calendar-planetary-studio.mts` verifies actual publication and
  reader selection, full paragraphs, aliases, dated precedence, retirement,
  restoration, wrong event facts and stale publication versions. Same-key,
  wrong-date controls fail before the shared exact-unit date guard and pass
  afterward for ingress and both station directions, while undated reuse passes
  on both readers.
- `tests/visual/calendar-planetary-studio.spec.ts` exercises all three event types
  with both block variants on mobile and desktop in light and dark themes
  through actual isolated handlers/storage (eight cases). It opens saved
  revisions after reload and checks complete
  Calendar-to-Sky paragraphs before and after reload. It also covers reviewed
  revisions, both publish controls, lookup failure recovery and archive/restore.
- Five additional browser cases publish synthetic governed imports through the
  actual package handler and PostgreSQL transaction using registered source keys
  and calculated event fixtures. They compare the whole card and Sky detail
  before and after reload at both widths/themes, and check the separate-summary
  branch. The same production-shaped flow clicks the actual reader Edit control
  for ingress and station, compares the complete editor text, and repeats after
  ordinary editor reload. Plain-source cases separately check matching reviewed
  private revisions against a newer unrelated draft. The fixture contains no
  owner source writing.
- Existing Article/Guide and Astro 101 revision regressions must continue to pass.
  The extracted receipt/editor regression checks the production predicates,
  including exclusion of governed package controls and distinct feed/proposal
  modes, with 109 positive and negative controls.
  The complete unfiltered local API command and all required exact-head hosted
  checks remain release gates.

All writes in these tests use synthetic isolated storage. Passing them does not
assert that an owner-bearing production restoration or another Studio editor
family has been audited.

## Browser CI sharding

The previous candidate's Studio admin shard 1 reached the existing 25-minute job
limit at 25m05s. Its log records cancellation without an application assertion
failure; the required aggregate consequently failed. That failure remains
recorded. The same selected files and assertions now run across six shards,
with one worker per shard and the same deadline. Exact Playwright list comparison
covers 619 tests, distributed 104/103/103/103/103/103, with no duplicate or missing
test identities. The complete required browser aggregate still gates release.

## Measured bundle cost

Matched normal builds against main
`47167ca7fc1158d3a0ad8fd8e5429da23d46c0dc`, with separate locked `npm ci`
installs and identical visual-smoke environment, measured 3,768,176 aggregate
JavaScript gzip bytes on main and 3,768,936 on the candidate: 760 additional
bytes across one additional deferred shared module. The initial candidate failed
the prior 3,768,677-byte ceiling by 259 bytes. A 512-byte aggregate allocation
sets the ceiling to 3,769,189. The final legacy-compatible candidate measures
3,768,923 bytes (+747 against main) before consolidating the editor predicates.
After consolidation it measures 3,769,032 bytes (+856 against main), leaving
157 bytes under the same 3,769,189 ceiling. Web startup, individual chunk and CSS
limits remain unchanged.

The native Admin profile uses the same CI Supabase placeholders on both builds.
Main measures 841,198 raw / 244,507 gzip startup bytes and 924,882 aggregate gzip
bytes. The initial candidate fails the prior limits at 841,967 / 244,753 startup
and 925,135 aggregate. Sharing the receipt, publication and classification
predicate reduces startup by 215 raw / 42 gzip bytes, to 841,752 / 244,711, and
aggregate to 925,024. The remaining feature cost is 554 raw / 204 gzip startup
bytes against main. A 512-byte raw and 256-byte gzip startup allocation, including
the corresponding largest-chunk raw guard, leaves 133 raw / 106 gzip bytes of
headroom. The 925,106 aggregate limit and startup graph counting remain intact.
The original failed builds remain recorded. This is the measured cost of
preserving event units and published originals, with no dependency or reader
prose change.


The complete-card and reader Edit follow-up remains deferred. An initial shared
parser added startup cost (842,512 raw / 244,940 gzip in native Admin) and failed
its startup limits. Moving the exact event entry into the existing deferred
Calendar workspace restores startup to 841,861 raw / 244,731 gzip, below the
unchanged 841,885 / 244,817 ceilings. Its native aggregate is 925,968 gzip bytes,
862 above the previous aggregate limit. The complete Web profile measures
3,770,183 aggregate gzip bytes, 994 above its previous aggregate limit. A measured
1,024-byte allocation in each aggregate sets ceilings of 926,130 and 3,770,213,
leaving 162 and 30 bytes respectively. Startup, individual chunks, CSS, graph
counting and payload guards retain their existing limits. The baseline,
intermediate optimization and failed profiles remain recorded.


On the completed source, the shared occurrence-currentness guard adds 55 Web
aggregate gzip bytes to 3,770,238. It fails the intermediate 3,770,213 ceiling by
25 bytes. A further measured 64-byte Web aggregate allocation sets the final
ceiling to 3,770,277, leaving 39 bytes. Native Admin remains at 841,861 raw /
244,731 gzip startup and 925,968 aggregate gzip, with its agreed ceilings
unchanged. The date-bound legacy browser case uses a real isolated API-created
row and retains all three event readings through publication and reload.


Final fresh-response proof and batching measure 3,770,435 Web aggregate gzip
bytes, 197 above the preceding source and 158 above its intermediate ceiling.
A further measured 256-byte Web aggregate allocation sets the final limit to
3,770,533, leaving 98 bytes. All other ceilings remain as reviewed. The complete
pre-currentness editor/navigation suites passed 99 checks; five final-source
browser cases then pass, including actual date-bound legacy publication/reload,
one canonical request per open and reload, plain original/pending Edit and
mobile/desktop governed Edit. Actual handler controls verify fresh-only proof,
offline and aborted failures, current pinned reuse without extra requests,
wrong dates, mismatched pins, retirement and explicit reset.
