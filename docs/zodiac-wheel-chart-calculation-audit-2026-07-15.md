# Zodiac Wheel And Chart Calculation Audit

Date: 2026-07-15

> Update (2026-07-27): the app now calculates the True Node throughout and displays it as North Node. Mean Node observations below describe the build audited on 2026-07-15 and are retained as historical findings.

## Executive Summary

I checked the current TLDR Astro chart calculation and wheel-rendering paths against the local integrity harness, the NASA/JPL Horizons independent comparison, and the supplied Jose Astro.com reference chart.

Bottom line: the core planetary longitude calculations used by the web app have not shown evidence of drift. The independent Horizons comparison found 0 discrepancies across the facts it can verify. The Jose reference chart matches the app's calculated Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron, Ascendant, and Midheaven to normal rounding tolerance.

Product decision after audit: TLDR Astro should use Whole Sign houses end to end. Planets are assigned by whole sign, chart wheels draw equal 30-degree houses from 0 degrees of the rising sign, and ASC/MC are angle markers rather than 1st/10th house cusps.

Important caveats:

- NASA/JPL Horizons does not verify Ascendant, MC/IC, house cusps, mean node, Lilith, stations, retrograde shadows, or exact transit hits in the current adapter.
- The current web wheel intentionally renders zodiac longitudes on an Ascendant-rotated whole-sign wheel; it will not visually match Astro.com's default quadrant house sectors.
- The Python API exposes Whole Sign as the only supported house system.
- One existing content/calendar integrity test is failing on stale generic retrograde aliases, unrelated to zodiac wheel longitude math but still a release risk.
- The supplied desktop screenshot shows Jose with Aries rising in the header, while the Astro.com reference and current calculation produce Pisces rising. That looks like stale or mismatched saved chart/header data, not a core ephemeris error for the referenced birth data.

## Calculation Stack Confirmed

Web app path:

- Source file: `apps/web/src/services/ephemeris.ts`
- Library: `swisseph-wasm@0.0.5`
- Flags: Swiss Ephemeris geocentric tropical positions with speed
- Angles: Swiss Ephemeris houses call is used to calculate Ascendant and Midheaven as angle points
- Houses: Whole Sign cusps derived from 0 degrees of the rising sign
- Displayed planet house: whole-sign house from Ascendant sign
- Node: mean North Node
- Lilith: mean Black Moon Lilith / mean apogee constant
- Chart facts: emitted through `factsFromSkySnapshot(snapshot)`

Wheel rendering path:

- Source files:
  - `apps/web/src/components/charts/Wheels.tsx`
  - `apps/web/src/components/charts/wheelGeometry.ts`
- Planet placement on the wheel is based on zodiac longitude reconstructed from sign plus degree.
- Natal and relationship wheels are rotated so the Ascendant appears on the left side of the wheel.
- MC/IC are drawn at their calculated zodiac longitudes; they are not forced to a vertical 12/6 axis.
- House numbers and house sector spokes are whole-sign, not quadrant sectors.
- Visible chart label: `Houses: Whole Sign`.

Backend API path:

- Source files:
  - `services/tldrastro-api/src/tldrastro_api/services/chart.py`
  - `services/tldrastro-api/src/tldrastro_api/services/natal.py`
- Uses Python `swisseph`.
- Uses `swe.houses_ex` for ASC/MC angle calculation.
- Rebuilds house cusps as Whole Sign from 0 degrees of the rising sign.
- Assigns planet houses with `house_for_longitude` against those Whole Sign cusps.
- Response metadata and content facts report `whole_sign`.

## Independent Verification Run

Command:

```bash
TLDR_ASTRO_VERIFY_PROVIDER_COMMAND="node scripts/providers/nasa-horizons-provider.mjs" \
TLDR_ASTRO_VERIFY_REPORT_PATH="/private/tmp/tldrastro-horizons-verification-report-20260715.json" \
node scripts/verify-astrology-integrity.mjs
```

Result:

- Overall status: `PARTIAL_WITH_GAPS`
- Discrepancies found in Horizons-verifiable facts: 0
- Verified facts:
  - Planets: 63
  - Moon: 7
  - Chiron: 7
  - Aspects among supported bodies: 102
- Unverified/gap facts: 201

The run exits non-zero because the current adapter cannot verify nodes, Lilith, angles, house cusps, station timestamps, retrograde shadow boundaries, or exact hits. That is expected from the adapter's documented limitations, not evidence of drift.

The Vite SSR harness also logged sandbox noise:

- `listen EPERM: operation not permitted 0.0.0.0:24678`
- dependency scan cancellation messages after the calculation result

The JSON report was still produced and showed 0 discrepancies in verified facts.

