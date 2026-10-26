# Calendar planetary-hour source audit

Audit date: 2026-10-26. The owner requested verification against supplied books
before deployment. These are evidence-backed calculation and task-affinity
rules, not owner prose approval or an endorsement of every historical claim.
Original source files, OCR and page images remain outside the public repository.

## Calculation evidence

| Source | Verified locator | Consequence |
| --- | --- | --- |
| John Gadbury, *Diary for 1694*, planetary-hour section | PDF pp. 19–20 | A planetary day begins at sunrise; night begins at sunset; the seven rulers continue in Chaldean order. |
| Same | PDF p. 22, right-hand page | An eight-hour daylight interval produces 40-minute day hours and 80-minute night hours. Day and night are divided separately into twelve. |
| Same | PDF pp. 23–24 | Monday's fourth daylight hour is Mars; its fourth night hour is Saturn. The example's printed arithmetic is inconsistent, so the test uses the stated 08:02 sunrise and 10:30 query with independently calculated elapsed time. |
| George Simotta, *A Theater of the Planetary Houres*, translated by George Baker | Printed pp. 7–8 (PDF pp. 7–8), hour tables printed pp. 12–14 (PDF pp. 10–11) | Independent weekday/sunrise rulership and day/night ruler tables agree with Gadbury. |

The tests use modern synthetic dates for the historical weekday examples. They
do not mistake a Julian-calendar date in the book for a modern Gregorian date.
Simotta's historical sunrise tables are not used as present-day location data.
Gadbury explicitly defers the practical activity significations at the end of
the diary (PDF p. 24); the diary verifies timing, not TLDR's activity list.

Runtime sunrise/sunset use the selected coordinates and the project's existing
solar-altitude calculation at a conventional −0.833° horizon. Actual elapsed
time is divided, including the next day's sunrise and DST changes. Predawn
hours retain the previous planetary date. The selected civil day clips the
displayed intervals without restarting their ruler sequence at midnight.
Missing required solar crossings produce unavailable hours.

Independent astronomical references: US Naval Observatory API 4.0.1, retrieved
2026-10-26, coordinates 40.7128, −74.0060:

| Local date | Reported sunrise/sunset | Calculated UTC sunrise/sunset |
| --- | --- | --- |
| 2026-03-08, UTC−4 | 07:19 / 18:55 | 11:18:52.999 / 22:55:11.999 |
| 2026-11-01, UTC−5 | 06:26 / 16:52 | 11:26:26.999 / 21:52:14.999 |

