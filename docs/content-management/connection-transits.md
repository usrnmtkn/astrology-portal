# Connection transit detail

Owner-authorized separation, October 15, 2026. Scope: Friends chart Transits,
`detail=connection-transit-*`. This changes the detail assembly, not the approved
Between You Two list openings, their publication identities or other consumers.

Calculated evidence is also shown under “Why this involves [friend]”, independently
of those prose sources. It identifies the natal endpoint receiving the transit
and lists that endpoint's actual grouped synastry contacts, including aspect type
and orb. The cards and detail use “may bring your existing connections into focus”
wording. Direct transits to both charts are identified only when the same moving
planet independently aspects the opposite endpoint in the current calculated
transit inventory. These facts include their own aspect and orb, independently of
card caps and prose publication. Other connections are explicitly described as
connections through the natal endpoint; their synastry aspects do not imply a
direct transit to the other chart. Missing or unpublished activation/bridge prose cannot hide these facts.
This factual section does not supply a missing interpretation or change publication
eligibility; all three prose-source boundaries below still apply.

In Read More, the outlined “Why this involves [friend]” button opens these facts
in a dialog. Its groups separate the primary transit, independently calculated
transits to the other chart, the natal connections to those same points, and
remaining connections through the natal endpoint. Each row retains its aspect
glyph, complete title and exact orb. The dialog also retains the primary
placement/house description and the indirect-connection caveat when applicable.

The detail has three independent prose sources:

1. One complete existing authored personal transit-aspect unit for the activated
   endpoint. The existing personal transit normalizer selects a source identity.
   `connectionTransitReading` independently admits only the same contact's
   authored transit-aspect situation, exact aspect or matching hard/soft family.
   It reads that complete source body directly, never the normalizer's composed
   or adapted output. Returns, reversed or generic contacts and other aspect
   families cannot supply this paragraph. Existing source approval and calculated
   timing rules apply; the friend view requires its own authored friend body.
   The released Moon rotation and canonical point aliases apply within that same
   exact/matching-family scope; retired selected identities cannot shift to another passage.
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

Connection details retain their existing reader source owner while the article is
open. The underlying panel is hidden and inert; navigating away releases it and
aborts any caller-owned read. Public source-key reads can be reused across charts,
but article variables and route selection remain chart-specific. Publication
changes and explicit content-update notices refresh independently of the parent's
asynchronous fallback-library load version.

The retained subtree also pauses its out-of-tree modal, menu and tooltip portals.
Modal children remain mounted so unsaved form values and the focused field can
resume. Chart editing returns focus through an explicit chart-owned control ID.
The existing placement failure notice and retry control share the article shell;
from a connection article, only an explicit retry requests those Sky sources.
