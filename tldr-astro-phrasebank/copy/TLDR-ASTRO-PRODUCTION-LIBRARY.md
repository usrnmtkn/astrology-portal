# TLDR ASTRO SOURCE EXTRACTION AND PRODUCTION LIBRARY

**Version:** 1.0 · **Built:** 2026-07-13 · **Scope:** editorial production library (article types, structures, vocabulary, hooks, fallbacks, personalized natal layer, surface variants, validation).

**Evidence base (only):** `tldr-astro-template-handoff-v2` (v2.0.1) `sources/` and `references/` — `cc-source-phrases.json`, `marie-source-phrases.json`, `tldr-astro-records.json`, `tldr-astro-voice-spec.md`, `CC-APP-CONTENT-LOGIC.json`, `source-derived-clause-exemplars.json`, and 50 CC reference screenshots. Nothing here is invented beyond what the corpus demonstrates; structural lessons are paraphrased, only short excerpts are quoted.

**Non-negotiable frame (from the package):** sources and screenshots are **evidence, not reader-ready copy**. A source key existing does not make a record READY. The reader only ever meets the *voiced* layer (Marie Satori house voice); the `cc/*` and `ms/*` reference logic is scaffolding that supplies WHAT is true, never shown raw. Compact and expanded copy must differ. When the required exact source is missing, return `SOURCE_GAP` rather than assembling prose from keywords.

---

## 1. Source inventory

| Source file | What it is | Shape | Default status |
| --- | --- | --- | --- |
| `cc-source-phrases.json` | Extracted CC horoscope mechanics: sign lived-behaviors/hooks/actions/closings, house scenes, planet function/productive/excess, 84 exact aspect-pair clauses, aspect geometry+psychology, 320 fallback-hooks, event-action notes, planet-in-sign copy, key-dates. | dict keyed by `cc/...` | APPROVED for guidance; individual `alt` lines CONFIRMED; `fallback-hook/*` weekly excerpts REFERENCE_ONLY/RAW_QUARANTINE until reviewed |
| `marie-source-phrases.json` | Marie Satori material: chart-comparison verdicts (synastry), retrograde phases, per-planet retrograde/ingress, dignity tags, profection years, midheaven-by-sign, mercury-rx/uranus-rx by sign, venus year, eclipse fragments, pull-quotes/essay-quotes. | dict keyed by `ms/...` | APPROVED for guidance; `pull-quote/*` and `essay-quote/*` REFERENCE_ONLY |
| `tldr-astro-records.json` | 2 MB record store: 132 generic transit-through-house rows (quarantined as `REFERENCE_SCAFFOLD`) + 84 exact aspect-pair rows requiring review. | `{records:[...]}` | REFERENCE_SCAFFOLD / EVIDENCE_ONLY_UNTIL_REVIEWED |
| `tldr-astro-voice-spec.md` | The Marie Satori house voice: gold-standard exemplars, signature moves, banned register. | prose | Voice authority (serving lane) |
| `CC-APP-CONTENT-LOGIC.json` | Reverse-engineered CC generation logic for natal placement pages, gift/challenge aspect sorting, and transit prioritization, from 42 screenshots. | structured | REFERENCE_ONLY (mechanics, not copy) |
| `source-derived-clause-exemplars.json` | 4 sentence-ready calibration records (sky retrograde, natal Sun, saturn-square-venus transit, moon-node aspect) showing fact→meaning→voice. | records with `slots` | REVIEWED_CLAUSE exemplars |
| `references/CC-*-screenshots/` (50 PNG) | 40 legacy + 10 current CC app screens (Me/birth-chart, Transits, Home planetary horoscopes, Moon forecast, Sky). | images | REFERENCE_ONLY / `raw_chani_copy` PROHIBITED as serving source |

**Duplicate sources:** the four smaller ZIPs (`-REVIEWED-COMPLETE`, `-NEW-NATAL-TRANSITS-DIRECTION`, `-FULL-DASHBOARD-NEW-DIRECTION`, `-FINAL-SOURCE-GROUNDED-TEMPLATES`) are prior iterations; their `cc-source-phrases.json` / `marie-source-phrases.json` / `tldr-astro-records.json` are byte-identical to v2.0.1. Use v2.0.1 only. See §14 and the changelog.

---

## 2. Article-type taxonomy

Three independent dimensions — never collapse them (per the extraction spec §2): **editorial type** (the container), **event type** (the astrological trigger), **surface** (where it renders). A `daily-horoscope` is an editorial container that may carry a `venus-ingress` event on a `feed-card` surface.

### Article-type comparison table

| Article type | Primary job | Typical length | Main structure | Personalization placement | Required timing | Fallback family |
| --- | --- | --- | --- | --- | --- | --- |
| daily-horoscope | one lived scene + one action for today | 60–140w | theme → concrete area → behavior → small correction | natal-house layer near end | date (day) | `fallback/daily-horoscope` |
| weekly-horoscope | thesis + how the week develops | 120–220w | thesis → main transit → supporting → chronology → priority → key dates | houses + exact aspect mid/late | date range + key dates | `fallback/weekly-horoscope` |
| monthly-horoscope | month arc around a lunation | 180–320w | overview → lunation/transit arc → personal story → priority → timing | primary+secondary house late | month + key dates | `fallback/monthly-horoscope` |
| planetary-horoscope | current planet/sign through the reader's rising house | 120–260w (detail) | opening claim → one house scene → optional questions → agency | **is** the body of the piece (rising-house) | active window | `fallback/planetary-horoscope` |
| season-horoscope | one season through a house | 120–220w | season frame → house area → pattern → practice | rising-house | ~1 month | `fallback/season-horoscope` |
| new-moon-horoscope | a beginning in a house | 120–200w | activated house → specific beginning → aspect/modifier → one practice → 6-mo ref | house + exact aspect | exact date + 6-mo arc | `fallback/new-moon-horoscope` |
| full-moon-horoscope | a culmination on a house axis | 120–200w | axis lit → two life areas → aspect/modifier → look-back to New Moon | **both** houses of axis | exact date + 6-mo look-back | `fallback/full-moon-horoscope` |
| solar-eclipse-horoscope | a chapter that arrives via changed circumstance | 140–220w | house activated → arrives-not-initiated → modifier → stay flexible | house | exact date + flexible window | `fallback/solar-eclipse-horoscope` |
| lunar-eclipse-horoscope | a culmination/separation that can't be ignored | 140–220w | axis → completes/separates → modifier → handle before explaining | axis (both houses) | exact date | `fallback/lunar-eclipse-horoscope` |
| year-ahead-horoscope | the year's dominant houses + main transit | 260–450w | dominant houses → main transit-to-natal → eclipses/axis → developmental task | primary houses + main exact transit | year + pass windows | `fallback/year-ahead-horoscope` |
| transit-essay | one collective transit, developed | 220–400w | what governs → what changes → dates → lived behavior → practical | collective (optional per-sign tail) | active window + exact | `fallback/transit-natal` (collective variant) |
| retrograde-guide | reconsideration cycle of a planet | 220–450w | what planet governs → what Rx changes → shadow/station dates → sign review → recurring problem → aspects → practical → per-sign/house | per-sign or per-house tail | shadow+station+Rx dates | `fallback/retrograde` |
| direct-station-guide | what starts moving again | 120–260w | what re-starts → what's unresolved → what got clearer → what gets tested | per-house | station date | `fallback/direct-station` |
| ingress-guide | a body changes sign; tone shifts | 120–260w | date-in/out → what planet does → what sign changes it to → why notable → per-house | per-house | ingress date + window | `fallback/ingress` |
| major-aspect-guide | two collective forces in contact | 160–320w | forces → tension/opening → dates → lived → practical | collective | exact date + orb | `fallback/sky-aspect` |
| retrograde-guide (two-sign) | Rx that backs into prior sign | 260–450w | governs → Sign A becomes visible → pivot → Sign B has been shaping it → station → re-entry as test | per-sign both signs | multi-pass dates | `fallback/retrograde` |
| moon-phase (module) | phase's role in the cycle + action | 30–90w | phase role → phase-appropriate action | collective (no sign copy) | timestamp | `fallback/moon-phase` (phase) |
| moon-sign (module) | embodied guidance for the Moon's sign | 30–90w | short embodied imperative → optional care/boundary | collective (no phase copy) | active window | `fallback/moon-sign` |
| natal-placement / birth-chart-feature | durable chart pattern | 140–320w | sign+house synthesis → conditional modifiers → ruler bridge → gifts/challenges | **is** personal (natal) | evergreen (no date) | none — `SOURCE_GAP` if unreviewed |
| sky collective planet-in-sign | what shifts in the shared environment | 90–200w | collective situation → developed meaning → optional response | **never** personalized | active window | `fallback/sky-aspect` collective |
| key-dates / event-timeline | dated list of events | list | date → one-line what-changes | collective | dates | `cc/key-dates/*` |

_New article types identified from the corpus beyond a naive "daily/weekly/monthly" set: **planetary-horoscope** (personalized-by-rising-house, distinct from Sky and from natal), **two-sign retrograde-guide**, **direct-station-guide** (separated from retrograde-guide), **ingress-guide**, **moon-phase** and **moon-sign** as separate modules, **cazimi** event copy, **outer-planet-cycle-guide**, **profection year** framing. See §20 deliverable 3._

### Per-type editorial detail

Each type below gives: purpose · hook pattern · body pattern · personalized placement · close · fallback · short surfaces · validation. Structures are written as sequences of editorial functions (per spec §4), grounded in the voice spec and CC-APP-CONTENT-LOGIC.

**daily-horoscope** — _Purpose:_ name one scene the reader could actually meet today and one proportionate move. _Hook:_ a recognizable moment or a light imperative (`cc/sign/*/hook/alt*`), never "the astrology" first. _Body:_ one dominant theme → one concrete life area → one behavior they may notice → one small correction. _Personalized placement:_ natal-house layer near the end only ("today's Moon moves through your {house} house, so this may show up through {one concrete example}"). _Close:_ one action or a plain reframe (`cc/sign/*/action/alt*`, `/closing/alt*`); may be omitted when the thought is complete. _Fallback:_ `fallback/daily-horoscope`. _Short surfaces:_ feed-card 70–120w, tooltip 12–24w. _Validation:_ exactly one scene; action is specific (state the rate / send the text), not "know your worth".

**weekly-horoscope** — _Purpose:_ a weekly thesis with chronological development. _Hook:_ name the week's tonal shift plainly. _Body:_ thesis → main transit → supporting transit → chronology → what changes by week's end → personalized priority → key dates. _Personalized:_ two houses + the strongest exact natal aspect, mid-to-late. _Close:_ prioritize one action + key dates. _Fallback:_ `fallback/weekly-horoscope`. _Short:_ week-view 35–65w. _Validation:_ chronology present; treated as a container, not an event.

**monthly-horoscope** — _Purpose:_ the month's arc around its lunation. _Body:_ overview → lunation + major-transit arc → personalized month story → priority → key timing. _Personalized:_ primary house + secondary house + strongest exact transit. _Close:_ most useful focus. _Validation:_ names the lunation; scaled to a month, not a day.

**planetary-horoscope (Home, personalized by rising house)** — _Purpose:_ interpret the **current** planet/sign through the user's **rising-sign whole-sign house** — one life situation, not a collective "Sun moving through Cancer" and not a natal placement. _Hook:_ a clear opening claim about that house domain. _Body:_ opening claim → one house-selected scene (choose ONE facet from `cc/house/{n}/*`, do not list) → optional related questions that deepen the same subject → compassionate/practical agency. _Personalized placement:_ the whole card is personalized; the house **selects** the scene. _Close:_ compassionate agency or one practical move. _Fallback:_ `fallback/planetary-horoscope` (house-personalized). _Short:_ card = factual placement title + timing + optional compact summary (no expanded narrative). _Validation:_ resolved rising house present; not collective; one subject; questions deepen it. _Worked resolver:_ `Gemini rising + Sun in Cancer → Cancer = 2nd house → one story about security/worth/livelihood` (choose one, e.g. worth tangled with money, `cc/house/2/worth`).

**season-horoscope** — season through a house; one pattern; one season-long practice. Personalized by rising house. Scaled to ~a month.

**new-moon-horoscope** — activated house → a specific beginning → exact aspect or natal modifier → one practice tied to a concrete behavior → six-month reference. Names one house. Sets an intention, not a prediction.

**full-moon-horoscope** — axis lit (must name **both** houses) → two life areas to a turning point → exact aspect/modifier → look back to the New Moon in the sister sign six months ago. Marie exemplar: "The Full Moon lands in your 2nd house, highlighting the 2nd/8th axis of personal resources versus shared wealth."

**solar-eclipse-horoscope** — house activated → a beginning that arrives through changing circumstances rather than a plan → modifier → keep the schedule flexible. Separated from lunar eclipse.

**lunar-eclipse-horoscope** — axis activated (both houses) → something completes/separates/becomes impossible to ignore → modifier intensifies → handle what's happening before deciding what it means.

