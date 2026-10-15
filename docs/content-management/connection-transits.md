# Connection transit detail

Owner-authorized separation, October 15, 2026. Scope: Friends chart Transits,
`detail=connection-transit-*`. This changes the detail assembly, not the approved
Between You Two list openings, their publication identities or other consumers.

The detail has three independent sources:

1. One complete existing authored personal transit-aspect unit for the activated
   endpoint. `connectionTransitReading` selects the same contact's situation,
   exact aspect or matching hard/soft family, preserving exact-before-family
   pass/variant priority. It never selects returns, reversed or generic contacts,
   other aspect families or composed fallback templates. Existing source approval
   and calculated timing rules apply; the friend view requires authored friend copy.
2. A directional `authored/connection-activation/{yourPoint}/{aspect}/{theirPoint}`
   passage. Only this exact key's published `body_you` serves. The reader is you;
   `{{holder1}}` is the friend. `body_they` remains an editorial field, never an
   automatic substitute. A reversed direction is another explicit key. Missing,
   empty, draft, retired or invalid copy hides that activation.
3. A calculated bridge from
   `fallback-template/connection-transit.bridge/{reader|friend}-endpoint`.
   The small structural draft starters and licensed variables are declared in
   `apps/web/src/content/connectionTransit.ts`. Studio saves an independent
   versioned source through the normal package revision workflow. Starters never
   serve before their own approval and publication. A retired or unavailable
   bridge stays hidden. A bridge also requires its published activation.

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
