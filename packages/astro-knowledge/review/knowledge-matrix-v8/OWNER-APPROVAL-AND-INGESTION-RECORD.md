# Knowledge matrix v8: owner approval and runtime-ingestion record

Date: 2026-08-09

Package: `tldr-astro-knowledge-matrix-v8-owner-approved-ingestion-ready.zip`

Runtime version: `v8-owner-approved-locked`

## Owner ruling

> Both tiers of the v8 matrix package are owner-authored. The owner rewrote and fixed the v5 rows; v8-locked rows carry a further owner read. Both tiers serve at runtime.

This ruling makes both serving statuses eligible:

1. `owner-approved-v8-locked`
2. `rewritten-owner-voice-audited-v5`

When candidates collide, the order above is the serving precedence. It does not authorize rewriting, cleaning, reflowing, relinting, event flattening, or substitution outside package coverage.

## Runtime source

The package JSONs are preserved byte-for-byte under:

`apps/web/public/content/knowledge-matrix-v8/v8-owner-approved-locked/`

| File | SHA-256 |
| --- | --- |
| `knowledge-matrix-v8-import-manifest.json` | `e13cef6d29112970a127dd89774ce81643e5e8b8e7f4b8be26f80790febf2895` |
| `knowledge-matrix-v8-owner-approved-build-report.json` | `1ba70bfa44997d1462a6d65994c161329347729c31f5c42c3a5ffb16bd6d393b` |
| `transit-meanings-v8-owner-approved-locked.json` | `1e918369505d41d2cf74d6e76a59704aa0550e8fc55d22b65b99b53a8f55a1a3` |
| `house-activations-v8-owner-approved-locked.json` | `f25074ea1f6eba38c2d12a3216f124b4d573c175bb374be28ea6ee3c69b2117f` |

The workbook remains the package's editorial source of truth. Runtime reads the two prebuilt JSON indexes and their manifest/build report; it does not rebuild or rewrite their copy.

## Coverage and exclusions

- Transit meanings: 318 primary keys, `planet|transit_sign|event_type`.
- House activations: 936 primary keys and 993 nested event entries, `rising|planet|transit_sign|house`, with `event_type` retained as the secondary key.
- Fifteen workbook source rows beginning `[EXCLUDE FROM FALLBACK]` or lacking a reusable planet-sign-house key are absent from the runtime JSON.
- A missing exact key returns no copy. There is no `Any` fallback, cross-sign fallback, cross-event fallback, or generic substitution.

## Hard validation gates

Runtime compilation fails when any package invariant fails:

- counts differ from the import manifest;
- a source key differs from its row fields;
- house events are flattened or their event key differs from `event_type`;
- a serving row has any status other than the two owner-approved statuses;
- an em dash, the word `whether`, or manifest-banned vocabulary appears;
- the package build report contains any warning.

The package version advances with the serving boundary. The public JSON is loaded only when the knowledge-matrix runtime is requested, so the 1,311 exact entries do not enter the initial JavaScript bundle.

## Flight-rule position

Development is complete on its own scope branch. Merge remains queued behind PR #129 and the Black Moon Lilith migration, with flight rule v2 requiring a rebase onto current `main`, fresh generated artifacts, and a renewed byte-identity audit immediately before merge.
