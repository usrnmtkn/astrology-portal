# Chiron and Nodes runtime/serving promotion proposal

Status: **held for explicit owner serving approval**. This proposal has not changed runtime eligibility, serving rows, manifests, or generated packages.

## Runtime-eligibility flips

- `chiron-aries`: `runtimeEligible: false` → `true` (REVIEWED)
- `north-node-aquarius`: `runtimeEligible: false` → `true` (REVIEWED)
- `south-node-leo`: `runtimeEligible: false` → `true` (REVIEWED)

## Exact serving transition

- `fallback-hook/sky-sign-copy/chiron/aries` — sky-placement-batch-4-chiron-aries-owner-approved-v1; article SHA-256 `130da3053ed152ef6958075c45a1101001f42fa86e9ce8037f8977bbef635e3d`
- `fallback-hook/sky-sign-copy/nodes/aquarius-leo` — sky-placement-batch-4-nodes-aquarius-leo-owner-approved-v1; article SHA-256 `f54bc749dc54fe7cca1c279aca0acc3712a51b44d40e587d501d948d05e60262`

## Deployment evidence

- Package: `v3-2026-08-04g`
- Vercel: `dpl_Cc7eZBaDB4qgWB7TtxxXncS4fhXW`
- Runtime capability: `sky-placement-on-demand-v1`
- Current fallback content hash: `91d393e81ef6d9cc2242dcc20dc28cb8`
- Current key manifest hash: `388652c251d27bfe839cb88410247812`

The companion JSON contains the exact approved article payloads. Applying this proposal requires a new, explicit owner serving approval.