Both endpoints on both dates agree within one minute. The API requests are
[March 8](https://aa.usno.navy.mil/api/rstt/oneday?date=2026-03-08&coords=40.7128%2C-74.0060&tz=-4)
and [November 1](https://aa.usno.navy.mil/api/rstt/oneday?date=2026-11-01&coords=40.7128%2C-74.0060&tz=-5).
These are conventional horizon times; terrain and actual local weather are
not inputs to TLDR's calculation.

## Activity evidence and serving rules

Henry Coley's *Clavis Astrologiae Elimata* (1676), Book 2, Section IV,
is quoted in the supplied seven planetary course pages. The same passage has a
[public transcription](https://www.renaissanceastrology.com/coleyplanetaryhours.html).
The historical quotation is distinguished from the course author's commentary.

| Runtime source ID | Activity and scope | Evidence and interpretation boundary |
| --- | --- | --- |
| `coley-venus` | Love: courtship; Rest: leisure | Direct hour prescriptions for courtship, marriage and pleasurable pastimes. Leisure is the supported rest activity; this does not establish sleep or medical recovery timing. |
| `coley-mercury` | Work: writing and trade | Direct hour prescriptions for correspondence, messages and commerce. |
| `coley-jupiter` | Work: patrons and finance | Direct hour prescriptions for approaches to patrons/professional authorities and lending/borrowing. No generic all-work claim. |
| `coley-saturn` | Work: property and land | Direct hour prescriptions for property/leases and working land. No generic productivity or email claim. |
| `venus-creative-affinity` | Creativity: art and music | The supplied Venus course page explicitly associates art/creation with Venus and its day/hour. Ficino, *Three Books on Life*, Book III, conclusion of chapter II, printed p. 255 (PDF p. 7), associates Venus with music and festivity. This is a scoped natural-rulership adaptation, not a quotation that every creative task belongs to Venus. |
| `mercury-creative-affinity` | Creativity: writing | Correspondence is explicit in Coley's hour rule; Ficino's same passage assigns skill/ingenuity and eloquence to Mercury. Creative writing is TLDR's narrow application of that affinity, not a direct historical prescription for modern fiction-writing. |

The course author's
[natural-rulership method](https://www.renaissanceastrology.com/planetaryhoursrenaissance.html)
supports matching a planet's hour to a matter it signifies. That does not turn
all hours into complete elections. Gadbury's *Astrological Sea-Man*, chapter II,
printed pp. 17 and 24–25 (supplied electional excerpt PDF pp. 3 and 7), also
considers the chart and multiple testimonies when choosing an election.

### Corrections and exclusions

- Removed general Mars-hour Work recommendations. Coley's broad caution and
  the course author's support for specifically Mars-ruled actions differ.
  Neither licenses every work task, and TLDR has no approved task-specific
  Mars election rule here.
- Removed generic Sun-hour Creativity. Ficino distinguishes public expression
  and kinds of music, while Coley qualifies Sun-hour use. The initial broad
  category exceeded this evidence. This is not a claim that Sun hours can
  never support a creative activity.
- Removed Moon-hour Rest. The reviewed hour passages do not establish sleep
  or recovery timing. TLDR's approved Moon-function vocabulary describes
  emotional needs/safety; that alone is not a sleep-hour prescription.
- Saturn's course page repeats an email/contract example also found under
  Mercury. The audit does not treat that duplication as independent evidence
  for email in Saturn hours.
- No universal lucky/unlucky score, full-chart election filter, disease,
  treatment, hostile magic or ritual instruction was imported. VOC and current
  transits remain separate complete Sky context; they do not silently alter
  calculated hour rulers or certify a time as favorable.

All seven classical planets still rule hours. An excluded category association
does not remove a planet from the actual hour cycle. Sky-context selection is
separate from hour/task associations. Existing complete eligible TLDR passages
remain verbatim, behind their existing editorial gates. No new narrative
interpretation or paid generation was needed for these corrections.

## Scope and reproducibility

Gadbury and Simotta were rendered and OCR'd; the cited pages were visually
checked. Ficino's relevant English passage was read and visually checked.
The seven course pages were inspected for their hour/activity rules. The
electional excerpt was checked for the distinction between an hour affinity
and a complete election. This is a targeted audit, not a claim to have read
every book or watched every course video in the supplied folder. The short
modern magical-timing handout supplies no technical planetary-hour rule and
was not used for these associations. Agrippa's title/front matter was inspected
but supplies no evidence for a rule in this change.

Source file SHA-256 identifiers (bibliographic verification only):

| Source | SHA-256 |
| --- | --- |
| Gadbury diary | `800c7d5c896a42ffcba48e72447be447f05b1e41d8139efe4b2091f4179f3cc2` |
| Simotta | `74506b659e949f33be7336287ec08e1bab30df1be6fab14492340e6a3d4d5d0a` |
| Ficino excerpt | `ef0e9ce6882eb69e287d509eee1638f7e88cd240291d0459d02fc08ab117d108` |
| Gadbury electional excerpt | `3d948c37a4792862c5c3a7275328c449916edb3ece8b132022b38f74f9da36ed` |
| Venus course page | `6a6fd7ee222f2ec2ecec2106e635c96d74cfb720272166a2646029ef88112086` |
| Mercury course page | `7d49fe598509e6a4cb01178a92a10e70976be34141e2b956a1424f8554b36df2` |

`scripts/test-calendar-planning-coverage.mts` checks the independent book-table
fixtures, USNO endpoints, DST/predawn behavior, source-preserving context and
full app/ICS parity. Browser checks assert the scoped labels and reject the
old Moon/Mars-hour recommendations. Full unfiltered API and exact-head hosted
checks remain required after the final integration revision; prior passes
cannot certify a later commit. Migration, merge and production release remain
subject to the existing coordinated release order.
