# Sky placement recovery ledger

Canonical source of truth for the 78 blank pages (84 candidate rows).
All counts in any report must reconcile to this file. If a count changes, identify the
records, explain why, update here, and report the delta. CF-001 uses remain in the separate
advisory queue and do not count as deterministic failures. CF-001 uses remain in the separate
advisory queue and do not count as deterministic failures.

Machine-readable: `SKY-PLACEMENT-RECOVERY-LEDGER.json`

## Verified baseline

| metric | value |
|---|---:|
| candidate pages | 84 |
| zero-hard-fail pages | 84 |
| pages with deterministic failures | 0 |
| score-3 pages | 82 |
| advisory shape warnings | 2 across 2 pages |
| generic people advisory signals | 32 across 31 pages |
| untraced duration | 0 (17 fixed and sourced) |
| figurative perform | 0 (5 fixed) |
| leak | 0 (1 fixed) |
| CF-001 deterministic failures | 0 (32 reclassified as advisory) |

## Production queue

source readiness: {'ready': 15, 'partial': 69}

rewrite complexity: {'simple': 19, 'medium': 65}

## Pilot selection

| page | tier | evidence | lint | why |
|---|---|---|---|---|
| `jupiter/aries` | A | meaning 16, scene 1, argument 3 | clean | fast mover, one-year residency, ready evidence, lint clean, simple complexity |
| `uranus/taurus` | B | meaning 28, scene 2, argument 8 | clean | slow mover, 28 meaning + 8 argument records, lint clean but voice signals present |
| `pluto/capricorn` | C | meaning 36, scene 1, argument 3 | clean | generational, richest evidence at 36 meaning records, needs condition and era handling |

## All 84 rows

