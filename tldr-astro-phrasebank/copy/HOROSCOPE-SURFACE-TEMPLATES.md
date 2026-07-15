# Horoscope surface templates + curated Marie voice layer

Adds the personalized horoscope surfaces (daily / weekly / lunation / monthly) that were
missing template contracts, plus a curated sentence-level voice engine drawn from
mariesatori.com and the by-sign lunation cards. Register here is second-person ("you") —
correct for personalized surfaces, and deliberately separate from the collective we/us Sky
layer.

## Curated voice layer — `phrasebank/cc-marie-site-templates.json`

27 exact Marie sentences (CONFIRMED, serve-verbatim, each with source + URL) paired with a
reusable template form (REVIEWED_TEMPLATE), plus six recurring template families and the
core principle. Older language the author has moved away from was excluded: alignment,
authentic self, masks, abstract healing language, keyword stacks, most X-not-Y, and
attributed quotes from other writers.

Six families: the strength that has gone too far; the behavior and the hidden reason; the
body reveals the cost; the two conflicting needs; the disruption as information; the
practical close. Core principle: name the ordinary behavior first (overworking, staying
quiet, managing someone's mood, editing a message, refusing help), then let the transit
explain why it is becoming impossible to keep doing.

## Surface templates — `phrasebank/cc-horoscope-surface-templates.json`

Six templates, each with ordered semantic slots, composition rules, word band, banned-
language list, source, and a worked example (verbatim examples tagged CONFIRMED):

- **home.daily_horoscope** — 40–80 words: recent behavior/feeling → the day's fastest
  transit as the reason it surfaces → one specific close. No house jargon in the body.
- **home.weekly_horoscope.collective** — 110–200 words: the week's arc ("carries you from
  X into Y") → the week's lesson (behavior + turn) → dated day-markers → collective close.
- **home.weekly_horoscope.by_rising** — per rising sign: which house the week's transit
  activates → behavior there → the turn → practical close.
- **me.lunation_horoscope.full_moon** — by rising, 90–160 words. **Always names the house
  axis** ("lands in your Nth house, highlighting the N/opposite axis of A versus B"),
  because a Full Moon is a Sun–Moon opposition. Then validates both truths → names the
  behavior and what the body registers → the transit driver → a proportionate release.
- **me.lunation_horoscope.new_moon** — by sun sign, 80–150 words: life-area claim → ordinary
  behavior → origin/hidden reason → practical close (often a scripted phrase). Seeds an
  intention rather than declaring an outcome.
- **home.monthly_horoscope** — by sun sign: month's focus → behavior → turn → practical
  close, maintenance framing over prediction.

Includes the house life-area map (1–12) and the house-axis map (1/7 … 6/12) so the lunation
templates can name the correct axis per reader. Sentence-level fills come from the site
templates + families above.

## Voice-guard updates

`resolver/seam_filter.py` register ban extended with the author's moved-away-from language:
`authentic self`, `masks?`, `highest self` (joining `alignment`, `shrink`, `take up space`,
`hold space`). These apply to authored REVIEWED clauses only; CONFIRMED verbatim lines are
never linted. The Sky harness now also prints a soft **X-not-Y count** (informational);
current authored Sky copy is down to 4, all traceable to Marie's own published
constructions or the eclipse safety line "a turning point, not a verdict."

Self-corrections applied from this pass: removed "the social mask slips" from Libra season
and my two invented X-not-Y constructions (Libra close, Saturn "built, not declared").

## Validation

Full repo green after wiring both builders into `tests/build_all.sh`: 2216/2216 main harness
renders, 21 detail + 21 card Sky fixtures, historical ON=5/OFF=0, 17/17 checks.
