# Natal aspect fact-boundary repair — 2026-08-12

## Reported regression

The You natal placement page rendered `Mercury Sextile Chiron` even though that contact was not present in the person's fixed natal chart. The same trust path was available to Friend natal surfaces.

## Root cause

Natal reader components treated the incoming `SkySnapshot.aspects` array as authoritative. A stale, transit-timed, or cross-surface-hydrated aspect row could therefore be displayed under `NATAL ASPECTS` even when the snapshot's fixed natal longitudes did not support that geometry.

## Repair

`apps/web/src/services/natalAspectFacts.ts` establishes one fail-closed reader boundary. It:

- accepts only canonical natal points with a finite fixed position;
- reconstructs the same fixed longitude from a valid sign and degree when a legacy saved chart omits the redundant absolute-longitude field;
- recomputes aspects from those fixed longitudes with the canonical sky-aspect engine;
- canonicalizes the node axis; and
- deliberately ignores every incoming aspect record.

The boundary is used by the You natal list, You placement details, You natal wheel, Friend natal list and placement details, and Friend natal wheel. Sky, transit, synastry, and composite surfaces are unchanged.

## Regression gate

`scripts/test-natal-aspect-fact-boundary.mjs` injects the reported false Mercury–Chiron record plus a transit-prefixed record, proves that incoming records cannot change the derived result, verifies the expected natal geometry, and statically guards every You and Friend natal call site. It is wired into `npm run test:content`.

No serving copy, approval state, auto-publish setting, or writer-promotion state changed.
