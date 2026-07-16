# App detail-page render spec (fixes the 7 UI errors)

## The fallback IS the product — it must read beautifully
Most combinations are never hand-written, so the "fallback" is what readers actually see. It must be a
full, beautiful reading, never a thin mad-lib. Every surface is covered by beautiful authored content
when the sources are chained correctly — the mustache mad-lib templates (5K, 5R, 4A, …) are a true
last resort that should effectively never render:

| Surface | Beautiful source chain (serve verbatim, in order) | Coverage |
|---|---|---|
| Natal placement | `cc-planet-in-sign-reviewed.natal_sign_story` + `cc-planet-in-house-reviewed.house_integration` (two kernels compose every planet-sign-house) | 120+120 → all 1,440 |
| Natal aspect | `cc-natal-aspect.experience` (+ `guidance`, `note`) | 214 → all pairs×aspects |
| Transit / sky aspect | `cc-aspect-pair-reviewed.expanded_narrative` → then `cc-natal-aspect.experience` | 83 ∪ 214 = **227 (full)** |
| Composite | `cc-composite-typed` (meaning/experience/advice) + `cc-composite-aspect` | 882 + 225 |
| Natal angle | `cc-natal-angles-authored.reading` (Asc/MC/Dsc/IC x 12) | 48 → all angle-signs |
| Sky placement / season | `cc-planet-in-sign-reviewed.collective_shift` | 120 |
| Planetary horoscope | `cc-planet-in-house-reviewed.home_scene` | 120 |
| Transit through house | `transit/planet-through-house` | 132 |
| Retrograde / ingress / station | `transit/retrograde`, `transit/ingress` (per planet) | 9 each |
| Moon phase | moon-phase bank | 8 |
| Synastry / house-overlay / same-planet | authored synastry (`synastry-core/context/overlay/chart-comparison`) | full |

| Sky point placement (Chiron/Lilith/N-Node/S-Node) | `cc-sky-points-authored.collective_reading` | 4 × 12 = 48 |

**Every detail surface is covered by beautiful authored content — none relies on the mad-lib
template.** Two app-wide-audit gaps are now authored: natal angles (48) and sky-point placements (48).

### Two app-side fixes to pair with this content
1. **Transit-to-angle cards read identically** (Pluto trine Asc = Uranus trine Asc = Pluto sextile Dsc):
   the Friends path uses a hardcoded `friendTransitEmergencySummary()` angle shortcut that ignores the
   transit planet. Point it at the aspect content chain (`cc-aspect-pair-reviewed.expanded_narrative`
   → `cc-natal-aspect.experience` for the pair+aspect) so each transit reads distinctly.
2. **Moon sky placement shows "still being prepared"** even though content exists
   (`moon-in-cancer.collective_shift` = "We get tender and protective…"). The sky Moon card isn't wired
   to `collective_shift` — wire it like the other planet sky placements. (Chiron/Lilith/Nodes now have
   `cc-sky-points-authored`.)

Because `cc-natal-aspect` covers 144 pair×aspect combos that transit `aspect-pair` lacks, chaining the
two gives full aspect coverage with beautiful copy — so a transit like "Saturn square Venus" always
gets a real reading, never the template. Placements compose two authored kernels, so they're always full.

**Rule:** for aspects, if `expanded_narrative` is missing for the pair, fall to
`cc-natal-aspect.experience` for that same pair+aspect. Do NOT fall to a mad-lib template.



The bugs on the placement/aspect detail pages come from the app rendering row fields too literally:
it repeats one field across TLDR / Overview / What-it-means, and it renders **internal** fields
(`originalityCheck`, `review_note`, `doctrine_source`, `compose_note`, ordering/instruction notes) as
body sections. Content is fine; rendering must follow the served-fields contract
(`cc-served-fields.json`).

## Golden rule
Render **only** the reader-facing fields named in `cc-served-fields.json` for that surface, in order.
**Never** render any field in `internal_blacklist`. Never render the same text twice.

