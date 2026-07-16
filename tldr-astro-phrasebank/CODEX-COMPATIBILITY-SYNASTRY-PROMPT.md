# Codex — wire up Friends → Compatibility (planet cards) + EXACT DYNAMICS (synastry)

The content library owns two compatibility surfaces. Both are fully authored in Marie's voice and
built by the phrasebank. Replace all app-generated compatibility copy with lookups into these files.
The canonical contract lives in `tldr-astro-phrasebank/APP-RENDER-SPEC.md` (sections "Compatibility"
and "EXACT DYNAMICS"); this prompt is the complete handoff.

Everything below is **DRAFT** pending Marie's editorial sign-off — fine in local/dev, not prod-LIVE
until signed off. Serve every field **verbatim** — no runtime re-compose.

---

## 1. Build the phrasebank

Run `tldr-astro-phrasebank/tests/build_all.sh` with:

```
MS_PATH=/Users/mprez/Code/tldrastro/apps/web/src/content/templateHandoffV2/sources/marie-source-phrases.json
SRC_DIR=/Users/mprez/Code/tldrastro/tldr-astro-phrasebank/sources
VALIDATE_SRC_DIR=/Users/mprez/Code/tldrastro/apps/web/src/content/templateHandoffV2/sources
MADLIBS=/Users/mprez/Code/tldrastro/tldr-astro-phrasebank/sources/TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md
```

Confirm **17/17 checks passed**. Three files are consumed:

- `phrasebank/cc-compatibility-writeups.json` — planet-comparison **long-form cards** (default view)
- `phrasebank/cc-compatibility-cards.json` — planet-comparison **scannable summary** (the "+ Summary" toggle)
- `phrasebank/cc-synastry-web-bundle.json` — **EXACT DYNAMICS** synastry contact bodies

All keys are **lowercase**. Lowercase the app's `"Mercury"`/`"Pisces"` before lookup.

---

## 2. Delete the app-generated compatibility copy

In `apps/web/src/App.tsx` (~9417–9588) remove these composers entirely — all card text now comes from
the JSON, nothing is generated app-side:
`signExpression` ("…moves through your {planet} topics with a {element}-led {modality} rhythm"),
`planet.toLowerCase()+" topics"`, `planetFunction` `.split(", ").slice(0,3)`, the generic same-sign
"recognition / blind spot" line, and `compatibilityPractice`.

---

## 3. PLANET COMPARISONS — long-form card (`cc-compatibility-writeups.json`, default view)

```ts
cards[planet][you][them] = {
  glyph, match, function, your_line, their_line,
  same_sign,          // boolean
  same_sign_line,     // string (only when same_sign)
  same_sign_quote,    // always null — do NOT render
  verdict,            // closing one-line judgment
  relationship        // same_sign|same_element|opposition|complementary|friction|mixed
}
```

`planet` ∈ {sun, moon, mercury, venus, mars, jupiter, saturn}.

**Header:** planet `glyph` + name, `match` as the short label under the name, `YOU: <sign>` /
`<friend>: <sign>`. `match` values: **Two of a kind** (same-sign), Naturally in sync, Easy chemistry,
Opposites that complete, Takes work, Mixed signals.

**Three-move render (Co-Star structure):**

- **Different-sign:** `function` → `your_line` → `their_line` → `verdict`.
- **Same-sign** (`same_sign === true`): `function` → `your_line` ("You both have Sun in Aquarius,
  meaning …", `their_line` is empty — do NOT print two identical paragraphs) → `same_sign_line` →
  `verdict`.

`your_line` / `their_line` already contain the gift **and** shadow ("…though you can act before you
think"). Print as-is.

**Do NOT:**
- Render `same_sign_quote` (always `null` — no standalone attributed quote block).
- Render `synthesis` if present (legacy, superseded by `verdict`).
- Name or branch on **houses**. Compatibility is sign-only (birth times aren't guaranteed). Ignore
  house data even when available.
- Reorder or reword any field.

The exact same-planet aspect may still render as a small receipt chip (e.g. "your Moon trine their
Moon · orb 2°"); name the aspect, don't soften it.

---

## 4. PLANET COMPARISONS — summary card (`cc-compatibility-cards.json`, the "+ Summary" toggle)

```ts
cards[planet][you][them] = { function, nouns, shared, different, watch, try, relationship }
```

Render four labeled lanes in order — **Shared · Different · Watch · Try** — one line each, `function`
as the lead, `nouns` wherever "{planet} topics" used to appear. This is the compact alternate view;
the long-form card is the default.

---

## 5. EXACT DYNAMICS — synastry contact lanes (`cc-synastry-web-bundle.json`)

Below the planet cards, the view lists the two charts' actual inter-aspects, grouped into **What
flows** (trine/sextile), **Challenges** (square/opposition), and **Mixed or charged** (conjunction).
Every row must render a body — currently only same-planet contacts do.

**Root cause:** `synastryContactSummary` (App.tsx) resolves each contact's body from the
`@tldr/astro-knowledge` relationship bundle (`packages/astro-knowledge` → `synastryAspects`). Those
records only carry an abstract DRAFT `plainTranslation` ("A's growth meets B's growth") with empty
`summaryShort`/`summaryDeep`, and no angle/outer coverage — so cross-planet contacts return empty.
Same-planet contacts survive only via the hardcoded `samePlanetSynastryFallback` code path.

**Content is ready** — `cc-synastry-web-bundle.json` has **720** Marie-voiced records covering every
contact among the 12 points the app aspects (5 personal + 5 social/outer + Ascendant/Midheaven) at all
5 aspects, in the bundle's own record shape:

```json
{ "id": "A-<their>_B-<your>_<aspect>", "planetA": "...", "planetB": "...", "aspect": "...",
  "summaryShort": "<scene>.", "summaryDeep": "<scene>. <dynamic>. <navigation>.", "status": "DRAFT" }
```

**Tasks:**
1. Merge `cc-synastry-web-bundle.json`'s `synastryAspects` into the relationship knowledge bundle **by
   `id`**, filling `summaryShort` + `summaryDeep` (keep existing `plainTranslation`/`policy`). The
   domain registry already reads `summaryShort` → preview and `summaryDeep` → expanded
   (`domainRegistry.ts` ~line 668) — verify the merged ids resolve; no registry change should be needed.
2. Render the body on **every** row in all three lanes (`compatibilityDynamicsFromContacts` /
   `synastryContactSummary`), not just the featured contact: `summaryShort` as the row summary,
   `summaryDeep` on expand.
3. Directionality is **their → your** (`planetA` = their, `planetB` = your). The registry already
   aliases the reverse, so one record per contact is enough.
4. Confirm these four render: `neptune square ascendant`, `saturn square ascendant`,
   `mars square moon`, `mars conjunction midheaven`.

---

## 6. Provenance / gating (both surfaces)

All content is **DRAFT** pending Marie's sign-off. Planet definitions and the gift half of each
placement are from Marie's book (*As Above, So Below*); the shadow halves are grounded in the book's
per-sign shadow lines; verdicts, same-sign copy, and synastry scene/dynamic/navigation are Marie's
authored/voiced content (bespoke pairs tier `reviewed-voiced`; the rest `template-generated-grounded`,
composed from her contribute/receive banks). **Serve verbatim — never re-voice or re-compose.**
