# Governed approvals and the approved-serving projection

This document defines how mutable owner decisions are joined to immutable source
material without exposing pending records to the reader package.

## Boundaries

The system has three distinct stores:

1. **Authoring sources** contain immutable corpus records, historical versions,
   candidates, and pending rows.
2. **Approval applications** contain owner decisions validated against the exact
   source hashes the owner reviewed.
3. **Approved-serving projections** contain only rows that the reader package may
   consume. They are generated artifacts and are never edited by hand.

The local V3 package partitions are the approved-serving projection. The build
selects the latest governed reader-eligible row for each content key and removes
pending variants and pairings before writing the bundled partition files. The
runtime validates `approved-serving-projection-v1.json` against the package
manifest, then applies its existing review filter again as defense in depth.
Serving modules import only generated `bundled-*.json` projection files; they do
not import mutable `source-rows/` files. Authoring-source coverage and provenance
assertions run in the generator and governance tests before those artifacts exist.

The projection accepts these review states:

```text
approved
approved_reuse
reviewed
```

Content families that require exact owner approval must also carry the structured
approval record required by `readerEligibility.*`. A status value alone cannot
make those families eligible.

## Authority classes

Provenance is not limited to a verbatim published-book match. A serving record may
be grounded in one of these authority classes:

- an immutable published-corpus passage;
- exact owner-authored wording;
- an owner-approved adaptation;
- an explicit owner-doctrine ruling.

The row must identify the applicable authority through its existing source and
approval metadata. Corpus similarity is not a substitute for approval, and a lack
of corpus n-gram overlap does not invalidate exact owner-authored wording.

## Approval queue and set

`approval-queue/v1` describes the questions placed before the owner.
`approval-set/v1` is the owner's exported response. The schemas live in
`packages/astro-knowledge/governance/`.

For span decisions, the queue stores the exact text and the first 16 hex characters
of its SHA-256. Character offsets are not authoritative. A changed or missing span
must be reviewed again.

Apply a set with:

```bash
npm run content:apply-approvals -- \
  --queue=/path/to/approval-queue.json \
  --approvals=/path/to/approvals.json \
  --out=/path/to/approval-application.json
```

The command validates every submitted decision before writing anything. It emits
one `approval-application/v1` record using an atomic same-directory rename. Any bad
ID, disallowed choice, stale hash, re-derived omission boundary, or empty required
owner rewrite rejects the entire application.

An incomplete approval set is legitimate. The decisions it contains are validated
and emitted as one atomic application; every omitted queue item appears in the
application's unresolved list and remains pending. This is not partial failure.

## Generated review desk

The review desk is generated from a queue rather than coded per content family:

```bash
npm run content:build-approval-desk -- \
  --queue=/path/to/approval-queue.json \
  --out=/path/to/approval-desk.html
```

The standalone HTML exports `approval-set/v1`. It does not write to source rows,
change review statuses, or publish content.

## Unresolved content report

`npm run build:content-unresolved-queue` scans the current V3 authoring sources and
writes `packages/astro-knowledge/generated/content-unresolved-queue-v1.json`.
This report is an inventory, not an approval grant. It records source paths, object
paths, statuses, reasons, and source hashes for rows excluded by reader governance.

## Cards and semantic retrieval

Horoscope cards continue to resolve by calculated astrology and canonical content
keys. Similarity or embedding search must not be added to the serving-card path.
Semantic retrieval may be introduced later for a cited reader Q&A product, with a
similarity floor and clean refusal, but it cannot choose horoscope copy.
