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
