# Admin bundle budget change note — 2026-08-28

The Content Studio Composition Map repair raises the Admin JavaScript budgets:

- entry gzip: `133,000` → `138,000` bytes
- aggregate gzip: `165,000` → `182,000` bytes

The measured production build is `134.8 kB` entry gzip and `175.4 kB` aggregate gzip. The increase covers contextual atomic-source guidance, explicit template-to-resolver lineage, honest preview verification, the runtime-parity/catalog QA shipped with this repair, and the app-wide inventory of 24 surfaces and supporting systems. Composition Map and its model remain lazy dynamic entries; the bundle gate still verifies that deferred content data is absent from the entry chunk.

These limits leave approximately two percent entry headroom and 3.6 percent aggregate headroom. Future increases require another measured change note or a code-splitting reduction.