## Staged CONFIRMED book source — not app-renderable yet
`sources/book-as-above-extract.json` is a staged CONFIRMED reference source mined from Marie Satori's
*As Above, So Below* (2023). It is verbatim book text, tier `CONFIRMED`, status `DRAFT`, and is **not**
yet wired into served surfaces. Do not import this raw source into the app and do not hand-render it
directly.

Coverage in the staged source:
- `planet_in_sign` — 10 planets x 12 signs, with Pluto in Virgo pending.
- `house_meanings` — 12/12.
- `empty_houses` — 12/12 keywords.
- `sign_archetypes` — 12/12.
- `planet_archetypes` — 7/10, with Sun/Moon/Venus pending.

Do not duplicate or overwrite the already-authored served surfaces:
- `cc-planet-in-house-reviewed` — 120 rows, `house_integration` / `home_scene`.
- `cc-transit-house` — transits through natal houses.
- `cc-planet-in-sign-reviewed` — natal placement by sign. The book's `planet_in_sign` is a verbatim
  cross-check/enrichment source, not a replacement.

The serving path is: content-library builder folds the book material into served phrasebank files and
adds `cc-served-fields.json` contract entries; the app renders only those served fields. Once served
files land, wire these overview surfaces:
- Sign detail / overview page → served `sign_archetypes`.
- Planet detail / overview page → served `planet_archetypes`.
- House detail / reference page → served `house_meanings`.
- Empty-house surface → served `empty_houses`, checked against existing `build_empty_house.py` output
  so the reading does not double up.

Known gaps not in the book: two-planet aspects, transit-to-natal aspects, ingresses, and
full/new-moon-by-sign. Keep current authored/fallback content for those.

## Serve the reader field VERBATIM — do not re-compose it
The reader fields are already finished, Marie-voiced sentences. Print them as-is. **Do NOT**
re-generate the section from planet-topic + sign vocab with a scaffold like
"{planet} in {sign} brings {topic} through {sign} conditions. This is one of the chart's core ways of …"
That scaffold introduces the banned seam **"brings"** and generic filler tails that repeat on every
placement ("where the next useful choice needs to be specific", "keeps developing through …"). None of
that is in the phrasebank — it is app-generated and should be removed.

Example — Venus in Capricorn in the 8th house:
- ❌ app-composed now: "Your Venus in Capricorn brings love, pleasure, taste, and values through
  disciplined, ambitious, long-game conditions. This is one of the chart's core ways of choosing,
  reacting, and responding."
- ✅ serve verbatim: sign section = `natal_sign_story` → "You love with commitment and staying power;
  you invest where it can last." house section = `house_integration` → "you love deeply and all-in,
  where trust and intimacy are shared."

Light framing is fine (a heading like "Venus in Capricorn", or a lead-in "Venus in Capricorn:"), but
the sentence itself must be the authored field, unedited. If a light connective is wanted, use a clean
verb ("shows up as", "plays out as") — never "brings … through … conditions".

Example 2 — Sky placement, Mars in Gemini (same bug class):
- ❌ app-composed now: "Mars is in Gemini, coloring the current sky with curious, restless, talkative
  conditions. drive, assertion, and the will to act becomes easier to notice in this sign's pace and
  priorities." (grammar breaks at "conditions. drive…"; this whole string is NOT in the phrasebank.)
- ✅ serve verbatim: `cc-planet-in-sign-reviewed.collective_shift` → "Our action scatters into talk and
  errands, and we're all busy and a little scattered."

**Forbidden app templates (remove these composers entirely) — same bug on three surfaces:**
- natal placement: `"{planet} in {sign} brings {topic} through {sign} conditions. This is one of the chart's core ways of …"`
- sky placement: `"{planet} is in {sign}, coloring the current sky with {adjectives} conditions. {topic} becomes easier to notice in this sign's pace and priorities."`
- natal angle: `"Your {angle} is in {sign}, so this angle meets life through {adjectives} conditions. It shapes how … becomes visible in the chart."` (also breaks subject-verb agreement)
All three concatenate vocab fragments and break grammar, and none of these strings exist in the
phrasebank — they are app-generated. Delete the composer and serve the authored field verbatim:
`natal_sign_story` / `house_integration` (placement), `collective_shift` (sky), `home_scene`
(horoscope), `reading` (angle). Every one of these is a finished, grammatical sentence.

