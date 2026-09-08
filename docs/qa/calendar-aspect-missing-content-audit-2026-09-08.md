# Calendar aspect missing-content audit — September 8, 2026

## Repository provenance

Remote refs refreshed from `https://github.com/usrnmtkn/astrology-portal.git`.
Audit branch: `codex/fallback-placement-match-audit`, 1 behind / 3 ahead of
`origin/main` due to the squash merge. `git diff origin/main` was empty before
the audit; audited application source is identical to production main
`9cfbe87bbb8afc5d1e1805f3e7af2366dc70d739`.

## Findings

The screenshot's Sun conjunction Lilith and Saturn trine Lilith both have LIVE
canonical reader bodies and matching published Content Studio rows. Both resolve
with either endpoint order once the published rows are loaded. Neither needs new
writing.

The runtime publication ledger intentionally prevents unversioned bundled copy
from substituting for a published Content Studio revision. With the live ledger
installed, all 439 bundled exact records are suppressed and all 439 matching
published records resolve, in both endpoint orders. No missing published body
was found in that inventory (379 canonical events plus 60 South Node readings).
This is a corpus/resolver audit, not a browser traversal of every possible date.

The detail content request is incomplete:

- `calendarTransitDetailContentKeys` requests the opened event's keys only.
  An ingress/station request contains no keys for related aspect cards.
- The non-current placement route computes a separate `placementSky` and renders
  its aspects, but passes the existing `skyGeneratedContent` map into the article.
- Main Sky hydration still derives requested aspect keys from `sky.aspects`,
  not the displayed `placementSky.aspects`.
- Consequently, the bundle is ineligible and the matching published row may
  never be requested. The factual card remains visible without its paragraph.
  Navigation/history affects which rows happen to be available already.

Relevant code: `apps/web/src/App.tsx` (`openCalendarTransitDetail`,
`calendarTransitDetailWithContent`, non-current placement route effect,
`currentSkyContentKeys`); `apps/web/src/features/calendar/calendarContentKeys.ts`;
`apps/web/src/content/domainRegistry.ts`; and
`apps/web/src/content/contentPublicationState.ts`.

## Browser evidence

Read-only checks against `https://tldrastro.vercel.app`:

1. Opening the current Lilith station from Calendar displayed Sun trine Lilith
   and Mars opposition Lilith correctly. Not every Calendar visit fails.
2. A fresh session on `?date=2026-09-08#sky/placement/lilith/sagittarius`
   displayed all five related aspects before a publication ledger was present.
3. Repeating that route with the unmodified publication cache captured from the
   live Calendar reproduced four empty cards:
   - Lilith trine Chiron
   - Lilith sextile Venus
   - Lilith square Neptune
   - Lilith square Sun
   Lilith sextile North Node retained alternative approved prose.
4. The returning-reader reproduction had no JavaScript page errors. Only the
   isolated browser's local cache was seeded; no server content was modified.
5. A separate attempt to wait for automatic publication hydration on that direct
   route timed out after 60 seconds. The controlled cached-session reproduction
   is the evidence for the four additional blanks, not that timed-out attempt.

The exact screenshot's date, route and browser session were not provided, so its
specific historical navigation sequence was not reproduced. Its two records
were verified separately through the published-content resolver.

## Validation and scope

`node scripts/test-calendar-exact-sky-aspect-routing.mjs` passed: 379 canonical
records, 758 directional routes, and 60 additional South Node records. That test
runs without installing the live publication ledger, so it does not catch the
missing-request condition.

The separate 439-record audit installed 3,620 publication records captured from
production and used the repository's matching last-known-good published rows.
All 439 resolved in both endpoint orders. The test's historical 75-record broader
universe gap must not be reported as 75 missing Calendar cards; Calendar excludes
quincunxes from its event calculation.

## Required repair