**year-ahead-horoscope** — dominant houses → most important transit-to-natal aspect + its window → eclipse axis + a major ingress/station → the year's developmental task. Prioritizes the exact transit over generic Sun/Moon commentary.

**transit-essay (collective)** — what the planet governs → what the event changes → dates → lived behavior → practical response; optional per-sign or per-house tail. Uses `cc/planet/*` + `cc/event-action/*` + `ms/ingress|retrograde/*`.

**retrograde-guide** — what the planet governs (`cc/planet/{p}/function`) → what retrograde changes → shadow + station + Rx dates (`ms/retro-phase/*`) → sign-specific review (`ms/mercury-rx/sign/*`, `ms/uranus-rx-gemini/*`) → the recurring/returning problem → major aspects → practical response (`cc/event-action/{planet}-retrograde`) → per-sign or per-house horoscopes. **Two-sign variant:** Sign A = what becomes visible; sign-change pivot; Sign B = what has been shaping the first problem; station direct; re-entry into Sign A as a test. Name the behavior, never "the focus shifts from communication themes to emotional themes."

**direct-station-guide** — what starts moving → what's still unresolved → what became clearer → what gets tested next. Separated from retrograde-guide.

**ingress-guide** — date-in/date-out → what the planet does → what the sign changes it into → why this ingress is notable → per-house effects (`cc/event-action/ingress-*`, `ms/ingress/*`).

**major-aspect-guide / current-sky aspect** — two collective forces in contact → one tension or opening → dates + orb → lived expression → optional response. Exact pair primary (`cc/aspect-pair/*`); never join two planet keyword lists with "meets".

**natal-placement** — see §4; ordered, conditional synthesis, not stacked definitions.

**moon-phase / moon-sign** — two separate modules; phase gives cycle-role + action, sign gives embodied imperative; never merge.

---

## 3. Event-type templates

Written as editorial-function sequences. Each names its required source families and its `SOURCE_GAP` condition.

### ingress
`date-in/out → what the planet does (decisive/relational/structural…) → what the destination sign changes it into → why notable (e.g. unusually long stay) → per-house lived effect → practical orientation`
Sources: `cc/event-action/ingress-{fast|jupiter|…}`, `ms/ingress/{planet}`, `cc/planet/{p}/function`, `cc/house/{n}/*`. Gap: no reviewed ingress or destination-sign source.

### retrograde
`what governs → what Rx reconsiders → shadow/station/Rx dates → sign review → the returning problem → aspects → practical response → per-sign/house tail`
Phase records are distinct (`ms/retro-phase/pre-retrograde-shadow | stationary | retrograde | post-retrograde-shadow`). Practical: `cc/event-action/mercury-retrograde` etc. Must answer: what is being reconsidered / what repeats / what should not be forced / what changes by natal house.

### direct-station
`what starts moving → what remains unresolved → what became clearer → what gets tested next`. Must not reuse retrograde copy. Source: `ms/retro-phase/stationary` + planet function.

### cazimi
`what it is (planet in the heart of the Sun, renewed) → clarity peak within the longer cycle → set/renew intentions tied to that planet`. Source: `cc/event-action/cazimi`. Rare; MANUAL_ONLY unless a reviewed clause exists.

### new-moon
`activated house → specific beginning → exact aspect/natal modifier → one practice → six-month reference`. Required elements all present or `SOURCE_GAP`.

### full-moon
`axis lit (both houses) → two life areas to a turning point → exact aspect/modifier → look-back to the New Moon six months ago`. Both houses required.

### solar-eclipse
`house activated → chapter arrives via changed circumstance → modifier → stay flexible`. Must answer: what chapter begins / how circumstances redirect it / which house / what stays flexible.

### lunar-eclipse
`axis activated → what culminates or separates → modifier intensifies → handle before explaining`. Must answer: what culminates/separates / which axis / what can't be ignored / what to handle first.

### sky-aspect
`two collective forces → one tension or opening → dates + orb + applying/separating → optional response`. Exact pair primary (`cc/aspect-pair/*`), no keyword concatenation. Gap: exact pair absent.

### transit-to-natal
`exact aspect-pair lived situation (primary) → house locates the scene → one Sun/Moon/chart-ruler/house-ruler modifier → lived synthesis → practical response → factual footer last`. **Begins with the exact aspect-pair source.** If the pair (e.g. Mars–Ascendant) lacks a reviewed clause, the interpretation is `SOURCE_GAP`; Mars and Ascendant keywords cannot be combined to fill it. Sources: `cc/aspect-pair/{a}-{aspect}-{b}`, `ms/chart-comparison/verdict/{planet}/{aspect}`, `ms/chart-comparison/planet/{p}`, `cc/ref/outer-planets/*` for slow transits, `cc/house/{n}/*` to locate.

### outer-planet-cycle
`the sore spot / generational theme in the sign's domain → multi-round ingress (R1/R2/R3) → slow "new cycle of working with" register`. Source: `cc/event-action/outer-planet-long-cycle-*`, `cc/fallback-outer-planet-cycle-*`. Slow; low certainty; MANUAL_ONLY tail.

### planetary-return
`the body returns to its natal sign/degree → what chapter closes and opens → the developmental task of the new cycle`. Source: profection/return framing (`ms/profection/*`). Sparse — flag in §15.

---

## 4. Personalized natal layer

**Trigger:** `user.isLoggedIn == true AND user.hasNatalChart == true`. Begin collectively or sign-based, then add the personalized natal layer **near the end** (except the natal-placement surface and Home planetary-horoscope, which are personal throughout).

### Shared serving order (do not reorder)
`activated natal house → exact transit-to-natal aspect → one meaningful Sun/Moon/chart-ruler/house-ruler modifier → lived synthesis → practical advice`

### Shared rules
- The personalized section answers three questions: where does this land in the chart, why might the user feel it differently, what to pay attention to.
- **Do not** append generic Sun/Moon/rising paragraphs. Reject "As an Aquarius, you are independent." Prefer synthesis: "This activates your 4th house, so it may show up through home, privacy, and family agreements. Your Scorpio Moon makes trust and decompression especially important, while your Aquarius Sun may push you to redesign the whole arrangement before testing a smaller repair."
- Exact natal aspects outrank generic luminary commentary.
- Missing/unreliable birth time → suppress house- and sect-dependent copy; fall back to sign-based collective. (See §13 and `SECT-ELIGIBILITY-CONTRACT`.)

### CC natal-placement page order (from `CC-APP-CONTENT-LOGIC.json`, calibration only)
`1 sign (function×archetype) → 2 house (concrete domain) → 3 sect importance (only for the sect light) → 4 natal retrograde (if Rx at birth) → 5 dignity note (if in dignity/debility) → 6 gifts & challenges (all aspects, sorted)`.
Aspect sorting: trine/sextile → GIFTS; conjunction inherits the other body's nature; square/opposition → CHALLENGES; benefic (Venus/Jupiter) in a hard aspect may sit under GIFTS as gift-with-tension; order by tightest orb then traditional body order.

### Per-type personalized templates (function sequences; braces are calc-layer facts)
- **daily:** `today's Moon/dominant transit moves through your {house} house → {one or two concrete house examples} → your {exact aspect / relevant placement} may make you more likely to {specific reaction} → give it a practical outlet through {action}`
- **weekly:** `the week's events activate your {houseA} and {houseB} → connects {life area A} with {life area B} → strongest personal contact is {exact natal aspect} → prioritize {action}`
- **monthly:** `the month centers on your {primary house}, secondary {secondary house} → strongest transit {exact aspect} → {month-long story} → focus {priority}`
- **planetary:** `{Planet} in {sign} moves through your {house} → notice through {2–3 concrete house examples} → your {placement} may make you {reaction} → helps when {productive use}, may lead to {excess} → choose {action}`
- **season:** `{sign} season moves through your {house} → attention to {house area} → your {placement/aspect} makes you aware of {pattern} → practice {action} through the season`
- **new moon:** `New Moon in {sign} falls in your {house} → begins a six-month story around {house area} → because {exact aspect/modifier} you may {excess} → set an intention tied to {behavior}`
- **full moon:** `Full Moon in {sign} lights your {houseA}/{houseB} axis → brings {area A} and {area B} to a turning point → {exact aspect/modifier} makes it personal through {experience} → look back to the New Moon in {sister sign}`
- **solar eclipse:** `Solar Eclipse in {sign} activates your {house} → a chapter around {house area} arrives through changing circumstance → {modifier} makes it noticeable through {experience} → keep the schedule flexible`
- **lunar eclipse:** `Lunar Eclipse in {sign} activates your {houseA}/{houseB} axis → {area A} and {area B} to a turning point → something completes/separates through {experience} → {modifier} intensifies → deal with it before deciding what it means`
- **year ahead:** `this year emphasizes your {primary houses} → most important transit is {transit-to-natal aspect} from {timing} → shapes the year through {story} → eclipses activate your {axis}, {ingress/station} shifts attention to {secondary area} → your task is {developmental focus}`

---

## 5. Sign banks

_Lived behaviors, not keyword stacks. Source: `cc/sign/{sign}/*`. Status: APPROVED (guides generation)._

### Aries

**Lived behaviors**

- generates ideas about identity/style/projects faster than plans to execute them
- wants to act on inspiration immediately
- equates directness with courage
- talks self out of investing in own goals when the inner critic spikes
- feels anxious precisely where usually energized

**Hook moves**

- name the surplus ("You've got great ideas")
- hand over agency ("The floor is yours")
- normalize doubt ("We all live with doubt")

**Actions (practical corrections)**

- make a plan and start moving
- say the thing directly
- invest in yourself
- don't wait for instant results
- name where resource tension is building

**Closings**

- name the courage it took
- "the inspiration is worth acting on"
- permission to fake confidence until it's real

**Authored exemplar lines (CONFIRMED — Marie/CC copy, may serve verbatim on matching surface):**

- _Try to have just a little more confidence in yourself._  `[cc/sign/aries/action/alt2]`
- _Don’t be afraid to invest in yourself._  `[cc/sign/aries/action/alt3]`
- _Don’t look for insta-results._  `[cc/sign/aries/action/alt5]`
- _Notice where tension is building around your resources._  `[cc/sign/aries/action/alt7]`
- _Focus on the messages that matter and forget the rest._  `[cc/sign/aries/action/alt8]`
- _Today’s inspiration is worth acting on._  `[cc/sign/aries/closing/alt1]`
- _It’ll help you clarify which goals are worth your energy — and how you can go after them._  `[cc/sign/aries/closing/alt2]`
- _Being that direct takes courage, and right now, you’ve got plenty to spare._  `[cc/sign/aries/closing/alt3]`
- _And if all else fails, fake it till you make it._  `[cc/sign/aries/closing/alt4]`
- _Then put it to good use._  `[cc/sign/aries/closing/alt5]`
- _You’re ready for major growth and change._  `[cc/sign/aries/closing/alt6]`
- _And then keep going._  `[cc/sign/aries/closing/alt7]`
- _Your ideas are running a few steps ahead of you today._  `[cc/sign/aries/hook/alt1]`
- _There’s lots to be grateful for today._  `[cc/sign/aries/hook/alt3]`
- _The floor is yours._  `[cc/sign/aries/hook/alt4]`
- _We all live with doubt._  `[cc/sign/aries/hook/alt5]`
- _Taking care of yourself can be harder than it seems._  `[cc/sign/aries/hook/alt6]`
- _You can always start fresh._  `[cc/sign/aries/hook/alt7]`
- _Your material world is in the spotlight._  `[cc/sign/aries/hook/alt8]`

_Provenance: `cc/sign/aries/lived-behaviors|hook-moves|actions|closings|alt*`_

### Taurus

**Lived behaviors**

- gets stuck in a critical thought loop and treats it as fact
- forces solutions instead of letting timing work
- resists the "pressurizing/challenging" stretch of a transit
- undervalues small brave self-examination

**Hook moves**

- pair forces ("Motivation, meet inspiration")
- challenge the inner critic ("Not everything your inner critic says is true")
- permission to slow ("Go easy on yourself")

**Actions (practical corrections)**

- follow instincts
- interrupt the thought loop
- don't force a fix now
- check on personal goals and name the self-care actually needed

**Closings**

- "this weirdness will pass"
- reframe as growth
- dare one small brave action

**Authored exemplar lines (CONFIRMED — Marie/CC copy, may serve verbatim on matching surface):**