## Detail page structure
```
EYEBROW        surface label + glyphs   (from route/computed chart, not a data field)
TITLE          "Venus in Capricorn in the 8th house"  (composed from computed chart)
TLDR pill      a SHORT summary — first sentence of the primary reader field, shown ONCE.
               If you cannot make a distinct short summary, DROP the pill. Never show the pill
               and then repeat the identical sentence in the body.
BODY           the reader fields, in contract order, each as its own labeled section.
               Show a section ONLY if its field is present and non-empty.
FOOTER         the `astro` field verbatim ("The astro: …"), if present. Footer only — never a body section.
```

## Reader fields + section labels per surface (from the contract)
| Surface | Reader fields (in order) → section label |
|---|---|
| Natal aspect (`cc-natal-aspect`) | `experience` → "How it works"; `guidance` → "What to do"; `note` → "Note" (only if present); footer `astro` |
| Transit-to-natal / sky aspect (`cc-aspect-pair-reviewed`) | `expanded_narrative` → body (one section, no label needed); optional `pull_quote.text` as a quote; `marie_advice.text` → "Marie's take" |
| Natal placement — sign (`cc-planet-in-sign-reviewed`) | `natal_sign_story` (NEVER `collective_shift`) |
| Natal placement — house (`cc-planet-in-house-reviewed`) | `house_integration` (NEVER `home_scene`) |
| Sky placement / season | `collective_shift` (NEVER `natal_sign_story`) |
| Planetary horoscope | `home_scene` (NEVER `house_integration`) |
| Composite (`cc-composite-typed`) | `meaning` → "What it is"; `experience` → "How it feels"; `advice` → "What helps"; footer `astro` |
| Composite aspect (`cc-composite-aspect`) | `experience`, `guidance`, `note` (as natal aspect) |

Do not use fixed generic labels (Overview / What it means / How it shows up) that force the same text
into three slots. Use the labels above, and render only sections that have real content.

## Compatibility cards — compare/contrast (replaces the app-generated template)
The Friends → Compatibility planet cards must **compare and contrast**, not stack two placement
descriptions. Delete the app composers flagged in the compatibility error report
(`signExpression` "…moves through your {planet} topics with a {element}-led {modality} rhythm",
`planet.toLowerCase()+" topics"`, `planetFunction` `.split(", ").slice(0,3)`, and the generic
same-sign "recognition / blind spot" sentence). Serve authored content from
`cc-compatibility-cards.json` instead:

```
cards[planet][you_sign][their_sign] = { function, nouns, shared, different, watch, try, relationship }
```

Render each planet card as four labeled lanes, in order — **Shared · Different · Watch · Try** — each
one line, plus the `function` line as the lead and `nouns` in place of "{planet} topics". Example
(Moon · You: Scorpio · Them: Cancer):
- **Shared** — Both water Moons read emotional tone quickly.
- **Different** — Scorpio protects deep, private feelings and skips shallow reassurance; Cancer seeks familiar safety in home and chosen people.
- **Watch** — One person may go quiet while the other reaches for reassurance.
- **Try** — Name whether you need space or comfort before reacting.

The exact same-planet aspect (e.g. "your Moon trine their Moon · orb 2°") still renders as a receipt
chip; name the aspect first, don't hide it behind soft verbs ("supports/opens/faces"). Content is
built by `tests/build_compatibility_cards.py` from `sources/compatibility-compare-contrast.json`;
tier voiced-original-grounded, DRAFT pending editorial sign-off.