## Jose Reference Check

Reference image:

- Date: 1979-02-08
- Local time: 9:00 a.m.
- UT: 13:00
- Place: El Vigia, Venezuela
- Astro.com method: default quadrant houses
- Astro.com sun sign: Aquarius
- Astro.com Ascendant: Pisces

Current app calculation used:

- Latitude: 8.633333 N
- Longitude: 71.65 W
- Date: `1979-02-08T13:00:00.000Z`

Comparison:

| Point | Astro.com reference | App calculation | Status |
| --- | --- | --- | --- |
| Sun | 19 Aquarius 10 | 19 Aquarius 10 | Match |
| Moon | 10 Cancer 27 | 10 Cancer 28 | Match |
| Mercury | 18 Aquarius 38 | 18 Aquarius 38 | Match |
| Venus | 3 Capricorn 29 | 3 Capricorn 30 | Match |
| Mars | 14 Aquarius 46 | 14 Aquarius 46 | Match |
| Jupiter | 2 Leo 05 Rx | 2 Leo 06 Rx | Match |
| Saturn | 12 Virgo 10 Rx | 12 Virgo 10 Rx | Match |
| Uranus | 20 Scorpio 53 | 20 Scorpio 53 | Match |
| Neptune | 19 Sagittarius 59 | 20 Sagittarius 00 | Match |
| Pluto | 19 Libra 08 Rx | 19 Libra 08 Rx | Match |
| Chiron | 5 Taurus 20 | 5 Taurus 20 | Match |
| Ascendant | 19 Pisces 58 | 19 Pisces 58 | Match |
| Midheaven | 22 Sagittarius 05 | 22 Sagittarius 05 | Match |
| North Node | True Node 17 Virgo 47 | Mean Node 19 Virgo 11 | Expected method difference |

Reference house-cusp comparison:

| House | Astro.com reference | App calculation | Status |
| --- | --- | --- | --- |
| 1 | 19 Pisces 58 | 19 Pisces 58 | Match |
| 2 | 24 Aries 08 | 24 Aries 08 | Match |
| 3 | 24 Taurus 45 | 24 Taurus 45 | Match |
| 4 | 22 Gemini 05 | 22 Gemini 05 | Match |
| 5 | 18 Cancer 40 | 18 Cancer 40 | Match |
| 6 | 17 Leo 19 | 17 Leo 19 | Match |
| 7 | 19 Virgo 58 | 19 Virgo 58 | Match |
| 8 | 24 Libra 08 | 24 Libra 08 | Match |
| 9 | 24 Scorpio 45 | 24 Scorpio 45 | Match |
| 10 | 22 Sagittarius 05 | 22 Sagittarius 05 | Match |
| 11 | 18 Capricorn 40 | 18 Capricorn 40 | Match |
| 12 | 17 Aquarius 19 | 17 Aquarius 19 | Match |

Interpretation:

- The app's raw calculation for Jose is accurate against the Astro.com reference.
- At the time of this audit, the node mismatch was expected because Astro.com's screenshot displayed True Node while the app used Mean Node. This has since been resolved by adopting the True Node.
- The supplied desktop app screenshot showing Aries rising for Jose conflicts with both the Astro.com reference and the current calculation. Investigate saved manual chart data, profile header state, or stale cached `natalChart` JSON for that record.

## Test Results

Ran:

```bash
node scripts/test-web-api-house-parity.mjs
```

Result:

- Passed for 3 fixed charts.
- Confirms web and Python API agree on Whole Sign house cusps and core planet house assignments.
- The script sends `houseSystem: "whole_sign"` to the API and asserts API output remains `whole_sign`.
- Chiron/Lilith are compared when both engines return them, because local Python ephemeris availability can omit optional bodies.
- The parity script suppresses known Vite sandbox WebSocket/dependency-scan noise so failures surface as assertions.

Ran follow-up surface smoke:

```bash
PYTHONPYCACHEPREFIX=/private/tmp/tldrastro-pycache PYTHONPATH=services/tldrastro-api/src \
python3 /private/tmp/check_tldr_whole_sign_surfaces.py
```

Result:

- Passed.
- Exercised natal, current sky, transits, synastry, composite, relationship compare, profections, and personal timing with Whole Sign settings.
- Confirmed returned metadata stays `whole_sign` across parent and nested chart surfaces.
- Confirmed natal, sky, and composite house cusp arrays are Whole Sign boundaries.

Ran:

```bash
npm run typecheck -w @tldr/web
```

Result:

- Passed.

Ran:

```bash
PYTHONPYCACHEPREFIX=/private/tmp/tldrastro-pycache PYTHONPATH=services/tldrastro-api/src python3 -m py_compile ...
```

