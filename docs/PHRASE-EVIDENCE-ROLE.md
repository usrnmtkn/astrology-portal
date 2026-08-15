# PHRASE — the fifth evidence role

Date: 2026-08-13
Status: built, indexed, retrievable. No billed calls. Nothing approved or served.

The voice bank and phrasebank were being used only as *derived style guidance*
baked into the canonical instructions. The writer was told about the voice but
never handed the lines. This closes that gap, the same shape as the matrix and
scene gaps before it.

---

## 1. The voice bank, indexed

`tldr-astro-phrasebank/MARIE-VOICE-BANK.md`, indexed in place. Nothing moved,
nothing edited.

| Kind | Count | What it is |
|---|---:|---|
| **one-liner** | **72** | Approved lines across 15 themes. Retrievable |
| gold-example | 20 | Full-thought shape: truth, turn, concrete move |
| approved-swap | 10 | Exact diction preferences, use-this-not-that |
| lived-moment-rule | 5 | Replaces an abstraction with observable behaviour |
| **Total** | **107** | across 18 theme groupings |

Each phrase carries its theme, the failure or subject it addresses, the bodies
and houses that theme speaks to, a content hash, and its exact source line.

### Themes and their astrological subjects

| Theme | Lines | Bodies | Houses | Addresses |
|---|---:|---|---|---|
| Retrograde / review | 14 | mercury, venus, mars, saturn | 3, 9, 12 | revisiting rather than restarting |
| Authenticity & self-expression | 9 | sun, ascendant, uranus, venus | 1, 5, 11 | self-diminishment to keep others comfortable |
| Family chaos, career & livelihood | 7 | saturn, moon, midheaven | 4, 6, 10 | home and work bleeding into each other |
| Boundaries & energy protection | 6 | saturn, moon, mars, pluto | 1, 6, 8, 12 | over-giving, unclear limits |
| Credit, ownership & creative theft | 6 | sun, mercury, pluto, midheaven | 5, 10, 11 | unacknowledged work, borrowed authorship |
| Family roles & breaking patterns | 6 | moon, saturn, pluto, south node | 4, 10, 12 | inherited roles kept past their use |
| Self-worth & personal power | 5 | sun, venus, pluto, saturn | 1, 2, 8 | worth proved through exhaustion |
| Strategy | 4 | mercury, saturn, jupiter, mars | 3, 6, 10 | acting before the plan is real |
| Empathy & emotional labor | 3 | moon, venus, neptune, chiron | 4, 6, 7, 12 | carrying the load unasked |
| Financial growth & security | 3 | venus, jupiter, saturn | 2, 8 | money decisions avoided or rushed |
| Self-worth & earning power | 3 | venus, sun, saturn | 2, 6, 10 | undercharging |
| Career & business boundaries | 2 | saturn, mars, midheaven, jupiter | 6, 10, 11 | scope creep and unpaid extra |
| Relationships & compromise | 2 | venus, mars, moon, descendant | 7, 8, 11 | self-erasure inside an agreement |
| Health | 1 | moon, mars, saturn, chiron | 1, 6, 12 | the body reporting what the schedule denies |
| Channeling creativity | 1 | sun, venus, neptune, jupiter | 3, 5, 9 | making stalled by permission-seeking |

**Thin themes worth noting:** Health (1), Channeling creativity (1),
Relationships & compromise (2), and Career & business boundaries (2). Any
Venus-in-7th or Moon-in-6th work will lean on very few lines.

## 2. The 63 phrasebank files, classified

| Classification | Files | Retrievable |
|---|---:|---|
| reader-facing owner-approved | **27** | yes |
| unreviewed | 29 | no |
| reference or working | 7 | no |

Retrievable files are those carrying reviewed or approved entries and not
matching a working-file pattern (audit, coverage, queue, report, test, fixture,
template, vocab, manifest, index, hooks, draft). The largest retrievable set is
`cc-aspect-pair-reviewed-angles.json` at 140 reviewed entries.

## 3. Retrieval

`packages/astro-knowledge/scripts/phrase-resolver.js`

For a target, matches voice-bank themes on the bodies and houses the target
touches, then selects 5 to 10 lines, capped at 3 per theme so one theme cannot
crowd out the rest. Returned as **AVAILABLE LINES** with this framing in the
prompt:

> These are the owner's own approved lines on subjects this target touches.
> You may use them verbatim or adapt them. They are not register examples and
> not correction pairs: those demonstrate voice and judgment and must not be
> reused. Using none of them is acceptable. Inventing a weaker version of one
> is not.

That last sentence is the point. The failure mode this closes is a model
paraphrasing a line the owner already wrote better.

## 4. The block rule

