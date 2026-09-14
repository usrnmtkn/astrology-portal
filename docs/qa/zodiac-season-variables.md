# Shared zodiac season variables

Content Studio provides `{{zodiacSeason}}` and `{{zodiacSeasonPolarAxis}}` as full editable prose. Each sign owns two shared source rows:

- `fallback-hook/zodiac-season/{sign}`
- `fallback-hook/zodiac-season-polar-axis/{sign}`

The 24 structural starters are empty, unapproved editor records. This release does not generate or publish astrology prose, change existing templates, or modify approved source wording. The polar-axis source is specific to the current sign's season and its opposite sign; it does not reuse Full Moon axis writing.

In a Placement article, open **Variables → Editable phrase variables → Sign**. Insert keeps the token at the cursor. Edit opens the shared source; Save & return publishes it and restores the parent article, including unsaved changes. Saved drafts remain separate from the live source. The Sign section of the Writing Library also links to these shared sources. The general Variables rail exposes both tokens and all twelve sign sources for supported templates.

Resolution uses the selected sign. Natal planet/node/angle and house-context templates, sign-aware personal transit templates, compatibility same-sign/cross-sign templates, Placement articles and compositions, sign-specific lunar/seasonal Sky sources, and Calendar Moon phase/void/weekly-Moon writing use the same source families. Compatibility uses the reader's primary sign (`signA`), not the friend's sign. Signless templates do not accept these variables. Existing local Writing Library values and explicit same-sign hash-pinned references retain their existing behavior.

Both variables are optional until used. Publication requires a nonempty, approved source with a current live publication for every sign supported by the consuming template. Generic templates therefore require all twelve values for each token they use; a sign-specific article requires only that sign. Missing or retired values fail closed. Shared sources contain full prose without nested tokens. Publishing a shared source releases its approved wording to intentional references; source drafts cannot alter readers. Competing source versions retain exact-version conflict protection.

Verification commands:

- `npm run test:zodiac-season-variables`
- `npm run test:content-studio-api` (includes the actual shared-source CRUD and publication-to-reader round trip)
- `npx playwright test --config playwright.sky-article.config.ts`
- `npm run qa:css-audit`

The resolver is shipped as package `v3-2026-09-14c`. Node, browser-source, shipped-artifact and Studio tests cover all twelve signs, complete paragraphs, missing sources, published revisions, cursor insertion, source editing and return, and saved token preservation. Tests use isolated storage and synthetic prose.

## Studio delivery size

The variable catalog now loads when an editor opens. Using the GitHub workflow's Supabase configuration, isolated main `ffe17d962` measures 620.8 kB raw / 178.6 kB gzip at entry and 452.4 kB aggregate gzip. This feature measures 608.8 kB raw / 176.3 kB gzip at entry and 457.0 kB aggregate. The startup download is smaller; the full editor feature adds 4.6 kB aggregate. Allocate 5 kB aggregate for the requested cross-surface controls while keeping the initial-entry, largest-chunk, memory-graph, lazy-boundary and forbidden-payload limits unchanged.

## Reader delivery size

The post-merge Visual smoke check for #813 identified the shared runtime's web bundle cost. An isolated build of pre-feature main `a6f21d663`, with its own dependencies and the workflow's Supabase environment, passes the previous budgets at 425.7 kB JavaScript boot and 475.3 kB reader boot. The feature initially measured 429,578 and 479,202 bytes respectively, with 3,061,247 aggregate JavaScript bytes.

Marking the structural editor starter initializer as pure removes its unused initialization from the shipped reader artifact. The editor/API still retain all 24 empty source starters; resolver behavior and approved copy are unchanged. The optimized build measures 429,403 JavaScript boot bytes, 479,027 reader boot bytes, and 3,061,073 aggregate JavaScript bytes, saving 175 compressed bytes. Allocate 4 kB to each startup budget and 3 kB aggregate for the requested cross-surface runtime. Initial CSS remains 49.6 kB; CSS, individual chunk, deferred-source boundary and timing limits are unchanged. No dependency was added.

Verification includes `npm run qa:bundle`, all-sign Node/browser-source/shipped-artifact tests, the unfiltered Content Studio API suite, and the deployed Studio browser flows. Production tests use an isolated actual API handler and synthetic prose; they do not write test content to the live store.
