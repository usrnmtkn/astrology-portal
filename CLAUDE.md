# TLDR Astro Claude instructions

## Writing registers (owner-stated; read before drafting any reader copy)

The project has three reader-facing registers. They are not
interchangeable, and copy written in the wrong one is rejected on sight.
Check the register before writing a single sentence.

Resolve the rendered surface first. Trace the page or route to its renderer
and content-key family before using source prose or choosing a voice. Never
infer register from a content key that merely names a planet and sign: the
same planet-plus-sign shape can feed Sky Placement, Calendar, You, or Friends,
where the renderer may make it current sky, a collective event, a natal
placement, a personal transit, or a relationship condition.

- Content rendered on the Sky page is current-sky content, never natal.
- Content rendered on the Calendar page is current-sky content, never natal.
- On You and Friends, the exact renderer decides between natal, personal
  transit, and relationship registers.

Current-sky temporality does not make every Sky surface sound identical. Sky
Placement articles may address the reader under their article contract, but
they describe the current transit rather than a standing personality.
Calendar aspect cards remain collective and use no second person. Apply the
sub-surface contract only after the current-sky classification is fixed. If
the route, renderer, or surface is ambiguous, fail closed and ask the owner
instead of guessing.

Incident record, 2026-08-15: an owner-directed natal register normalization
was applied to Sky Placement review rows because the surface was assumed from
the content key instead of resolved; review caught the error, the change was
reverted, and it remained non-serving throughout.

### 1. Sky aspect (Calendar) — collective

Two planets aspecting each other in the current sky. It is the same for
everyone; the reader is not in it.

Calendar cards have two parts (owner decision, 2026-08-14). Forecast
first, astrology underneath.

**Main copy: the forecast.** What may happen, why it matters, what can
move. No astrology explanation required, and no placement or aspect names
in it. The reader gets something usable before being asked to process
planet, sign, aspect, modality.

