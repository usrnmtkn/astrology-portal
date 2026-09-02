# SKY V4 continuous corpus correction — verification

Release checks:

- exactly 120 unique continuous placement keys
- all 120 TLDR What, TLDR Takeaway, Hook, Lived, and Turn fields are nonblank
- only Sun in Virgo and Mercury in Virgo replace the long-form placement article; the other 118 long-form articles remain on the historical canonical baseline
- zero verbatim or >= 0.80 near-duplicate fallback/article sentences in the approved review audit
- the deferred SKY V4 reader route applies the approved correction before rendering
- no runtime prose synthesis
- historical canonical package SHA-256 remains `9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750`

Owner approval authorizes serving after repository tests and CI pass.
