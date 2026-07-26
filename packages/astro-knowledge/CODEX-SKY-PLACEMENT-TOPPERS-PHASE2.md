# Codex prompt: placement toppers (phase 2 - live-aspect layer)

The evergreen placement bases are live. The topper is the optional live layer: when
a placement's planet is TIGHTLY aspected right now, prepend one short paragraph, in
the aspect-card voice, that frames the base with the current contact. When the
planet has no tight aspect, no topper - the base stands alone.

## Behavior (locked rules)

- Fire the topper ONLY when the placement's planet has a tight current aspect
  (reuse the exact aspect data + orb the sky-aspect cards already compute). If none
  is tight, no topper.
- Show only the SINGLE tightest aspect (same rule as the aspect cards' series line).
- Fast planets (Moon, Mercury, Venus, Sun, Mars) will get a fresh topper often;
  slow outers (Jupiter-Pluto, Chiron, nodes) rarely. Never leave a stale topper:
  when the tight aspect separates, drop the topper on the next cron.
- Voice: aspect-card register (collective "we", NEVER "you" - it lints under the
  ASPECT mode, not the placement mode). One short paragraph, prepended above the
  two-paragraph base.
- The rendered card = topper paragraph + evergreen base (base is unchanged/cached).

## Generation

`generatePlacementTopper({planet, sign, aspect, other, otherSign, orb})`:
- Reuse the current tightest-aspect meaning the aspect pipeline already has.
- Build a 1-paragraph topper prompt: name the current contact, say what it does to
  the placement's theme right now, end on one grounded line. Gate through
  generate -> lint(aspect mode) -> judge. Reuse closeBank / signal-fed retry /
  judge-guided repair.
- Cache keyed by (planet, sign, aspect, other) so it only regenerates when the
  tight contact changes.

## Topper exemplars (owner-approved shape; add as gold/few-shot)

For Sun in Leo, currently conjunct Jupiter:
> Right now Jupiter sits right on top of that Leo Sun, so the season opens with the volume already up: wins feel bigger, the yeses come easier, and going all-in sounds like the only sensible plan. Take the tailwind - just remember Jupiter enlarges everything it touches, including the size of the bet.

For Venus in Virgo, currently opposite Saturn:
> Right now Venus in Virgo is opposite Saturn, so the practical streak comes with a cold audit: the connection, the purchase, the plan all get held up to the light and asked whether they're actually worth it. Useful question. Just don't let the scoring turn into a verdict on people who were only ever going to be human.

## Cron + render

- The daily placement cron additionally recomputes toppers: for each current
  placement, check the tightest aspect; generate/refresh the topper if the contact
  is new, drop it if the contact separated. Idempotent.
- Render prepends the cached topper to the base when present.
- Auto-publish routing unchanged (topper+base judged as one card): 3 -> LIVE,
  2 -> review, 1 -> regenerate.

## Calibration

Add 1-2 topper golds (the two above) to the placement-mode calibration set and
re-run the separation gate in-app on `openai/gpt-4.1` before enabling toppers.
Toppers stay behind a flag (e.g. `SKY_PLACEMENT_TOPPERS_ENABLED`) until the sample
reads clean and the owner signs off.

## Scope / honesty

This is a real build (live-aspect coupling + a new generation path + its own
calibration), not a same-day flip. Ship the daily-body rewrites and keep the
evergreen bases serving today; land toppers as a fast follow once this passes.