**Details: the astrology, in reader order.** Names the transit ("Sun in Leo
opposite Saturn in Aquarius"), then follows the same message-first logic as
the forecast. Details may sound like astrology education; the main copy may
not. Details is NOT "Sun does X. Saturn does Y. Opposition means Z. Fixed
means Q." That order makes the reader assemble the meaning themselves.

Details beats, in this order (owner decision, 2026-08-14):

1. **What may happen.** Compose both placements into one recognizable
   situation.
2. **Why it matters.** Explain both placements astrologically, in one
   sentence.
3. **Why it sticks or moves this way.** Add aspect, then modality or
   element, only where useful.
4. **What can move.** Translate the astrology back into the part of the
   situation that can actually change.

The astrology library governs the explanation. The reader logic governs
the order of the prose.

This split is also what removes the repetition problem: placements are
named once, in Details.

- The signs carry the substance. "Sun in Leo opposition Saturn in
  Aquarius" and "Sun in Pisces opposition Saturn in Virgo" must not read
  alike. If the copy would be unchanged by swapping the signs, it is wrong.
  The signs determine what the tension is, so they change the forecast
  itself, not just the Details.
- Stay general enough that anyone recognizes it. A single narrow scene (one
  bakery, one council meeting, one comment thread) is a personal-transit
  move and does not belong here. Ordinary life is texture, not plot.
- No second person. No standing-pattern claims.
- Stored bodies begin lowercase; the Calendar composes the date lead-in.

Approved shape (owner-authored, 2026-08-14):

> On Tuesday, August 18, someone may want their effort recognized while
> the answer coming back is that the same rule applies to everyone. That
> can turn a quiet frustration into a direct disagreement about credit,
> exceptions, or what the policy actually covers. Neither side is likely
> to back down quickly. What can change is the agreement: what counts, who
> gets recognized, and which rule applies here.
>
> **Details.** Sun in Leo opposite Saturn in Aquarius. Someone may want
> their contribution recognized while the answer coming back is that the
> same rule applies to everyone. The Sun in Leo puts more weight on
> individual contribution and recognition, while Saturn in Aquarius holds
> to the standard meant to apply across the group. The opposition makes
> both positions difficult to ignore, and because both signs are fixed,
> neither side is likely to give way quickly. What can move is the
> agreement itself: what counts, who gets recognized, and which rule
> applies here.

Beats in the forecast: the tension in ordinary words, then what it turns
into, then how it behaves, then what can actually change.

Synonym sets naming one referent ("the policy, process, or rule") and
facets of one question ("what counts, who gets recognized, which rule
applies") are correct. They are not scene menus. A scene menu offers
different situations ("a payment plan stretches, a deadline moves, a
policy is revised") and is prohibited. Any deterministic gate that
rejects the approved shape above is wrong and must be fixed.

### 2. Personal transit (You, Friends) — event

A moving planet contacting one person's natal point. Temporary, theirs.

- Second person. A specific everyday scene is correct here.
- The friend or other person is visible in the scene where one is involved.
- Temporary event, never a permanent trait.

### 3. Natal aspect (You) — standing pattern

A pattern in the birth chart. Person first, "you tend to".

- Shape: pattern, then why, then a way through.
- Never reads like a transit or a passing mood.

### Rules that apply to all three

- One scene or condition per piece. No menus of alternatives ("a payment
  plan stretches, a deadline moves, a policy is revised").
- Planets are not characters. Do not write "Mercury puts... while Venus
  refuses...".
- No detachable aspect formulas ("The sextile opens a route...").
  If a sentence would fit any other card of that aspect, it fails.
- The mechanism names who does what in ordinary words. Not abstractions
  colliding.
- Endings state where things stand. They do not invent facts absent from
  the piece, promise resolution, or deliver a moral.
- Invent nothing. Concrete detail must come from governed source material.
- Plain over clever; the meaning survives one read. No em dashes, ASCII
  only, no "steady", no coaching or permission language. Contractions are
  fine.
- Voice exemplars must themselves pass every rule above. An exemplar that
  violates a rule is a counter-example and must be removed from the packet.

## Serving-content merge model (v2, 2026-08-08 — replaces the flight rule)

Scope: `apps/web/src/content/fallbackArchitectureV3/**` and
`packages/astro-knowledge/**`.

The v1 flight rule halted all work whenever any open PR touched the scope.
With multiple concurrent agent sessions that halted everything constantly and
made the owner adjudicate every merge. v2 protects the same things — approved
copy and generated-artifact integrity — with a queue and an invariant instead
of a stop.

1. **Queue, don't halt.** Open PRs in scope do not block branching or
   development. They establish merge order: scope PRs merge one at a time,
   oldest-ready-first unless the owner reorders. Immediately before merging,
   rebase onto current main and regenerate all generated artifacts.

2. **Overlap is judged on source files only.** `dist/tldr-content.js`, the
   bundled manifests, and `content-book.html` are generated — never merge them
   across branches; the merging PR regenerates them from its sources. A
   conflict exists only when two PRs edit the same source content.

3. **Approved copy is protected by invariant, not by pausing.** Every scope PR
   must leave all `review_status: approved` rows byte-identical, unless the PR
   description quotes the owner's explicit approval for the specific change.
   Diff the approved rows before merging to verify. Violations are a hard
   stop.

4. **Stop-and-report is reserved for:** (a) a source-file conflict with
   another open PR that rebasing cannot resolve, (b) any change to approved
   copy without quoted owner approval, (c) CI failures not on the known
   pre-existing list. Everything else proceeds through the queue.

5. **PR hygiene.** A scope PR idle for 3+ days must be rebased or closed by
   its owning session before that session opens another scope PR.

6. **Isolated gate execution.** Every gate-relevant check runs in an isolated
   worktree with dependencies installed locally by `npm ci`. Never symlink or
   reuse `node_modules` across worktrees. Before reporting a content gate,
   build `@tldr/astro-knowledge` locally in that worktree, regenerate every
   affected artifact there, and confirm workspace package links resolve inside
   that isolated worktree.