### Long-form "Go Deeper" write-up (Co-Star style)
For the expanded per-planet view, serve `phrasebank/cc-compatibility-writeups.json` (same lookup shape:
`cards[planet][you_sign][their_sign]`, planet/sign keys lowercase). It renders as flowing prose, in order:
```
cards[planet][you][them] = { glyph, match, function, your_line, their_line, synthesis,
                             relationship, same_sign, house_hint, same_house_line }
```
- `match` — a short verdict label shown near the planet heading (Mirrored / Naturally in sync / Easy chemistry / Opposites that complete / Needs translation / Mixed signals).
- `function` → lead sentence; `your_line` → "Your {Planet} is in {Sign}, meaning …" (Marie's **verbatim** book description); `their_line` → "Their {Planet} is in {Sign}, meaning …" (same description, pronoun-shifted); `synthesis` → closing dynamic + adjustment.
Serve all four verbatim as-is — do NOT re-compose. Use the summary card (Shared/Different/Watch/Try) as
the default view and this write-up as the "Go Deeper+" expansion. Descriptions are Marie's reviewed
article voice (`natal_sign_story`), `their_line` pronoun-shifted, `synthesis`/`match` voiced-original;
all DRAFT pending sign-off. Built by `tests/build_compatibility_writeups.py`.

**Card structure follows Co-Star:** three moves — planet definition (`function`), the placements, then a
blunt one-line **`verdict`** as the closer (Co-Star's evaluative judgment, e.g. "Your ways of loving are
very compatible" / "You don't really understand how each other thinks, and you may frequently argue").
The `verdict` is keyed to the pair's element relationship and is the last line on every card.

- **Different-sign:** `function` → `your_line` → `their_line` → `verdict`.
- **Same-sign** (`same_sign: true`): `function` → `your_line` ("You both have Sun in Aquarius, meaning …",
  `their_line` empty) → `same_sign_line` (the shared-sign dynamic) → `verdict`.
  Do NOT render `same_sign_quote` (it is always `null` now — no standalone attributed quote block).

`synthesis` is legacy (advisory watch+try) and is superseded by `verdict`; do not render it.

**Do NOT name or branch on houses.** Compatibility runs on signs only (houses need birth times that
aren't always available), so there is no house differentiation and no "both live in the Nth house"
copy. Ignore any house data even when present.

## EXACT DYNAMICS (synastry contact lanes: What flows / Challenges / Mixed)

Below the planet-comparison cards, the Compatibility view lists the two charts' actual inter-aspects,
grouped into **What flows** (trine/sextile), **Challenges** (square/opposition), and **Mixed or
charged** (conjunction). Every row must render a body — `scene. dynamic. navigation.` — not just a
title + orb.

**Root cause of the blank rows (fix required):** the app resolves each contact's body from the
relationship knowledge bundle (`packages/astro-knowledge` → `synastryAspects`). Those records only
carry an abstract DRAFT `plainTranslation` ("A's growth meets B's growth") with empty `summaryShort`/
`summaryDeep`, and no angle/outer coverage — so `synastryContactSummary` returns empty for every
**cross-planet** contact. Only **same-planet** contacts render, because they use the hardcoded
`samePlanetSynastryFallback` code path, not content. That is exactly why the PDF shows a body on
Moon△Moon but blanks on Asc□Neptune, Saturn□Asc, Mars□Moon, and Mars☌MC.

**Content is ready:** `phrasebank/cc-synastry-web-bundle.json` (built by `tests/build_synastry_web_bundle.py`
from the complete `cc-synastry-reviewed`) contains Marie-voiced `summaryShort` + `summaryDeep` for
**every** contact among the 12 points the app aspects (5 personal + 5 social/outer + Asc/MC), all 5
aspects — 720 records, in the bundle's own record shape (`id: "A-<their>_B-<your>_<aspect>"`).

**Codex tasks:**
1. Merge `cc-synastry-web-bundle.json` `synastryAspects` into the `@tldr/astro-knowledge` relationship
   bundle by `id`, filling `summaryShort`/`summaryDeep` (keep existing `plainTranslation`/`policy`).
2. Render the body on **every** row in all three lanes — `summaryShort` as the row summary,
   `summaryDeep` (scene. dynamic. navigation.) on expand — not only the featured contact.
3. Bespoke pairs are richer; the rest compose from Marie's contribute/receive banks. All **DRAFT**
   pending editorial sign-off (not prod-LIVE until Marie signs off).
4. Directionality is `their → your` (planetA = their, planetB = your); the registry already aliases
   the reverse, so one record per contact is enough.

## Pull-quote de-duplication (transit feed)
`pull_quote.text` is an OPTIONAL verbatim-Marie closer (tier CONFIRMED). Transit pull-quotes in
`TRANSIT-PULLQUOTE-REVIEW.md` are editorially signed off as of July 15, 2026 and may serve verbatim.
On a given day a chart can activate several transit-to-natal cards at once, and a Marie line may be
attached to more than one aspect pair. **A reader must never see the same pull_quote twice in one
day/feed.** Rule: when assembling the day's transit cards, keep the `pull_quote` only on the single
tightest-orb card that carries a given line, and drop the `pull_quote` from every other card that
would show the same text. If two cards have the same orb, keep it on the earlier card in the feed's
existing deterministic sort order. The card body (`expanded_narrative`) still renders — only the
duplicate closer is suppressed. This is a hard guarantee independent of how the quotes are attached;
the content build also caps each line to ≤2 transit pairs so this rule rarely has to fire (see
`tests/test_pullquote_collisions.py`, which simulates typical days and gates the raw collision rate).

## The 7 errors → the rule that fixes each
1. **Duplicate copy across TLDR/Overview/What-it-means** → TLDR pill is a distinct short summary shown
   once (or dropped); body sections are the distinct reader fields. Never reuse one field in two slots.
2. **"Transit-to-natal entries are ordered…" leaked** → that is an internal ordering note; it is in
   `internal_blacklist`. Never render it.
3. **"Do not apply same-moment aspect exclusions…" leaked** → internal instruction; blacklisted. Never render.
4. **Section labels don't match content** → labels come from the contract's field→label map; a section
   renders only if its field exists. No empty/duplicated sections.
5. **Copy too terse** → serve the full reader field (`expanded_narrative` ≈ 48 words for transit
   aspects; `experience`/`guidance` for natal). The terse clause was old data; the new rows are full readings.
6. **"your Venus" pronoun** → owner-aware: use "your" on the **You** tab (self); use the person's name /
   "their" in **Friends** / profile contexts. Drive pronoun from the route owner, not the copy.
7. **Redundant TLDR pill** → see rule 1: pill = short distinct summary once, or drop it.

## No-prose files — serve from the floor, not these rows
`cc-natal-angle-reviewed`, `cc-planetary-horoscope`, `cc-composite-reviewed`, `cc-synastry-reviewed`
are unsigned slot/template rows with **no clean reader prose**. Rendering them leaks placeholders like
"Use the calculated angle as factual context when no reviewed angle interpretation is available"
(the Ascendant/Midheaven bug). For those surfaces:
- **Angles** → serve the floor (sign character via `lived-behaviors`), not the angle row.
- **Planetary horoscope** → serve `cc-planet-in-house-reviewed.home_scene`.
- **Composite placement** → serve `cc-composite-typed`.
- **Synastry** → serve the authored-content synastry floor.
Treat a row whose reader fields are all empty as "no content" and fall through to the floor.

## Internal blacklist (never render — full list in `cc-served-fields.json`)
`id, kind, pair, aspect, valence, status, surface(s), sign, house, angle, body, their_body, your_body,
title, astro(footer-only), template_family, recommended_short_template, recommended_long_template,
slots, source_keys, originalityCheck, tone_version, revoice_version, doctrine_source, review_note,
compose_note, trace, fields, eyebrow, requires_birth_time, house_domain, …`
