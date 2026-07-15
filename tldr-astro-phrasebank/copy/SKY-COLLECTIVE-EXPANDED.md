# Expanded collective-Sky layer + optional historical lookback

Implements the two separated Sky surface contracts and the Admin-gated historical
module, in the repo's phrasebank / composer / harness idiom (collective `we/us/our`
voice only — never personalized horoscopes, natal placements, or personal transits).

## Two separate contracts (never card → detail reuse)

| Surface | Contract | Record file | Composer entry |
|---|---|---|---|
| `sky.collective.card` | `sky.collective.card.v1` | `phrasebank/cc-sky-collective-card-reviewed.json` | `compose_card()` |
| `sky.collective.detail` | `sky.collective.{variant}.detail.v1` | `phrasebank/cc-sky-collective-detail-reviewed.json` | `compose_detail()` |

The card is one collective claim (14–30 words, one sentence). The detail is authored
independently as **named semantic slots** and composed into 1–2 finished paragraphs via
each record's `paragraphsPlan` — never one `<p>` per slot, and the card is never copied
into the expanded body. Variants and their slot sets: `planet-sign`, `moon-sign`,
`retrograde` (2-paragraph, phase context second), `station`, `aspect`, `ingress`.

Composer lives in `resolver/sky_collective.py`. Output object matches the contract:
`{ eyebrow, title, dateRange, paragraphs[], historicalLookback|null, relatedSection }`
plus a `_trace` (templateId, templateVersion, readerAuthority, compactRecordId,
`compactRecordUsedAsExpandedAuthority:false`, sourceGap, cacheVersion, historical trace).

## Fixtures (21 paired card+detail — all 7 Sky node types)

The 13 required pairs — Sun in Cancer, Moon in Cancer, Mercury retrograde in Cancer,
Venus in Virgo, Mars in Gemini, Jupiter in Leo, Saturn in Aries, Chiron in Taurus, a
station retrograde (Saturn in Aries), a station direct (Mercury in Cancer), a conjunction
(Sun–Mercury), a square (Mars–Saturn), a trine (Venus–Jupiter) — plus Uranus in Gemini
and Jupiter in Cancer as expanded hosts for the historical tests.

Two node types were added to close the coverage gaps found in the surface audit:

- **ingress / season** (`sky.collective.ingress.detail.v1`): Libra Season Begins (Sun
  ingress / equinox) and Mars Enters Cancer (a threshold that names what changes from the
  prior Gemini condition). Treated as thresholds, not sign summaries.
- **lunation / eclipse** (`sky.collective.lunation.detail.v1`, new variant): New Moon in
  Cancer, Full Moon in Capricorn, Solar Eclipse in Aries, Lunar Eclipse in Libra. Grounded
  in Forrest's *Book of the Moon* (New Moon = seeding in the dark / faith before evidence;
  Full Moon = culmination, visibility, release) and Greene's collective-cycles book
  (eclipses on the nodal axis as accelerated turning points). Eclipse copy stays
  non-deterministic ("a turning point, not a verdict"). The two "release" articles carry
  Marie's CONFIRMED closer *"A release of something that was never truly yours."*
  Word band 90–160; eyebrow shows "Lunation" or "Eclipse" per record.

## Historical lookback (optional, Admin-gated)

Global application setting `skyHistoricalLookbackEnabled` (default **Off**) in
`config/admin-content-settings.json`, accessed through `resolver/admin_settings.py`.
It is not a user preference, not localStorage, and not user-configurable; toggling it
appends an Admin audit entry, bumps `configVersion`, and changes the reader cache key
(`cache_version()`), so no code deploy is needed and stale pages don't persist.

Historical records are a separately governed type in
`phrasebank/sky-historical-lookback.json`, with astrology-calculation sources kept
distinct from historical-event sources. A block renders only when: Admin **On** ∧
surface is `sky.collective.detail` ∧ record `status=="reviewed"` ∧ integrity checks
passed ∧ variant is historically eligible (moon-sign excluded) ∧ event identity matches.
Otherwise `historicalLookback: null` — no empty heading, divider, or placeholder. The
module always renders **after** the current interpretation, uses a reviewed heading from
the allowed lane, and is blocked if it contains causal/deterministic language.

## Validation

`tests/render_sky_collective.py` renders every fixture, lints (per-sentence seam +
register, banned expanded patterns, house/`your-chart` leakage, metadata duplication,
compact-leak, word bands, paragraph structure, comma-inventory), exercises the historical
module ON/OFF/ineligible (draft, moon, no-record, personalized surface, compact card),
checks initial/hydrated parity and the Admin invariants, and emits both acceptance
reports. Wired into `tests/build_all.sh`. Latest run: **21 detail + 21 card fixtures
valid, all counters at target (0 failures), historical ON=5 / OFF=0 / ineligible=0**;
full repo suite 2216/2216 harness renders + 17/17 checks still green.

## Coverage after this pass

Every Sky node type in the information model now has an expanded card+detail contract:
planet-in-sign, moon-in-sign, retrograde, station, current-sky aspect, ingress/season,
and lunation/eclipse. The contract, composer, gating, lints, parity, and both acceptance
reports are complete. Remaining work is **matrix depth, not missing types** — the expanded
articles are fixture-depth (e.g. 8 of the collective planet-in-sign combinations, 1 of 12
moon signs), so authoring the full per-combination matrices is the next content pass.
