# Natal writing path V4 — registry, entry point, and batch gates — 2026-08-13

Status: implementation and owner-review evidence. No reader-facing copy, approval state, serving state, auto-publish state, or writer-promotion state changed.

## Natal aspect registry

The natal writer now recognizes a dedicated registry under `packages/astro-knowledge/data/aspects/` for exact natal aspects involving Ascendant, Midheaven, North Node, South Node, and Part of Fortune. The registry contains **392** natal-only mechanism records.

Each record is generated from `AspectMeanings!AstrologySupport` in `TLDR-LL-KNOWLEDGE-MATRIX-V9-DIRECT-SECOND-PERSON-LIVED-PENDING-OWNER.xlsx` and carries its exact workbook row, cell, workbook SHA-256, and PDF page reference. The record contains no reader copy. It does not use or cite `data/synastry/aspects/`.

Coverage changed as follows:

| Scope | Before | After | Cleared |
| --- | ---: | ---: | ---: |
| All 713 unapproved LL V13 rows | 266 compliant | 579 compliant | 313 |
| WP1 Batch 1 | 51 compliant | 132 compliant | 81 |

The remaining **134 of 713** rows fail closed for unrelated inactive, absent, or unsupported placement/generic boundaries.

## Two entry points

`TLDR-VOICE-ENTRY-POINT-RULING-OWNER.md` was copied from the owner worktree byte-identically (SHA-256 `661fa3fac603eeeb860624f0032c25e459d316ed8dba2d7f8c720b04d82fb82c`). A compliant natal packet now emits two independent authoring tasks from the same AstrologySupport mechanism:

- Self: reader's own experience.
- Friend: what people in the room observe.

The Friend model input contains no self passage. The blocking contract now includes `friend_entry_position`, `pronoun_swap_derivation`, `friend_interior_access`, and `friend_coaching`.

## V4 gates

The abstract-subject grammar gate rejects an abstract quality acting as the grammatical subject. It also rejects deictic `here` when it points at the chart instead of a life situation. The four owner-supplied sentences for Mercury conjunct Neptune, Moon opposite Neptune, Moon trine Jupiter, and Moon trine Neptune are regression fixtures and all fail the gate.

The batch cadence gate fails when any opening two-word construction or closing three-word construction exceeds 15 percent.

Batch 1 V4 results:

| Voice | Largest opening construction | Rate | Largest closing construction | Rate | Result |
| --- | --- | ---: | --- | ---: | --- |
| Self | `a teacher` | 5.3% | `the blind spot` | 3.0% | PASS |
| Friend | `people notice` | 10.6% | `that is why` | 10.6% | PASS |

The strengthened V4 grammar/deixis precheck returned 23 supplied self candidates to mechanism-first drafting. The final V4 artifact contains **132 self candidates and 132 independently authored Friend candidates**, zero SOURCE_GAP rows, zero abstract-subject/chart-deixis failures, and zero Friend entry/derivation failures.

## Gate-effectiveness metric

The owner's semantic baseline was **34 of 51** V3 READY rows with observable material in only one sentence while the remaining sentences explained. The deterministic V4 observable-term proxy reports **53 of 132 self** candidates and **14 of 132 Friend** candidates. The baseline is an owner semantic observation; the V4 counts are precheck evidence only and are not editorial verdicts.

## Owner workbook

`TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V4.xlsx` preserves established columns A:O, carries both person contracts, labels deterministic results as prechecks, and leaves every original, self-V4, and Friend-V4 owner verdict/edit cell blank.

The separate owner-supplied `TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V4-OWNER-STYLE.xlsx` is retained byte-identically as input evidence (SHA-256 `6f76d76702e5a2fab9f8db18aebd0633d08a50ad5a593bfabcf141b6ae710da8`).

## Governance

- Unapproved rows remain unserved.
- Approved rows were not changed.
- All V4 prose is a review-gated candidate, not owner-approved copy.
- No generated artifact was merged across branches.
- Auto-publish remains off.
- Writer promotion remains unauthorized.
