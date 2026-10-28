# Friction/Flow: natal transits and synastry

Implementation policy: `natal-synastry-daily-v2`, October 25, 2026.

## Calculation and priority

- Each pair uses the two actual natal charts. No midpoint composite supplies
  a target or interpretation. Existing chart-sharing consent and reliable birth
  time requirements remain in force.
- Swiss Ephemeris searches the complete selected civil day, including 23/25-hour
  DST dates, for the five major aspects within 1°. Exact roots, closest approach,
  motion and in-orb intervals are calculated; noon is not a visibility gate.
  The moving inventory is Sun through Pluto. Natal targets also include Chiron,
  Lilith and the true North Node. Measured Ascendant, MC and North Node endpoints
  represent the opposite axes without duplicate day slots. This feature does
  not change the app's separate Chiron/Lilith/node moving-transit inventory.
- Annual whole-sign profections use completed age on the selected local date,
  natal Ascendant and traditional sign rulers. The natal browser timing engine
  receives explicit completed age. A birthday can change the ruler between the
  three tiles. Unknown birth dates do not acquire an inferred age or ruler.
- Transits by or to the lord of the year lead each person's main-theme ranking.
  Outer-to-outer background contacts otherwise follow personal contacts; moving
  planet weights and closest orb break subsequent ties. One main theme per person
  appears in the existing day tile. Every exact contact remains in the popup,
  including those already identified as a main theme or mood contact.
- Mood/reaction callouts identify hard/conjunct Mars, Saturn or outer-planet
  contacts to the natal Moon, and hard/conjunct Moon contacts to Mars, Saturn or
  Pluto. They display the corresponding existing personal passage, rather than
  a new generic mood interpretation. One additional mood contact per person is
  exposed alongside the main themes; remaining exact contacts stay visible.
- Synastry uses the app's existing contact/orb policy without the compatibility
  card cap. Background-only synastry contacts do not establish pair prominence.
  A link through a natal endpoint is distinguished from an independently
  calculated direct transit to the other endpoint.
- Easy/Tense/Mixed require direct transits by the same moving planet to both
  ends of an actual synastry link, with overlapping in-orb intervals. Two exact
  contacts at different times that day do not establish simultaneous activation.
  The moving planet counts once per channel, regardless of how many links it
  reaches. Unrated conjunctions retain Active. Personal influences without a
  clear shared lean also show Active; an empty daily search shows Quiet.

The aspect channels, moving-planet weights, thresholds and overlap requirement
are explicit app heuristics. They are not an ancient Hellenistic compatibility
formula, a complete traditional judgment of planetary condition, or a guarantee
of the people's behavior. Profections supply annual priority, not a newly
invented daily time-lord system. Sources:
[annual profections](https://theastrologypodcast.com/2018/04/26/annual-profections-a-basic-time-lord-technique/),
[synastry and transit timing](https://theastrologypodcast.com/transcripts/ep-165-transcript-synastry-the-astrology-of-relationships/).

## Existing writing and presentation

- The existing personal normalizer chooses the source identity. The connection
  reading adapter admits only the same ordered planet pair and exact or licensed
  aspect family, with the appropriate You/Friend body and existing approval and
  publication gates. Generic Moon, reversed-contact and composite prose cannot
  supply a personal reading. Existing same-planet return sources retain their
  separate identity; a missing source is reported honestly.
- Every admitted authored passage remains complete. Only declared variables are
  filled. `untilDate` uses the searched current continuous contact window, in
  the selected location's time zone, rather than the end of the popup's day or
  the end of a broad multi-pass series. Calculated retrograde state accompanies
  the event facts.
- Existing published directional connection-activation sources can supply an
  additional complete passage. A missing source is not replaced by a generic
  bond or static-composite paragraph. Calculated synastry evidence remains
  visible independently.
- The existing avatars, friend-name link, three day tiles, colors, menu, hiding
  controls, date-based feed, birthday rail and popup CSS are retained. The popup
  identifies main themes, mood/reaction contacts and exact contacts without
  duplicating a reading. Annual rulers appear in an existing disclosure style;
  expanded details explain the technique and any missing birth-date input.
- Shared Circle snapshots deliberately hide birth dates. Their transits and
  synastry still work, while annual profections remain unavailable. This change
  does not expose or reconstruct private birth information.

## Verification

Run from the implementation checkout:

```sh
npm run typecheck
npm run test:relationship-forecast
node --import tsx scripts/test-friends-feed-transits.mts
npm run qa:css-audit
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4194 npx playwright test tests/visual/friends-pair-forecast.spec.ts tests/visual/friends-feed-exact.spec.ts --workers=1
```

Calculation regressions cover three independent Swiss reference dates, full-day
Moon events, stations, midnight, DST, birthday profections, traditional rulers,
individual vs pair pressure, overlap and deduplication. Source regressions check
distinct pairs/aspects and complete You/Friend passages. Browser checks rebuild
the actual web bundle and start a fresh preview; they cover desktop/mobile,
light/dark, source failure/retry, reload, complete source text and heading style,
plus the real worker-to-reader path and unchanged date-based feed.

Local results on October 25: typecheck, calculation/source tests, the existing
feed regression, CSS/token audits and bundle budgets passed. The final fresh
preview on port 4194 passed all seven browser tests. An earlier port-4191 run
encountered a preview belonging to another checkout and is excluded from the
acceptance evidence. Production was not tested or changed.

A separate source-identity audit of this checkout's bundled corpus admitted
1,223 of 1,500 You/Friend contact-and-aspect cases. The other 277 did not produce
an eligible matching authored passage through the current selector, chiefly
Chiron/Lilith/node cases, some outer-planet conjunctions and angle contacts.
This is source-selection coverage, not 1,500 actual events or a live-store
inventory. For example, the existing personal normalizer can select a Sun–North
Node conjunction source for a requested sextile; Friction/Flow explicitly refuses
that aspect mismatch. These gaps are not filled with generic Moon or other
unrelated writing, and no new content approval is inferred.

This is local implementation and verification. No authored source row is
rewritten, generated, approved or published by this change, and no production
deployment is implied.
# Editable Friction/Flow wording

Status, annual-profection and supporting UI wording now has a dedicated
`cms/friction-flow/` catalog and Studio workspace. See
[the source and publication contract](../content-management/friction-flow-writing.md).
The calculation and feed design are unchanged by this extension.

