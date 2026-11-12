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
Retired or stale rows cannot supply a cached event reading. Independent Sky
articles remain available when no exact Calendar unit is published.

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
  restoration, wrong event facts and stale publication versions.
- `tests/visual/calendar-planetary-studio.spec.ts` exercises all three event types
  with both block variants on mobile and desktop in light and dark themes
  through actual isolated handlers/storage (eight cases). It opens saved
  revisions after reload and checks complete
  Calendar-to-Sky paragraphs before and after reload. It also covers reviewed
  revisions, both publish controls, lookup failure recovery and archive/restore.
- Existing Article/Guide and Astro 101 revision regressions must continue to pass.
  The extracted receipt/editor regression checks the production predicates,
  including exclusion of governed package controls and distinct feed/proposal
  modes, with 109 positive and negative controls.
  The complete unfiltered local API command and all required exact-head hosted
  checks remain release gates.

All writes in these tests use synthetic isolated storage. Passing them does not
assert that an owner-bearing production restoration or another Studio editor
family has been audited.

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