If a target matches a voice-bank theme and no phrases resolve, the run stops
before any provider call:

```
PHRASE_EVIDENCE_MISSING: <id> matches voice-bank themes [...] but no owner
lines resolved. No provider call is allowed.
```

Silence there would mean the writer was denied the owner's own material on a
subject she has already written about.

**Wave-1 check, all 60 targets:** 0 would block, 0 return zero lines, every
target receives the full 10.

## 5. Venus in Libra retro-check

`placement-sign/venus/libra`, 7th-house context. **8 themes matched, 10 lines
available, not blocked.** Every one of these was in the repo and none reached
the writer:

**Empathy & emotional labor** — matched via Venus and the 7th
> You might be feeling tired of being the one who always holds it together. The friend, the organizer, the one who shows up.
> You've carried so much on your own for so long you may not notice when you're pushing past your limits. There's a difference between resilience and never letting yourself rest.
> You're allowed to put the weight down, even if no one else is ready to pick it up.

**Relationships & compromise** — matched via Venus and the 7th
> The right person will still piss you off. The difference is you're willing to work through it because the life you're building is worth more than the argument you're having.
> Every couple fights. The ones who last are the ones who know what they're fighting for.

**Authenticity & self-expression** — matched via Venus
> Stop dimming your fire to make someone else's candle look brighter.
> They'll love the version of you that's easiest to swallow. Serve 'em the full plate anyway.
> Stop folding yourself into origami just so people can fit you in their pocket.

**Self-worth & personal power** — matched via Venus
> You don't have to burn yourself to prove you're fire.
> Sometimes the best thing you can do is put it all down and walk away for the night.

Ten lines on exactly the subject, in the owner's voice, already approved,
sitting unused while the writer was asked to produce Venus-in-Libra copy from
doctrine alone.

---

## Files

- `scripts/build-phrase-index.mjs` — indexer, deterministic, `--check`
- `packages/astro-knowledge/generated/phrase-index.json` — the index
- `packages/astro-knowledge/scripts/phrase-resolver.js` — retrieval, block rule,
  prompt rendering

## 6. Phrasebank components — object-matched, not theme-matched

The 27 retrievable files needed a different rule from the voice bank, because
their entries are a different kind of thing.

| | Voice bank | Phrasebank |
|---|---|---|
| Unit | free-standing one-liner | a set of card components |
| Written for | a theme | one specific astrological object |
| Retrieved by | **theme match** on bodies and houses | **object match** on canonical id |
| Offered as | AVAILABLE LINES | AVAILABLE COMPONENTS |

**Indexed: 1,307 component sets, 3,425 components, 1,231 sets mapped to a
canonical id.** 99 sets are hand-voiced and rank first in selection.

| Object kind | Sets |
|---|---:|
| transit-aspect | 495 |
| placement-sign | 357 |
| placement-house | 144 |
| composite-placement | 120 |
| synastry-aspect | 99 |
| natal-aspect | 16 |
| unmapped | 76 |

Two entry shapes carry material and both are now read: a `slots` object, and
named prose fields directly on the entry (`natal_sign_story`, `home_scene`,
`house_domain`, `collective_shift`, and similar). Missing the second shape had
hidden 368 sets, including every planet-in-sign entry.

Components are tagged by role — scene, consequence, adjustment, domain,
natal-story, collective-reading, bridge — so the writer can see which part of
a card each piece is.

A same-pair natal set attached to a transit target is offered under the same
rule as the evidence resolver: `MECHANISM REFERENCE ONLY`, framing not
borrowable.

**Wave-1:** 40 of 60 targets have an exact component set, 190 components in
total, none block.

**Venus in Libra now returns both**: 10 available lines plus its own component
set.

> natal-story: You love beauty, balance, and partnership itself; harmony is the point.
> collective-reading: We want fairness and grace in connection, and ugliness grates on us.

## Open

1. **Approve surface-specific retrieval policies.** Friends transit is wired.
   Other surfaces remain phrase-disabled rather than inheriting Friends or
   long-form cadence implicitly.
2. **1,196 of 3,425 components have role `other`** — they carry material but
   their field name is not yet mapped to a card role. Worth a pass so the
   writer knows what each piece is for.
3. **76 sets remain unmapped**: composite planets, moon phases, retrogrades,
   ingresses, synastry house overlays, asteroid cores. These are object kinds
   the canonical scheme does not yet name.
4. **Thin themes** — Health, Channeling creativity, Relationships &
   compromise, Career & business boundaries each have 1 to 2 lines.
5. **29 unreviewed phrasebank files** are excluded on the same evidence the
   status audit produced. They may contain owner material that was never
   labelled.
