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