- _Follow your instincts._  `[cc/sign/taurus/action/alt1]`
- _Try to interrupt that thought loop._  `[cc/sign/taurus/action/alt2]`
- _Don’t try to force a solution right now._  `[cc/sign/taurus/action/alt3]`
- _Try not to give it too much thought._  `[cc/sign/taurus/action/alt4]`
- _Dare to take one small action that reminds you just how brave you are._  `[cc/sign/taurus/action/alt5]`
- _Check on your personal goals and passion projects, and figure out what kind of self-care you really need right now._  `[cc/sign/taurus/action/alt6]`
- _Keep in mind that the next few weeks might feel more pressurizing or challenging than usual._  `[cc/sign/taurus/action/alt7]`
- _How can you trust yourself a little more and self-sabotage a little less?_  `[cc/sign/taurus/closing/alt1]`
- _These moments are meant to be savored._  `[cc/sign/taurus/closing/alt3]`
- _But that kind of brave self-examination is how you grow._  `[cc/sign/taurus/closing/alt4]`
- _You just have to get started._  `[cc/sign/taurus/closing/alt7]`
- _And if you stay open to them, they can teach you a lot about yourself._  `[cc/sign/taurus/closing/alt8]`
- _The drive and the spark are finally in the same room._  `[cc/sign/taurus/hook/alt1]`
- _Not everything your inner critic says is true._  `[cc/sign/taurus/hook/alt2]`
- _Today brings you a little boost._  `[cc/sign/taurus/hook/alt3]`
- _Catch up with yourself._  `[cc/sign/taurus/hook/alt4]`
- _Go easy on yourself._  `[cc/sign/taurus/hook/alt5]`
- _Healing isn’t easy work, but it is a great teacher._  `[cc/sign/taurus/hook/alt6]`
- _Growth and healing aren’t always linear._  `[cc/sign/taurus/hook/alt7]`
- _Time to recharge._  `[cc/sign/taurus/hook/alt8]`

_Provenance: `cc/sign/taurus/lived-behaviors|hook-moves|actions|closings|alt*`_

### Gemini

**Lived behaviors**

- has surplus social energy but scatters it
- needs the group chat / community to regulate nerves
- hesitates to make the first move
- overdoes stimulation past the point of moderation

**Hook moves**

- name the surplus energy
- offer motivation as a question ("Need a little motivation?")
- normalize anxiety

**Actions (practical corrections)**

- make a plan
- go mingle
- put yourself out there
- reset when bandwidth is gone and retry later

**Closings**

- "your people are waiting"
- moderation is key
- first moves build stronger bonds

**Authored exemplar lines (CONFIRMED — Marie/CC copy, may serve verbatim on matching surface):**

- _Look no further than your community._  `[cc/sign/gemini/action/alt1]`
- _Take this opportunity to reset, and try again later when your bandwidth is back._  `[cc/sign/gemini/action/alt4]`
- _Focus up, social butterfly._  `[cc/sign/gemini/action/alt6]`
- _Listen to the uncensored voices in your head._  `[cc/sign/gemini/action/alt8]`
- _Your people are waiting._  `[cc/sign/gemini/closing/alt1]`
- _Right now, moderation is key._  `[cc/sign/gemini/closing/alt2]`
- _There doesn’t have to be a catch._  `[cc/sign/gemini/closing/alt3]`
- _Daring to make the first move is how you build stronger bonds._  `[cc/sign/gemini/closing/alt4]`
- _Pro tip: Venting in the group chat or connecting with your community can help soothe your nerves._  `[cc/sign/gemini/closing/alt5]`
- _When you zoom in on the friendships and communities that matter most to you, you expand your circle in surprising ways._  `[cc/sign/gemini/closing/alt6]`
- _Things will clear up, even if it doesn’t seem like it now._  `[cc/sign/gemini/closing/alt8]`
- _There's more energy in you than you know what to do with right now._  `[cc/sign/gemini/hook/alt1]`
- _Need a little motivation?_  `[cc/sign/gemini/hook/alt2]`
- _Your alone time feels extra replenishing today._  `[cc/sign/gemini/hook/alt3]`
- _Get out there and mingle._  `[cc/sign/gemini/hook/alt4]`
- _It’s okay to feel anxious._  `[cc/sign/gemini/hook/alt5]`
- _Friction isn’t fun, but it can be a great teacher._  `[cc/sign/gemini/hook/alt6]`
- _Liking an Instagram post isn’t activism._  `[cc/sign/gemini/hook/alt7]`
- _Put yourself out there._  `[cc/sign/gemini/hook/alt8]`

_Provenance: `cc/sign/gemini/lived-behaviors|hook-moves|actions|closings|alt*`_

### Cancer

**Lived behaviors**

- sits on bold ideas rather than sharing them
- tries to do it all alone
- hides away when overwhelmed
- measures life by meaning added, not boxes checked

**Hook moves**

- name the inspiration
- separate having-dreams from acting
- make connection a "must."

**Actions (practical corrections)**

- open to new approaches
- let others help
- spread the news
- trim what doesn't matter to focus on roles that do

**Closings**

- leads worth chasing
- honesty beats hoarding ideas
- visibility is the only way to make a mark

**Authored exemplar lines (CONFIRMED — Marie/CC copy, may serve verbatim on matching surface):**

- _Open yourself up to new ways of approaching your goals._  `[cc/sign/cancer/action/alt1]`
- _Focus instead on what would add more meaning to your life._  `[cc/sign/cancer/action/alt3]`
- _Remember that you don’t have to do this on your own._  `[cc/sign/cancer/action/alt5]`
- _Don’t worry — the world will still be waiting for you when you’re done hiding away._  `[cc/sign/cancer/action/alt8]`
- _These leads are worth chasing._  `[cc/sign/cancer/closing/alt1]`
- _When you trim the fat, you can focus on the roles and projects that matter._  `[cc/sign/cancer/closing/alt2]`
- _That kind of honesty isn’t always comfortable, but it beats keeping all your bold ideas to yourself._  `[cc/sign/cancer/closing/alt3]`
- _However scary it is to put yourself out there, it’s the only way to make your mark._  `[cc/sign/cancer/closing/alt4]`
- _So clarify where you want to focus your energy and go for it._  `[cc/sign/cancer/closing/alt5]`
- _You have everything you need to feel fulfilled._  `[cc/sign/cancer/closing/alt6]`
- _They’re here to show you what needs tweaking._  `[cc/sign/cancer/closing/alt7]`
- _Inspiration is showing up in bulk today._  `[cc/sign/cancer/hook/alt1]`
- _Having dreams is one thing._  `[cc/sign/cancer/hook/alt2]`
- _Friend time is a must today._  `[cc/sign/cancer/hook/alt3]`
- _Start spreading the news._  `[cc/sign/cancer/hook/alt4]`
- _You’re not supposed to have it all figured out._  `[cc/sign/cancer/hook/alt5]`
- _Your public life hasn’t always been a breeze._  `[cc/sign/cancer/hook/alt6]`
- _This New Moon in Aries is all about your public life._  `[cc/sign/cancer/hook/alt7]`
- _Quit playing it small._  `[cc/sign/cancer/hook/alt8]`

_Provenance: `cc/sign/cancer/lived-behaviors|hook-moves|actions|closings|alt*`_

### Leo

**Lived behaviors**

- performs certainty while privately uncertain
- chases big/"unrealistic" goals
- needs grounding rituals before being "on"
- forgets the journey is the point

**Hook moves**

- "trust your inner compass"
- affirm shine
- offer a change ("Want to make some changes?")

**Actions (practical corrections)**

- research before leaping
- find one small way to act on a big dream
- don't second-guess
- practice calming habits before the spotlight

**Closings**

- stay open to many paths
- "the journey is the whole point"
- get comfortable with uncertainty

**Authored exemplar lines (CONFIRMED — Marie/CC copy, may serve verbatim on matching surface):**

- _Trust your inner compass today._  `[cc/sign/leo/action/alt1]`
- _Start researching._  `[cc/sign/leo/action/alt2]`
- _Get swept up in your goals, even if they seem “unrealistic.” Then find one small way to act on them._  `[cc/sign/leo/action/alt4]`
- _Focus on how you show up in public, even when things get tough or taxing._  `[cc/sign/leo/action/alt6]`
- _Practice the calming, grounding habits that help you blow off steam so you’ll be ready for your close-up._  `[cc/sign/leo/action/alt7]`
- _Don’t let your inner critic discourage you._  `[cc/sign/leo/action/alt8]`
- _You have to stay open to all kinds of paths to land on the right one._  `[cc/sign/leo/closing/alt1]`
- _The journey is the whole point, remember?_  `[cc/sign/leo/closing/alt2]`
- _Sometimes good things just happen._  `[cc/sign/leo/closing/alt3]`
- _What are you waiting for?_  `[cc/sign/leo/closing/alt4]`
- _And part of that is learning to get comfortable with uncertainty._  `[cc/sign/leo/closing/alt5]`
- _Knowing when to change direction is half the battle._  `[cc/sign/leo/closing/alt6]`
- _You just have to move, period._  `[cc/sign/leo/closing/alt7]`
- _And they can help you fine-tune your plans if you let them._  `[cc/sign/leo/closing/alt8]`
- _Let your own compass call it today._  `[cc/sign/leo/hook/alt1]`
- _Your big goals are worth chasing._  `[cc/sign/leo/hook/alt2]`
- _You’re shining today._  `[cc/sign/leo/hook/alt3]`
- _Want to make some changes in your life?_  `[cc/sign/leo/hook/alt4]`
- _Take a deep breath._  `[cc/sign/leo/hook/alt5]`
- _Your future goals have shifted a lot over the years — and that’s a good thing._  `[cc/sign/leo/hook/alt6]`
- _It’s not silly to dream big — it’s strategic._  `[cc/sign/leo/hook/alt7]`
- _Don’t second-guess your plans._  `[cc/sign/leo/hook/alt8]`

_Provenance: `cc/sign/leo/lived-behaviors|hook-moves|actions|closings|alt*`_

### Virgo

**Lived behaviors**

- fills gaps with wishful thinking, then it backfires
- overanalyzes good things
- rushes to clarify fine print
- gaslights own perceptions

**Hook moves**

- puncture mind-reading ("You can't read minds")
- "trust your inner compass"
- anti-gaslight ("Don't gaslight yourself")

**Actions (practical corrections)**

- notice where wishful thinking is filling gaps
- clarify expectations without rushing
- say yes to the collaboration
- count to 10

**Closings**

- clarifying now smooths connections
- instincts can find a solution that works for everyone
- no rush on the fine print

**Authored exemplar lines (CONFIRMED — Marie/CC copy, may serve verbatim on matching surface):**

- _Notice where you’re letting wishful thinking fill in the gaps — it’s fun until it backfires._  `[cc/sign/virgo/action/alt1]`
- _Notice if any of your fantasies are distracting you from the reality of your collaborations and agreements._  `[cc/sign/virgo/action/alt2]`
- _Say yes to that collab._  `[cc/sign/virgo/action/alt5]`
- _Share your resources with someone you trust._  `[cc/sign/virgo/action/alt6]`
- _Take a breath and count to 10._  `[cc/sign/virgo/action/alt7]`
- _Clarifying expectations now will help your connections run more smoothly._  `[cc/sign/virgo/closing/alt1]`
- _Your instincts could lead you to a solution that works for everyone._  `[cc/sign/virgo/closing/alt2]`
- _Just remember: There’s no rush to clarify all the fine print._  `[cc/sign/virgo/closing/alt3]`
- _You don’t have to overanalyze every good thing that happens to you._  `[cc/sign/virgo/closing/alt4]`
- _Then, once everyone is on the same page, start building whatever you want to create together._  `[cc/sign/virgo/closing/alt5]`
- _It’s okay to do things that scare you._  `[cc/sign/virgo/closing/alt6]`
- _Then decide how you’re going to work with it._  `[cc/sign/virgo/closing/alt7]`
- _These roadblocks can teach you important lessons if you stay open to them._  `[cc/sign/virgo/closing/alt8]`
- _You can’t read minds._  `[cc/sign/virgo/hook/alt1]`
- _Hello, inspiration._  `[cc/sign/virgo/hook/alt2]`
- _You’re learning to dream big._  `[cc/sign/virgo/hook/alt3]`
- _Trust your inner compass._  `[cc/sign/virgo/hook/alt4]`
- _Crunch those numbers._  `[cc/sign/virgo/hook/alt5]`
- _Don’t gaslight yourself._  `[cc/sign/virgo/hook/alt6]`
- _It’s not fun to face the tough stuff._  `[cc/sign/virgo/hook/alt7]`
- _Your goals aren’t going to achieve themselves._  `[cc/sign/virgo/hook/alt8]`

_Provenance: `cc/sign/virgo/lived-behaviors|hook-moves|actions|closings|alt*`_

### Libra

**Lived behaviors**

- swaps diplomacy for avoidance
- keeps rose-colored glasses on relationships
- plays it cool when directness is needed
- carries relationship setbacks forward

**Hook moves**

- ask about relationship insight
- "it's okay to be blunt with your loved ones"
- normalize anxiety

**Actions (practical corrections)**

- see connections as they really are
- start the overdue conversation
- swap diplomacy for directness
- notice what shifted with loved ones

**Closings**

- focus on how people make you feel
- face facts, then invest in connections that matter
- "no time to play it cool."

**Authored exemplar lines (CONFIRMED — Marie/CC copy, may serve verbatim on matching surface):**

