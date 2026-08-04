# Sky Placement on-demand fallback migration

Status: implemented in package `v3-2026-08-04b`; batch 2 remains staged and blocked from serving until deployment verification and a separate owner-approved serving diff.

## Boundary and chunk path

Sky Placement article inventories previously entered the static reader graph through `fallbackArchitectureV3Runtime.ts`. The generated placement hooks now live in `bundled-sky-placement-rows-v3.json` and are imported only by `fallbackArchitectureV3SkyPlacementBundle.ts`. Vite assigns the JSON and its partition manifest to the stable `fallback-content-sky-placement` dynamic chunk.

The App requests this boundary only for `sky/placement/*` and `sky/retrograde/*` detail routes. The production bundle gate fails if the placement chunk is absent or re-enters the static App graph.

## Source selection and reader behavior

- The existing resolver remains the only selection engine; no copy is re-authored or transformed by this migration.
- Reader eligibility remains limited to `approved`, `approved_reuse`, and `reviewed` rows.
- Continuous Sky Placement copy additionally requires a `serving` release in `sky-placement-serving-manifest-v1.json`. Editorial approval alone is not serving approval.
- While the route partition is loading, the detail article is withheld so a lower-priority source cannot flash before the exact approved source becomes available.
- If both the local route chunk and a valid cached/dashboard partition fail, the UI reports the error, offers Retry, and may show only the already-available approved standalone floor. Source gaps remain fail-closed.
- Entry, exit, prior-ingress, prior-residency, and engine key-date slots continue to be supplied at render time. The content partition contains no frozen reader-local dates.

## Package, dashboard, and cache parity

The generated package summary contains full, core, and `skyPlacement` content/key hashes plus the required runtime capability. Dashboard materialization assigns placement rows to provider `tldrastro-fallback-architecture-v3-sky-placement` and carries both full-package and partition metadata on every row.

Core and placement dashboard caches use separate schemas and keys. A cache is accepted only when its package version, runtime capability, partition content hash, key-manifest hash, key count, and reconstructed content all exactly match the bundled partition manifest. Any mismatch clears that partition cache and leaves the governed local bundle active.

## Batch 2 serving gate

Batch 2 is currently `staged`, with no approved keys and `migration_gate.status` set to `blocked`. Both manifest generation and dashboard materialization reject a batch-2-or-later serving release unless all of these are present:

1. `transition: staged_to_serving`;
2. `required_runtime_capability: sky-placement-on-demand-v1`;
3. verified deployment evidence (`deployed_package_version`, `verified_at`, and `source`);
4. an explicit owner approval statement, date, source, and exact `approved_keys` diff.

The serving transition must therefore be a later, reviewable change after this runtime package is deployed and verified. It cannot be inferred from editorial status or from this migration landing.

## Verification and rollout

Required order:

1. Build the resolver bundle and regenerate the full/core/placement manifests.
2. Run the startup, cache-parity, serving-gate, deferred-runtime, Sky Placement, typecheck, and reader-safety contracts.
3. Build the production web app and run `npm run qa:bundle`.
4. Deploy package `v3-2026-08-04b` with batch 2 still staged.
5. Verify route loading, retry/error behavior, local-time engine slots, dashboard fallback, and cache replacement in production.
6. In a separate owner-approved diff, record deployment evidence and only the exact batch-2 keys authorized to serve.

Bundle targets:

- Sky Placement fallback chunk: at most 150 kB gzip.
- Placement chunk in static App boot graph: 0 bytes.
- Existing App boot, App chunk, reader CSS, and total-reader budgets must continue to pass.

The first production build of this migration measured the route chunk at approximately 105.2 kB gzip and the App JavaScript boot graph at approximately 375.8 kB gzip.
