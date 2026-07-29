# Codex: solo transit cards -> lived-first template

## Symptom
`/#you` transit cards (e.g. "Chiron square your Jupiter") still render structure-first:
> Until Jul 30, 2026, Chiron in Taurus is square your natal Jupiter. In plain terms:
> this pushes old insecurities... They grind against each other...

The lived-first restructure (owner-approved) was designed but never wired. This is the
same fix pattern as the sky placement article: reorder existing slots into a template,
lead with the lived effect, close with the chart mechanics + window.

## Where
`apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs`,
`renderTransitAspect` (the transit-to-natal aspect renderer). Template change only -
same resolved slots, new order. NOT bespoke, NOT a content-source change.

## Current template (retire)
`{timeOpen}, {transitRef} is {aspectAdj} your natal {natalTitle}. In plain terms:
this {aspectVerb} right now. {transitTypeLine/effect}`

## New template (lived-first)
`{transit_effect}. That's {transitRef} {aspect_gerund} your natal {natalTitle}, {window}.`

1. LEAD with the resolved lived clause (the `transit-effect-{soft|hard}/{transiting}
   [/{natal}]` body already filled with {natalArea}). No preamble before it.
2. DROP the leading "{timeOpen}, {transitRef} is {aspectAdj} your natal {natalTitle}."
   line and the "In plain terms: this {aspectVerb} right now." mechanics sentence.
3. CLOSE with one astrology line carrying the window inline:
   "That's {transitRef} {aspect_gerund} your natal {natalTitle}, {window}."
   - aspect_gerund map: square->squaring, trine->in a trine to, opposition->opposite,
     sextile->sextile to, conjunction->meeting.
   - window inline from the computed transit range: "through July 30" (was "Until Jul 30, 2026").

## Rendered check - Chiron square your Jupiter
BEFORE:
Until Jul 30, 2026, Chiron in Taurus is square your natal Jupiter. In plain terms: this pushes old insecurities and where repair happens up against your sense of what is possible right now. They grind against each other: growth, belief, and where things expand brush against an old sore spot, and reactions can run bigger than the moment deserves. Pay attention to the sting, because it points directly to where healing wants to happen.

AFTER:
Growth, belief, and where things expand brush against an old sore spot, and the reaction can run bigger than the moment deserves. Pay attention to the sting; it points to where healing wants to happen. That's Chiron in Taurus squaring your natal Jupiter, through July 30.

## Scope
- The template is shared, so this fixes ALL transit-to-natal aspect cards, not just
  Chiron. That is intended - lived-first everywhere on this surface.
- Watch the "can" hedge grammar bug already flagged (can throw yourself / can need) if
  any effect rows route through that path; apply that one-line fix here too if so.

## Report
- /#you Chiron-square-Jupiter renders the AFTER shape (no "In plain terms:", no leading
  "{date}, X is Y your natal Z"; astrology + window as the closing line).
- Spot-check 3 other transit cards (one soft, one hard, one outer) for clean grammar +
  correct aspect_gerund and inline window.
- test:content + reader-contract tests pass; PACKAGE_VERSION bumped if any source row changed.

---

## FOLLOW-UP after v3-2026-07-28a import

28a's sign propagation is correct - the Taurus-specific Chiron wants-line renders. But
28a's new wants-pair composer is authoritative and still opens structure-first
("Until July 30... In plain terms:"), so the lived-first order regressed. The prior
package-local override was NOT retained over the archive - as expected, a package-local
patch gets overwritten on every import.

Fix must land in the composer SOURCE (the archive generator that produces the package),
then rebuild as 28b and re-import. Do not re-apply as a package-local override.

Change in the wants-pair composer, for the transit-to-natal path:
1. Emit the sign-aware wants/effect line FIRST (the line 28a already resolves correctly).
2. Delete the "Until {date}, {transitRef} is {aspectAdj} your natal {natalTitle}."
   opener and the "In plain terms: this {aspectVerb} right now." sentence.
3. Append the closer: "That's {transitRef} {aspect_gerund} your natal {natalTitle},
   through {date}." (gerund map above; window inline).

Target render (Chiron square Jupiter) is the AFTER block above - felt line leads, the
"Until July 30" fact moves into the closing "through July 30".

### Two pre-existing blockers (not from this change) - please clear alongside
1. `test:content` stops on the untracked retired `apps/web/src/content/sky-writing/`
   folder. That folder is docs/spec, not V3 content - exclude it from the test:content
   scan (or `git rm` it if the spec is captured in astro-knowledge). It should not gate
   content tests.
2. `test-transit-aspect-v3-selection` expects `authored/transit-aspect/pluto/chiron/square`,
   which never existed; both old state and 28a resolve via
   `authored/transit-aspect/any/chiron/conjunction`. To unblock now, update the test's
   expected key to the real resolving key. BUT flag for me separately: that means a
   Chiron SQUARE is being served CONJUNCTION copy (square = friction/grind, conjunction
   = fusion) - a voice mismatch I'll want an aspect-correct `.../any/chiron/square`
   variant for. Queue it; don't block 28b on it.