- _Take off your rose-colored glasses and recognize what’s really going on in our connections._  `[cc/sign/libra/action/alt1]`
- _Start the conversations you’ve been meaning to have with the people closest to you, and swap diplomacy for directness._  `[cc/sign/libra/action/alt2]`
- _Notice what’s shifted with the people you love, and look ahead to the future._  `[cc/sign/libra/action/alt3]`
- _Trust that whatever unravels is showing you what you need from your partnerships._  `[cc/sign/libra/action/alt5]`
- _Find one way to invest in that future._  `[cc/sign/libra/action/alt8]`
- _Just focus on how your people make you feel and go from there._  `[cc/sign/libra/closing/alt1]`
- _Once you face the facts, you can pour your energy into connections that truly matter._  `[cc/sign/libra/closing/alt2]`
- _This is no time to play it cool._  `[cc/sign/libra/closing/alt3]`
- _Building close connections means confronting what’s getting in your way._  `[cc/sign/libra/closing/alt4]`
- _Just do something together that moves your connections forward._  `[cc/sign/libra/closing/alt5]`
- _What lessons can you learn from these roadblocks?_  `[cc/sign/libra/closing/alt6]`
- _Why throw a tantrum when you could search for a solution?_  `[cc/sign/libra/closing/alt8]`
- _What are your closest relationships showing you right now?_  `[cc/sign/libra/hook/alt1]`
- _Today might be a mixed bag._  `[cc/sign/libra/hook/alt2]`
- _The math is mathing today._  `[cc/sign/libra/hook/alt3]`
- _It’s okay to be blunt with your loved ones._  `[cc/sign/libra/hook/alt4]`
- _Anxiety is a part of life._  `[cc/sign/libra/hook/alt5]`
- _You’ve gone through a fair share of setbacks in your closest relationships._  `[cc/sign/libra/hook/alt6]`
- _Your relationships are meant to evolve over time._  `[cc/sign/libra/hook/alt7]`
- _Dare to “go there” in your relationships today._  `[cc/sign/libra/hook/alt8]`

_Provenance: `cc/sign/libra/lived-behaviors|hook-moves|actions|closings|alt*`_

### Scorpio

**Lived behaviors**

- pushes through the daily grind without zooming out
- overthinks whether there's a catch
- chooses being right over connecting
- risks burnout by not cooling off

**Hook moves**

- name inspiration in routines
- "it's time to take action"
- "be upfront with yourself."

**Actions (practical corrections)**

- let it happen
- stop and plan how to make it real
- zoom out and reassess routines
- count to 10
- ask "right, or connected?"

**Closings**

- support is an evolving practice
- "there doesn't always have to be a catch"
- cool off so you don't burn out
- "you're braver than you think."

**Authored exemplar lines (CONFIRMED — Marie/CC copy, may serve verbatim on matching surface):**

- _Don’t think too hard about it._  `[cc/sign/scorpio/action/alt1]`
- _Take this chance to zoom out and reassess the big picture of your daily routines._  `[cc/sign/scorpio/action/alt3]`
- _Do you want to be right, or do you want to connect?_  `[cc/sign/scorpio/action/alt7]`
- _Trust takes time to build, and it’s okay to go back to the drawing board._  `[cc/sign/scorpio/action/alt8]`
- _Supporting yourself is a constantly evolving practice._  `[cc/sign/scorpio/closing/alt1]`
- _There doesn’t always have to be a catch._  `[cc/sign/scorpio/closing/alt2]`
- _Just remember to take your time and cool off as needed so you don’t burn out along the way._  `[cc/sign/scorpio/closing/alt3]`
- _You’re braver than you think._  `[cc/sign/scorpio/closing/alt4]`
- _Every bit of effort adds up._  `[cc/sign/scorpio/closing/alt5]`
- _This process isn’t always comfortable, but bringing all the tough stuff to light is more satisfying in the long run._  `[cc/sign/scorpio/closing/alt7]`
- _You’ll find a way to channel that fiery energy constructively._  `[cc/sign/scorpio/closing/alt8]`
- _Even the routine stuff feels lit up with ideas today._  `[cc/sign/scorpio/hook/alt1]`
- _It’s time to take action._  `[cc/sign/scorpio/hook/alt2]`
- _Things feel extra flowy with the people you love._  `[cc/sign/scorpio/hook/alt3]`
- _Your motivation is on fire._  `[cc/sign/scorpio/hook/alt4]`
- _Be upfront with yourself._  `[cc/sign/scorpio/hook/alt5]`
- _Your daily grind isn’t always smooth sailing._  `[cc/sign/scorpio/hook/alt6]`
- _Invest in your wellbeing today._  `[cc/sign/scorpio/hook/alt7]`
- _It’s time to face your to-dos._  `[cc/sign/scorpio/hook/alt8]`

_Provenance: `cc/sign/scorpio/lived-behaviors|hook-moves|actions|closings|alt*`_

### Sagittarius

**Lived behaviors**

- juggles a busy home life
- lets wishful thinking fill gaps
- keeps daydreams private
- overcomplicates play
- rushes a good time

**Hook moves**

- name the home juggle
- "let inspiration lead"
- "take charge of your creative or romantic life."

**Actions (practical corrections)**

- carve out playtime (with kids or yourself)
- don't overcomplicate
- show the imagination
- share the daydreams

**Closings**

- comfort is worth the care
- "wisdom in not rushing"
- soak it up
- don't keep daydreams to yourself

**Authored exemplar lines (CONFIRMED — Marie/CC copy, may serve verbatim on matching surface):**

- _Carve out a little playtime with the kids in your life — or with yourself._  `[cc/sign/sagittarius/action/alt3]`
- _Don’t overcomplicate them._  `[cc/sign/sagittarius/action/alt4]`
- _Do yourself a favor and soak it up._  `[cc/sign/sagittarius/action/alt6]`
- _Don’t keep your daydreams to yourself._  `[cc/sign/sagittarius/action/alt8]`
- _Your comfort is worth the extra care._  `[cc/sign/sagittarius/closing/alt1]`
- _There’s wisdom in not rushing or forcing a good time._  `[cc/sign/sagittarius/closing/alt3]`
- _How can you believe in yourself a little more?_  `[cc/sign/sagittarius/closing/alt6]`
- _Then let it inspire your next moves._  `[cc/sign/sagittarius/closing/alt7]`
- _Just pick a goal and go after it._  `[cc/sign/sagittarius/closing/alt8]`
- _Home is asking a lot of you at the moment._  `[cc/sign/sagittarius/hook/alt1]`
- _Let inspiration lead the way today._  `[cc/sign/sagittarius/hook/alt2]`
- _Take charge of your creative or romantic life._  `[cc/sign/sagittarius/hook/alt3]`
- _You’re on a roll today._  `[cc/sign/sagittarius/hook/alt4]`
- _Show off your imagination._  `[cc/sign/sagittarius/hook/alt5]`
- _It takes guts to admit you’re scared._  `[cc/sign/sagittarius/hook/alt6]`
- _Having fun can be hard work._  `[cc/sign/sagittarius/hook/alt7]`
- _It’s okay to redefine your idea of fun._  `[cc/sign/sagittarius/hook/alt8]`

_Provenance: `cc/sign/sagittarius/lived-behaviors|hook-moves|actions|closings|alt*`_

### Capricorn

**Lived behaviors**

- aims high but overrides rest
- makes rash moves under stress
- postpones fun until "earned"
- needs a refresh at the roots (home/family)

**Hook moves**

- spotlight home life
- "it's great to aim high" (then temper)
- "it's time for a refresh."

**Actions (practical corrections)**

- no rash decisions
- start with one small action
- put it all on the table
- focus on roots
- count to 10

**Closings**

- you'll learn which instincts to follow
- "start with one small action and go from there"
- try a new approach and find your courage

**Authored exemplar lines (CONFIRMED — Marie/CC copy, may serve verbatim on matching surface):**

- _Don’t make any rash decisions._  `[cc/sign/capricorn/action/alt1]`
- _Start with one small action and go from there._  `[cc/sign/capricorn/action/alt2]`
- _Notice where tension is building in your love life or creative work._  `[cc/sign/capricorn/action/alt8]`
- _You’ll figure out which instincts are worth following._  `[cc/sign/capricorn/closing/alt1]`
- _But it is an opportunity to try a new approach — and to discover how brave you really are._  `[cc/sign/capricorn/closing/alt3]`
- _Then seize the day’s momentum and make a move._  `[cc/sign/capricorn/closing/alt4]`
- _They’re here to show you what needs tweaking and what would help you feel more secure._  `[cc/sign/capricorn/closing/alt5]`
- _Just don’t keep putting off the stuff you truly enjoy._  `[cc/sign/capricorn/closing/alt6]`
- _Just take the next step._  `[cc/sign/capricorn/closing/alt7]`
- _Your consistency will work its own magic._  `[cc/sign/capricorn/closing/alt8]`
- _The spotlight swings toward home and family today._  `[cc/sign/capricorn/hook/alt1]`
- _It’s great to aim high._  `[cc/sign/capricorn/hook/alt2]`
- _You don’t need an excuse to have a good time._  `[cc/sign/capricorn/hook/alt3]`
- _Put it all on the table._  `[cc/sign/capricorn/hook/alt4]`
- _Stressed out, much?_  `[cc/sign/capricorn/hook/alt5]`
- _It’s time for a refresh._  `[cc/sign/capricorn/hook/alt6]`
- _What does home mean to you?_  `[cc/sign/capricorn/hook/alt7]`
- _Focus on your roots today._  `[cc/sign/capricorn/hook/alt8]`

_Provenance: `cc/sign/capricorn/lived-behaviors|hook-moves|actions|closings|alt*`_

### Aquarius

**Lived behaviors**

- has a million ideas and over-commits
- crosses wires in communication
- overthinks instead of enjoying
- sprints to feel accomplished

**Hook moves**

- name the idea-flood
- "tap the brakes"
- "don't mince your words."

**Actions (practical corrections)**

- focus on the few you're most excited about
- take action however small
- use challenges to level up
- follow hunches
- name home-life tension

**Closings**

- leaning in improves choices
- "you don't have to sprint to feel accomplished"
- you decide how you express yourself

**Authored exemplar lines (CONFIRMED — Marie/CC copy, may serve verbatim on matching surface):**

- _Focus on the ones you’re most excited about._  `[cc/sign/aquarius/action/alt1]`
- _Quit overthinking and let yourself enjoy._  `[cc/sign/aquarius/action/alt2]`
- _Take action, however small or subtle._  `[cc/sign/aquarius/action/alt4]`
- _Use them to level up._  `[cc/sign/aquarius/action/alt5]`
- _Follow your hunches._  `[cc/sign/aquarius/action/alt7]`
- _Notice where tension is building in your home life or with the people closest to you._  `[cc/sign/aquarius/action/alt8]`
- _The more you lean in, the better choices you’ll make._  `[cc/sign/aquarius/closing/alt1]`
- _You don’t have to sprint to feel accomplished._  `[cc/sign/aquarius/closing/alt2]`
- _You get to decide how you’re meant to express yourself._  `[cc/sign/aquarius/closing/alt4]`
- _You’ll feel more confident once you confront whatever’s blocking you._  `[cc/sign/aquarius/closing/alt5]`
- _Then bring the energy._  `[cc/sign/aquarius/closing/alt6]`
- _What matters is that you’re being proactive._  `[cc/sign/aquarius/closing/alt7]`
- _A dozen ideas are competing for your time right now._  `[cc/sign/aquarius/hook/alt1]`
- _It’s a great day to get cozy._  `[cc/sign/aquarius/hook/alt2]`
- _Don’t mince your words._  `[cc/sign/aquarius/hook/alt3]`
- _Feel like everyone keeps getting wires crossed?_  `[cc/sign/aquarius/hook/alt4]`
- _The challenges you’ve worked through have been some of your greatest teachers._  `[cc/sign/aquarius/hook/alt5]`
- _There’s no need to overthink things._  `[cc/sign/aquarius/hook/alt6]`
- _Home is always what you make of it._  `[cc/sign/aquarius/hook/alt7]`
- _What are you really trying to say?_  `[cc/sign/aquarius/hook/alt8]`

_Provenance: `cc/sign/aquarius/lived-behaviors|hook-moves|actions|closings|alt*`_

### Pisces

**Lived behaviors**

- procrastinates on inspiration
- runs a balancing act
- doubts own bravery
- falls for get-rich-quick shortcuts
- needs to treat progress as a marathon

**Hook moves**

- "act on your inspiration today"
- name the balancing act
- "no more procrastinating."

**Actions (practical corrections)**

- pay attention
- take one step toward a money goal
- stop doubting
- use hiccups to rework the plan
- get involved locally
- count to 10

**Closings**

- "a marathon, not a sprint"
- "no catch"
- "your wallet will thank you"
- confidence comes from leaving the comfort zone

**Authored exemplar lines (CONFIRMED — Marie/CC copy, may serve verbatim on matching surface):**

