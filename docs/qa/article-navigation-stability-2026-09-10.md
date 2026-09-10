# Nested article navigation and refresh

Owner report: Codex task `01a089dd-57dc-7882-951e-69b0888197e5`, September 10, 2026. Screenshots show Lilith placement aspect links changing the URL without replacing the displayed article, Back skipping the placement, and refreshes temporarily removing writing.

The release explicitly routes nested Sky links, stores the immediate parent on the browser entry, and gives nested natal aspects their own URLs. Back, Forward and reload resolve the same calculated natal aspect inventory used by the placement. Same-route refreshes retain eligible cached detail rows while replacement content loads, allowing newly available approved local sources to render immediately; incomplete hydration no longer marks the refresh complete. Failed requests recompose approved local sources with still-eligible cached detail rows. Offline regressions reject superseded and retired rows and preserve the full approved Sun–Lilith passage.

The production baseline fails both new navigation regressions: Sky Back returns to `#sky` instead of the Lilith placement, and a nested natal aspect has no aspect route. Local verification covers the destination `#sky-detail-title`, both Sun–Lilith and Mars–Lilith links, one-level Back, natal Forward/reload, and observed DOM stability during focus/content revalidation in four theme/viewport combinations. Existing Sun placement refresh tests remain included.

TypeScript, web build, bundle limits, CSS audit and Calendar exact-aspect parity are release checks. No content source or approval record changes. The full content suite has an existing Friends historical payload-hash mismatch at `scripts/test-friends-owner-signoff-ruling.mjs:161`; the older separate Sky phrasebook gate expects 248 exact records while main contains 439. Those source inputs and gates are unchanged.

Production deployment and final live-browser verification are recorded on the pull request after merge.
