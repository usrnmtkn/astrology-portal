# Monthly overview and seasonal introduction acceptance

Implementation baseline: `origin/main` at `2fb7c8322096038788ad2c6f1707926b4c4ab65c`.
Feature branch: `feat/monthly-horoscope-overview`. The release PR records the exact
implementation head, required CI results and deployment revision.

## User journey

- **Monthly** in Content Studio prepares one shared calendar-month overview for
  all signs, using local first-of-month boundaries. Its writing profile is
  separate from Daily, Weekly and Seasonal.
- New **Seasonal** editions contain a shared introduction followed by all twelve
  sign readings. The introduction receives the complete zodiac-season and
  learning-axis sources; sign readings retain their own whole-sign house map.
- Existing twelve-reading seasonal editions reopen and publish unchanged.
- Every unit uses the existing prepare, explicit generation approval, saved
  request, recovery, reject, review and exact-wording publication flow.
- **This month** in Horoscopes displays the complete shared reading. **This
  season** displays the shared introduction before the selected sign reading.
- Calendar Month reads the same published monthly body. Its established
  composition remains the fallback when no monthly edition is available.

## Acceptance evidence

| Criterion | Status | Evidence |
| --- | --- | --- |
| Month boundaries, leap years and DST | Passed | `scripts/test-horoscope-monthly.mts`: UTC February, New York March, Sydney April, December year boundary |
| Exact major planetary aspects | Passed | Direct Swiss positions across three different months check all five supported aspect angles; both planets retain their own signs and motion |
| Complete owner evidence | Passed | Three complete collective essays retain source spans, exact-text hashes and word counts; actual provider input and deployment includeFiles coverage checked |
| Seasonal evidence selection | Passed | Shared introduction receives collective essays and raw season/axis meanings; sign entries retain complete sign-specific examples and mapped meanings |
| Create, recover, publish and actual reader admission | Passed | Real handlers with isolated storage, one fixture provider call, duplicate/stale refusal, exact saved prose, private metadata exclusion |
| Existing saved seasonal content | Passed | Legacy twelve-unit fixture and actual seasonal publication-claims regressions |
| New monthly/seasonal reader matrix | Passed | Fresh Vite build, four Playwright 390/1440 light/dark cases, computed heading styles and semantic order; Calendar reuse and error recovery |
| Existing horoscope regressions | Passed | Navigation, personalization, worldwide discovery, twelve-sign import, recovery and seasonal source plans passed across the full 45-case reader suite |
| Full Content Studio API release gate | Local passed | Unfiltered local gate passed; final-head GitHub workflow recorded in the PR |
| Four-profile editor and lunar workspace | Passed | Monthly profile saves/reloads in four reader cases; five full profile-editor cases and four lunar-workspace cases pass after removing the fixed three-profile assumption |
| Existing Calendar publication fallback | Passed | Four fresh-build passage-editor cases; the shared isolated database models the monthly lookup, and the published weekly/monthly opening and final sentence remain visible when no horoscope overview exists |
| Web/admin typechecks and CSS tokens | Passed | `tsc --noEmit` for both applications and `npm run qa:css-audit` |
| Bundle boundaries | Passed | Matched isolated builds described below; all startup and deferred-payload guards retained |
| Built public assets privacy | Passed | Protected-policy scans of both web and admin builds |
| Production | Not deployed at initial acceptance | Release PR must record READY main deployment and deployed browser checks |

The monthly browser matrix covers plan approval, one draft, editing the last
reading, saving once before publication, reload, exact reader opening and ending,
season navigation, loading/error retry and empty daily discovery. Calendar checks
use the same body, survive reload and retry a failed read. Auth fixtures use the
same isolated Supabase placeholders in the browser and fresh build.

## Size comparison

Separate worktrees, each with its own `npm ci`, use identical workflow Supabase
placeholders. Main versus feature, gzip level 9:

| Measure | Main | Feature | Difference |
| --- | ---: | ---: | ---: |
| All web JavaScript | 3,518,061 B | 3,519,258 B | +1,197 B |
| Reader boot including CSS | 513,607 B | 513,750 B | +143 B |
| Deferred horoscope reader | 3,498 B | 3,664 B | +166 B |
| All admin JavaScript | 782,164 B | 782,566 B | +402 B |

Small aggregate/reader allocations cover these additions. The initial Linux CI
build measured reader boot at 513,751 B, one byte over its prior cap; a 100 B
allowance retains a tight boundary. Entry, CSS, largest-chunk, memory graph and
forbidden-payload caps remain unchanged.
No dependency was added.

## Boundaries and limitations

- All write/generation acceptance uses synthetic provider responses and isolated
  storage. No paid request, owner draft, writing profile or publication was changed
  to obtain this evidence. Fixture success does not certify the literary quality
  of a future model output; the owner still reviews every complete passage.
- There is no automatic regeneration or insertion into an already approved
  seasonal edition. A new season has thirteen units; a month has one.
- Editorial dates stay in the edition's saved IANA time zone. A reader's location
  selects the local period; selecting another published zone is explicit. The
  application does not rewrite approved prose into another time zone.
- Only the new overview-range adapter opts into signed conjunction/opposition
  crossings. Existing Sky and Calendar calculation consumers are unchanged.
- The three complete owner seasonal essays support the new monthly register;
  they are not labeled as owner-authored monthly examples. Historical astrology
  is never promoted to current calculated fact.