- _Do something that moves you closer to a financial goal._  `[cc/sign/pisces/action/alt1]`
- _Use the hiccups to rework your game plan as needed._  `[cc/sign/pisces/action/alt3]`
- _Get more involved in your neighborhood._  `[cc/sign/pisces/action/alt4]`
- _Get-rich-quick schemes are just that — schemes._  `[cc/sign/pisces/action/alt6]`
- _Share what’s on your mind, even if it feels scary._  `[cc/sign/pisces/action/alt8]`
- _Then remind yourself it’s a marathon, not a sprint._  `[cc/sign/pisces/closing/alt1]`
- _And no, there isn’t a catch._  `[cc/sign/pisces/closing/alt2]`
- _Your wallet will thank you._  `[cc/sign/pisces/closing/alt3]`
- _Confidence comes from venturing outside your comfort zone._  `[cc/sign/pisces/closing/alt4]`
- _No more running on autopilot._  `[cc/sign/pisces/closing/alt6]`
- _After all, a small win is still a win._  `[cc/sign/pisces/closing/alt7]`
- _You’re on your way._  `[cc/sign/pisces/closing/alt8]`
- _Act on your inspiration today._  `[cc/sign/pisces/hook/alt1]`
- _You’re in the middle of a balancing act._  `[cc/sign/pisces/hook/alt2]`
- _Things are working in your favor today._  `[cc/sign/pisces/hook/alt3]`
- _No more procrastinating._  `[cc/sign/pisces/hook/alt4]`
- _FYI: You’re braver than you think._  `[cc/sign/pisces/hook/alt5]`
- _Any setbacks or challenges you’ve experienced have taught you something._  `[cc/sign/pisces/hook/alt6]`
- _Ready for a reset?_  `[cc/sign/pisces/hook/alt7]`
- _Stop doubting yourself._  `[cc/sign/pisces/hook/alt8]`

_Provenance: `cc/sign/pisces/lived-behaviors|hook-moves|actions|closings|alt*`_

## 6. House banks

_A house selects the life scene; it never emits a keyword paragraph. Source: `cc/house/*`._

### 1st house

**Domain (calc-layer label set):** self, body, vitality, presentation, the "portal you come into the world through"; how you start and show up

**Lived scenes (choose one; do not list):**

- your body, energy, and physical presence right now  `[cc/house/1/body]`
- the impulse to initiate, assert, or reinvent yourself  `[cc/house/1/drive]`
- first impressions and the vibe you lead with  `[cc/house/1/image]`
- a fresh identity chapter — who you're becoming  `[cc/house/1/reset]`
- how you start things and the version of you that walks in first  `[cc/house/1/self]`

_Provenance: `cc/house/1` (+ facets)_

### 2nd house

**Domain (calc-layer label set):** your money and how you make it; possessions, material security, self-worth, resources, income changes

**Lived scenes (choose one; do not list):**

- the money you earn and how you earn it  `[cc/house/2/income]`
- building a stable material base, slowly  `[cc/house/2/security]`
- the pull between spending for comfort and saving for safety  `[cc/house/2/spending]`
- what you own, use, and treat as worth keeping  `[cc/house/2/value]`
- self-worth that's gotten tangled up with resources  `[cc/house/2/worth]`

_Provenance: `cc/house/2` (+ facets)_

### 3rd house

**Domain (calc-layer label set):** communication, learning, errands, siblings, local life, everyday mind

**Lived scenes (choose one; do not list):**

- commutes, errands, and the logistics of local life  `[cc/house/3/errands]`
- picking up a skill, fact, or new way of thinking  `[cc/house/3/learning]`
- the speed and clarity of your own thinking  `[cc/house/3/pace]`
- siblings, neighbors, and the people you see in passing  `[cc/house/3/siblings]`
- everyday messages, texts, and conversations  `[cc/house/3/talk]`

_Provenance: `cc/house/3` (+ facets)_

### 4th house

**Domain (calc-layer label set):** home, family, roots, "root system," privacy, the midnight/foundation of the chart

**Lived scenes (choose one; do not list):**

- what "belonging" actually means to you  `[cc/house/4/belonging]`
- family, ancestry, and inherited patterns  `[cc/house/4/family]`
- your home, living arrangement, and sense of place  `[cc/house/4/home]`
- the need to retreat, decompress, and be unobserved  `[cc/house/4/privacy]`
- the emotional foundation everything else stands on  `[cc/house/4/roots]`

_Provenance: `cc/house/4` (+ facets)_

### 5th house

**Domain (calc-layer label set):** pleasure, romance, creativity, dating, play, children, self-expression ("all sensual pleasures")

**Lived scenes (choose one; do not list):**

- children, or the childlike parts of you  `[cc/house/5/children]`
- creative projects and self-expression for its own sake  `[cc/house/5/creativity]`
- fun, leisure, and permission to enjoy  `[cc/house/5/play]`
- taking a chance because it's alive, not safe  `[cc/house/5/risk]`
- dating, flirtation, and being pursued or pursuing  `[cc/house/5/romance]`

_Provenance: `cc/house/5` (+ facets)_

### 6th house

**Domain (calc-layer label set):** work, workload, health, routine, maintenance, service, the daily grind

**Lived scenes (choose one; do not list):**

- health, wellness, and the body's upkeep  `[cc/house/6/health]`
- the crankiness and depletion that signal you took on too much  `[cc/house/6/overwhelm]`
- the habits and systems that run your day  `[cc/house/6/routine]`
- showing up for others through practical help  `[cc/house/6/service]`
- daily tasks, the to-do list, and the grind  `[cc/house/6/workload]`

_Provenance: `cc/house/6` (+ facets)_

### 7th house

**Domain (calc-layer label set):** partnership, significant others, the descendant, open agreements, one-to-one conflict

**Lived scenes (choose one; do not list):**

- contracts, deals, and the terms you agree to  `[cc/house/7/agreements]`
- holding your own needs and someone else's at once  `[cc/house/7/balance]`
- open, one-to-one conflict and how you handle it  `[cc/house/7/conflict]`
- the people you attract and what they reflect back  `[cc/house/7/mirror]`
- committed partnerships, romantic and business  `[cc/house/7/partnership]`

_Provenance: `cc/house/7` (+ facets)_

### 8th house

**Domain (calc-layer label set):** shared money, debts, grants, loans, taxes, inheritance, intimacy, other people's resources

**Lived scenes (choose one; do not list):**

- endings, release, and what transforms when something dies  `[cc/house/8/endings]`
- deep intimacy, merging, and being truly known  `[cc/house/8/intimacy]`
- relying on or managing other people's resources  `[cc/house/8/others-resources]`
- shared funds, debts, taxes, and inheritance  `[cc/house/8/shared-money]`
- trust, control, and what you're willing to depend on  `[cc/house/8/trust]`

_Provenance: `cc/house/8` (+ facets)_

### 9th house

**Domain (calc-layer label set):** belief, higher study, travel, publishing, philosophy, worldview, meaning

**Lived scenes (choose one; do not list):**

- your beliefs, worldview, and what you hold true  `[cc/house/9/beliefs]`
- stretching past the edge of your comfort zone  `[cc/house/9/expansion]`
- the search for meaning and the bigger picture  `[cc/house/9/meaning]`
- higher study, teaching, publishing, big ideas  `[cc/house/9/study]`
- travel, distance, and leaving the familiar  `[cc/house/9/travel]`

_Provenance: `cc/house/9` (+ facets)_

### 10th house

**Domain (calc-layer label set):** career, public role, reputation, the most "prominent perch," visible responsibility

**Lived scenes (choose one; do not list):**

- bosses, authority figures, and your own authority  `[cc/house/10/authority]`
- career, vocation, and your public work  `[cc/house/10/career]`
- the mark and role you're building over time  `[cc/house/10/legacy]`
- reputation, visibility, and how the world reads you  `[cc/house/10/reputation]`
- responsibility, ambition, and being counted on  `[cc/house/10/responsibility]`

_Provenance: `cc/house/10` (+ facets)_

### 11th house

**Domain (calc-layer label set):** friends, community, "comrades, covens, and communities," groups, future plans

**Lived scenes (choose one; do not list):**

- being part of something bigger than yourself  `[cc/house/11/belonging-large]`
- friends, groups, and chosen community  `[cc/house/11/friends]`
- future hopes and long-range goals  `[cc/house/11/hopes]`
- the ideals and causes you organize around  `[cc/house/11/ideals]`
- networks, collaboration, and collective effort  `[cc/house/11/networks]`

_Provenance: `cc/house/11` (+ facets)_

### 12th house

**Domain (calc-layer label set):** solitude, the hidden, unseen pressure, "trolls under the bridge," retreat, private undoing

**Lived scenes (choose one; do not list):**

- what you avoid, hide, or haven't wanted to face  `[cc/house/12/avoidance]`
- hidden pressures and private ways of coping  `[cc/house/12/hidden]`
- solitude, rest, and time unobserved  `[cc/house/12/solitude]`
- dreams, the unconscious, and what comes up on its own  `[cc/house/12/unconscious]`
- retreat, surrender, and quietly letting something dissolve  `[cc/house/12/undoing]`

_Provenance: `cc/house/12` (+ facets)_

## 7. Planet banks

_Function / productive / excess. Source: `cc/planet/{planet}/*` and `ms/chart-comparison/planet/*`._

### Sun

- **Function:** identity, vitality, and where you're meant to shine  `[cc/planet/sun/function]`
- **Productive:** confidence, warmth, and being seen for who you are  `[cc/planet/sun/productive]`
- **Excess:** ego inflation, or needing the spotlight to feel like you matter  `[cc/planet/sun/excess]`
- **Relational read:** who you are at the core, your identity and sense of direction  `[ms/chart-comparison/planet/sun]`

### Moon

- **Function:** emotional needs, moods, and what makes you feel safe  `[cc/planet/moon/function]`
- **Productive:** care, comfort, and honest feeling  `[cc/planet/moon/productive]`
- **Excess:** reactivity, moodiness, or retreating into the shell  `[cc/planet/moon/excess]`
- **Relational read:** your emotional world, your moods, and what makes you feel safe  `[ms/chart-comparison/planet/moon]`

### Mercury

- **Function:** thinking, communication, and how you process  `[cc/planet/mercury/function]`
- **Productive:** clear plans, sharp questions, and saying it well  `[cc/planet/mercury/productive]`
- **Excess:** overthinking, scattering, or talking past the point  `[cc/planet/mercury/excess]`
- **Relational read:** how you think, talk, and process information  `[ms/chart-comparison/planet/mercury]`

### Venus

- **Function:** love, pleasure, taste, and what you value  `[cc/planet/venus/function]`
- **Productive:** warmth, harmony, and drawing good things in  `[cc/planet/venus/productive]`
- **Excess:** conflict-avoidance, people-pleasing, or overindulgence  `[cc/planet/venus/excess]`
- **Relational read:** how you love, what you find beautiful, and what you value  `[ms/chart-comparison/planet/venus]`

### Mars

- **Function:** drive, assertion, and the will to act  `[cc/planet/mars/function]`
- **Productive:** decisive action and healthy fight for what matters  `[cc/planet/mars/productive]`
- **Excess:** aggression, impatience, or burning out  `[cc/planet/mars/excess]`
- **Relational read:** how you assert yourself, pursue what you want, and handle anger and desire  `[ms/chart-comparison/planet/mars]`

### Jupiter

- **Function:** growth, opportunity, and the search for more  `[cc/planet/jupiter/function]`
- **Productive:** generosity, faith, and saying yes to expansion  `[cc/planet/jupiter/productive]`
- **Excess:** overdoing, over-promising, or believing your own hype  `[cc/planet/jupiter/excess]`
- **Relational read:** how you grow, what you believe, and where you find meaning  `[ms/chart-comparison/planet/jupiter]`

### Saturn

- **Function:** structure, discipline, limits, and time  `[cc/planet/saturn/function]`
- **Productive:** mastery earned through patient, unglamorous work  `[cc/planet/saturn/productive]`
- **Excess:** rigidity, self-denial, or fear of never being enough  `[cc/planet/saturn/excess]`
- **Relational read:** how you handle responsibility, limits, and fear  `[ms/chart-comparison/planet/saturn]`

### Uranus

- **Function:** change, innovation, and the urge to break free  `[cc/planet/uranus/function]`
- **Productive:** breakthroughs, authenticity, and useful disruption  `[cc/planet/uranus/productive]`
- **Excess:** chaos, restlessness, or blowing things up to feel free  `[cc/planet/uranus/excess]`

### Neptune

- **Function:** imagination, spirituality, and dissolving boundaries  `[cc/planet/neptune/function]`
- **Productive:** compassion, inspiration, and creative vision  `[cc/planet/neptune/productive]`
- **Excess:** illusion, escapism, or losing the thread of what's real  `[cc/planet/neptune/excess]`

### Pluto

