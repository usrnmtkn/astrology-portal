# Timing-event source corpus V7 (31 source records, plain notes, needs_review)

Owner decisions applied (Aug 3): cazimi = 17 arcminutes triggers the named event; the app's 1-degree
measurement is proximity metadata only and produces no card. Moon ingress is permanently excluded from
this corpus (the Moon placement card covers it). Chiron stations and active retrograde passage are
scheduled for the next engine pass.

Meaning-layer SOURCE RECORDS for Sol packet building. Revised against the second import review (Aug 3).

**Contract (revised):**
- These rows are source records, not reader content. IDs use the `src.timing.*` namespace and are never
  resolved by the app. They feed generation; reader keys are outputs of generation, materialized
  concretely.
- Reader-key mapping (for the packet builder and Codex): event enums use hyphens
  (`retrograde-passage`); content-key segments use underscores per `calendarContentKeys.ts`
  (`sky.retrograde.mercury.gemini.retrograde_passage`, `pre_shadow`, `station_retrograde`,
  `station_direct`, `post_shadow`). Station keys: `sky.station.{planet}.{sign}.{motion}`. Ingress key
  available today: `sky.ingress.{planet}.{sign}` only. Sign wildcards do not exist at lookup; generation
  materializes twelve concrete sign rows (or the future wildcard source-resolution layer does), never a
  literal `{sign}` row.
- Status fields per row: `engine_event` (does the engine emit this event today), `source_row` (is this
  meaning record complete), `reader_key` (does a resolvable reader key exist today), `composition`
  (what must be joined before this row can produce reader copy).
- Global composition contract (applies to every row, generalizing the outer-planet rule): reader copy is
  produced only by joining (1) this timing meaning, (2) the planet's meaning, (3) the sign's meaning,
  (4) phase or ingress-pass meaning, (5) engine dates, direction, and duration, (6) owner voice models.
  Without the sign join, twelve sign rows degenerate into one paragraph with twelve keys.
- Guidance lines are literal interpretive propositions. Lines marked `do_not_quote` are governed
  constraints for selection, never sentences for reuse.
- Ingress notes describe collective subject, style, and atmosphere. Sign meaning supplies the content;
  house-style "life domain" framing is out of scope for sky ingress copy.
- Provenance is claim-level with exact artifacts: [tag:artifact/locator — claim — supports Fact|Scene|
  Meaning]. Unverified traditional claims are labeled as such and carry no authority.

**Blocked pending engine/contract work (import nothing before these):** key expansion with underscore
normalization; ingress pass-type calculation (`initial | re-entry | final`; engine currently computes
direction only, which cannot distinguish initial from final); cazimi event emission at the decided 17-arcminute threshold with the retrograde/direct
distinction; pre/post-shadow emission; Mars Sun-opposition midpoint; Chiron stations and passage
(scheduled next engine pass).

---

## A. Mercury retrograde phases

### src.timing.mercury.pre-shadow
Status: engine_event no · source_row ready · reader_key none (`...pre_shadow` after emission) ·
composition full join required.
Fact: Mercury transits the degrees it will retrograde back over, before the station.
Scenes: a text misread and re-sent; a plan made loosely with everyone expecting changes; a topic recurring
between friends without anyone raising it on purpose; a device glitching once, then working.
Meaning note: traditionally a preview period; subjects appearing here are candidates for the retrograde's
review. Nothing requires action during this phase.
Sources: [CC:search/mercury+retrograde page — "enters its shadow phase before its next retrograde cycle" —
supports Fact] [AC:astrology-430-56-dark-spaces-silver-light — shadow narrated as approach — supports
Meaning].

