---

## 9. Phrase bank

Phrases are stored by **function**, not by symbol, so the composer can pull the right *move* for a subject. Function families (from the voice spec's signature moves and the CC banks):

- **opening hooks** — recognizable moment or light imperative. Sources: `cc/sign/{sign}/hook/alt*`, `cc/sign/{sign}/hook-moves`, `cc/fallback-hook/*`.
- **pattern-naming** — "you might be noticing where you've been…". Voice-spec move 2.
- **lived behavior** — the concrete, slightly uncomfortable thing. Sources: `cc/sign/{sign}/lived-behaviors`, `cc/house/{n}/*`.
- **permission / reframe** — "your worth isn't determined by your earning capacity"; "both things are true".
- **somatic observation** — "your shoulders might tense up when someone asks for help".
- **questions** — only when they deepen the same subject ("what if independence doesn't mean doing it all alone?").
- **practical actions** — concrete corrections and scripts. Sources: `cc/sign/{sign}/actions`, `cc/sign/{sign}/action/alt*`, `cc/event-action/*`.
- **transitions** — light, never the mandatory "this transit reveals".
- **timing lines** — "active from {date}", "look back to the New Moon six months ago". Sources: `ms/retro-phase/*`, `cc/key-dates/*`.
- **closings** — release or one small action. Sources: `cc/sign/{sign}/closings`, `/closing/alt*`.

Each phrase record carries: `key, text, function, scope, articleTypes, eventTypes, surfaceEligibility, register, status, source, notes` (per spec §7). The **phrase-record table** with worked samples is generated in the banks section above (see "Required table: phrase-record sample"). Banks §5–§8 are the full, provenance-tagged phrase inventory.

**Translate abstractions (voice-spec law).** Weak → strong pairs to enforce at generation:
- "Know your worth" → "State the rate, protect the time, ask for credit, or stop waiting for approval before deciding."
- "Give yourself grace" → "Stop after one revision, allow an ordinary mistake, or lower the standard for the first attempt."
- "Take up space" → "State the preference, ask for time, speak before overediting, or stop shrinking the request."

## 10. Hook bank

Each hook is tagged with what it *does* (`function`), `bestFor`, `avoidFor`, `intensity`. Examples grounded in the corpus:

| Hook (paraphrase / short excerpt) | Function | Best for | Avoid for | Intensity |
| --- | --- | --- | --- | --- |
| "What do you actually want to say?" | communication-reassessment | daily, mercury-retrograde, mercury-ingress | natal-profile | low |
| "You can't read minds." `[cc/sign/virgo/hook/alt1]` | anti-projection | daily (Virgo/Mercury), sky-aspect friction | eclipse | low |
| "Start spreading the news." `[cc/sign/cancer/hook/alt4]` | visibility-prompt | daily, new-moon (public life) | grief/loss transit | mid |
| "Worship at the altar of Personal and Professional Boundaries this week." `[cc/fallback-hook/weekly/taurus/v2]` | boundary-frame | weekly | tooltip | mid |
| "You might be noticing where you've been…" (voice-spec) | pattern-naming | daily, full-moon, transit-essay | key-dates | mid |
| "The Full Moon lands in your 2nd house…" (voice-spec) | locate-transit | full-moon, monthly | feed-card (too long) | low |

**Rule:** a hook opens; it does not carry the astrology. Name the placement plainly *after* the hook, once, then go to lived behavior.

## 11. Fallback library

A fallback is thinner than authored copy but still specific. **Quality floor:** `event → lived setting → likely behavior → one useful response`. **Personalized floor:** `event → natal house → one concrete house example → exact natal aspect or one relevant modifier → one practical response`.

Weak: "Venus in Virgo brings relationships and values into focus."
Strong: "Venus enters Virgo and moves through your 4th house, bringing home, family agreements, and practical comfort into focus. Fix the part of the living arrangement that affects daily life, then stop once the result is workable."

### Fallback families created (each with the same eight variants)
`collective · sign-based · house-personalized · exact-aspect · short-card · tooltip · notification · receipt-only`

`fallback/daily-horoscope` · `fallback/weekly-horoscope` · `fallback/monthly-horoscope` · `fallback/planetary-horoscope` · `fallback/season-horoscope` · `fallback/new-moon-horoscope` · `fallback/full-moon-horoscope` · `fallback/solar-eclipse-horoscope` · `fallback/lunar-eclipse-horoscope` · `fallback/year-ahead-horoscope` · `fallback/ingress` · `fallback/retrograde` · `fallback/direct-station` · `fallback/moon-sign` · `fallback/moon-phase` · `fallback/new-moon` · `fallback/full-moon` · `fallback/solar-eclipse` · `fallback/lunar-eclipse` · `fallback/sky-aspect` · `fallback/transit-natal`

### Event-specific fallback logic (must-answer checklists)
- **retrograde:** what's reconsidered / what repeats / what not to force / what changes by natal house. Template: `{Planet} retrograde begins in {sign} in your {house} house, making you reconsider how you {behavior} in {house area}. Review {object/agreement/routine} before returning to the plan.`
- **direct-station:** what starts moving / what's unresolved / what got clearer / what gets tested.
- **solar-eclipse:** what chapter begins / how circumstances redirect / which house / what stays flexible.
- **lunar-eclipse:** what culminates or separates / which axis / what's undeniable / what to handle before explaining.
- **moon-in-sign:** current emotional weather / natal house / strongest exact Moon-to-natal aspect / one practical use / when the Moon leaves the sign.
- **two-sign retrograde:** `{Planet} retrograde begins in {signA} by making you reconsider how you {signA behavior}. When it moves back into {signB}, the review turns more {personal/practical/emotional}, bringing up {signB condition} shaping the original problem.` (Name the behavior; never "the focus shifts from communication to emotional themes.")

### Source material for fallbacks
`cc/fallback-hook/*` (320 rows — **most are raw weekly-column excerpts; REFERENCE_ONLY / RAW_QUARANTINE until reviewed and rewritten in voice**), `cc/event-action/*`, `cc/planet/*`, `cc/house/*`, `ms/retro-phase/*`, `ms/ingress/*`, `ms/retrograde/*`. Fallbacks are generated *from* these in voice, never served raw.

## 12. Surface variants

Write each size intentionally; do not truncate. What each size must carry:

| Surface | Length | Must carry | Drops |
| --- | --- | --- | --- |
| expanded-web / app-expanded | 180–320w | full arc: locate → lived → cause → practical (+personal layer) | nothing |
| feed-card | 70–120w | one claim + one lived beat + one action | questions, footer, second beat |
| calendar-day-card | 45–80w | event + one lived line + timing | cause explanation |
| week-view | 35–65w | thesis + priority | per-day chronology |
| month-view | 20–40w | month's one focus + key date | lived examples |
| tooltip | 12–24w | what the event is, plainly | advice, personalization |
| notification | 18–35w | event + one thing to do/notice + timing | mechanism |
| receipt-only | fact line | `{event}: {transiting} {aspect} {natal}` + date/orb | all interpretation |

Card vs detail (per `EXECUTABLE-TEMPLATE-CONTRACT`): **compact must differ from expanded** — a card is one concise claim; the detail page is the developed interpretation. They may never be identical strings.

## 13. Validation rules

Runtime/editorial gates (from the extraction spec §19 + the package contracts). A record is reader-ready only if **all** pass:

1. Surface resolved first; narrative model matches the surface (Sky collective ≠ Home planetary ≠ natal).
2. Calculated facts (dates, signs, houses, aspects, orbs, motion, dignity, sect) come from the calc layer, kept out of the narrative body; footer/receipt only.
3. Narrowest reviewed source selected (exact planet-in-sign or aspect-pair before general planet/sign/house).
4. Supporting sources used as constraints — a house selects the scene, never emits a keyword paragraph.
5. One coherent situation; no symbol-by-symbol translation; no concatenated modules.
6. Optional beats suppressed when they only repeat; no mandatory "this transit reveals / you may be noticing".
7. `SOURCE_GAP` when the required exact source is missing — never build prose from keywords, prompts, feedback, reports, or raw CC copy.
8. Compact ≠ expanded.
9. Daily and weekly treated as containers, not events. Solar and lunar eclipses separated. Retrograde and direct-station separated. Moon phase and Moon sign separated.
10. Every personalized template uses the natal house; exact natal aspects outrank generic Sun/Moon; Sun/Moon/rising synthesized into one story, never three paragraphs.
11. House and sign banks are lived situations, not keyword lists.
12. Fallbacks thinner than authored copy and every fallback names a practical action.
13. Short-surface versions written intentionally, not truncated.
14. Source status preserved; raw phrases quarantined; no silent promotion of DRAFT → served copy.
15. Unsupported predictions removed; no "end the relationship/job" advice without context.
16. Birth-time-missing behavior defined: suppress house/sect copy, fall back to sign-based collective.
17. Voice: no keyword stacks, no "activation" without explanation, no em dashes, no "not X but Y" reflex, no slogans, no generic Sun/Moon/rising paragraphs.
18. Parity: Dashboard preview == published record == generated snapshot == app output.

An executable subset of these is implemented in `resolver/` (`surface_resolver.py`, `lane_priority.py`, `seam_filter.py`, `sect.py`) and exercised by `tests/` — see §14.

## 14. Source registry and provenance

**Status ladder + serving rules (spec §15):**
`CONFIRMED` → may serve verbatim · `APPROVED` → may serve or guide generation · `DRAFT` → may inform generation, not serve verbatim · `REFERENCE_ONLY` → structure/research only · `RAW_QUARANTINE` → cannot enter automatic generation context · `MANUAL_ONLY` → requires human selection · `DEPRECATED` → never retrieve.

**Package tier mapping (from `SOURCE-CLASSIFICATION.json`):** default `EVIDENCE_ONLY`; reader-eligible only at `REVIEWED_CLAUSE` / `REVIEWED_RECORD`. `cc/transit/*/house-*` → `REFERENCE_SCAFFOLD` (not reader-eligible). `cc/aspect-pair/*` → `EVIDENCE_ONLY_UNTIL_REVIEWED`. Prohibited source classes (never serve): prompt, chat_feedback, status_report, audit_report, test_fixture_text, tldr_failure_screenshot, developer_diagnostic, **raw_chani_copy**.

**Provenance requirement:** every served clause records `sourceKeys, slot, reviewStatus, originalityCheck`; every served record additionally records `surface, templateId, templateVersion, renderedFields`. Provenance keys appear inline throughout §5–§8.

**Executable enforcement shipped with this library** (`resolver/`, aligned to the package contracts, not a replacement for them):
- `seam_filter.py` — rejects keyword seams ("X moves through Y circumstances", "Planet brings…", comma keyword-runs) and stock summary openers that restate.
- `lane_priority.py` — exact→context→keyword lane order; SOURCE_GAP when no exact situation source; optional-slot suppression.
- `surface_resolver.py` — collective vs rising-house-personalized vs natal divergence (proves Sky `Sun in Cancer` ≠ Home Gemini-rising `Sun in Cancer` → 2nd house).
- `sect.py` — day/night sect eligibility, Mercury calculated not guessed, sect copy suppressed without birth time + horizon, transit sect-weighting flag OFF (experimental).
- `schema.json` — per-entry schema with lane, surface_scope, card/detail, state.

## 15. Open gaps

- **Exact aspect-pair coverage is partial:** 84 rows exist and are all still `EVIDENCE_ONLY_UNTIL_REVIEWED`; many needed pairs (e.g. Mars–Ascendant, most outer-to-angle) are absent → those transits resolve to `SOURCE_GAP` by design. Priority review queue: the 84 rows + the 132 quarantined generic transit-through-house rows must NOT be promoted as substitutes.
- **Planet-in-sign copy is seasonal/dated,** not a clean 120-combo matrix; several entries are month-specific column copy (RAW_QUARANTINE).
- **Eclipses:** source fragments (`ms/eclipse-house/*`, `ms/eclipse-guidance/*`) do not separate solar vs lunar; per-sign eclipse copy must be authored.
- **Angles (`me.natal_angle`)** need angle-specific sources; only `ms/midheaven/*` exists — Ascendant/Descendant/IC by sign are missing.
- **Planetary returns / profections** are sparse (`ms/profection/*` only).
- **Outer-planet transit refs** (`cc/ref/outer-planets/{planet}-transit`) referenced by the transit template are thin; slow-transit tails should stay MANUAL_ONLY.
- **`cc/fallback-hook/*` (320)** are largely raw weekly-column excerpts — high quarantine load; each must be reviewed and rewritten in voice before serving.
- **Sect data dependency:** all house/sect personalization suppressed without reliable birth time + horizon; the sign-based collective path is the required fallback.

---

# Final deliverables

## Deliverable 1 — Consolidated production library
This document (`TLDR-ASTRO-PRODUCTION-LIBRARY.md`), sections 1–15, plus the executable `resolver/`, `schema.json`, `fixtures/`, and `tests/` in the same package.

## Deliverable 2 — Source-coverage report
See the generated **coverage table** in the banks section. Summary: sign banks 12/12 (high); house scenes 12/12 + facets (high); planet functions ~7/10 clean, outer planets thin (medium); exact aspect-pairs 84 rows all unreviewed (medium); planet-in-sign partial + dated (medium); fallback-hooks 320 mostly raw (low); retrograde phases 4/4 (high); ingress by body (medium); eclipses fragmentary (low).

## Deliverable 3 — Newly identified article types
`planetary-horoscope` (rising-house personalized, distinct from Sky and natal); two-sign `retrograde-guide`; `direct-station-guide` (split from retrograde); `ingress-guide`; `moon-phase` and `moon-sign` as separate modules; `cazimi` event copy; `outer-planet-cycle-guide`; `profection`/`planetary-return` framing; `key-dates`/`event-timeline`.

## Deliverable 4 — Missing source categories
Angles by sign (Asc/Desc/IC); per-sign eclipse copy (solar vs lunar); clean 120-combo planet-in-sign; reviewed exact aspect-pairs beyond the 84 (esp. planet–angle, outer–personal); outer-planet transit-to-natal refs; planetary-return copy; per-house retrograde tails for planets other than Mercury/Uranus.

## Deliverable 5 — Fallback families created
21 families listed in §11, each with 8 variants (collective, sign-based, house-personalized, exact-aspect, short-card, tooltip, notification, receipt-only), each enforcing the quality floor.

## Deliverable 6 — Passages requiring manual editorial review
All `cc/aspect-pair/*` (84); all `cc/transit/*/house-*` (132 quarantined); `cc/fallback-hook/*` (320 raw excerpts); dated `cc/planet-in-sign/*` seasonal copy; `ms/pull-quote/*` and `ms/essay-quote/*` (REFERENCE_ONLY); any outer-planet slow-transit tail (MANUAL_ONLY).

## Deliverable 7 — Duplicate sources
`-REVIEWED-COMPLETE`, `-NEW-NATAL-TRANSITS-DIRECTION`, `-FULL-DASHBOARD-NEW-DIRECTION (2)`, `-FINAL-SOURCE-GROUNDED-TEMPLATES` ZIPs carry byte-identical `cc-source-phrases.json` / `marie-source-phrases.json` / `tldr-astro-records.json` to v2.0.1. They differ only in their `CODEX-IMPLEMENTATION-PROMPT.md` / `PACKAGE-AUDIT.md` iteration notes. **Canonical: `tldr-astro-template-handoff-v2` (2.0.1).** Older ZIPs → DEPRECATED for sourcing.

## Deliverable 8 — Changelog
- Added the 3-dimensional taxonomy (editorial × event × surface) and the article-type comparison table.
- Added `planetary-horoscope` as a first-class rising-house-personalized type, separated from Sky collective and natal placement.
- Separated moon-phase/moon-sign, solar/lunar eclipse, retrograde/direct-station.
- Added event-type function-sequence templates incl. two-sign retrograde and cazimi.
- Added the personalized natal layer with shared serving order and 10 per-type templates; banned generic Sun/Moon/rising paragraphs.
- Regenerated sign/house/planet/aspect banks from the corpus with inline provenance and status.
- Added 21 fallback families with an 8-variant matrix and must-answer checklists.
- Added surface-variant spec (8 sizes, written not truncated) and compact≠expanded rule.
- Added 18 validation gates and an executable subset (`resolver/` + `tests/`).
- Flagged quarantine load: 84 aspect-pair + 132 generic transit-house + 320 fallback-hook rows requiring review; marked older ZIPs DEPRECATED for sourcing.
