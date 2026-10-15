# Connection transit detail

Owner-authorized separation, October 15, 2026. Scope: Friends chart Transits,
`detail=connection-transit-*`. This changes the detail assembly, not the approved
Between You Two list openings, their publication identities or other consumers.

The detail has three independent sources:

1. The complete existing personal transit meaning, selected through
   `normalizePersonalTransitSurface` for the activated endpoint. Its existing
   You/Friend perspective, source approval and calculated timing rules apply.
2. A directional `authored/connection-activation/{yourPoint}/{aspect}/{theirPoint}`
   passage. Only this exact key's published `body_you` serves. The reader is you;
   `{{holder1}}` is the friend. `body_they` remains an editorial field, never an
   automatic substitute. A reversed direction is another explicit key. Missing,
   empty, draft, retired or invalid copy hides that activation.
3. A calculated bridge from
   `fallback-template/connection-transit.bridge/{reader|friend}-endpoint`.
   The small structural defaults and licensed variables are declared in
   `apps/web/src/content/connectionTransit.ts`. Studio saves an independent
   versioned override through the normal package revision workflow. A retired
   or unavailable published override cannot resurrect a default. A bridge appears
   only with its published activation.

Studio exposes these under Connection Transits. The transit editor links to the
existing Personal Transits library. Connection Activations starts empty, with
no copied legacy synastry passages and no inherited approval. Connection Transit
Bridges opens the two separate template sources. Opening any editor is read-only;
saving a draft does not publish it. Normal authentication, version checks,
publication and public-reader projection remain authoritative.

Legacy `fallback-hook/synastry-pair/*` rows continue to serve their existing
Compatibility/Synastry consumers. They never fill a missing connection activation.
No rewrite or publication of activation prose is included in this implementation.

Verification: `npm run test:connection-transits`, the actual-handler roundtrip in
`npm run test:content-studio-api`, and
`npx playwright test --config playwright.connection-transit.config.ts`.