- **Function:** power, depth, and irreversible transformation  `[cc/planet/pluto/function]`
- **Productive:** regeneration, honesty about power, composting the dead weight  `[cc/planet/pluto/productive]`
- **Excess:** control, obsession, or power struggles  `[cc/planet/pluto/excess]`

## 8. Aspect banks

### 8.1 Aspect mechanics (process, not verdict)

_Source: `cc/aspect/*` (geometry) and `cc/ref/aspect-psychology/*` (process)._

**Conjunction**
- Geometry: same sign; energies fuse ("like two ingredients blending"); closer = stronger  `[cc/aspect/conjunction]`
- Process: A conjunction fuses two functions so tightly they act as one, which concentrates their power and makes them hard to separate or moderate.  `[cc/ref/aspect-psychology/conjunction]`

**Sextile**
- Geometry: ~2 signs / ~60°; harmonious, cooperative, supportive; opportunity you must take  `[cc/aspect/sextile]`
- Process: A sextile is opportunity that only pays off when acted on; left alone it simply passes.  `[cc/ref/aspect-psychology/sextile]`

**Square**
- Geometry: ~3 signs / ~90°; friction that pushes action; uncomfortable but productive  `[cc/aspect/square]`
- Process: A square is friction between two functions that will not resolve on its own, and it is usually the engine of real growth because it forces action.  `[cc/ref/aspect-psychology/square]`

**Trine**
- Geometry: ~4 signs / ~120°; most harmonious, a "gift," easy flow (risk: taken for granted)  `[cc/aspect/trine]`
- Process: A trine lets two functions cooperate so easily that the talent can go unnoticed and undeveloped, gift and laziness in one.  `[cc/ref/aspect-psychology/trine]`

**Opposition**
- Geometry: ~6 signs / ~180°; tug-of-war; balance contrasts within self or with others  `[cc/aspect/opposition]`
- Process: An opposition sets two functions facing each other, felt as an inner see-saw or projected onto other people, and it asks for balance rather than choosing a side.  `[cc/ref/aspect-psychology/opposition]`

### 8.2 Exact aspect-pair clauses (EVIDENCE_ONLY_UNTIL_REVIEWED — each row needs clause review)

_These are the ONLY correct primary source for a personalized transit / natal aspect / sky aspect. A house locates the scene; it never fills a gap. If a needed pair is absent -> `SOURCE_GAP`. Source: `cc/aspect-pair/*` (84 rows)._

_Total exact aspect-pair rows available: 84._

- **chiron sextile north node** — An old tender spot lines up with where you're meant to grow, and there's a gentle opening to work with it. Tend the sore spot in small, honest ways and let it point you forward.  `[cc/aspect-pair/chiron-sextile-north-node]`
- **mars conjunction jupiter** — Drive and confidence swell together — bold moves feel easy and the appetite for more is high. Great for starting things, risky for overreach. Take the big swing, but size it to what you can actually follow through on.  `[cc/aspect-pair/mars-conjunction-jupiter]`
- **mars conjunction north node** — Your drive locks onto something you're genuinely hungry for, and there's real momentum behind it. Point it at a goal that actually matters and go, but watch the tendency to get so caught up in wanting that you skip your basic needs.  `[cc/aspect-pair/mars-conjunction-north-node]`
- **mars sextile pluto** — Focused intensity that can move mountains when it's aimed — deep drive without the power struggle. Channel it into real, lasting change.  `[cc/aspect-pair/mars-sextile-pluto]`
- **mars square pluto** — Drive meets intensity, and force wants to become domination — of a situation or a person. Power struggles and all-or-nothing pushes are the trap. Aim the intensity at real change rather than winning, and don't torch a bridge you'll need.  `[cc/aspect-pair/mars-square-pluto]`
- **mars square saturn** — The urge to act meets a wall of limits, delay, or self-doubt, and the friction is frustrating. It calls for disciplined effort rather than reckless pushing or freezing. Move in smaller structured steps; the resistance marks exactly what needs to get stronger.  `[cc/aspect-pair/mars-square-saturn]`
- **mars trine saturn** — Energy and discipline cooperate: you can work hard without burning out and finish what you start. Steady, productive drive.  `[cc/aspect-pair/mars-trine-saturn]`
- **mercury conjunction mars** — Thinking speeds up and words get sharp — quick, decisive, easy to fire off before you mean to. Good for cutting through, risky for saying what you can't take back. Stay deliberate about what you send.  `[cc/aspect-pair/mercury-conjunction-mars]`
- **mercury opposition chiron** — Something said or heard touches an old sore spot, and words land harder than intended. It's an opening for repair, not only for hurt. Use it for the honest, healing conversation rather than the defensive one.  `[cc/aspect-pair/mercury-opposition-chiron]`
- **mercury square neptune** — Thinking gets foggy, idealized, or hard to pin down; facts blur and it's easy to hear what you want to hear. Don't sign or promise on a hunch. Check the details against something solid before you commit.  `[cc/aspect-pair/mercury-square-neptune]`
- **mercury square pluto** — Conversations turn into power struggles, and the real subject is often control or whether your effort is recognized. Words can dig or manipulate now. Say the honest thing plainly instead of maneuvering around it.  `[cc/aspect-pair/mercury-square-pluto]`
- **mercury square saturn** — Thoughts turn heavy, careful, and self-critical, and communication can feel slow or blocked. The upside is precision and follow-through. Say the plain, structured version, and don't mistake the seriousness for pessimism.  `[cc/aspect-pair/mercury-square-saturn]`
- **mercury trine jupiter** — Thinking and the big picture flow easily; ideas connect and explaining things feels natural. The risk is spending it on small talk. Aim the mental energy at a real question and say the idea out loud before you've perfected it.  `[cc/aspect-pair/mercury-trine-jupiter]`
- **mercury trine saturn** — Thinking is clear, careful, and organized — you can plan, focus, and say the precise thing. Use it for the serious conversation or the detailed work.  `[cc/aspect-pair/mercury-trine-saturn]`
- **moon conjunction chiron** — An old feeling surfaces and a sore spot goes tender. Be gentle with yourself, this is a place that still heals.  `[cc/aspect-pair/moon-conjunction-chiron]`
- **moon conjunction jupiter** — The heart runs generous and the mood expands. Warm, hopeful, and big-hearted, just watch the urge to overdo it.  `[cc/aspect-pair/moon-conjunction-jupiter]`
- **moon conjunction mars** — Feelings run hot and fast. A mood moves you to act, which is powerful when aimed and reactive when not.  `[cc/aspect-pair/moon-conjunction-mars]`
- **moon conjunction mercury** — Feeling and thought run together. You feel what you think and want to talk it out, so say the tender thing plainly.  `[cc/aspect-pair/moon-conjunction-mercury]`
- **moon conjunction neptune** — Feelings turn dreamy and porous. You soak up the room and drift, lovely for imagination and risky for boundaries.  `[cc/aspect-pair/moon-conjunction-neptune]`
- **moon conjunction north node** — Your feelings point straight at what you're growing toward, and the pull can be strong. Let yourself want it and take one step closer, without mistaking the intensity for a finished decision.  `[cc/aspect-pair/moon-conjunction-north-node]`
- **moon conjunction pluto** — Feelings run deep and intense and something buried can surface. Powerful for honesty, risky for brooding. Let it move through instead of gripping it.  `[cc/aspect-pair/moon-conjunction-pluto]`
- **moon conjunction saturn** — Feelings turn heavy, serious, or lonely and you may want to withdraw. Real, but don't mistake the mood for the truth. Tend to yourself and let it pass.  `[cc/aspect-pair/moon-conjunction-saturn]`
- **moon conjunction sun** — Feelings and identity move as one. What you need and who you are point the same direction, so you feel most yourself when you honor the mood.  `[cc/aspect-pair/moon-conjunction-sun]`
- **moon conjunction uranus** — Moods turn sudden and restless and you need room to breathe. Expect the unexpected in how you feel.  `[cc/aspect-pair/moon-conjunction-uranus]`
- **moon conjunction venus** — Feelings turn soft, affectionate, and pleasure-seeking; you want comfort and closeness. A good window for warmth, connection, and self-care.  `[cc/aspect-pair/moon-conjunction-venus]`
- **moon opposition chiron** — Someone brushes the old sore spot. What they do lands on a bruise, so tend the bruise, not just the person.  `[cc/aspect-pair/moon-opposition-chiron]`
- **moon opposition jupiter** — Your need for comfort pulls against the hunger for more. You feel restless for something bigger than what already soothes you.  `[cc/aspect-pair/moon-opposition-jupiter]`
- **moon opposition mars** — Your need for comfort meets someone's heat or push. Irritation flares, so move your body before you snap.  `[cc/aspect-pair/moon-opposition-mars]`
- **moon opposition mercury** — Logic and mood pull opposite ways. You feel one thing and think another, so hear both out before you decide.  `[cc/aspect-pair/moon-opposition-mercury]`
- **moon opposition neptune** — Your feelings blur with everyone else's. It is hard to tell your mood from the room's, so get quiet and check.  `[cc/aspect-pair/moon-opposition-neptune]`
- **moon opposition pluto** — Emotional intensity meets a power dynamic: jealousy, control, or an old feeling demanding attention. Feel it fully, then choose your response rather than react.  `[cc/aspect-pair/moon-opposition-pluto]`
- **moon opposition saturn** — Your needs collide with duty or someone's distance; you feel torn between caring for yourself and holding it together. Make room for the feeling without dropping the responsibility.  `[cc/aspect-pair/moon-opposition-saturn]`
- **moon opposition sun** — Your outer self and your inner feelings sit across from each other. Let both be true instead of picking a side.  `[cc/aspect-pair/moon-opposition-sun]`
- **moon opposition uranus** — Your need for security pulls against the urge to break away. Something or someone disrupts your comfort zone.  `[cc/aspect-pair/moon-opposition-uranus]`
- **moon opposition venus** — What you need pulls against what you value in someone else. Balance your own comfort with theirs.  `[cc/aspect-pair/moon-opposition-venus]`
- **moon sextile chiron** — A gentle chance to tend an old sore spot. One small, kind act toward the tender part goes a long way.  `[cc/aspect-pair/moon-sextile-chiron]`
- **moon sextile jupiter** — Your emotions and your optimism are lining up easily, so a warm, hopeful feeling wants to rise in you. Let yourself lean into it and feel it move through your body, rather than brushing it off or holding back. Just let it be what it is, without forcing it bigger or overdoing it.  `[cc/aspect-pair/moon-sextile-jupiter]`
- **moon sextile mars** — A chance to turn a feeling into action. Do the small brave thing the mood is pointing at.  `[cc/aspect-pair/moon-sextile-mars]`
- **moon sextile mercury** — An easy chance to put a feeling into words. The conversation you have been avoiding gets simpler now.  `[cc/aspect-pair/moon-sextile-mercury]`
- **moon sextile neptune** — A gentle opening for intuition and compassion. Follow the soft nudge to create something or care for someone.  `[cc/aspect-pair/moon-sextile-neptune]`
- **moon sextile pluto** — A chance to go one level deeper without drama. Let an honest feeling surface and actually look at it.  `[cc/aspect-pair/moon-sextile-pluto]`
- **moon sextile saturn** — A chance to give a feeling some structure. A steadying routine or a small boundary helps the mood settle.  `[cc/aspect-pair/moon-sextile-saturn]`
- **moon sextile sun** — A small opening to line up how you feel with what you are doing. Take the easy step and let the mood carry the day.  `[cc/aspect-pair/moon-sextile-sun]`
- **moon sextile uranus** — A chance to try a fresh emotional approach. Break a small routine and notice how it feels.  `[cc/aspect-pair/moon-sextile-uranus]`
- **moon sextile venus** — A soft opening for warmth, affection, and small pleasures. Reach for the comforting, lovely thing.  `[cc/aspect-pair/moon-sextile-venus]`
- **moon square chiron** — An old hurt gets poked and you go defensive. Notice the reaction before you act on it.  `[cc/aspect-pair/moon-square-chiron]`
- **moon square jupiter** — Feeling and optimism overinflate. You promise the world on a good mood, so enjoy it and keep the commitments realistic.  `[cc/aspect-pair/moon-square-jupiter]`
- **moon square mars** — Feelings run hot and reactive: irritation, defensiveness, a short fuse. Move the energy through your body before you say the thing you'll regret.  `[cc/aspect-pair/moon-square-mars]`
- **moon square mercury** — Head and heart bicker. You overthink a mood or talk yourself out of a real feeling, so quiet the mental noise first.  `[cc/aspect-pair/moon-square-mercury]`
- **moon square neptune** — Moods get foggy, porous, or escapist; you soak up everyone's feelings and lose the thread of your own. Rest, and don't make big emotional decisions in the haze.  `[cc/aspect-pair/moon-square-neptune]`
- **moon square north node** — What you're reaching for scrapes against what actually comforts you, and it feels awkward. Don't retreat to the familiar just because the growth is uncomfortable; take one small step toward it anyway.  `[cc/aspect-pair/moon-square-north-node]`
- **moon square pluto** — Emotional intensity and a pull toward control. Brooding or a quiet power struggle over feelings, so let it move through you.  `[cc/aspect-pair/moon-square-pluto]`
- **moon square saturn** — Emotions meet a cold wall and you feel unsupported, blocked, or not enough. Comfort yourself first, then deal with the actual limit rather than the feeling of it.  `[cc/aspect-pair/moon-square-saturn]`
- **moon square sun** — Your needs pull against your goals. What would comfort you and what you think you should be doing are at odds, so choose one on purpose.  `[cc/aspect-pair/moon-square-sun]`
- **moon square uranus** — Emotional restlessness. You want to bolt from the familiar and feelings arrive without warning, so give yourself space.  `[cc/aspect-pair/moon-square-uranus]`
- **moon square venus** — You want comfort and you want closeness, and they are slightly crossed. Watch soothing yourself with spending or sweets.  `[cc/aspect-pair/moon-square-venus]`
- **moon trine chiron** — Comfort in the healing. It is easier than usual to feel the tender thing without being swamped by it.  `[cc/aspect-pair/moon-trine-chiron]`
- **moon trine jupiter** — Warm, hopeful, and genuinely generous. A feel-good flow that is easy to share.  `[cc/aspect-pair/moon-trine-jupiter]`
- **moon trine mars** — Emotion fuels action smoothly. You are moved by what you actually care about, so put the energy to work.  `[cc/aspect-pair/moon-trine-mars]`
- **moon trine mercury** — It is easy to name what you feel. Gentle, honest talking flows.  `[cc/aspect-pair/moon-trine-mercury]`
- **moon trine neptune** — Soft, imaginative, and easily empathic. A tender, creative, forgiving mood.  `[cc/aspect-pair/moon-trine-neptune]`
- **moon trine pluto** — Deep feeling that renews you. You can be honest about the heavy thing and come out lighter.  `[cc/aspect-pair/moon-trine-pluto]`
- **moon trine saturn** — Steady, contained feelings. There is real comfort in routine, discipline, and knowing where you stand.  `[cc/aspect-pair/moon-trine-saturn]`
- **moon trine sun** — Who you are and how you feel agree without effort. Confidence and comfort come easily today.  `[cc/aspect-pair/moon-trine-sun]`
- **moon trine uranus** — Refreshing emotional freedom. Change feels easy and you are comfortable doing it your own way.  `[cc/aspect-pair/moon-trine-uranus]`
- **moon trine venus** — Tenderness comes easily. A warm, affectionate mood that is good for closeness and for treating yourself kindly.  `[cc/aspect-pair/moon-trine-venus]`
- **saturn square jupiter** — Growth pushes against limits: you want to expand while something says slow down and consolidate. The friction is between optimism and realism. Grow, but build the structure that makes the growth hold.  `[cc/aspect-pair/saturn-square-jupiter]`
- **sun conjunction north node** — Who you are and where you're headed line up, and you can feel the pull toward something bigger. Aim yourself at it deliberately, without burning past your own limits.  `[cc/aspect-pair/sun-conjunction-north-node]`
- **sun opposition moon** — Your public self and your private feelings pull opposite ways, the face you show versus what you actually need. The work isn't to pick a side but to let both be true: steady on the outside without abandoning what you feel underneath.  `[cc/aspect-pair/sun-opposition-moon]`
- **sun opposition saturn** — Your goals run up against hard reality or someone else's constraints, and the gap between where you are and where you want to be feels stark. Don't read the limit as a verdict on your worth. Name what's in your control and put steady work there.  `[cc/aspect-pair/sun-opposition-saturn]`
- **sun square pluto** — Identity meets deep pressure: something asks you to drop a hollow version of yourself and get honest about power. It can feel like a confrontation or a reckoning. Let what's false fall away instead of gripping for control.  `[cc/aspect-pair/sun-square-pluto]`
- **sun square saturn** — Your direction meets an obstacle — a limit, a duty, or an authority saying not yet. It can feel like being blocked or doubted. Treat it as a test of commitment: do the unglamorous part, and the confidence you build is real rather than borrowed.  `[cc/aspect-pair/sun-square-saturn]`
- **sun trine jupiter** — Confidence and opportunity align; things feel expansive and doors open. A good time to say yes to growth you can honor.  `[cc/aspect-pair/sun-trine-jupiter]`
- **sun trine saturn** — Ambition and structure work with each other: steady effort pays off and discipline feels supportive rather than heavy. A good window to commit to something long-term and build it properly.  `[cc/aspect-pair/sun-trine-saturn]`
- **venus conjunction mars** — Attraction and drive line up, so what you want and who you want it from stop being separate questions. Desire feels direct and a little bold. Pursue it plainly instead of dressing it up as something more acceptable.  `[cc/aspect-pair/venus-conjunction-mars]`
- **venus conjunction uranus** — Attraction turns sudden and electric — a crush, a spark, an urge to shake up how you love or spend. Exciting, but restless and not always durable. Enjoy the novelty without mistaking a jolt for a foundation.  `[cc/aspect-pair/venus-conjunction-uranus]`
- **venus opposition north node** — What you value and what you're being pulled to grow toward feel at odds, often through another person. Notice where an old comfort is competing with the stretch, and choose the one that helps you grow.  `[cc/aspect-pair/venus-opposition-north-node]`
- **venus opposition pluto** — Closeness runs into power: jealousy, control, or the uneasy sense you've been giving far more than you get back. What's imbalanced gets exposed. Get clear on what you actually want from the connection before reacting to the intensity.  `[cc/aspect-pair/venus-opposition-pluto]`
- **venus sextile neptune** — A gentle opening around love, art, and imagination — inspiration that can become real if you act on it instead of only admiring it. Don't let fear of disappointment stop you reaching. Make one tangible, beautiful thing with what's already here.  `[cc/aspect-pair/venus-sextile-neptune]`
- **venus sextile north node** — Warmth and your growth edge cooperate, and a small step toward what you want feels natural. Reach for the connection or pleasure that also moves you forward.  `[cc/aspect-pair/venus-sextile-north-node]`
- **venus square saturn** — Warmth meets caution: a relationship, or your sense of being valued, feels tested, distant, or effortful, and doubt about being wanted can creep in. Ask for what you need directly instead of withdrawing, and let the connection prove itself through what people do.  `[cc/aspect-pair/venus-square-saturn]`
- **venus trine jupiter** — Warmth and generosity flow — good feeling, social ease, and a little luck in love and money. Enjoy it, and be generous without overextending.  `[cc/aspect-pair/venus-trine-jupiter]`
- **venus trine neptune** — Love and imagination blend beautifully; romance, art, and compassion flow. Lovely — just keep one foot on the ground about what's real.  `[cc/aspect-pair/venus-trine-neptune]`
- **venus trine saturn** — Affection and commitment sit easily together; a relationship or your sense of worth feels stable and worth the effort. Good for defining what you want and making it durable.  `[cc/aspect-pair/venus-trine-saturn]`

