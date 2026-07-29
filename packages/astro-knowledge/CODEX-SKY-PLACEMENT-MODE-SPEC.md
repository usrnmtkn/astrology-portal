# Sky placement mode — spec + build plan

Rebuilds the sky planet-in-sign write-ups. Today the Sky page renders 14 planet
templates with an adjective slot ("the Sun is in {{signTitle}}: ... take on a
{{signStyle}} cast"), so every sign is the same sentence with a swapped adjective.
This replaces that with sign-specific write-ups in the collective sky voice,
reusing the aspect-card engine (voice contract + linter + judge + generator), NOT
a new one.

Owner has approved three golds across the range (Sun = luminary at home, Venus =
personal, Pluto = slow outer). Shape and voice are locked. This spec is the source
of truth for wiring them.

## Dependency / ordering

Starts AFTER the linter structure-gate change (paragraph-count fail) lands, because
the placement changes touch the same shared files (`lint-sky-voice.js`,
`examples.json`, the generator). Do not start in parallel — avoid the collision.

## The mode

`surface: "sky"`, `mode: "collective-placement-card"`. Two layers (hybrid):

- EVERGREEN BASE — 2 short paragraphs. Durable, cacheable, sign-specific, no
  live-sky data. This is 168 cards (14 bodies x 12 signs) and is the bulk of the value.
- LIVE TOPPER — 1 optional paragraph, prepended only when the planet is tightly
  aspected right now. Written in the aspect-card voice. Needs current-sky data.

## Person rule (LOCKED — differs from the aspect cards)

Collective "we" in the BODY; the impersonal "you" is allowed ONLY in the final
sentence (the closer). The aspect cards ban "you" everywhere; placements do not.

Linter change: `lintCard` takes a mode. In `collective-placement-card` mode, the
"you/your/you're" ban applies everywhere EXCEPT the closing truth+catch pair.
The closer is NOT always one sentence — it is the trailing run of short (<=13-word)
sentences at the end, capped at 2 (a truth + its catch). Run the you-ban on the
body (everything before that run); skip it inside the closing run only. Everything
else (banned-words, constructions, AI-tells including "the gift is"/"the shadow is",
em dash, stacked-ending, the new paragraph-count fail) applies unchanged.

This rule is PROTOTYPED AND VALIDATED (scratch): all three golds pass 3/0 and a
control with "you" in the body still fails. The earlier "final sentence only" draft
was too strict — it flagged Pluto's two-sentence close ("You don't get to opt
out... You only get to decide..."). Implement the closing-pair version.

Confirm the 17 aspect exemplars still lint 3/0 (they run in aspect mode, so their
behavior is unchanged).

## Shape + voice (from the 3 golds and the owner's 2025 articles)

- Open on a claim, never an announcement ("For about four weeks Venus moves through
  Virgo, and what we want turns practical." NOT "Venus is now in Virgo.").
- Personify the planet in short declaratives where it fits ("Venus here reads love
  as attention"; "Pluto goes to work on power itself").
- Concrete and modern (coffee order, cold audit, networks/machines/crowds, the 1%).
- Name the shadow plainly, but never with the "the gift is / the shadow is" seam.
- End on a reframe/truth then a catch, the same close discipline as the aspect cards.
- State the PACE so the reader knows mood vs chapter vs era ("about four weeks",
  "about twenty years... you feel it at the turning points"). Pace also does the
  timing work that the topper does for fast planets.
- Direct over poetic: no "shine"-style metaphors; plain idiom wins.

## Bans

Inherit the aspect-card ban set (banned-words.json, banned-constructions.json, the
sky AI-tells in sky-aspect.json) with ONE change: replace the blanket "you" fail
with the body-only "you" rule above.

## Source layer — COMPLETE, no net-new authoring (corrected)

The source already exists for all 14 bodies; it just lives in two folders:
- Traditional 10 planets: `data/placements/sign/{planet}-{sign}.json` (120 files,
  tldr/body/gift/challenge).
- Chiron, North Node, Lilith: `data/points/placements/sign/{point}-{sign}.json`
  (36 files, tldr/body/shadow/business). Same usable shape.
All are natal "you"-framed; the generator reframes to collective, the same way it
reframed data/pairs for aspects.

Generator change: read BOTH directories when resolving placement source. SOUTH
NODE has no own files (nodes are always exactly opposite): generate "South Node in
X" from the `north-node-{opposite-sign}` source with the comfort-zone/release frame
the current template already uses. No files to author.

## Approved golds (add to examples.json, tagged, all must lint 3/0 in placement mode)

### sky-sun-in-leo (tier: luminary)
> For about a month the Sun sits in Leo, and the whole season tilts toward being seen. Warmth, nerve, and the urge to make something with our name on it all run a little hotter - we want to be looked at doing the thing we're proud of, not just to have done it. This is the Sun at home, so the confidence is clean when it has something generous to point at: a project, a person, a room we're trying to light up.
>
> The catch is that Leo measures by applause, and applause is a fickle ruler. The same heat that makes us bold makes us touchy about credit, quick to perform, slow to sit in a room where we are not the center of it. Build from the inside out and people notice. Chase the clout directly and you'll just watch it land on somebody else.

### sky-venus-in-virgo (tier: personal)
> For about four weeks Venus moves through Virgo, and what we want turns practical. Affection, taste, and money all bend toward the useful: the gesture that actually helps over the grand one, the person who remembers how we take our coffee over the one who performs romance. Venus here reads love as attention - clocking what someone needs before they ask, and quietly handling it.
>
> Push practical love too far and it curdles: help hardens into control, and care shows up as a list of corrections. Under this Venus we start loving people by fixing them, or earning our keep by staying useful until there is nothing left over. Care lands best with no invoice attached. Try to be needed instead of loved and you'll end up neither.

### sky-pluto-in-aquarius (tier: outer)
> Pluto takes about twenty years to cross a sign, so this is an era, not a mood - most of us feel it as the slow weather of the decade rather than any single week. In Aquarius it goes to work on power itself: who holds it, who it runs through, and how much of it now lives in networks, machines, and crowds instead of the 1% at the top. The systems we treat as permanent are exactly the ones being quietly rebuilt.
>
> The shadow of Aquarius is the group that swallows the person: control dressed up as progress, the crowd deciding it speaks for everyone. Pluto here keeps exposing which of our shared structures were built to serve the many and which only claimed to. You don't get to opt out of an era this size. You only get to decide what you're helping to build inside it.

## Topper logic (phase 2)

- Fires only when the planet is tightly aspected right now; show the single tightest
  contact (same rule as the aspect cards' series line).
- Fast planets (Moon, Mercury, Venus, Sun, Mars) get a fresh topper often; slow
  outers (Jupiter-Pluto, Chiron, nodes) rarely — do not leave a stale topper sitting
  for months. Prefer no topper over an old one.
- The topper reuses the current aspect meaning already computed for the aspect cards.

## Build split + phasing

PHASE 1 — evergreen bases (ship first; no live-sky coupling):
- Engine (Claude): add the placement mode to the voice contract; add the linter
  mode; add the 3 golds to examples.json; extend the generator with a placement
  path (load placement source, build base prompt, generate -> lint(placement) ->
  judge, reusing closeBank + repair + signal-fed retry); extend the judge with
  placement tier hints + placement gold standards; re-run the separation-gate
  calibration.
- App (Codex): a table/rows for generated placement cards (mirror
  generated_interpretations); resolver switch so the Sky page renders the generated
  base and falls back to the old template only if missing; a cron to generate/refresh
  the 168 bases.

PHASE 2 — live toppers (after bases are live):
- Couple placement generation to current-sky aspect data; prepend the tightest
  topper; refresh when the sky changes.

## Guardrails

- Reuse the engine; do not fork a second generator/linter/judge.
- No changes to the calibration philosophy (separation gate stays).
- Aspect-card behavior must be unchanged (verify 17/17 still 3/0 in aspect mode).
