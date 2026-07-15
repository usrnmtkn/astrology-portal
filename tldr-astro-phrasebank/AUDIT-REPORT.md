# Deep-dive wiring audit — all 31 surfaces

## Render / served-fields deep dive (UI errors)
You reported: duplicate copy across TLDR/Overview/What-it-means, internal instructions leaking to the
page ("Transit-to-natal entries are ordered", "Do not apply same-moment aspect exclusions", "Use the
calculated angle as factual context"), section labels not matching content, terse copy, and a redundant
TLDR pill. Investigation:

- **The leaked instruction strings are NOT in my files** — they're in the old imported data. But my
  files DO carry long **internal** fields (`originalityCheck`, `review_note`, `doctrine_source`,
  `compose_note`) that leak if the app renders long fields literally. Root cause = rendering, not content.
- **My reader-facing content is clean** — 4,118 reader fields scanned: 0 slot leaks, 0 real instruction
  leaks, 0 duplicate sections. Depth is adequate (transit aspects ≈48 words; placements are short
  kernels the app frames).
- **Four files have no clean reader prose** (`cc-natal-angle-reviewed`, `cc-planetary-horoscope`,
  `cc-composite-reviewed`, `cc-synastry-reviewed`) — rendering them as primary leaks placeholders
  (the Ascendant/Midheaven "factual context" bug). Their surfaces must serve from the floor/sibling.

**Deliverables added this pass:**
- `cc-served-fields.json` — the reader-facing field whitelist per surface, the 35-field internal
  blacklist that must never render, the 4 no-prose files, and instruction markers.
- `APP-RENDER-SPEC.md` — exactly how the app should build a detail page (reader fields in order,
  distinct TLDR shown once, footer = astro, owner-aware pronouns, no internal fields), mapping each of
  your 7 errors to the rule that fixes it.
- New build gate `verify_rich_content.py` (contract-driven): fails if any reader field has a slot leak,
  an instruction marker, or duplicate text across a record's sections.

These are the two fixes needed: (a) import my clean rows, (b) have the app follow `APP-RENDER-SPEC.md`.

---


## End-to-end deep dive (latest pass) — 6 checks, 2 new fixes
Ran a full audit across data sources, templates, resolver, fallbacks, and tests. Results:

1. **Structural integrity** — 51 files parse; 0 duplicate content_keys; all tier/status valid;
   serving state consistent; 0 CONFIRMED rows flipped LIVE. ✅
2. **Domain separation** — 0 strong seasonal/sky markers in any natal-served field; 0 natal markers in
   sky fields; house natal vs horoscope fields correctly separated. ✅
3. **Coverage** — planet-in-sign 120/120, planet-in-house 120/120, natal-aspect 214 (astronomically
   complete), composite 882, planet-through-house 132, retrograde 9/9, ingress 9; gaps chain to safe
   fallbacks (0 unsafe). ✅
4. **Template + slot resolution** — 235 slots all classified, 0 orphan slots, 0 nonexistent sources,
   0 unsafe fallbacks. ✅
5. **Render cleanliness** — 31 fallback routes render clean; 9,339 rich prose fields clean. ✅
6. **NEW FIX A — raw-slot fallback templates were LIVE.** 30 legacy `type=fallback` templates
   (weekly/monthly/year-ahead horoscope, cazimi, outer-planet-cycle) carried `{single-brace}` slots
   with no interpolation path and were serving LIVE — they'd leak `{house area}` / `{one concrete
   life example}` to readers. **Demoted to DRAFT**; only the 2 pure-prose collective versions stay
   LIVE. Added a hard gate: no LIVE row may contain a raw slot (mustache templates excepted).
7. **NEW FIX B — relationship surfaces had no LIVE floor.** All synastry/composite content was DRAFT,
   so the Friends tab would blank. **Promoted the clean authored synastry/composite floor to LIVE**
   (146 rows); the richer `cc-composite-typed` (882) stays DRAFT editorial for Marie.

Floor after fixes: **1,803 LIVE / 932 DRAFT**. Suite green (17/17 + 2 render gates).

### For Codex — weekly / monthly / year-ahead horoscope surfaces
Those surfaces' fallback templates use natural-language `{slots}` (`{life area}`, `{one skill}`) that
need the app's own interpolation engine. They are now DRAFT so they cannot serve raw braces. Serve the
`fallback/*-horoscope/collective` pure-prose rows (LIVE) for those surfaces until the interpolation
engine can fill the templated variants; then promote them.

---


## Bottom line
**Yes — every emergency fallback renders clean.** `tests/verify_fallback_render.py` pulls the actual
served text for all 31 routes across representative scopes and checks for empty output, unresolved
`{{slots}}`, and duplicate sentences: **31 routes, 0 failures.** 27 serve real Marie prose; 4 are
app-composed utility surfaces (circle-feed, settings, chart-contradiction, free-will-disclaimer) that
correctly serve nothing from the phrasebank rather than a random quote. This check is now a build gate,
so a leaking or empty fallback fails the build.


Method: for every route I pulled the **actual text** its source would serve and read it for domain
correctness (natal vs sky vs transit vs relationship), coverage, and voice. Below is every surface,
what it now serves, and the verdict. Bugs found are fixed in this bundle.

## Bugs found and fixed in this pass
1. **Natal placement showed seasonal/sky copy** (you reported it). `you.natal-placement` was wired to
   `vocab/planet-in-sign` ("Aquarius Season begins with a bang") and `you.natal-house-placement` to
   `transit/planet-through-house`. Fixed → `cc-planet-in-sign-reviewed:natal_sign_story` +
   `cc-planet-in-house-reviewed:house_integration` (true natal fields).
2. **Natal aspects used generic second-person copy.** `you.natal-aspect` / `natal/hard-aspect` were on
   `aspect-pair` ("Pursue it plainly…"). Fixed → `cc-natal-aspect:experience` (third-person natal:
   "Your sense of direction and your emotional needs are closely joined…").
3. **`friends.relationship-timing` served nothing** — pointed at a non-resolving `transit/*` wildcard.
   Fixed → `aspect-pair/aspect-pair` (concrete, resolves).
4. **`friends.circle-feed` / `settings.life-area-focus` served a random quote** ("Mercury retrograde is
   not to be feared"). Fixed → `static` (app-composed utility surfaces; must NOT pull a guide-phrase).

## Full surface verdict (after fixes)
| Surface | Serves | Domain | Verdict |
|---|---|---|---|
| sky.seasonal-current | planet-in-sign `collective_shift` | sky | ✅ |
| sky.planetary-placement | planet-in-sign `collective_shift` | sky | ✅ |
| sky.lunar-cycle / lunar-calendar/day | planet-in-sign `collective_shift` (Moon) | sky | ✅ |
| sky.ingress | `transit/ingress` whole | sky-event | ✅ |
| sky.retrograde / sky.station | `transit/retrograde` whole | sky-event | ✅ |
| sky.retrograde-section | `transit/retrograde` (single planet) | sky-event | ⚠️ multi-planet summary is app-composed; single-planet fallback only |
| sky.aspect-detail / aspect-sign-context | `aspect-pair` | aspect | ✅ (aspect meaning is universal) |
| lunar-calendar/arc-new/full-moon | moon-phase bank (2A/2E) | sky | ✅ reads well |
| you.natal-placement | `natal_sign_story` + `house_integration` | natal | ✅ FIXED |
| you.natal-house-placement | `house_integration` | natal | ✅ FIXED |
| you.natal-aspect | `cc-natal-aspect:experience` | natal | ✅ FIXED |
| you.natal-angle-placement | template 5L–5O | natal | ⚠️ template (no bespoke angle piece); coherent |
| you.transit-through-house | `transit/planet-through-house` whole | transit | ✅ |
| you.transit-to-natal / you.daily-timing | `aspect-pair` | transit-aspect | ✅ |
| you.transit-to-angle | template 4D | transit | ⚠️ template; coherent |
| natal/hard-aspect | `cc-natal-aspect:experience` | natal | ✅ FIXED |
| natal/chart-contradiction | template 5K | natal | ⚠️ template; low-traffic |
| natal/free-will-disclaimer | static disclaimer | — | ✅ |
| friends.synastry-contact | `synastry-core` + `synastry-context` | relationship | ✅ |
| friends.same-planet | `synastry/chart-comparison` | relationship | ✅ |
| friends.house-overlay | `synastry-overlay` + `synastry-house-overlay` | relationship | ✅ |
| friends.composite-aspect / composite-placement | `synastry/composite` | relationship | ✅ |
| friends.relationship-timing | `aspect-pair` | relationship-timing | ✅ FIXED |
| friends.circle-feed | static (app-composed) | utility | ✅ FIXED (no random quote) |
| settings.life-area-focus | static (app-composed) | utility | ✅ FIXED (no random quote) |

## Coverage of the primary rich sources (how often the floor even fires)
- `cc-planet-in-sign-reviewed` 120 (10×12 full), `cc-planet-in-house-reviewed` 120 (full),
  `cc-natal-aspect` 214, `cc-transit-house` 84, `transit/retrograde` 9 (all retro bodies),
  `transit/ingress` 9, `aspect-pair` 84, `cc-composite-typed` 882, synastry ~250. The high-traffic
  reading surfaces are well covered; gaps fall to template, then guide-phrase, never blank.

## Remaining ⚠️ (not bugs — documented limits)
- **Angle placements, transit-to-angle, chart-contradiction**: no bespoke Marie piece exists, so they
  use mustache templates. Coherent but plainer than the whole-piece surfaces.
- **sky.retrograde-section** ("N planets retrograde" roundup): Marie never wrote a multi-retrograde
  summary; the app composes it. Offered to author one bespoke row if you want it phrasebank-backed.
- **Template-only surfaces** can read plainer than whole-piece ones; that's inherent where no bespoke
  prose exists. Every one is domain-correct — none mix natal/sky/transit.

## Guardrails now enforced by the build
The build FAILS on: missing field / illegal surface or block_type / duplicate key / wrong serving
state / unmapped slot / slot source not in library / bridge template or **record_file:field** target
that doesn't exist. So a natal→sky mis-wire like the one you caught cannot ship silently again.