| page | lint | failures | people | duration | readiness | complexity | render |
|---|---|---|---:|---|---|---|---|
| `chiron/aquarius` | clean | - | 1 | traced | partial | medium | non_serving |
| `chiron/aries` | clean | - | 0 | traced | ready | simple | non_serving |
| `chiron/cancer` | clean | - | 0 | traced | partial | simple | non_serving |
| `chiron/capricorn` | clean | - | 1 | traced | partial | medium | non_serving |
| `chiron/gemini` | clean | - | 1 | traced | partial | medium | non_serving |
| `chiron/leo` | clean | - | 0 | traced | partial | medium | non_serving |
| `chiron/libra` | clean | - | 0 | traced | partial | simple | non_serving |
| `chiron/pisces` | clean | - | 0 | fixed_sourced | partial | medium | non_serving |
| `chiron/sagittarius` | clean | - | 0 | traced | partial | simple | non_serving |
| `chiron/scorpio` | clean | - | 0 | traced | partial | medium | non_serving |
| `chiron/taurus` | clean | - | 0 | traced | partial | medium | non_serving |
| `chiron/virgo` | clean | - | 0 | traced | partial | medium | non_serving |
| `jupiter/aquarius` | clean | - | 0 | traced | partial | medium | non_serving |
| `jupiter/aries` | clean | - | 0 | traced | ready | simple | non_serving |
| `jupiter/cancer` | clean | - | 0 | traced | ready | medium | non_serving |
| `jupiter/capricorn` | clean | - | 1 | traced | ready | medium | non_serving |
| `jupiter/gemini` | clean | - | 0 | traced | ready | medium | non_serving |
| `jupiter/leo` | clean | - | 1 | traced | ready | medium | non_serving |
| `jupiter/libra` | clean | - | 0 | traced | partial | medium | non_serving |
| `jupiter/pisces` | clean | - | 0 | traced | ready | medium | non_serving |
| `jupiter/sagittarius` | clean | - | 1 | traced | partial | medium | non_serving |
| `jupiter/scorpio` | clean | - | 1 | traced | ready | medium | non_serving |
| `jupiter/taurus` | clean | - | 0 | traced | partial | medium | non_serving |
| `jupiter/virgo` | clean | - | 0 | traced | partial | medium | non_serving |
| `neptune/aquarius` | advisory | stacked-ending | 1 | fixed_sourced | partial | medium | non_serving |
| `neptune/aries` | clean | - | 0 | traced | ready | medium | non_serving |
| `neptune/cancer` | clean | - | 0 | traced | partial | medium | non_serving |
| `neptune/capricorn` | clean | - | 1 | fixed_sourced | partial | medium | non_serving |
| `neptune/gemini` | clean | - | 0 | traced | partial | simple | non_serving |
| `neptune/leo` | clean | - | 0 | fixed_sourced | partial | medium | non_serving |
| `neptune/libra` | clean | - | 1 | fixed_sourced | partial | medium | non_serving |
| `neptune/pisces` | clean | - | 0 | traced | partial | medium | non_serving |
| `neptune/sagittarius` | clean | - | 0 | traced | partial | medium | non_serving |
| `neptune/scorpio` | clean | - | 0 | fixed_sourced | partial | medium | non_serving |
| `neptune/taurus` | clean | - | 0 | fixed_sourced | partial | medium | non_serving |
| `neptune/virgo` | clean | - | 1 | traced | partial | medium | non_serving |
| `north-node/aquarius` | clean | - | 1 | traced | partial | medium | non_serving |
| `north-node/aries` | clean | - | 0 | traced | ready | simple | non_serving |
| `north-node/cancer` | clean | - | 1 | traced | partial | medium | non_serving |
| `north-node/capricorn` | clean | - | 0 | traced | partial | medium | non_serving |
| `north-node/gemini` | clean | - | 0 | fixed_sourced | ready | simple | non_serving |
| `north-node/leo` | clean | - | 0 | traced | partial | simple | non_serving |
| `north-node/libra` | clean | - | 1 | traced | partial | medium | non_serving |
| `north-node/pisces` | clean | - | 0 | fixed_sourced | partial | simple | non_serving |
| `north-node/sagittarius` | clean | - | 0 | traced | partial | simple | non_serving |
| `north-node/scorpio` | clean | - | 1 | fixed_sourced | partial | medium | non_serving |
| `north-node/taurus` | clean | - | 0 | fixed_sourced | partial | medium | non_serving |
| `north-node/virgo` | clean | - | 0 | fixed_sourced | partial | medium | non_serving |
| `pluto/aquarius` | clean | - | 0 | traced | ready | simple | non_serving |
| `pluto/aries` | clean | - | 0 | traced | partial | medium | non_serving |
| `pluto/cancer` | clean | - | 1 | traced | partial | medium | non_serving |
| `pluto/capricorn` | clean | - | 0 | traced | ready | simple | non_serving |
| `pluto/gemini` | clean | - | 0 | traced | partial | simple | non_serving |
| `pluto/leo` | clean | - | 1 | traced | partial | medium | non_serving |
| `pluto/libra` | clean | - | 1 | traced | partial | medium | non_serving |
| `pluto/pisces` | clean | - | 0 | traced | partial | simple | non_serving |
| `pluto/sagittarius` | clean | - | 2 | traced | partial | medium | non_serving |
| `pluto/scorpio` | clean | - | 1 | traced | partial | medium | non_serving |
| `pluto/taurus` | clean | - | 1 | traced | partial | medium | non_serving |
| `pluto/virgo` | clean | - | 1 | traced | partial | medium | non_serving |
| `south-node/aquarius` | clean | - | 1 | traced | partial | medium | non_serving |
| `south-node/aries` | clean | - | 0 | traced | partial | medium | non_serving |
| `south-node/cancer` | clean | - | 0 | traced | partial | simple | non_serving |
| `south-node/capricorn` | clean | - | 0 | fixed_sourced | partial | medium | non_serving |
| `south-node/gemini` | clean | - | 0 | fixed_sourced | partial | medium | non_serving |
| `south-node/leo` | clean | - | 1 | traced | partial | medium | non_serving |
| `south-node/libra` | clean | - | 0 | fixed_sourced | partial | medium | non_serving |
| `south-node/pisces` | clean | - | 0 | traced | partial | simple | non_serving |
| `south-node/sagittarius` | clean | - | 1 | traced | partial | medium | non_serving |
| `south-node/scorpio` | clean | - | 0 | traced | partial | medium | non_serving |
| `south-node/taurus` | clean | - | 0 | traced | partial | medium | non_serving |
| `south-node/virgo` | clean | - | 0 | fixed_sourced | partial | simple | non_serving |
| `uranus/aquarius` | clean | - | 1 | traced | partial | medium | non_serving |
| `uranus/aries` | clean | - | 0 | traced | partial | medium | non_serving |
| `uranus/cancer` | clean | - | 0 | traced | partial | medium | non_serving |
| `uranus/capricorn` | clean | - | 0 | traced | partial | medium | non_serving |
| `uranus/gemini` | advisory | stacked-ending | 1 | traced | ready | medium | non_serving |
| `uranus/leo` | clean | - | 0 | traced | partial | medium | non_serving |
| `uranus/libra` | clean | - | 1 | traced | partial | medium | non_serving |
| `uranus/pisces` | clean | - | 1 | traced | partial | medium | non_serving |
| `uranus/sagittarius` | clean | - | 1 | traced | partial | medium | non_serving |
| `uranus/scorpio` | clean | - | 1 | traced | partial | medium | non_serving |
| `uranus/taurus` | clean | - | 0 | traced | ready | medium | non_serving |
| `uranus/virgo` | clean | - | 0 | traced | partial | simple | non_serving |