## Required table: phrase-record sample (section 18)

| Key | Text or paraphrase | Function | Scope | Eligible article types | Status | Source |
| --- | --- | --- | --- | --- | --- | --- |
| `cc/aspect-pair/venus-square-saturn` | warmth meets caution; being valued feels tested | lived-situation | transit-to-natal / sky-aspect | planetary-horoscope, transit-essay | APPROVED | cc-source-phrases.json |
| `cc/house/8/trust` | trust, control, what you're willing to depend on | scene-selector | 8th-house scenes | all personalized | APPROVED | cc-source-phrases.json |
| `cc/sign/virgo/actions` | count to 10; clarify without rushing | practical-correction | Virgo | daily/weekly/planetary | APPROVED | cc-source-phrases.json |
| `cc/event-action/mercury-retrograde` | back up files; note what recurs; triple-check dates | practical-action | mercury-retrograde | retrograde-guide | APPROVED | cc-source-phrases.json |
| `ms/retro-phase/stationary` | ~2 days; concentrated view of the planet's archetype | timing-explainer | any retrograde | retrograde-guide, direct-station-guide | APPROVED | marie-source-phrases.json |

## Required table: coverage (section 18)

| Category | Coverage | Missing | Confidence |
| --- | --- | --- | --- |
| Sign lived-behavior banks | 12/12 signs | expanded alt-lines uneven by sign | high |
| House scene banks | 12/12 houses, 60 facet scenes | few houses have <5 facets | high |
| Planet function banks | 10/10 planets | outer planets thinner | medium |
| Exact aspect-pair clauses | 84 rows | 84 rows still EVIDENCE_ONLY_UNTIL_REVIEWED; many pairs absent | medium |
| Planet-in-sign | 138 rows | seasonal/dated copy mixed in; not all 120 combos | medium |
| Fallback hooks | 320 rows | many are raw weekly excerpts needing quarantine review | low |
| Retrograde phases | 4/4 phases (ms/retro-phase) | per-planet retro copy only for some planets | high |
| Ingress | 9 bodies (ms/ingress) | sign-flavored ingress uneven | medium |
| Dignity | 5 tags | per-sign dignity sparse | medium |
| Eclipses | 3 rows | solar vs lunar not separated in source | low |

---

## 9. Phrase bank

