# Sky Placement composition bundle allowance — 2026-09-08

PR #691 adds the requested Reader preview, Main template, and Assembly interfaces for Sky Placement articles and fallback hooks. The aggregate JavaScript gzip allowance increases from 302,000 to 305,000 bytes (3 kB, under 1%). The entry gzip, entry raw, and largest-chunk limits remain 175,000, 616,000, and 616,000 bytes respectively.

The CI build of commit 1e28b725 measures 303.9 kB aggregate gzip, 174.1 kB entry gzip, and 613.2 kB entry raw. The separate SkyPlacementComposition chunk measures 3.5 kB gzip / 10.3 kB raw. The local build measures 303.7 kB aggregate and 173.9 kB entry gzip; the small difference comes from build environment configuration. The new total limit leaves about 1.1 kB aggregate headroom over the measured CI build.

This is an allowance for the new editor interface, not a change to startup or content-payload budgets. The bundle gate now explicitly requires SkyPlacementComposition to remain a dynamic entry, alongside CompositionMapWorkspace. Existing deferred-group and forbidden-content checks remain enforced. Source records continue to load through the existing API; the canonical corpus is imported only by regression tests, not the browser component.

Validation: the six placement composition checks and all twelve Daily Sky Summary behavior checks passed in CI. The summary job failed only at its subsequent aggregate bundle-size gate, leading to this measured adjustment.
