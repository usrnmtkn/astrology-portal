# Writing engine wiring — directive

Date: 2026-08-13
Status: authorized to build. One bounded billed batch at the end, 12 calls.
This document is self-contained. No external task record is required.

---

## Goal

Finish wiring the matrix, corpus, and source materials into one knowledge
path that every writer uses. Then run one bounded test to find out whether
card quality was ever a permissions problem or an input-starvation problem.

## Why this matters

`run-friends-transit-wave-comparison.mjs` currently builds its own packet from
one file plus two hardcoded constants. For `transit-aspect/saturn/mercury/conjunction`
that is **130 characters of astrology**, from which the writer is asked to
produce two four-to-six sentence cards with a specific ordinary scene, a named
mechanism, and a concrete consequence.

Meanwhile the repo holds, unread by any writer: 386 reviewed phrasebank
doctrine entries, 688 V13 aspect rows, 120 REVIEWED house-transit files, and
215 SOURCE_BACKED insight files. Measured across the 60 wave-1 targets,
routing through the index takes average writer input from **120 characters to
921** — 7.7x — all from material already in the repo.

The scene-licensing work constrains what a writer may say. It never gave the
writer anything to say. This directive fixes the second problem.

---

## Already built

**`scripts/build-knowledge-index.mjs`** — the canonical catalog. Resolves
every store's native key to one id.

| | |
|---|---:|
| canonical objects | 4,968 |
| source records indexed | 12,188 |
| objects found in 2+ stores | 1,571 |
| collisions | 0 |
| unresolved | 232 (1.9%) |

**`packages/astro-knowledge/scripts/knowledge-resolver.js`** — returns
selected fields per object, tagged with temporality and approval, sorted
approved-first, with related-object mechanism reference.

## Decisions already taken — do not relitigate

**1. `nonagen` is merged into `semisextile`.** This reverses the earlier
recommendation to keep them separate. Evidence: every genuine aspect in V13
covers 97–100 planet pairs; semisextile covers 55 and nonagen 46, union 99 —
exactly one aspect's coverage. V13's own entry opens *"The nonagen, or
semisextile, is..."*. The engine (`packages/astro-knowledge/engine/aspect-patterns/index.js`)
calculates neither, computing only opposition/trine/square/sextile/quincunx.
The 2 overlapping pairs (`mars-neptune`, `mars-pluto`) carry different copy for
the same meaning and are duplicates to reconcile. Full reasoning:
`docs/decisions/2026-08-13-nonagen-and-status-reliability.md`.

Follow-up in scope: `normalizeAspect` in
`apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts`
currently maps `nonagen -> "nonagen"`. It must map `nonagen -> "semisextile"`,
and the union types should drop `nonagen` as an output value while keeping it
an accepted input alias.

**2. `status` is not a trustworthy authority signal. Do not gate on it.**
DRAFT files have a median of 625 characters of substantive prose against 474
for REVIEWED. 980 of 1,401 DRAFT files exceed the median REVIEWED file, 733 of
them synastry, which the owner has confirmed is finished work. A gate that
filters to approved-only would exclude the owner's own library. The authority
model must **replace** `status`, not read it as truth.

---

## Build: three layers

### Layer 1 — canonical catalog

Harden the existing index script. It maps native records to canonical
concepts. It does not authorize or select prose.

Required:
- **Deterministic output.** Remove `generatedAt` from the payload or move it
  outside the hashed region. Same inputs must produce a byte-identical file.
- **`--check` mode** that exits non-zero when the committed index is stale.
- **Source hashes.** SHA-256 per source file, recorded per record.
- **Fail loudly.** JSON parse failures and unsupported glob behaviour must be
  reported and counted, never silently skipped. `fs.globSync` availability is
  currently assumed; make the fallback explicit.
- **No invented ids.** Arbitrary body names are presently normalised into
  apparently valid ids. Unknown bodies must be reported as unresolved rather
  than coerced.
