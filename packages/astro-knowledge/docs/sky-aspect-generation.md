# Sky-aspect card generation

How collective current-sky aspect cards get written, at the approved voice, reusably.

## The pipeline (generate-then-lint)

```
data/pairs/{a-b}.json   (source-backed meaning: blend / harmonious / hard)
        +
voice/tldr-astro/sky-aspect.json   (8-beat template, guardrails, tier + metaphor rules)
        +
voice/tldr-astro/examples.json     (canonical 8-beat "we" exemplars, canonical: true)
        |
   scripts/generate-sky-aspect-cards.js   (assembles the per-aspect prompt)
        |
     [ app model writes the card ]  <- app provider/model env; temperature 0.7
        |
   scripts/lint-sky-voice.js   (gates output; retries on failure; flags if it can't pass)
        |
   approved card
```

The model never invents astrology. It fills the 8 beats using the meaning from
`data/pairs`, and it is gated by the voice linter before anything ships.

## Try it

```
# print the exact prompt for any aspect (no model needed):
node scripts/generate-sky-aspect-cards.js --dry-run sun-pluto opposition leo aquarius

# generate with the same model configuration as the app:
node scripts/generate-sky-aspect-cards.js --run sun-pluto opposition leo aquarius
```

Local runs load `apps/web/.env.local` without replacing shell environment
variables. Provider selection follows
`CONTENT_GENERATION_PROVIDER_SKY_ASPECT`, then
`CONTENT_GENERATION_PROVIDER`, and defaults to OpenAI. Model/key variables are
`OPENAI_MODEL` / `OPENAI_API_KEY` or
`ANTHROPIC_MODEL` / `ANTHROPIC_API_KEY`.

## Current-sky matrix and review

`/api/cron/generate-sky-aspects` reads the immutable current-sky facts, keeps
each sign attached to its planet while normalizing the pair order, and caches
each card at:

```
sky.aspect.{a}.{aspect}.{b}.{signA}.{signB}
```

Existing clean drafts are reused, so a card is regenerated only when its
planet/sign tuple changes or its prior row failed. New output is saved as a
`DRAFT` in `generated_interpretations`. Output that does not reach `3 / 0
fails` is additionally marked `sky-voice-needs-review`, which keeps it outside
the reader lane even if its status is changed accidentally.

The Sky reader accepts only exact sign-specific rows whose source snapshot
proves the pair file, canonical facts, and `3 / 0 fails`. The poetic body,
multi-pass series line, and factual space-mechanics caption render as separate
elements. Missing pair sources, Chiron, Lilith, and the Nodes do not render.

## The 8 beats

Beats 1, 2, 5, 6 come from `data/pairs` + aspect nature. Beat 4 comes from the
sign layer. Beats 3, 7, 8 are the authored voice work — the parts a writer or a
model-within-the-template supplies. Full definition in `sky-aspect.json` -> `shape.beats`.

## Voice rules (enforced by the linter)

- First-person-plural "we" is the primary register. "you" is banned.
- Hard-banned words, banned phrases, conditional "steady", bare-"loop" warn, "friction" warn.
- Em dash banned; use a spaced hyphen " - ".
- Elemental metaphors only when they match a planet/sign in the card (water for Neptune, fire for the Sun/Leo, etc.).
- Show both faces; end on two short quotable lines.
- Series line ("The first of five passes, running through May 2028.") renders only when count >= 2, from `facts.series`.

## Status

- The current Sun-in-Leo page (5 cards) is authored to this bar and lives as the
  canonical exemplars in `examples.json` (all score 3).
- `data/pairs/sun-chiron.json` is a STUB (Chiron isn't among the 45 major-planet
  pairs). It needs owner review and a second Chiron source before those cards ship.
- Moon exemplars in `examples.json` are the earlier 2-paragraph shape; re-cut them
  to the 8-beat "we" template when convenient.