### src.timing.mercury.station-retrograde
Status: engine_event yes · source_row ready · reader_key `sky.station.mercury.{concrete sign}.retrograde` ·
composition full join required.
Fact: Mercury's apparent motion reaches zero before reversing; conventionally read a day or two either
side.
Scenes: replies delayed well past normal; travel plans changed twice in a day; the same conversation
repeated in one meeting; a booking abandoned midway.
Meaning note: traditionally an unfavorable window for finalizing agreements, travel, and communication
decisions. A pause reading, not a failure reading. Some decisions made at stations stand.
Sources: [AC:astrology-june-11-20-gemini-iii — "virtually motionless... slowed for its retrograde
station" — supports Fact] [CC:search/horoscopes — "stations retrograde on September 9th" — supports
dated-event Fact].

### src.timing.mercury.retrograde-passage
Status: engine_event yes (daily passage events) · source_row ready · reader_key
`sky.retrograde.mercury.{concrete sign}.retrograde_passage` · composition full join required.
Fact: the active retrograde. Occurs roughly every 100 days and lasts roughly 20 days; a station change can
repeat a specific aspect three times.
Scenes: a former coworker or old friend reappears; a shelved draft or hobby project reopened; a lost item
or misfiled message found; a trip rerouted; a misunderstanding cleared on the second conversation.
Meaning note: traditionally a revision period rather than a launch period. The traditional reading holds
that returned material benefits from completion. Interpretive, not predictive.
Sources: [Rodden:Modern Transits, Transit Mercury section — cycle and duration figures and three-pass
repetition — supports Fact] [CC:mercury-retrograde guide page — apparent backward motion as review —
supports Meaning] [SD:blogs — "letting go also means revisiting something from the past so you can
finally close it" — supports Meaning] [AC:astrology-nov-28-dec-4 — retrograde Mercury as unreliable
narrator — supports the verify-before-trusting reading].

### src.timing.mercury.cazimi-retrograde
Status: engine_event no (emission pending at the decided threshold) · source_row ready · reader_key none
· composition full join required; retrograde/direct distinction required.
Fact: Mercury's inferior conjunction with the Sun at the retrograde midpoint. Decided policy (owner, Aug
3): within 17 arcminutes triggers the named cazimi event; the 1-degree measurement remains proximity
metadata only and produces no card. A direct-motion superior-conjunction cazimi is a different event and
needs its own record if emitted.
Scenes: a stuck decision resolving in one sitting; the point of the confusion becoming sayable; a delayed
message finally written.
Meaning note: traditionally the clearest day inside the retrograde; mid-review insights are traditionally
treated as worth recording. Possibility, not guarantee.
Sources: [fact bank:TLDR-Reference-Facts-CC-SD.md, cazimi entry — 17-arcminute traditional figure —
supports Fact] [AC:astrology-nov-28-dec-4 — "short kazimi lends Saturday night a depth and clarity about
the confusions this Mercury retrograde has entailed" — supports Meaning] [SD:blogs — "This Cazimi is also
a powerful time to revisit any creative project, conversation, or decision that stalled" — supports
Scenes].

