# Personal-transit fallback acceptance

The coverage audit previously equated a non-`authored/` template key with reader
rejection and never called the reader adapter. PR #708 corrected the application
gate, but that audit still reported valid evergreen writing as unavailable.

`scripts/audit-you-transit-detail-coverage.mjs` now bundles the actual App reader
adapter and shipped content runtime together. For 938 supported transit identities,
it checks You and Friends voices in both direct and retrograde inputs (3,752 cases).
These are content-routing fixtures, not ephemeris assertions. Every successful
resolver result must retain its complete meaning body in the reader and provide
a nonempty card preview. Evergreen compositions retain fallback provenance.

Results on main `e1765334`, with the audit changes: 2,940 authored cases, 804
approved composition cases, zero rejected selected passages. Eight cases are the
existing Sun/Sun and Uranus/Uranus return gaps across the four voice/motion inputs.
Those return identities have no eligible return unit in this runtime; ordinary
conjunction copy must not substitute for them. Any additional source gap now fails
the check. Supplying eligible approved return copy can close the existing gaps.

Lifecycle tests also verify draft or absent CMS mirrors preserve the approved
local Lilith–Pluto passage; retired hooks and templates remain unavailable; old
publication revisions cannot undo retirement; explicit newer republishing restores
the passage; and retiring an exact Chiron–Jupiter source never exposes generic
copy underneath or suppresses unrelated Lilith writing.

The audit runs in `npm run test:reader-copy-repair`, already part of the required
Visual smoke workflow. The existing browser regression in
`tests/reader-recovery/reader-recovery.spec.ts` continues to cover the rendered
Lilith–Pluto card, full detail, reload, and mobile layout. This change adds release
protection only; it changes no application code, prose, approval, or publication.

Validation: `npm run test:reader-copy-repair` passes. A temporary test bundle with
the old authored-only filter restored fails at the resolver-to-reader comparison,
confirming that this check detects the original defect.