Phrases are stored by **function**, not by symbol, so the composer can pull the right *move* for a subject. Function families (from the voice spec's signature moves and the CC banks):

- **opening hooks** — recognizable moment or light imperative. Sources: `cc/sign/{sign}/hook/alt*`, `cc/sign/{sign}/hook-moves`, `cc/fallback-hook/*`.
- **pattern-naming** — "you might be noticing where you've been…". Voice-spec move 2.
- **lived behavior** — the concrete, slightly uncomfortable thing. Sources: `cc/sign/{sign}/lived-behaviors`, `cc/house/{n}/*`.
- **permission / reframe** — "your worth isn't determined by your earning capacity"; "both things are true".
- **somatic observation** — "your shoulders might tense up when someone asks for help".
- **questions** — only when they deepen the same subject ("what if independence doesn't mean doing it all alone?").
- **practical actions** — concrete corrections and scripts. Sources: `cc/sign/{sign}/actions`, `cc/sign/{sign}/action/alt*`, `cc/event-action/*`.
- **transitions** — light, never the mandatory "this transit reveals".
- **timing lines** — "active from {date}", "look back to the New Moon six months ago". Sources: `ms/retro-phase/*`, `cc/key-dates/*`.
- **closings** — release or one small action. Sources: `cc/sign/{sign}/closings`, `/closing/alt*`.

Each phrase record carries: `key, text, function, scope, articleTypes, eventTypes, surfaceEligibility, register, status, source, notes` (per spec §7). The **phrase-record table** with worked samples is generated in the banks section above (see "Required table: phrase-record sample"). Banks §5–§8 are the full, provenance-tagged phrase inventory.

**Translate abstractions (voice-spec law).** Weak → strong pairs to enforce at generation:
- "Know your worth" → "State the rate, protect the time, ask for credit, or stop waiting for approval before deciding."
- "Give yourself grace" → "Stop after one revision, allow an ordinary mistake, or lower the standard for the first attempt."
- "Take up space" → "State the preference, ask for time, speak before overediting, or stop shrinking the request."

## 10. Hook bank

Each hook is tagged with what it *does* (`function`), `bestFor`, `avoidFor`, `intensity`. Examples grounded in the corpus:

| Hook (paraphrase / short excerpt) | Function | Best for | Avoid for | Intensity |
| --- | --- | --- | --- | --- |
| "What do you actually want to say?" | communication-reassessment | daily, mercury-retrograde, mercury-ingress | natal-profile | low |
| "You can't read minds." `[cc/sign/virgo/hook/alt1]` | anti-projection | daily (Virgo/Mercury), sky-aspect friction | eclipse | low |
| "Start spreading the news." `[cc/sign/cancer/hook/alt4]` | visibility-prompt | daily, new-moon (public life) | grief/loss transit | mid |
| "Worship at the altar of Personal and Professional Boundaries this week." `[cc/fallback-hook/weekly/taurus/v2]` | boundary-frame | weekly | tooltip | mid |
| "You might be noticing where you've been…" (voice-spec) | pattern-naming | daily, full-moon, transit-essay | key-dates | mid |
| "The Full Moon lands in your 2nd house…" (voice-spec) | locate-transit | full-moon, monthly | feed-card (too long) | low |

**Rule:** a hook opens; it does not carry the astrology. Name the placement plainly *after* the hook, once, then go to lived behavior.

## 11. Fallback library

A fallback is thinner than authored copy but still specific. **Quality floor:** `event → lived setting → likely behavior → one useful response`. **Personalized floor:** `event → natal house → one concrete house example → exact natal aspect or one relevant modifier → one practical response`.

Weak: "Venus in Virgo brings relationships and values into focus."
Strong: "Venus enters Virgo and moves through your 4th house, bringing home, family agreements, and practical comfort into focus. Fix the part of the living arrangement that affects daily life, then stop once the result is workable."

### Fallback families created (each with the same eight variants)
`collective · sign-based · house-personalized · exact-aspect · short-card · tooltip · notification · receipt-only`

`fallback/daily-horoscope` · `fallback/weekly-horoscope` · `fallback/monthly-horoscope` · `fallback/planetary-horoscope` · `fallback/season-horoscope` · `fallback/new-moon-horoscope` · `fallback/full-moon-horoscope` · `fallback/solar-eclipse-horoscope` · `fallback/lunar-eclipse-horoscope` · `fallback/year-ahead-horoscope` · `fallback/ingress` · `fallback/retrograde` · `fallback/direct-station` · `fallback/moon-sign` · `fallback/moon-phase` · `fallback/new-moon` · `fallback/full-moon` · `fallback/solar-eclipse` · `fallback/lunar-eclipse` · `fallback/sky-aspect` · `fallback/transit-natal`

### Event-specific fallback logic (must-answer checklists)
- **retrograde:** what's reconsidered / what repeats / what not to force / what changes by natal house. Template: `{Planet} retrograde begins in {sign} in your {house} house, making you reconsider how you {behavior} in {house area}. Review {object/agreement/routine} before returning to the plan.`
- **direct-station:** what starts moving / what's unresolved / what got clearer / what gets tested.
- **solar-eclipse:** what chapter begins / how circumstances redirect / which house / what stays flexible.
- **lunar-eclipse:** what culminates or separates / which axis / what's undeniable / what to handle before explaining.
- **moon-in-sign:** current emotional weather / natal house / strongest exact Moon-to-natal aspect / one practical use / when the Moon leaves the sign.
- **two-sign retrograde:** `{Planet} retrograde begins in {signA} by making you reconsider how you {signA behavior}. When it moves back into {signB}, the review turns more {personal/practical/emotional}, bringing up {signB condition} shaping the original problem.` (Name the behavior; never "the focus shifts from communication to emotional themes.")

### Source material for fallbacks
`cc/fallback-hook/*` (320 rows — **most are raw weekly-column excerpts; REFERENCE_ONLY / RAW_QUARANTINE until reviewed and rewritten in voice**), `cc/event-action/*`, `cc/planet/*`, `cc/house/*`, `ms/retro-phase/*`, `ms/ingress/*`, `ms/retrograde/*`. Fallbacks are generated *from* these in voice, never served raw.

## 12. Surface variants

Write each size intentionally; do not truncate. What each size must carry:

| Surface | Length | Must carry | Drops |
| --- | --- | --- | --- |
| expanded-web / app-expanded | 180–320w | full arc: locate → lived → cause → practical (+personal layer) | nothing |
| feed-card | 70–120w | one claim + one lived beat + one action | questions, footer, second beat |
| calendar-day-card | 45–80w | event + one lived line + timing | cause explanation |
| week-view | 35–65w | thesis + priority | per-day chronology |
| month-view | 20–40w | month's one focus + key date | lived examples |
| tooltip | 12–24w | what the event is, plainly | advice, personalization |
| notification | 18–35w | event + one thing to do/notice + timing | mechanism |
| receipt-only | fact line | `{event}: {transiting} {aspect} {natal}` + date/orb | all interpretation |

Card vs detail (per `EXECUTABLE-TEMPLATE-CONTRACT`): **compact must differ from expanded** — a card is one concise claim; the detail page is the developed interpretation. They may never be identical strings.

## 13. Validation rules

Runtime/editorial gates (from the extraction spec §19 + the package contracts). A record is reader-ready only if **all** pass:

1. Surface resolved first; narrative model matches the surface (Sky collective ≠ Home planetary ≠ natal).
2. Calculated facts (dates, signs, houses, aspects, orbs, motion, dignity, sect) come from the calc layer, kept out of the narrative body; footer/receipt only.
3. Narrowest reviewed source selected (exact planet-in-sign or aspect-pair before general planet/sign/house).
4. Supporting sources used as constraints — a house selects the scene, never emits a keyword paragraph.
5. One coherent situation; no symbol-by-symbol translation; no concatenated modules.
6. Optional beats suppressed when they only repeat; no mandatory "this transit reveals / you may be noticing".
7. `SOURCE_GAP` when the required exact source is missing — never build prose from keywords, prompts, feedback, reports, or raw CC copy.
8. Compact ≠ expanded.
9. Daily and weekly treated as containers, not events. Solar and lunar eclipses separated. Retrograde and direct-station separated. Moon phase and Moon sign separated.
10. Every personalized template uses the natal house; exact natal aspects outrank generic Sun/Moon; Sun/Moon/rising synthesized into one story, never three paragraphs.
11. House and sign banks are lived situations, not keyword lists.
12. Fallbacks thinner than authored copy and every fallback names a practical action.
13. Short-surface versions written intentionally, not truncated.
14. Source status preserved; raw phrases quarantined; no silent promotion of DRAFT → served copy.
15. Unsupported predictions removed; no "end the relationship/job" advice without context.
16. Birth-time-missing behavior defined: suppress house/sect copy, fall back to sign-based collective.
17. Voice: no keyword stacks, no "activation" without explanation, no em dashes, no "not X but Y" reflex, no slogans, no generic Sun/Moon/rising paragraphs.
18. Parity: Dashboard preview == published record == generated snapshot == app output.

An executable subset of these is implemented in `resolver/` (`surface_resolver.py`, `lane_priority.py`, `seam_filter.py`, `sect.py`) and exercised by `tests/` — see §14.

## 14. Source registry and provenance

**Status ladder + serving rules (spec §15):**
`CONFIRMED` → may serve verbatim · `APPROVED` → may serve or guide generation · `DRAFT` → may inform generation, not serve verbatim · `REFERENCE_ONLY` → structure/research only · `RAW_QUARANTINE` → cannot enter automatic generation context · `MANUAL_ONLY` → requires human selection · `DEPRECATED` → never retrieve.

**Package tier mapping (from `SOURCE-CLASSIFICATION.json`):** default `EVIDENCE_ONLY`; reader-eligible only at `REVIEWED_CLAUSE` / `REVIEWED_RECORD`. `cc/transit/*/house-*` → `REFERENCE_SCAFFOLD` (not reader-eligible). `cc/aspect-pair/*` → `EVIDENCE_ONLY_UNTIL_REVIEWED`. Prohibited source classes (never serve): prompt, chat_feedback, status_report, audit_report, test_fixture_text, tldr_failure_screenshot, developer_diagnostic, **raw_chani_copy**.

**Provenance requirement:** every served clause records `sourceKeys, slot, reviewStatus, originalityCheck`; every served record additionally records `surface, templateId, templateVersion, renderedFields`. Provenance keys appear inline throughout §5–§8.

**Executable enforcement shipped with this library** (`resolver/`, aligned to the package contracts, not a replacement for them):
- `seam_filter.py` — rejects keyword seams ("X moves through Y circumstances", "Planet brings…", comma keyword-runs) and stock summary openers that restate.
- `lane_priority.py` — exact→context→keyword lane order; SOURCE_GAP when no exact situation source; optional-slot suppression.
- `surface_resolver.py` — collective vs rising-house-personalized vs natal divergence (proves Sky `Sun in Cancer` ≠ Home Gemini-rising `Sun in Cancer` → 2nd house).
- `sect.py` — day/night sect eligibility, Mercury calculated not guessed, sect copy suppressed without birth time + horizon, transit sect-weighting flag OFF (experimental).
- `schema.json` — per-entry schema with lane, surface_scope, card/detail, state.

## 15. Open gaps

- **Exact aspect-pair coverage — UPDATE:** all 84 rows have now been reviewed and promoted to `REVIEWED_CLAUSE` (voiced, decomposed to transit slots, seam-cleared) in `phrasebank/cc-aspect-pair-reviewed.json`; the transit templates resolve for them instead of gapping. See `REVIEW-QUEUE-REPORT.md`. Still absent → still `SOURCE_GAP` by design: all planet–angle pairs (Mars–Ascendant, Saturn–MC, etc.), and many outer-planet→personal long-transit combinations. The 132 quarantined generic transit-through-house rows must NOT be promoted as substitutes.
- **Planet-in-sign copy is seasonal/dated,** not a clean 120-combo matrix; several entries are month-specific column copy (RAW_QUARANTINE).
- **Eclipses:** source fragments (`ms/eclipse-house/*`, `ms/eclipse-guidance/*`) do not separate solar vs lunar; per-sign eclipse copy must be authored.
- **Angles (`me.natal_angle`)** need angle-specific sources; only `ms/midheaven/*` exists — Ascendant/Descendant/IC by sign are missing.
- **Planetary returns / profections** are sparse (`ms/profection/*` only).
- **Outer-planet transit refs** (`cc/ref/outer-planets/{planet}-transit`) referenced by the transit template are thin; slow-transit tails should stay MANUAL_ONLY.
- **`cc/fallback-hook/*` (320)** are largely raw weekly-column excerpts — high quarantine load; each must be reviewed and rewritten in voice before serving.
- **Sect data dependency:** all house/sect personalization suppressed without reliable birth time + horizon; the sign-based collective path is the required fallback.

---

# Final deliverables

## Deliverable 1 — Consolidated production library
This document (`TLDR-ASTRO-PRODUCTION-LIBRARY.md`), sections 1–15, plus the executable `resolver/`, `schema.json`, `fixtures/`, and `tests/` in the same package.

## Deliverable 2 — Source-coverage report
See the generated **coverage table** in the banks section. Summary: sign banks 12/12 (high); house scenes 12/12 + facets (high); planet functions ~7/10 clean, outer planets thin (medium); exact aspect-pairs 84 rows all unreviewed (medium); planet-in-sign partial + dated (medium); fallback-hooks 320 mostly raw (low); retrograde phases 4/4 (high); ingress by body (medium); eclipses fragmentary (low).

## Deliverable 3 — Newly identified article types
`planetary-horoscope` (rising-house personalized, distinct from Sky and natal); two-sign `retrograde-guide`; `direct-station-guide` (split from retrograde); `ingress-guide`; `moon-phase` and `moon-sign` as separate modules; `cazimi` event copy; `outer-planet-cycle-guide`; `profection`/`planetary-return` framing; `key-dates`/`event-timeline`.

## Deliverable 4 — Missing source categories
Angles by sign (Asc/Desc/IC); per-sign eclipse copy (solar vs lunar); clean 120-combo planet-in-sign; reviewed exact aspect-pairs beyond the 84 (esp. planet–angle, outer–personal); outer-planet transit-to-natal refs; planetary-return copy; per-house retrograde tails for planets other than Mercury/Uranus.

## Deliverable 5 — Fallback families created
21 families listed in §11, each with 8 variants (collective, sign-based, house-personalized, exact-aspect, short-card, tooltip, notification, receipt-only), each enforcing the quality floor.

## Deliverable 6 — Passages requiring manual editorial review
All `cc/aspect-pair/*` (84); all `cc/transit/*/house-*` (132 quarantined); `cc/fallback-hook/*` (320 raw excerpts); dated `cc/planet-in-sign/*` seasonal copy; `ms/pull-quote/*` and `ms/essay-quote/*` (REFERENCE_ONLY); any outer-planet slow-transit tail (MANUAL_ONLY).

## Deliverable 7 — Duplicate sources
`-REVIEWED-COMPLETE`, `-NEW-NATAL-TRANSITS-DIRECTION`, `-FULL-DASHBOARD-NEW-DIRECTION (2)`, `-FINAL-SOURCE-GROUNDED-TEMPLATES` ZIPs carry byte-identical `cc-source-phrases.json` / `marie-source-phrases.json` / `tldr-astro-records.json` to v2.0.1. They differ only in their `CODEX-IMPLEMENTATION-PROMPT.md` / `PACKAGE-AUDIT.md` iteration notes. **Canonical: `tldr-astro-template-handoff-v2` (2.0.1).** Older ZIPs → DEPRECATED for sourcing.

## Deliverable 8 — Changelog
- Added the 3-dimensional taxonomy (editorial × event × surface) and the article-type comparison table.
- Added `planetary-horoscope` as a first-class rising-house-personalized type, separated from Sky collective and natal placement.
- Separated moon-phase/moon-sign, solar/lunar eclipse, retrograde/direct-station.
- Added event-type function-sequence templates incl. two-sign retrograde and cazimi.
- Added the personalized natal layer with shared serving order and 10 per-type templates; banned generic Sun/Moon/rising paragraphs.
- Regenerated sign/house/planet/aspect banks from the corpus with inline provenance and status.
- Added 21 fallback families with an 8-variant matrix and must-answer checklists.
- Added surface-variant spec (8 sizes, written not truncated) and compact≠expanded rule.
- Added 18 validation gates and an executable subset (`resolver/` + `tests/`).
- Flagged quarantine load: 84 aspect-pair + 132 generic transit-house + 320 fallback-hook rows requiring review; marked older ZIPs DEPRECATED for sourcing.
