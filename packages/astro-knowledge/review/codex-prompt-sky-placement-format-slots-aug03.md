# Codex prompt — three new Sky Placement slots (prior-sign handoff, cycle line, concurrent events)

Copy everything below the line into Codex. This prompt is self-contained; do not attempt to open any
files outside the repository. All owner rules and facts are restated in full.

---

The owner compared the placement format against its registered structural model (the CHANI guide noted
in `voice/tldr-astro/sky-placement.json#articleStructure`) and adopted three missing beats. All three
are fact-gated: they render only when the engine or the astrology library supplies the backing fact,
and they never introduce sourced cultural or historical claims. "The astrology library" is the
project's name for `packages/astro-knowledge` meaning data, per the writer policy ("The astrology
library supplies meaning").

## 1. New fact file: `data/modifiers/planet-cycle-facts.json`

Stable orbital facts for the cycle-line slot. Schema: per body, `zodiacCircuit` (time to move through
all twelve signs), `typicalSignStay`, `variabilityNote` where residency varies. Values to encode
(verify each against the Swiss Ephemeris test rig before marking REVIEWED; ship as DRAFT):

- sun: circuit 1 year; about 1 month per sign.
- moon: circuit about 27 days; about 2.5 days per sign. (Reference only; Moon ingress copy remains
  permanently excluded.)
- mercury: circuit about 1 year (stays near the Sun); sign stay ranges roughly 2 weeks to 2 months
  when a retrograde falls in the sign.
- venus: circuit about 1 year; sign stay roughly 3 weeks to 4 months with a retrograde.
- mars: circuit about 2 years; roughly 6 to 7 weeks per sign, up to about 7 months with a retrograde.
- jupiter: circuit about 12 years; about 1 year per sign.
- saturn: circuit about 29 years; roughly 2.5 to 3 years per sign.
- uranus: circuit about 84 years; about 7 years per sign.
- neptune: circuit about 165 years; about 14 years per sign.
- pluto: circuit about 248 years; 12 to 31 years per sign (elliptical orbit; state the range for the
  current sign from ephemeris when rendering).
- chiron: circuit about 50 years; roughly 4 to 8 years per sign (elliptical).
- north/south node: cycle about 18.6 years; about 18 months per sign pair, moving backward through
  the zodiac.

The writer never invents a number: cycle sentences must trace to this file or to engine dates. Any
duration in output without a backing fact fails the existing boundary check.

## 2. Three new slots in the placement article structure

Add to `sky-placement.json#articleStructure` and the packet builder. Each is a fact-gated device
following the existing `timingDevices`/`voiceDevices` pattern (`id`, `rule`, `requiresFact`,
`houseExample`). Rendering caps unchanged: max two voice devices per card; these three structural
slots do not count against that cap but each renders at most once.

1. `prior-sign-handoff` — one sentence, at or immediately before the hook, saying where the planet
   arrives from and what changes. requiresFact: `priorSign` + prior-sign entry/exit dates
   (engine-computed). houseExample: "After a year of growing through what feels like home, Jupiter
   leaves Cancer and starts growing through the other person." Register: collective, no second
   person, no appositive planet definitions ("the planet of growth and abundance" is a lint
   fingerprint).
2. `cycle-line` — one or two sentences in the meaning beat teaching the planet's rhythm from
   `planet-cycle-facts.json`. requiresFact: the planet's entry in that file. houseExample: "Jupiter
   takes about twelve years to visit all twelve signs, so each sign gets roughly one year of this
   attention." This slot exists because generated drafts keep skipping the astrology teaching; the
   deterministic placement-name check stays, and Terra treats a card with neither planet mechanics
   nor sign meaning as score 1.
3. `concurrent-events` — one short paragraph between turn and moves: what else the sky is doing
   during this transit that changes how it lands. requiresFact: `eventsDuringTransit` (engine-ranked
   computed events inside the transit window; render the top one or two only). Meaning for each event
   joins from the astrology library; dates come from the engine; nothing else enters. houseExample:
   "A month into the transit, the South Node follows into the same sign, and the year of expansion
   picks up an undertow: what grows here also gets audited here." If the engine supplies no ranked
   events, the slot is absent, not filled.

Cycle-location addendum: the existing `cycle-location` device may state the previous residency's date
range when the engine supplies it ("Jupiter was last in Leo from July 2014 to August 2015"). Date
ranges only. Cultural and historical characterizations of past transits (pop-culture examples,
celebrity references, era descriptions) are excluded by the falsifiability rule and score 1 if
generated.

## 3. Lint and judge updates

- Deterministic: any month, year, or duration in a placement draft must trace to `{{...}}` tokens,
  `planet-cycle-facts.json`, or a supplied engine fact; otherwise reject (this extends the existing
  hallucination gate to the new slots).
- Deterministic: appositive planet-definition pattern ("X, the planet of A, B, and C") already flagged
  from the CC fingerprint list; confirm it fires inside the new slots too.
- Terra: a placement card missing both the cycle line and any planet/sign teaching scores 1. A
  concurrent-events paragraph naming an event not present in `eventsDuringTransit` scores 1.
- Excluded structures, record in the spec so generation never drifts toward them: natal-facing
  sections (Jupiter-return personalization belongs to the transit-to-natal surface; at most a
  one-line pointer to the app feature), second-person register, meme-speak ("entering the chat,"
  "main character era," "glow-up").

## 4. Verify

- A Jupiter-in-Libra dry-run prompt with `priorSign: cancer` present renders the handoff device;
  without the fact, the device text is absent.
- A dry-run with `eventsDuringTransit` empty renders no concurrent-events block.
- A test draft containing "from July 2014 to August 2015" passes when the engine supplied the range
  and fails when it did not.
- A test draft containing a celebrity name or "main character era" fails.
- planet-cycle-facts values match the Swiss Ephemeris rig within stated tolerances.
- Owner calibration pieces still score 3.

Out of scope: generating new copy (billed; owner authorizes separately), the fallback-surface
structure (opening/tension/development/close/try_this is unchanged), Moon ingress (permanently
excluded), and any change to the four approved V4 format exemplars.
