# Codex: restore the "Impact & Clarity" Sky placement article (V3-compliant)

## Root cause
The live /#sky placement page renders through `renderSkyPlacement()`
(apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs) which
assembles the OLD structure: {{signStyle}} adjective opener -> sign lore -> "the {sign}
trap" -> one paragraph per aspect via the "for everyone at once" sky-event frames ->
element close -> "Wishing you..." sign-off. The newer Impact & Clarity template
(adopted Jul 22) was collateral-reverted by `beb07a45` ("Enforce V3 content boundaries"),
which purged non-V3 sources. The article spec is RESTORED at
`apps/web/src/content/sky-writing/TLDR-Sky-Article-Spec.md` - implement to it.

## The fix stays inside the V3 boundary
Do NOT reintroduce the purged non-V3 sources (emergencyCopy, aspectPairSourcePhrases,
sky-articles-authored JSON, fallback-atoms). The Impact & Clarity article is
(a) AUTHORED evergreen copy per placement = V3-compliant authored content, plus
(b) COMPUTED ephemeris aspect lines = allowed. This mirrors the existing deliberate
exception where the governed astro-knowledge resolver is canonical for the
aspect-pattern reader.

## LOCKED structure (owner-approved on the Sun-in-Leo gold, outputs/sky-article-sun-leo-gold.md)
Five beats, in order:
1. Opening: date range + the shift ("The Sun will be in Leo until August 22, and the
   volume goes up on wanting to be seen.")
2. Lore/history: the sign's mythology + pace (approved `sky-season-lore/{sign}`
   verbatim, trimmed of any theme the meaning beat carries).
3. Meaning: what the placement does, in the owner's voice.
4. Confrontation + catch: the pattern that breaks / the temptation to watch, ending
   on the caution (no motivational tone).
5. Today: the placement planet's CURRENT aspects, named with the EXACT date and
   whether applying ("Building toward an exact conjunction on July 29, the Sun and
   Jupiter in Leo amplify momentum. ... Confidence gets you into the room; substance
   is what keeps you in it."). Sits BELOW the article, not at the top.

beat -> source (engine ASSEMBLES from the approved bank; do not hand-write prose):
- opening: `sky-placement-you/{planet}` + computed date range
- lore: `sky-season-lore/{sign}` (verbatim)
- meaning: `{planet}-{sign}` source (data/placements/sign) + owner bespoke copy if present
- confrontation/catch: `sky-sign-trap/{sign}` + `sky-season-shadow/{sign}` + owner bespoke
- today: computed current aspects to the placement planet, exact-dated, appended below

Voice + ban list are in the restored spec (this surface bans "safe/settle/steady/
perform/shrink", "this energy", "right now", "reveals/heals", the not-X-but-Y reframe;
no em dashes). Note: unlike the sky CARDS, this article MAY end a beat on a direct
caution/instruction - owner's call for this surface.

## Wiring changes
1. Author the evergreen article per placement as an authored card
   (`authored/sky-ingress/{planet}/{sign}`, or a dedicated `authored/sky-article/...`
   surface). renderSkyPlacement already serves `authored/sky-ingress/{planet}/{sign}`
   VERBATIM and returns early - but it currently appends NOTHING (no aspect lines) in
   that path. Change it so the authored evergreen body is followed by the computed
   dated aspect lines.
2. Replace the aspect-line frame with the spec's dated wrapper:
   "[Dates]: [transit fact]. [What shifts, concrete]. [One move]." - retire the
   "for everyone at once" sky-event frames for this surface.
3. Retire the old assembly elements (adjective opener, sign lore, "trap", element
   close, "Wishing you" sign-off) on the placement article once an authored article
   exists. For placements without an authored article yet, compose the fallback per
   the spec's fallback-assembly order (function line -> sign-mechanics -> collective
   sentence -> computed walkthrough -> do/don't -> handoff) - never the retired
   kumbaya structure.
4. Update the reader-facing-content contract test to allow this authored-sky-article +
   computed-ephemeris exception (as it already allows the aspect-pattern exception),
   so the V3-boundary enforcement does not revert it again. Add a regression test that
   asserts /#sky/placement/sun/leo does NOT contain "Wishing you", the "{sign} trap",
   or a "for everyone at once" wrapper.

## Content = ONE TEMPLATE, not bespoke articles
Every placement renders from a single template (frame + slots); the voice lives in the
per-sign / per-planet SLOT VALUES, never in hand-written per-placement prose. Frame and
slot->hook map are in outputs/sky-placement-article-template.md (matches the beat->source
map above): opening_shift + sky-season-lore/{sign} + {planet}-{sign} source +
sky-sign-trap/{sign} + sky-season-shadow/{sign} + computed current aspects.
- The engine determines WHICH placements are current from real ephemeris (correct signs
  for fast planets), fills the slots, and appends the day's aspects (exact-dated, no
  "Today:" label) last.
- To make a placement hit harder, tune its SLOT VALUE (e.g. opening_shift for Sun/Leo),
  which improves that placement everywhere - do not write a one-off article.
- An optional per-placement authored override may still supersede the template if one
  ever exists, but the template is the model; do not free-write article prose.

## Report
- /#sky/placement/sun/leo renders the Impact & Clarity structure (no retired elements).
- The dated aspect wrapper renders from computed ephemeris, not the old frame.
- Reader-contract test updated + the new regression test passes.
- No purged non-V3 sources reintroduced; no social/flag changes beyond this surface.