### src.timing.mercury.station-direct
Status: engine_event yes · source_row ready · reader_key `sky.station.mercury.{concrete sign}.direct` ·
composition full join required.
Fact: Mercury's apparent motion reaches zero before resuming forward motion; the post-shadow retrace
follows.
Scenes: a delayed agreement finalized; a trip rebooked and kept; a long-circling conversation settled; a
repair actually scheduled.
Meaning note: traditionally the resolution point of the review. Forward motion is not full speed until
the retrace completes.
Sources: [SD:blogs — "Mercury finally stations direct, ending the retrograde that has slowed us down since
late June" — supports Fact] [CC:search/horoscopes — dated station-direct announcements — supports Fact].

### src.timing.mercury.post-shadow
Status: engine_event no · source_row ready · reader_key none (`...post_shadow` after emission) ·
composition full join required.
Fact: Mercury retraces the retrograde degrees moving direct, back to the first station's degree.
Scenes: the last loose ends from the retrograde tied off; the corrected plan running for the first time
without incident.
Meaning note: traditionally the integration tail; retrograde themes fade rather than stop at the direct
station.
Sources: [SD:blogs — "Use the first half of the week to complete your review process, tie up loose ends" —
supports Meaning] [CC:mercury-retrograde guide page — shadow dates included in coverage — supports Fact].

## B. Venus retrograde phases

### src.timing.venus.pre-shadow
Status: engine_event no · source_row ready · reader_key none · composition full join required.
Fact: Venus transits her future retrograde degrees.
Scenes: a familiar price newly bothersome; a relationship pattern noticed but not named; a jacket, app, or
standing plan that stops feeling right; a redecorating urge that stalls.
Meaning note: preview of the value-and-relationship review; traditionally not a decision window.
Sources: [AC:astrology-430-56-dark-spaces-silver-light — "Venus creeps ever deeper into the shadow of her
coming retrograde, rousing uncomfortable feelings and messing with cash flow" — supports Fact and Scenes].

### src.timing.venus.station-retrograde
Status: engine_event yes · source_row ready · reader_key `sky.station.venus.{concrete sign}.retrograde` ·
composition full join required.
Fact: Venus stationary before reversing.
Scenes: a purchase left in the cart; a relationship conversation postponed again; a room half-rearranged;
an invitation neither accepted nor declined.
Meaning note: traditionally read as the stall marking the review's subject matter; classically an
unfavorable window for commitments in Venus's areas. Interpretive.
Sources: [AC:astrology-430-56 — pre-station Venus tension — supports Meaning] [CC:search/horoscopes —
dated stations — supports Fact].

### src.timing.venus.retrograde-passage
Status: engine_event yes · source_row ready · reader_key
`sky.retrograde.venus.{concrete sign}.retrograde_passage` · composition full join required.
Fact: the active Venus retrograde. Occurs roughly every 18 months and lasts roughly 42 days. Old partners
and old attractions are classically associated with the period.
Scenes: an ex making contact; a couple revisiting an arrangement set years ago; subscriptions and standing
plans reassessed; a wardrobe or home purge; a creative project's look reconsidered.
Meaning note: existing judgments about cost, value, taste, and commitment may be reconsidered during this
period. Do not claim that every purchase or promise made during the retrograde will fail. Governed
constraint, do_not_quote: chemistry is not a verdict.
Sources: [Rodden:Modern Transits, Transit Venus section — 18-month cycle, 42-day duration — supports Fact]
[CC:2010-horoscopes-free — Venus retrograde as value-and-relationship reckoning across twelve sign
readings — supports Meaning] [SD:blogs — release and realignment framing — supports Meaning]
[house:TLDR-Aspect-WriteUp-Ruling-Owner-JUL31.md — chemistry-is-not-a-verdict rule — governed constraint].

### src.timing.venus.cazimi-retrograde
Status: engine_event no (emission pending at the decided threshold) · source_row ready · reader_key none
· composition full join required.
Fact: Venus's inferior conjunction with the Sun at the retrograde midpoint; traditionally begins a new
Venus-Sun cycle. Same decided policy as Mercury cazimi: 17 arcminutes triggers the event; 1 degree is
proximity metadata only, no card.
Scenes: sudden clarity about what a relationship, purchase, or creative direction is worth to the person
deciding; a values question answered plainly after weeks of wobble.
Meaning note: traditionally the center of the value review and the seed of the next cycle in relationships
and values. Interpretive.
Sources: [fact bank:TLDR-Reference-Facts-CC-SD.md, cazimi entry — figure and cycle-renewal reading —
supports Fact and Meaning].

### src.timing.venus.station-direct
Status: engine_event yes · source_row ready · reader_key `sky.station.venus.{concrete sign}.direct` ·
composition full join required.
Fact: Venus stationary before resuming direct motion; post-shadow retrace follows.
Scenes: a renegotiated arrangement taking effect; a return kept; a reconciliation or separation made
definite; the postponed conversation finally had.
Meaning note: resolution point of the value review; revised terms normalize over the retrace.
Sources: [SD:blogs — station direct as completion — supports Meaning] [CC:search/horoscopes — dated
stations — supports Fact].

### src.timing.venus.post-shadow
Status: engine_event no · source_row ready · reader_key none · composition full join required.
Fact: Venus retraces the retrograde degrees moving direct.
Scenes: the first ordinary week under a revised arrangement; the replacement purchase quietly working out.
Meaning note: integration tail of the value review.
Sources: [structural parallel to src.timing.mercury.post-shadow — supports Fact only; no independent
meaning locator].

## C. Mars retrograde phases

### src.timing.mars.pre-shadow
Status: engine_event no · source_row ready · reader_key none · composition full join required.
Fact: Mars transits its future retrograde degrees.
Scenes: a project launched with everyone privately expecting a version two; a disagreement postponed; a
fitness plan started at an unsustainable pace; a home renovation begun optimistically.
Meaning note: efforts begun here traditionally carry a built-in mid-course revision; plans with a
scheduled review point fit the period. Interpretive.
Sources: [AC:astrology-nov-28-dec-4 — "Mars is digging slowly an underworld of his own in preparation for
his Winter 2012 retrograde" — supports Fact and Meaning].

### src.timing.mars.station-retrograde
Status: engine_event yes · source_row ready · reader_key `sky.station.mars.{concrete sign}.retrograde` ·
composition full join required.
Fact: Mars stationary before reversing.
Scenes: momentum on a project or dispute stopping without explanation; a training week falling flat;
effort producing friction instead of progress.
Meaning note: traditionally a poor window for launches and confrontations; the traditional reading treats
the stall as the strategy coming under review. Interpretive.
Sources: [AC:astrology-of-wednesday-june-27th-2018 — "Coming right on the heels of Mars' retrograde
station, this Full Moon's timing is not merciful" — supports station-weight Fact] [traditional reading,
no folder locator verified — Meaning carries interpretive authority only].

### src.timing.mars.retrograde-passage
Status: engine_event yes · source_row ready · reader_key
`sky.retrograde.mars.{concrete sign}.retrograde_passage` · composition full join required.
Fact: the active Mars retrograde. Occurs every 24 to 26 months and lasts 60 to 80 days; a station change
can repeat a specific aspect three times.
Scenes: an old disagreement reopening with the same participants; a project rolled back to an earlier
version; long-held anger finally voiced at its actual source; a competitive goal quietly rescoped; energy
moved from a stalled push to a neglected repair.
Meaning note: traditionally a revision period for the effort underway rather than a launch period for a
new one. Governed constraint, do_not_quote: the size of a reaction measures the age of the grievance.
Sources: [Rodden:Modern Transits, Transit Mars section — cycle 24-26 months, duration 60-80 days,
three-pass repetition — supports Fact] [traditional reading, no folder locator verified — the
revise-not-launch Meaning carries interpretive authority only] [house:TLDR-Aspect-WriteUp-Ruling and
pair-sources Mars-Lilith entry — grievance-age rule — governed constraint].

### src.timing.mars.sun-opposition
Status: engine_event no · source_row ready · reader_key none · composition full join required.
Fact: the Sun opposes retrograde Mars at the passage midpoint. Astronomy: a superior planet's retrograde
centers on its opposition to the Sun; engine-verifiable. Mars has no retrograde cazimi; this is the
structural midpoint event.
Scenes: the conflict or effort under review reaching its most visible moment; the real stakes of a stalled
push becoming plain to everyone involved.
Meaning note: traditionally the fullest illumination of what the retrograde is reviewing. Interpretive.
Sources: [astronomy — superior-planet retrogrades center on Sun opposition — supports Fact,
engine-verifiable] [traditional reading, no folder locator verified — Meaning carries interpretive
authority only].

### src.timing.mars.station-direct
Status: engine_event yes · source_row ready · reader_key `sky.station.mars.{concrete sign}.direct` ·
composition full join required.
Fact: Mars stationary before resuming direct motion; post-shadow retrace follows.
Scenes: a leaner version of a project restarting; a renegotiated boundary holding through its first test;
physical energy returning.
Meaning note: momentum traditionally returns in stages through the retrace rather than at once.
Sources: [SD:blogs — direct station as end of slowdown — supports Meaning] [CC:search/horoscopes — dated
stations — supports Fact].

### src.timing.mars.post-shadow
Status: engine_event no · source_row ready · reader_key none · composition full join required.
Fact: Mars retraces the retrograde degrees moving direct.
Scenes: the revised plan running at full speed for the first time; the settled conflict staying settled.
Meaning note: integration tail; the urge to make up lost time traditionally precedes actual clearance.
Sources: [structural parallel to the other post-shadow records — supports Fact only].

## D. Outer-planet retrograde frame — STRUCTURAL LAYER (Jupiter, Saturn, Uranus, Neptune, Pluto; Chiron scheduled next engine pass)

These records never produce reader copy alone. Required composition: this structural meaning + the
planet's own meaning from `data/modifiers/retrograde-planet-meanings.json` + sign meaning + engine facts +
voice, per the global contract. Their reader keys exist per planet and sign; the structural record itself
is not a reader key.

### src.timing.outer.station-retrograde
Status: engine_event yes for Jupiter-Pluto; Chiron scheduled next engine pass · source_row ready
(structural) · reader_key per planet `sky.station.{planet}.{concrete sign}.retrograde` · composition
planet meaning REQUIRED + full join.
Fact: annual retrograde station of a slow planet; passages run roughly 4 to 6 months depending on the
body.
Scenes: a long personal project set down mid-build; a long-term commitment paused for rethinking; the
year's big theme going quiet in plans and loud in conversations at home.
Meaning note: structurally a scheduled review inside a multi-year story, not an alarm. The planet's own
meaning supplies what is under review.
Sources: [AC:astrology-june-11-20-gemini-iii — Neptune's station "begins its annual season of retreat" —
supports Fact] [AC:astrology-apr-10-19-aries-iii — slow retrogrades argued as major themes — supports
Meaning].

### src.timing.outer.retrograde-passage
Status: engine_event yes (daily passage) for Jupiter-Pluto; Chiron scheduled next engine pass ·
source_row ready (structural) · reader_key per planet
`sky.retrograde.{planet}.{concrete sign}.retrograde_passage` · composition planet meaning REQUIRED +
full join.
Fact: the active retrograde months of a slow planet.
Scenes: commitments made earlier in the year privately re-examined; quiet exits and quiet deepenings in
relationships and projects without announcements.
Meaning note: structurally the period when the long theme continues without visible motion. Planet meaning
supplies content.
Sources: [AC:astrology-of-sunday-october-6th-2019 — "undercurrent of longer-term changes pulls at the
day" — supports Meaning] [SD:blogs — "Pluto retrograde asks us to go inward" — supports the inward
reading].

### src.timing.outer.station-direct
Status: engine_event yes for Jupiter-Pluto; Chiron scheduled next engine pass · source_row ready
(structural) · reader_key per planet `sky.station.{planet}.{concrete sign}.direct` · composition planet
meaning REQUIRED + full join.
Fact: the slow planet resumes direct motion.
Scenes: a postponed personal decision getting a date; a long project picked back up with changes; a
conclusion reached privately during the quiet months acted on.
Meaning note: structurally, conclusions formed during the retrograde tend to become visible actions after
the direct station. Interpretive.
Sources: [CC:search/horoscopes — "Jupiter will station direct" dated pattern — supports Fact]
[AC:equinox-churn and related — direct-season development framing — supports Meaning].

## E. Ingress events

Reader key available today: `sky.ingress.{planet}.{sign}` (plus dated instance). The engine computes
direction (direct | retrograde) only; it cannot distinguish an initial direct ingress from a final one, so
pass types are NOT emitted. The pass-specific records below wait on engine ingress-history work, and until
then generation may use only the pass-neutral meaning. Pass-neutral rule: describe the shift without
claiming it is new territory, because a direct ingress may be a final re-entry completion.

Shared re-entry record (applies to all planets once passType exists):
### src.timing.shared.ingress-re-entry
Status: engine_event no (passType not computed) · source_row ready · reader_key none · composition full
join required.
Meaning note: a retrograde return to the prior sign reopens that sign's themes briefly for completion.
Not new territory; review framing only. The planet's meaning says what is reviewed; the prior sign's
meaning says where.
Sources: [astronomy — retrograde re-entry mechanics — supports Fact, engine-verifiable].

### src.timing.sun.ingress
Status: engine_event yes · source_row ready · reader_key `sky.ingress.sun.{concrete sign}` · composition
full join required. All Sun ingresses are initial (no retrograde).
Fact: monthly sign change.
Scenes: the shared mood changing subject; a household's or friend group's attention rotating with the
season; last month's preoccupation receding.
Meaning note: the collective's seasonal subject and style shift; the sign meaning supplies the new subject
and style.
Sources: [CC:search/horoscopes — season framing with date ranges — supports Fact]
[AC:2010-horoscopes-free — ingress sentences carrying immediate consequence — supports structure].

### src.timing.moon.ingress
Status: PERMANENTLY EXCLUDED from the timing-event corpus (owner decision, Aug 3): the Moon placement
card already serves this meaning; no calendar ingress event will be added. Record retained for the
placement surface only.
Fact: sign change every 2 to 3 days; the fastest cycle.
Scenes: the same errand feeling different on different days; a group's appetite shifting between comfort
and adventure inside one week.
Meaning note: short-cycle collective mood; expires on its own schedule.
Sources: [AC daily pages, e.g. astrology-of-friday-october-11th-2019 — lunar narration as day texture —
supports Meaning] [SD:blogs — day-by-day Moon listings — supports Fact].

### src.timing.mercury.ingress
Status: engine_event yes (pass-neutral) · source_row ready · reader_key
`sky.ingress.mercury.{concrete sign}` · composition full join required.
Fact: several weeks per sign, variable with retrogrades; re-entries occur.
Scenes: conversations changing subject and pace at home and at work; the questions friends ask each other
changing shape; reading and scrolling habits shifting.
Meaning note (pass-neutral): the collective conversation takes on the sign's subject and style.
Sources: [CC:search/mercury+retrograde — "Mercury breezes into Gemini" ingress guide with dates — supports
Fact] [AC:astrology-june-11-20-gemini-iii — "Mercury, who enters Cancer on the 12th, attests to..." —
supports structure].

### src.timing.venus.ingress
Status: engine_event yes (pass-neutral) · source_row ready · reader_key
`sky.ingress.venus.{concrete sign}` · composition full join required.
Fact: roughly 3 to 4 weeks per sign, longer near retrogrades; re-entries occur.
Scenes: what looks good shifting at home and in feeds; date and gathering formats changing; the same gift
or gesture landing differently than last month.
Meaning note (pass-neutral): collective taste, affection style, and spending take on the sign's style.
Sources: [CC:search/saturn+return page — "Venus evacuates the storm zone and enters Virgo on July 21st" —
supports Fact pattern] [AC daily pages — Venus movements narrated as social texture, e.g.
astrology-of-saturday-september-14th-2019 — supports Meaning].

### src.timing.mars.ingress
Status: engine_event yes (pass-neutral) · source_row ready · reader_key `sky.ingress.mars.{concrete sign}`
· composition full join required.
Fact: roughly 6 to 7 weeks per sign, much longer around retrogrades; re-entries occur.
Scenes: where friction shows up shifting between the kitchen, the group chat, the commute, and the
project; a new kind of disagreement appearing; physical energy asking for a different outlet.
Meaning note (pass-neutral): collective effort and friction take on the sign's style and subject.
Sources: [CC:search/horoscopes — "enters practical Capricorn from January 4th to February 12th" — supports
Fact] [AC:2010-horoscopes-free — ingress with consequence — supports structure].

### src.timing.jupiter.ingress
Status: engine_event yes (pass-neutral) · source_row ready · reader_key
`sky.ingress.jupiter.{concrete sign}` · composition full join required.
Fact: roughly one year per sign; re-entries occur.
Scenes: a subject or pursuit suddenly popular among friends; a hobby, belief, or plan growing faster than
expected; last year's enthusiasm settling into routine.
Meaning note (pass-neutral): collective confidence and growth take on the sign's subject; expansion is
broad, not selective.
Sources: [CC:search/horoscopes — year-long Jupiter guides — supports Fact] [AC:2010-horoscopes-free —
Jupiter ingress consequences narrated per sign — supports Scenes].

### src.timing.saturn.ingress
Status: engine_event yes (pass-neutral) · source_row ready · reader_key
`sky.ingress.saturn.{concrete sign}` · composition full join required.
Fact: roughly 2.5 years per sign; re-entries occur.
Scenes: a casually treated subject acquiring rules and deadlines; a relationship or habit formalizing or
ending; improvised arrangements replaced by durable ones.
Meaning note (pass-neutral): collective standards and consequence take on the sign's subject and style.
Sources: [CC:search/saturn+return — "Every 2.5 years or so, Saturn enters a new sign" — supports Fact]
[Jacobs:Saturn Returns PDF, Capricorn/structure passage — structure-building meaning — supports Meaning]
[AC:astrology-dec-21-30 — "multi-year landscape of Saturn in Capricorn" — supports framing].

### src.timing.uranus.ingress
Status: engine_event yes (pass-neutral) · source_row ready · reader_key
`sky.ingress.uranus.{concrete sign}` · composition full join required.
Fact: roughly 7 years per sign; re-entries occur.
Scenes: an assumption questioned everywhere at once; unconventional arrangements tried in homes and
friendships; a settled routine or tool replaced abruptly.
Meaning note (pass-neutral): collective disruption and experiment take on the sign's subject.
Sources: [AC:15th-21st-gilded-tempest — multi-year configurations "sowing the next several years' big
conflicts" — supports Meaning] [house:Uranus corpus (owner-approved editions) — empathy-first framing —
governed voice anchor].

### src.timing.neptune.ingress
Status: engine_event yes (pass-neutral) · source_row ready · reader_key
`sky.ingress.neptune.{concrete sign}` · composition full join required.
Fact: roughly 14 years per sign; re-entries occur; generational marker.
Scenes: a subject acquiring glamour and vagueness together; ideals forming faster than practical support;
the cohort coming of age treating the new dream as normal.
Meaning note (pass-neutral): collective longing and confusion take on the sign's subject; the vision and
the illusion arrive together.
Sources: [Parker:DK Astrology PDF, Neptune section (p. 242 area) — "The planet was in Libra from 1942 to
1956-7" and generation-influence caution — supports Fact and Meaning] [AC:astrology-2020-the-bridge — era
framing — supports structure].

### src.timing.pluto.ingress
Status: engine_event yes (pass-neutral) · source_row ready · reader_key
`sky.ingress.pluto.{concrete sign}` · composition full join required.
Fact: 12 to 31 years per sign; re-entries occur; generational marker.
Scenes: something treated as permanent beginning a long overhaul; hidden workings becoming visible;
control in the sign's subject area named openly.
Meaning note (pass-neutral): collective excavation and transformation take on the sign's subject; the
process outlasts news cycles.
Sources: [AC:astrology-2020-the-bridge — "Saturn perfects a conjunction with Pluto at 22 Capricorn" and
epochal framing — supports structure] [house:Pluto corpus — power named openly — governed voice anchor].

---

## Status

needs_review, awaiting meaning-layer approval after Codex's key-expansion and provenance passes. V7
applies the owner's product decisions: cazimi at 17 arcminutes (1 degree = proximity metadata, no card),
Moon ingress permanently excluded, Chiron stations and passage scheduled for the next engine pass. Import
scope per owner: currently emitted stations, active passages, and pass-neutral ingresses only. V6's
structural content is otherwise unchanged: `src.timing.*` source records, underscore-normalized reader-key
mapping, four-field statuses, six-part composition contract, pass-neutral ingress rule with a shared
re-entry record, claim-level provenance with unverified traditional claims labeled, governed phrases
marked do_not_quote.
