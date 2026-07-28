# Codex prompt: land the placement ENGINE (generator + linter mode + judge + golds)

The placement app phase is committed (reader gate, cron, schema, integration test).
What's left to make placements actually generate is the engine side. Apply this on
`codex/ship-sky-aspect-pipeline` (it has the structure-gate + signal-fed repair;
my worktree does not, so I'm specifying rather than editing to avoid clobbering).
Reuse the aspect engine — do NOT fork a second generator/linter/judge.

## 0. Source correction (affects the cron's coverage check)

Sources are COMPLETE for all 168; they live in two folders:
- `data/placements/sign/{planet}-{sign}.json` — the 10 traditional planets (120).
- `data/points/placements/sign/{point}-{sign}.json` — chiron, north-node, lilith (36).
South Node has no files: derive "South Node in X" from `north-node-{oppositeSign}`
using the comfort-zone/release frame. So the "120/168" gate should read both dirs
and treat the node axis as derived; nothing needs authoring.

## 1. Linter placement mode (`lint-sky-voice.js`)

`lintCard(text, { mode })`. Default/aspect mode is unchanged. In
`mode: "collective-placement-card"` the ONLY change is the "you/your/you're" ban:
it applies to the body but is skipped inside the closing truth+catch pair. This
algorithm is prototyped and validated against all 5 golds plus a body-"you"
control:

```
// closer = trailing run of short (<=13-word) sentences, capped at 2
function closerSentenceCount(sentences) {
  let n = 0;
  for (let i = sentences.length - 1; i >= 0 && n < 2; i--) {
    if (sentences[i].trim().split(/\s+/).filter(Boolean).length <= 13) n++;
    else break;
  }
  return Math.max(n, 1);
}
```
Split into sentences; the closer is the last `closerSentenceCount` sentences; run
the you-ban on everything before the closer only. Everything else (banned-words,
constructions, "the gift is/the shadow is", em dash, stacked-ending, paragraph-
count fail from the structure gate) applies in both modes unchanged.

Verify: the 17 aspect exemplars still lint 3/0 in aspect mode; the 5 placement
golds below lint 3/0 in placement mode; a card with "you" in the body still fails
in placement mode.

## 2. Add the 5 approved golds to `examples.json`

Tag each: `surface: "sky"`, `mode: "collective-placement-card"`, `tier` as noted,
`canonical: true`. All must lint 3/0 in placement mode.

**sky-sun-in-leo** (tier luminary)
> For about a month the Sun sits in Leo, and the whole season tilts toward being seen. Warmth, nerve, and the urge to make something with our name on it all run a little hotter - we want to be looked at doing the thing we're proud of, not just to have done it. This is the Sun at home, so the confidence is clean when it has something generous to point at: a project, a person, a room we're trying to light up.
>
> The catch is that Leo measures by applause, and applause is a fickle ruler. The same heat that makes us bold makes us touchy about credit, quick to perform, slow to sit in a room where we are not the center of it. Build from the inside out and people notice. Chase the clout directly and you'll just watch it land on somebody else.

**sky-moon-in-scorpio** (tier luminary)
> For about two and a half days the Moon slides through Scorpio, and the collective mood drops below the surface. Feelings get heavier and more private - less said out loud, more felt in the gut. Small things land harder, and we start reading for what people aren't saying as much as what they are. This is the fastest hand on the clock, a passing tone rather than a chapter: sharp while it lasts, mostly gone in a few days.
>
> The pull now is to test the people we love - to poke at a bond to see if it holds, or to go quiet and make them guess. Scorpio feelings want the truth, but they will settle for control when the truth feels too exposed. Say the raw thing while the Moon is here and it clears. Hold it in and it just leaks out sideways, aimed at whoever is closest.

**sky-venus-in-virgo** (tier personal)
> For about four weeks Venus moves through Virgo, and what we want turns practical. Affection, taste, and money all bend toward the useful: the gesture that actually helps over the grand one, the person who remembers how we take our coffee over the one who performs romance. Venus here reads love as attention - clocking what someone needs before they ask, and quietly handling it.
>
> Push practical love too far and it curdles: help hardens into control, and care shows up as a list of corrections. Under this Venus we start loving people by fixing them, or earning our keep by staying useful until there is nothing left over. Care lands best with no invoice attached. Try to be needed instead of loved and you'll end up neither.

**sky-pluto-in-aquarius** (tier outer)
> Pluto takes about twenty years to cross a sign, so this is an era, not a mood - most of us feel it as the slow weather of the decade rather than any single week. In Aquarius it goes to work on power itself: who holds it, who it runs through, and how much of it now lives in networks, machines, and crowds instead of the 1% at the top. The systems we treat as permanent are exactly the ones being quietly rebuilt.
>
> The shadow of Aquarius is the group that swallows the person: control dressed up as progress, the crowd deciding it speaks for everyone. Pluto here keeps exposing which of our shared structures were built to serve the many and which only claimed to. You don't get to opt out of an era this size. You only get to decide what you're helping to build inside it.

**sky-chiron-in-aries** (tier point)
> Chiron sits in a sign for years, marking where a whole generation carries the same tender spot. In Aries, the sore place is the right to want things and chase them - to take up space, to come first without a written apology attached. For years the culture has been picking at exactly this: whose anger is allowed, who gets to be selfish, what happens when we finally stop asking permission.
>
> The wound shows up two ways - freezing when it is time to assert, or overcorrecting into aggression to cover the freeze. Both are the same bruise. The medicine is plain: we want things out loud, act on our own behalf, and let it come out clumsy. You don't heal the fear of being too much by staying small. You heal it by taking up room and surviving the discomfort.

## 3. `generatePlacementCard` (in the generator module)

Mirror `generateCard` but for placements:
- Load source: `data/placements/sign/{planet}-{sign}.json` OR
  `data/points/placements/sign/{point}-{sign}.json`; south-node from the opposite
  north-node file. Pass tldr/body/gift(or shadow)/challenge as the MEANING; the
  prompt reframes natal "you" to collective "we".
- Build the base prompt: the placement shape (2 short paras, open on a claim,
  personify the planet, name the shadow without the "gift is/shadow is" seam, state
  the pace, end on truth+catch), the person rule (we body, "you" only in the closer),
  and the placement golds as the few-shot (rotate, same anti-contamination approach
  as `closeBank`).
- Gate: generate -> `lintCard(text, { mode: "collective-placement-card" })` ->
  judge (placement mode, section 4). Reuse `closeBank`, the signal-fed lint retry,
  and the one-shot judge-guided repair exactly as the aspect path does.
- TOPPER is phase 2 — generate the evergreen base only for now.

## 4. Judge placement mode (`judge-sky-voice.js`)

Add placement tiers (luminary / personal / outer / point) and use the 5 golds above
as the same-tier gold standards. Point tier hint: "a generational tender spot; wound
then medicine; slower and heavier than a planet — do not penalize the two-part
shape." Reuse the median-of-samples + cold temperature. Then a
`test-placement-calibration.js` mirroring the aspect one, gated on the SAME
separation criterion (0 golds off-voice, 0 weak passed, gold−weak mean ≥ 1.5). It
needs the model key, so run it where the key is available; keep
`SKY_PLACEMENT_JUDGE_CALIBRATED` false until it passes.

## 5. Validate + report

- 17 aspect exemplars 3/0 (aspect mode); 5 placement golds 3/0 (placement mode);
  body-"you" control fails in placement mode.
- Aspect regression + placement app integration still pass.
- Generate a small sample (e.g. the 5 current-sky placements) and report them
  unedited for an owner voice audit, plus the placement calibration numbers once the
  key is available. Do not deploy or set the placement flag until calibration passes.