Result:

- Passed for the patched API modules.

Attempted:

```bash
python3 -m pytest services/tldrastro-api/tests/test_natal.py services/tldrastro-api/tests/test_sky.py services/tldrastro-api/tests/test_synastry.py services/tldrastro-api/tests/test_transits.py
```

Result:

- Blocked in this local environment because system Python does not have `pytest`/FastAPI installed and `services/tldrastro-api/.venv` does not contain a usable Python binary.

Ran:

```bash
node scripts/verify-astrology-integrity.mjs --allow-missing-provider
```

Result:

- Primary app facts validated for all configured fixtures.
- Status remains blocked if no independent provider is supplied, by design.

Ran:

```bash
node scripts/test-astrology-calculation-integrity.mjs
```

Result:

- Failed before runtime calculation fixtures:
  - `Calendar key selection must not ask for generic retrograde planet aliases.`
- The failing source is in `apps/web/src/features/calendar/LunarCalendar.tsx`, where retrograde lookup still includes generic fallback keys such as `sky-retrograde-${planetPart}`.
- This is a content/fact provenance problem, not a zodiac longitude calculation drift problem.

## Findings

### P0/P1 Calculation Drift

No confirmed drift in core web app planetary longitudes.

Evidence:

- Horizons comparison found 0 discrepancies for supported planetary and aspect facts.
- Jose reference chart positions match Astro.com.

### P1 Saved Chart/Header Integrity

The Jose desktop screenshot shows Aries rising, while the attached mobile screenshot and Astro.com reference show Pisces rising.

Likely causes:

- Stale `natalChart` JSON stored for that manual chart.
- Header rendering reading a cached profile/signature field instead of `selectedChart.natalChart.ascendant`.
- Manual chart edited after calculation without recalculating natal chart.

Recommended check:

- Inspect the saved row/localStorage entry for `manual-1784131948658`.
- Confirm `birthDate`, `birthTime`, `birthTimeUnknown`, `birthLocation.latitude`, `birthLocation.longitude`, `birthLocation.timeZone`, and embedded `natalChart.ascendant`.
- If the birth data is the Astro.com Jose reference, force recalculation and persist the new `natalChart`.

### P1 House-System Ambiguity

Decision: use Whole Sign throughout the app.

Implementation requirements:

- Planet houses: Whole Sign.
- Wheel houses: equal 30-degree signs starting at 0 degrees of the rising sign.
- ASC/MC: plotted as angle markers, not treated as 1st/10th house cusps.
- UI label: `Houses: Whole Sign`.
- Diagnostics/provenance: house system should report `whole_sign`.

### P2 Web/API Divergence

Status: fixed in this pass.

Changes made:

- Python API calculations use Whole Sign cusps and reject unsupported house-system values at the request model layer.
- API response metadata reports `whole_sign` across natal, sky, transits, synastry, composite, relationship compare, profections-derived timing, and content facts.
- Composite charts now derive Whole Sign cusps from the midpoint Ascendant instead of midpointing house cusps.
- `/houses/systems` only advertises Whole Sign.
- `scripts/test-web-api-house-parity.mjs` compares web and API house assignments for fixed charts.
- Follow-up API smoke confirmed all API chart surfaces return `whole_sign`, including nested natal/current-sky/profection charts.

### P2 Node Method Difference

At the time of this audit, the app used the Mean North Node while the Astro.com reference image displayed the True Node. The app now uses the True Node.

Recommended action:

- Resolved 2026-07-27: use the True Node as the sole product calculation and display it as North Node.
- Astro.com True Node screenshots can now be used as a node-position reference when the zodiac, frame, place, and timestamp also match.

### P2 Verification Coverage Gaps

The current independent harness cannot verify:

- Ascendant/Descendant/MC/IC
- House cusps
- mean node
- Lilith
- retrograde station timestamps
- shadow boundaries
- exact transit hits

Recommended action:

- Add a Swiss Ephemeris CLI or another machine-readable astrology provider for angles/cusps.
- Add fixture-level golden references for at least one natal chart, one synastry chart, one composite chart, one transit chart, one DST-boundary chart, and one high-latitude chart.

## Conclusion

The wheel/chart calculation core appears stable for planetary positions. The strongest concrete mismatch is not ephemeris drift: it is the Jose Aries-vs-Pisces rising discrepancy in the app screenshot, which likely comes from stale or inconsistent saved chart data/header rendering.

Before release, the remaining risk is not "planets drifted"; it is stale saved chart/header data. The calculation paths are now unified around Whole Sign, but cached Jose records should still be inspected if the UI continues to show Aries rising for the Astro.com birth data that calculates as Pisces rising.
