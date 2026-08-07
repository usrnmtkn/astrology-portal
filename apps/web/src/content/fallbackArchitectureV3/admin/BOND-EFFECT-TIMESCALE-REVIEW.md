# Owner review queue: bond-effect timescales vs real windows

Status: PENDING OWNER REVIEW. Nothing in this file is serving; all serving rows are
unchanged. This queue exists because bond cards now always show the real ephemeris
window in the closing mechanics line ("… until November 27, activating …"), so a
hardcoded timescale inside the effect paragraph can contradict the window the reader
sees two lines later.

## Method

All 139 serving `fallback-hook/bond-effect-*` rows in `source-rows/bond-language-pass-2.json`
were scanned for hardcoded timescale phrases (today, this week, this month, the next few
months, a few days, for a while, right now). 48 rows carry one. Risk was judged by
comparing the phrase against the transit windows the engine can actually produce for
that planet (including retrograde loops, which stretch inner-planet contacts well past
their normal pace).

## No action needed (timescale matches the planet's pace)

- Moon rows saying "today" — Moon contacts never outlive a day.
- Saturn rows saying "the next few months" — correct for every Saturn window.
- Jupiter rows saying "this month" — roughly correct; Jupiter retro loops can stretch to
  ~2 months but "this month" reads as register, not a promise.
- All "for a while" rows — vague by design, safe at any window.
- Sun rows ("this week", "a few days") — the Sun never retrogrades; windows are short.

## Flagged for review (phrase can contradict the shown window)

| Row | Phrase | Conflict case |
| --- | --- | --- |
| `bond-effect-trine/mars` | "today" | A normal Mars trine holds ~1–2 weeks; a retro loop can hold months. The card can read "today" above a window ending six weeks out. |
| `bond-effect-sextile/mercury` | "today" | Mercury retro repeats the contact across ~3 weeks. |
| `bond-effect-soft/mercury`, `.../variant-3`, `bond-effect-hard/mercury/variant-3` | "this week" | Same Mercury retro stretch. |
| `bond-effect-square/venus`, `bond-effect-opposition/venus`, `bond-effect-soft/venus`, `.../variant-3`, `bond-effect-hard/venus`, `.../variant-3` | "this week" / "a few days" | Venus retro holds a contact up to ~6 weeks. |
| `bond-effect-hard/mercury/variant-3` | "this week" | As above. |

## Suggested direction (for owner drafting, not applied)

Keep timescale out of the effect paragraph entirely; the closing mechanics line already
carries the real window. Example shape, using the flagged Mars trine:

- Current: "You work well as a team today. The project, move, workout, or practical job
  that needs two sets of hands may go faster than expected."
- Proposed: "You work well as a team while this holds. The project, move, workout, or
  practical job that needs two sets of hands may go faster than expected."

Alternative engine-side mitigation if rewrites are unwanted: when the activation transit
is retrograde, prefer a variant row without a timescale phrase (requires tagging rows,
larger change).

## Process note

Per package rules, replacement rows enter `review_status`-gated drafts and stay dark
until approved; do not edit the serving bodies in place.
