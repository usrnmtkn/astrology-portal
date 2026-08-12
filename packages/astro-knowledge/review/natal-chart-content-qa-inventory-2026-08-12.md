# Natal Chart Content QA inventory — 2026-08-12

**Status:** deterministic inventory complete; semantic whole-passage review pending  
**Surfaces:** You and Friend  
**Governance:** advisory review evidence only; no serving changes, copy changes, approval changes, auto-publish, or writer promotion

## Run

Command:

```sh
npm run qa:natal-content:inventory
```

The reproducible runner is `scripts/run-natal-chart-content-qa-inventory.mjs`. Its full local artifact is `artifacts/natal-chart-content-qa-inventory-2026-08-12.json`; the artifact is generated and intentionally not committed.

## Coverage

| Family | Attempted | Rendered | Fail-closed source gaps |
| --- | ---: | ---: | ---: |
| Composed placements | 4,032 | 4,032 | 0 |
| Named points | 96 | 96 | 0 |
| Natal aspects | 1,632 | 1,358 | 274 |
| Natal aspect patterns | 12 | 12 | 0 |
| Empty houses | 3,168 | 3,168 | 0 |
| House glossary | 24 | 24 | 0 |
| **Total** | **8,964** | **8,690** | **274** |

The successful renders deduplicate to 8,110 distinct surface-specific passages. All 8,110 carry rendered text, a stable render key, SHA-256, route, facts, and a pending semantic-review state.

## Deterministic findings

- No rendered passage matched the current-sky or transit-leak tripwire.
- No render was empty and no successful render contained unresolved slots or runtime placeholders.
- 408 distinct Friend placement passages contain second-person language. These are repeated downstream manifestations of 12 vocabulary rows, not 408 independently authored defects:
  - `fallback-vocab/planet-excess/sun` — 144 passages
  - `fallback-vocab/planet-excess/jupiter` — 144 passages
  - `fallback-vocab/placement-gerund/chiron/aries/0` — 12 passages
  - `fallback-vocab/placement-gerund/chiron/gemini/0` — 12 passages
  - `fallback-vocab/placement-gerund/chiron/leo/0` — 12 passages
  - `fallback-vocab/placement-gerund/chiron/virgo/0` — 12 passages
  - `fallback-vocab/placement-gerund/chiron/libra/0` — 12 passages
  - `fallback-vocab/placement-gerund/chiron/scorpio/0` — 12 passages
  - `fallback-vocab/placement-gerund/chiron/sagittarius/0` — 12 passages
  - `fallback-vocab/placement-gerund/chiron/capricorn/0` — 12 passages
  - `fallback-vocab/placement-gerund/chiron/aquarius/0` — 12 passages
  - `fallback-vocab/placement-gerund/chiron/pisces/0` — 12 passages
- 171 distinct passages contain `whether`, across 143 composed placements and 28 natal aspects. This is a writing-review finding, not an automatic copy mutation.

The 274 natal-aspect gaps remained fail-closed: 136 quincunx, 31 conjunction, 16 sextile, 31 square, 31 trine, and 29 opposition render attempts. The full artifact records every affected render key and error.

## Whole-passage status

No semantic verdict is claimed. The local worktree has no configured model-provider key, and the QA protocol does not authorize an implicit billed batch. Therefore:

- semantic reviews completed: 0
- semantic reviews pending: 8,110
- billed model calls: 0

The next semantic pass must read rendered text only, state the passage's one-sentence core message first, and then assign `PASS`, `EDIT`, `CUT`, or `SOURCE_GAP` under the versioned whole-passage rubric. Findings remain owner-review candidates and cannot alter approved or serving copy automatically.