- **Resolve the remaining 232.**

### Layer 2 — governed evidence resolver

Given a target, surface, and register, return a bounded packet containing:

```
canonicalId
temporality                 temporary-window | lifelong-pattern | standing-between-two-people | dated-event
evidence[]                  meaning and fact material
  authorityClass            factual-evidence | owner-approved-prose | voice-exemplar |
                            negative-example | machine-proposal | unverified
  surfacePermission         which surfaces may use this record
  store, path, field, rowKey, sourceSha256
  text
voiceExemplars[]            permitted owner voice, marked as style not content
licenses                    surface-specific
exclusions                  doNotAssume, banned registers, surface bans
packetSha256
indexSha256
```

`authorityClass` is a new field derived from evidence, not copied from
`status`. Where authority cannot be established, the class is `unverified` and
the record is available for mechanism reference only, never as prose to
imitate.

Cross-surface leakage is a hard error: a Friends packet must not carry
synastry-surface prose as an exemplar.

### Layer 3 — universal pre-call gate

Integrate into `src/astro-writing/runWritingPipeline.mjs` **before any writer,
reviewer, or reviser call**. Every provider request must:

- carry a valid packet;
- record `indexSha256` and the selected evidence hashes in the billed-call
  ledger;
- stop before billing on missing, stale, unauthorized, cross-surface, or
  unresolved evidence.

`run-friends-transit-wave-comparison.mjs` must consume the same resolver.
Delete its private knowledge path at line ~136 (`sourcePacket`) and the
hardcoded `FACTORS` / `ASPECTS` constants; those become catalog records.

---

## Test batch — the point of all of this

After the three layers pass their tests, run **one bounded batch: the original
six comparison targets, Sol writer plus Terra reviewer, 12 successful calls
maximum, zero retries, stop on first failure.**

Those six already have drafts and Terra scores from the 130-character run, so
the only variable is input richness. Report a side-by-side of old and new Terra
scores per target.

Do not filter evidence to approved-only for this batch. Nothing serves; the
purpose is measurement, and the status labels are known unreliable. Record the
authority class of every evidence record used so the provenance of any
improvement is legible.

Ledger discipline as before: the existing log is at
`packages/astro-knowledge/review/friends-transit-wave-1-dual-provider-v1/billed-call-log.json`
with 77 successful calls recorded. Preflight must show exactly 12 planned calls
before any spend.

---

## Tests required before the batch

1. Index determinism — two builds byte-identical; `--check` catches staleness.
2. Aspect identity — `nonagen` resolves to `semisextile`; no nonagen ids exist;
   the runtime normalizer agrees.
3. Authority classes — every evidence record carries one; `unverified` records
   are never offered as voice exemplars.
4. Surface isolation — a Friends packet contains no other surface's prose.
5. Pre-call gate — a missing, stale, or unresolved packet stops before billing;
   assert no provider call is attempted.
6. Temporality — natal material in a transit packet is labelled
   mechanism-reference and cannot supply framing.
7. Preservation — ledger, the 33 existing drafts, protected artifacts, and
   serving content all byte-identical.

## Constraints

- No serving change, no approval change, no production hash pinned.
- Nothing becomes `servingEligible`; owner approval attaches to output copy at
  review, never inferred from input status.
- Do not bulk-edit `status` fields. Correcting them is a separate owner-led
  pass.
- Third-party material stays doctrine-only, voiced original, never in a prompt.
- Fail closed everywhere.

## Return

1. Index totals after hardening, with determinism and `--check` proven.
2. Unresolved count and what remains.
3. Authority-class distribution across indexed records.
4. Confirmation the Friends runner no longer has a private knowledge path.
5. Test results, all seven.
6. Preflight showing exactly 12 planned calls.
7. After the batch: old versus new Terra score per target, and the average
   writer-input character count before and after.
8. Confirmation of fail-closed status and that nothing was approved or served.
