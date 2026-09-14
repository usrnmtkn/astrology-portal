# App event date and time consistency

Calendar's Virgo arc used August 23–September 23 even when Sky and its Sun article correctly used August 22–September 22 for New York. The visible seven-day Calendar feed omitted both Sun ingresses; the season helper then supplied fixed calendar dates. PR #807 had corrected the Sky card/article time-zone path, but did not cover this Calendar fallback.

Base: `b4a622a3c` (`origin/main`, September 14, 2026). Branch: `codex/calendar-season-date-consistency`, with the working changes applied over that base.

## Result

- Calendar's calculation feed now includes bounding Sun ingresses even for a basic month or a week entirely within a season. Only the Sun scan extends beyond the visible grid; individual day movement lists retain their own civil-date events.
- Season selection has no static date-table fallback. Missing calculated boundaries return no season range. Seasonal lunar milestones are selected between the exact ingress instants, then formatted in the selected location's zone.
- Calendar's persisted cache and API request version invalidate old feeds. Month identifiers and week cache keys no longer depend on the browser's time zone.
- Sky placement aspect dates prefer calculated exact timestamps. Placement egress labels and personal-transit ranges, exact-pass dates, article windows, and embedded transit dates use the calculation's zone across Sky, You, and Friends.
- Placement and retrograde countdowns count civil days in the same zone as their date labels. A date-only selection remains a civil date; timestamps retain their instant. On September 14, New York's September 22 Sun exit is eight civil days away; UTC's September 23 exit is nine.
- Approved source rows, publication state, and bundled reader prose remain unchanged.

## Verification

`npm run test:event-dates` compares the actual Sky adapter, Calendar Day/Week/Month feeds, and lunar-day resolver across Virgo 2026 and Capricorn 2026–2027 in New York, UTC, and Tokyo. An independent Swiss Ephemeris instance checks the Sun's sign on both sides of each boundary. Additional cases cover missing facts, browser/selected-zone disagreement, UTC+14/UTC−12 month boundaries, midnight, year rollover, both New York DST changes, personal-transit dates, and countdowns.

`TLDR_DATE_BASELINE=1 npm run test:event-dates` reproduces the original Calendar mismatch using the base Git objects: actual August 23, expected August 22 in New York.

The fresh-build browser command is:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4187 npx playwright test tests/visual/event-date-consistency.spec.ts tests/visual/sky-placement-dates.spec.ts --workers=1
```

The six scenarios use real calculation workers and isolated bundled editorial data. They cover desktop/mobile, light/dark, a Honolulu browser with New York/UTC/Tokyo selected, Sky card and article ranges, Calendar Day/Week/Month navigation, reload, lunar milestone times, Calendar-to-article exact times, and the Sun passage's opening and final sentence. No event timestamp or season is mocked. The first browser run also reproduced the pre-existing Tokyo month-heading shift; the final tests include its repair.

Additional checks: Calendar content hydration; Calendar API civil dates, DST continuity, direct-ephemeris noon parity and wrong-week rejection; 2,436 Sky/You aspect and motion routes; Sky aspect date ranges; TypeScript; CSS/token audits; the full local Content Studio API suite; reader bundle budgets; repository and built-public-asset privacy scans.

The broader `test:sky-placements` command passes the new date checks and real calculated timelines for all 14 bodies plus a second Mercury passage, then stops in `scripts/test-sky-placement-house-templates.mjs:184`. Its source-pattern assertion expects `heading: packageSection?.heading || personalTransitDisplayTitle(transit)`, which is absent in unchanged main as well as this branch. The assertion and unrelated heading code were not changed. The complete broader suite is therefore not claimed green.

Release verification is recorded in the PR: the unfiltered Content Studio API workflow must pass on its exact head, the merged main deployment must become ready, and these browser regressions must also pass against the production URL.
