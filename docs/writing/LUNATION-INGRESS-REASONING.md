# Lunation and ingress reasoning

Status: agent-prepared from owner direction in chat, 2026-09-27
(https://claude.ai/code/session_01LW6LRGcWkgXumG2o28WYU7). Unsigned until the
owner approves it. It governs how a lunation or ingress article is argued. It
does not approve any reader wording, and it does not change any serving row.

Voice, register, and the do-not-use list still come from
`tldr-astro-phrasebank/TLDR-WRITING-AUTHORITY-INDEX.md`. This document decides
what the article says and in what order. The owner's writing decides how it is
said.

## Owner exemplar

Supplied by the owner in chat on 2026-09-27 as the model for Full Moon and
ingress write-ups (Aries Full Moon, September 26, 2026). Owner-authored, quoted
exactly:

> Today's Full Moon is holding her own between Saturn and Neptune in the same part of the sky where Saturn and Neptune joined last February to begin a dramatic dissolution, death, and restructuring of reality as we have known it. This Full Moon is a big check-in point asking if we are taking the necessary time to commit to our soul call, inner work, shadow projections, integrity, and dreams. Or are we just on a wild ride, seemingly of someone else's making that we don't know how to get off?  Under this Full Moon, on Saturn's Day, Black Moon Lilith just entered Capricorn, Saturn's sign, so we are all being asked to devote ourselves to understanding how the Death archetype is in fact, our greatest teacher for understanding that all we have is this very moment to live our Selves to the fullest!

How the exemplar is built:

| Beat | In the exemplar |
| --- | --- |
| Sky anchor | The Moon between Saturn and Neptune. |
| Cycle anchor | The same part of the sky where Saturn and Neptune joined last February, and what that began. |
| The question | A check-in with two paths: committing to the work, or a wild ride of someone else's making. |
| Governing planet | Saturn. Saturn's Day, then Lilith entering Saturn's sign. The ingress is read through the ruler of the sign it enters. |
| Archetypal close | Saturn as the Death archetype, turned into a call to live this moment. |

## The reasoning chain

These beats are hidden logic, not a paragraph template. Two beats may share a
paragraph, and a short piece may compress them. This order governs the
argument; the Event Page Architecture in
`packages/astro-knowledge/data/frameworks/lunar-event-content-architecture.json`
lists what the page must contain.

1. **Sky anchor.** Open with where the Moon physically is: its degree and the
   bodies in the lunation. When the Moon sits between two bodies, say which two.
2. **Cycle anchor.** Tie the event to the conjunction that began the story in
   this part of the sky: the pair, the month and year, the degree, and what it
   began. When the seed planets are retrograde, they are going back over that
   same ground. With no seed, anchor to the lunation's own cycle: the same-sign
   New Moon six months earlier for a Full Moon, the eclipse series for an
   eclipse.
3. **The question.** A New Moon asks what begins. A Full Moon is a check-in on
   what the seed started: is the reader doing that work on purpose, or being
   carried along by it? An eclipse redirects and asks the reader to notice, not
   force. Pose the question once.
4. **Governing planet.** One traditional planet governs the article. Route every
   other detail back to it: the day ruler, the receptions, the dignities, and
   any ingress in the window. An ingress in the window is never a separate
   item. Read it through the ruler of the sign it enters, and say how that
   ruler is doing.
5. **Condition layer.** Go deeper through the lights and their rulers: the
   Sun's and Moon's dignity, an exaltation-fall swap on the axis, each light's
   ruler with its sign, dignity, motion, and whole-sign relation to the light,
   mutual receptions, and dispositor loops. Use a fact only when it changes
   what the article says about the question.
6. **Archetypal close.** Name the governing planet's archetype and turn it into
   an embodied call for this moment. Default significations: Saturn is time,
   endings, and the teacher; Mars is courage and what we fight for; Venus is
   value and relationship; Jupiter is meaning and faith; Mercury is the mind
   and the message; the Sun is purpose and visibility; the Moon is the body,
   need, and memory. The owner's own framing of a planet overrides these.

Traditional rulerships only. Uranus, Neptune, Pluto, Chiron, Lilith, and the
nodes can sit in a lunation or seed a story, but they never rule a sign or
govern the article.

## Ingress logic

An ingress is read through the ruler of the sign being entered and that
ruler's current condition.

1. Name the ingress: planet, sign, date and time, motion, and the sign it is
   leaving.
2. Say where the new sign's ruler is, its dignity and motion, and whether it
   sees the sign by whole-sign aspect or is in aversion to it. A ruler in fall
   or detriment, retrograde, or in aversion changes how the ingress lands. A
   ruler in its own sign or exaltation supports it.
3. Name any mutual reception between the planet and that ruler.
4. Connect the ingress to any lunation or seed conjunction in the same window.
5. Then follow the placement composition modules in
   `docs/content-management/SKY_PLACEMENT_V5.md`.

Lilith: the app calculates True Lilith. Mean Lilith can be in a different sign
on the same day. On September 26, 2026, True Lilith was at 12° Sagittarius and
Mean Lilith at 1° Capricorn; the exemplar's "Lilith just entered Capricorn" is
Mean Lilith. A source that names Mean Lilith's sign must say Mean Lilith.

## How the governing planet is chosen

`lunationReasoningFacts` scores each of the seven traditional planets by the
facts that run through it, one point each:

- rules the Moon's sign, or the Sun's sign;
- rules the day of the event (local weekday, America/New_York by default);
- sits in the lunation (same sign as the Moon, within 10°);
- is exalted on one side of a Full Moon axis and fallen on the other, with both
  swap planets on the axis now;
- belongs to the seed conjunction;
- changes sign within 72 hours, or rules the sign another body is entering;
- is in mutual reception with the Sun or Moon.

The top score is `governingPlanet`. The ranking and every reason are kept so an
editor can see why.

## Calculated facts

`apps/web/src/services/skyEventReasoningFacts.mjs` computes the facts. It
writes no reader prose.

| Beat | Field | Source |
| --- | --- | --- |
| Sky anchor | `skyAnchor.bodiesInLunation`, `skyAnchor.moonBetween` | Positions at the exact lunation |
| Cycle anchor | `cycleAnchor.seedConjunctions` | `SLOW_CONJUNCTIONS`, 1960-2060, every exact pass, Swiss Ephemeris. The latest cycle of a pair qualifies when a pass fell within 10° of the Moon in the Moon's sign, or both planets are still in that sign |
| Governing planet | `governingPlanet`, `governingPlanetRanking` | Scoring above |
| Condition layer | `lights`, `axis`, `receptions` | `planetSignDignity.mjs` (sign-level traditional dignity) |
| Ingresses | `ingressesInWindow[].reading` | Position `transitStart` / `transitEnd` within 72 hours |
| Single ingress | `ingressReasoningFacts().rulerReading` | Same rules, for one ingress |

## Worked example: Aries Full Moon, September 26, 2026

Calculated by the module from Swiss Ephemeris positions at 12:49 EDT
(`scripts/test-sky-event-reasoning-facts.mjs`). Facts only; no reader wording.

- Sky anchor: Moon 3°37' Aries between Neptune (2°59', retrograde) and Saturn
  (11°55', retrograde).
- Cycle anchor: Saturn-Neptune conjunction, February 20, 2026, 0°45' Aries.
  Both planets are still in Aries and both are retrograde.
- Governing planet: Saturn (day ruler, in the lunation, exaltation-fall swap on
  the axis, seed conjunction, mutual reception with the Sun). Next: Mars.
- Condition layer: the Sun in Libra (fall) and Saturn in Aries (fall) are in
  mutual reception by exaltation. The Moon in Aries and Mars at 29° Cancer
  (fall) are in mutual reception by domicile, square by sign. The Sun's ruler
  Venus is in Scorpio (detriment). Both lights' dispositor chains end in the
  Moon-Mars loop.
- Ingress in the window: Mars enters Leo on September 27 at 22:49 EDT, 34 hours
  later. Leo's ruler, the Sun, is in fall in Libra and sees Leo by sextile.

## Where this is wired

- `packages/astro-knowledge/data/frameworks/lunar-event-content-architecture.json`:
  `reasoning-chain` and `ingress-logic` sections.
- `api/_lib/content-generation.ts`: `formatLunationTemplateInstruction` now
  reads the real framework id. Before this change it looked for
  `lunation-content-architecture-framework`, which does not exist, so no
  lunation framework text reached generation. It applies only to rows whose
  facts are `type: "lunation"` or `type: "ingress"`, and it drops the ritual
  framework for eclipses.
- `api/admin/prepopulate-content.ts`: queued lunation rows carry
  `facts.reasoning`, calculated from the sky at the exact lunation. If that sky
  cannot be calculated, `reasoning.status` is `incomplete` and the prompt
  forbids uncalculated claims.
- Tests: `npm run test:sky-event-reasoning`.

## Not covered

- Serving Sky lunation bodies are whole authored articles
  (`sky-lunation/{new-moon|full-moon}/{sign}`) and render verbatim. This logic
  does not rewrite them.
- The deterministic ingress composition (format 5) has a dignity module but no
  ruler-condition module. Adding one needs owner-authored sentences.
- No queue path creates dated ingress article rows yet. `ingressReasoningFacts`
  is ready for one.
- Dignity is sign-level only: no triplicity, bounds, face, sect, or peregrine
  status.