Hydrate exact aspect keys from the snapshot actually used to render each detail,
including non-current placements and related cards opened through Calendar.
Merge those rows into the detail's content map and rebuild the detail after they
arrive. Preserve publication/retirement checks and approved wording. Add a browser
regression with a populated publication cache and a different-date placement;
assert both the opening and ending of each protected passage.

This task produced an audit only. No application code, content, publication
state, commit, or deployment was changed.

## Implemented fix and cross-surface review

The subsequent owner request authorized the fix and a review of other surfaces.
Implementation is on `codex/calendar-detail-aspect-hydration`, created directly
from refreshed `origin/main` (0 ahead / 0 behind before these uncommitted changes).
This section supersedes the audit-only implementation status above.

- `skyDetailContent.ts` derives exact content requests from the same snapshot
  used to render a detail, respects explicit event signs, reuses current rows,
  and discards superseded or retired rows. It does not weaken publication gates.
- Current Sky details, alternate-date placement details, Calendar details, and
  dated aspect reloads load matching published rows and recompose after arrival.
  Already available prose remains visible while loading, and cancelled route
  requests cannot replace the article selected afterward.
- Calendar composition uses the event-time snapshot instead of combining an
  event placement with the main Sky's unrelated positions and aspects.
- Related aspect links retain their calculated time. `/at/` retains a known exact
  moment; `/on/` retains a sampled snapshot without falsely labeling it exact.
- No canonical prose, review state, or publication records changed.

### Other surfaces

| Surface | Review / result |
| --- | --- |
| Main Sky and alternate placements | Same request-snapshot mismatch; covered by this fix and returning-reader browser regression. |
| Aspect detail links and reloads | Date was lost by related links; fixed and tested for exact and sampled timestamps. |
| Calendar Day / Month aspect cards | Existing event-key request path and approved copy precedence passed. |
| You natal placements | Uses natal/You content partitions and birth-chart facts; opening and closing a natal placement passed. |
| You weekly content | Delayed published Virgo macro restored its complete body in the browser; no analogous omitted-key error reproduced. |
| You / Friends date switching | Shared date-switch browser flow passed; content caches are keyed by surface, date and preview mode. |
| Friends relationship tabs | Existing partition loading and reader-copy flow passed; no analogous omitted-key error reproduced. |
| Reports | Existing facts/assembly/fulfillment/judge preflight checks passed; no live paid report was generated. |

These are bounded source and browser checks, not a claim that every account,
chart, or historical date was traversed.

### Validation

- New regression: 439 published identities in both orders (878 resolutions),
  explicit event signs, stale-revision re-request and retirement safety passed.
- Seven browser flows passed on a fresh production build with the same dummy
  API configuration used by CI. The fix regression asserts entire approved
  paragraphs and filters mock responses to only actually requested keys.
- Web typecheck, production build, CSS audits and existing bundle budgets passed.
- Existing exact Calendar routing, Sky aspect hydration and placement-authority
  tests passed.
- Full `npm run test:content` reached the already documented failure in
  `test-friends-owner-signoff-ruling.mjs:161`: actual hash
  `84bcb9343e221991b2efe9f363d75aeaf926212319896c82a7c8878484acf4ee`
  versus expected
  `9ae494a7998e4441a03799c477e8e0819028e0822908a7a3ca4aeafb1e1415f5`.
  That test and its content inputs are unchanged by this fix.
- A separately run older `test-reviewed-sky-aspect-phrasebook.mjs:50` still
  asserts 248 exact transit records, while unchanged main contains 439.
  The stale count was recorded, not used to alter approved content.
- Initial local browser attempts without CI's dummy API configuration did not
  exercise the network mocks. They were superseded by the configured runs.

No commit, merge, production publication or deployment has been performed for
this fix.

The final expanded browser regression also passed (13.4 seconds of test time):
select September 10 in Calendar, open the Venus-in-Scorpio ingress card, and
verify its full published Venus-square-Pluto paragraph. This exercises the
Calendar placement entry path in addition to direct Sky links and reloads.
