# Content publication and retirement verification — 2026-09-07

This change prevents a retired Content Studio key from exposing older bundled or cached writing. It preserves the owner-approved Uranus and Chiron/Jupiter writing. The later owner-authorized Virgo macro recovery is documented below.

## Publication contract

`content_publications` is a durable, public-read lifecycle ledger for shared content keys. Each record contains Live/retired state, a monotonically increasing revision, and the exact published source row ID and PostgreSQL timestamp. It has no foreign key to the editable source: deletion cannot remove the lifecycle decision. Personalized content remains in its separate user-scoped store.

- Retire everywhere records a tombstone for the selected key; source deletion, demotion, and renaming also retain the old key's retirement when it was the selected publication.
- Imports cannot undo retirement or take publication away from a different selected source row. The verified bootstrap transaction records an initialization marker; afterward, unregistered imported rows cannot serve as overrides. Static bundled baselines remain available for keys without a publication.
- Publish again is an authenticated, version-checked action. The server checks reader eligibility and rejects draft/proposed/held copy. The existing owner Save & publish action can also explicitly restore publication in one operation.
- Publication RPCs are service-role-only. A client-supplied publication header is insufficient to restore content; the trigger also checks the database request role.
- Supabase timestamps retain microsecond precision when matching published versions.

The reader, Studio status endpoint, and effective natal preview consult this ledger. The natal preview loads the actual published source rows, rather than treating the editor's current inventory as authoritative.

Bundled fallback lookup treats a blocked publication as a terminal source gap. It cannot silently try the older generic passage underneath. Calculated Calendar/Sky aspect facts remain separate from the retired prose. This guard applies to the browser resolver, generated distribution, Node reference resolver, direct CMS surfaces, vocabulary, and tagline caches. Publication identities apply to reusable undated writing; dated generated instances retain their existing date-scoped selection.

Lifecycle records persist separately from body caches. They merge by revision, survive reload, and synchronize to already-open tabs. An older snapshot or an absent key in a later response cannot erase a retirement. The nightly offline exporter includes the same records and excludes rows that do not match their publication identity.

A disconnected device cannot learn a new retirement until it reconnects. Once it receives the record, retirement remains effective offline. A current publication whose body is unavailable is withheld; older writing is not substituted.

## Existing Sky mirrors

The production preflight found Sky mirror metadata still stamped `v3-2026-08-27a`. The current bulk partition and those imported rows do not agree, so raw Live labels cannot establish an authoritative publication.

The new Sky path selects individually published source identities, validates them against the current key manifest and reader gates, and caches those exact rows for offline use. Publishing or retiring one key does not invalidate unrelated writing. Before initialization, bulk mirrors retain their existing version and partition checks. After initialization, only canonical published Sky identities may override the local bundle. Partial overlays merge over the full local Sky partition, including when that partition loads after the override.

A read-only production preflight examined 6,371 raw Live/serving rows and identified 3,619 current reader-eligible Studio overrides. The authored-copy status comparison also now applies the same saved-body normalization as the reader. The bootstrap generator uses the selected source identity, not merely another row containing identical copy, and creates version-checked insert SQL for these identities only, preserving any concurrent publication or retirement. It does not automatically apply that SQL, promote drafts, or register obsolete mirrored copy.

## Verification

Passed:

- `npm run test:content-publications`: isolated PostgreSQL/PGlite migration, sticky retirement, delete/rename behavior, import protection, stale/deleted source rejection, explicit restore, role/header authorization, anonymous/authenticated write denial, and draft rejection.
- Real Node/browser/generated-distribution retirement of the Uranus exact passage and Chiron/Jupiter authored passage; no fallback to older assembly.
- Authenticated publication endpoint and effective preview tests, including server-side canonical source loading.
- Production-style Node ESM startup reaches authorization for status, publication, and natal-preview endpoints.
- `npm run test:content-studio-api`, including repeated saves, archive/restore, conflict handling, and the exact owner Uranus text in every house/motion.
- All 73 Content Studio/offline browser cases. The retirement editor works at desktop and mobile widths. Offline tests cover reload, stale snapshots, an already-open second tab, and a partial Sky publication preserving unrelated local writing.
- Web TypeScript, CSS/token audits, fallback package cache contract, and the existing offline-snapshot contract.
- Resolver distribution, manifests, and content book rebuilt. Authored source rows and owner-copy receipts unchanged.

Broader suite blockers already present in the starting revision:

- `test-content-unresolved-studio.mts` expects a nonempty governed queue; the committed queue has zero actionable entries.
- `test-natal-placement-sign-house-composition.mjs` expects 194 entries; the current owner-approved inventory has 195.
- `test-fallback-refresh-wiring.mjs` expects an older Chiron/Jupiter opening that has already been superseded in the committed source.

These assertions were not changed to conceal failures or restore old writing. The existing PR also has the previously recorded main-branch bundle-budget failures; budgets were not raised.

## Coordinated rollout

The production migration has **not** been applied and no real content has been retired during implementation.

1. Deploy the reviewed code from main. Before the table exists, publication actions fail visibly rather than claiming success; existing reader loading keeps its previous behavior.
2. Apply `apps/web/supabase/migrations/20260907180000_content_publications.sql`. It adds lifecycle metadata without rewriting prose. Generate the initial seed with `node --import tsx scripts/seed-content-publications.mts --out=/private/tmp/content-publications-bootstrap.sql`, review its eligibility counts, and execute that version-checked seed immediately after the migration. Its transaction installs the initialization marker together with eligible source identities. Never seed from raw Live labels.
3. Verify public read and denied public writes, record count, canonical owner-copy identities, and unchanged source checksums. Verify the live publication endpoint reaches admin authorization.
4. Refresh the nightly snapshot with `scripts/refresh-content-studio-last-known-good.mjs` and run its contract check. The export must include publication records; a failed publication read must abort the export.
5. Verify retirement/republication using isolated fixture content, then verify the protected owner passages and representative Calendar, Sky, Natal, and Friends reader surfaces.

Never roll back by deleting the ledger or removing tombstones. Keep publication records and identity-sequence state in database backups. A code rollback must retain the lifecycle guards or retired bundled prose could become visible again.

## Virgo New Moon recovery

The owner reported the old Virgo macro returning and asked on 2026-09-07: “Can this old and outdated copy be removed or replaced, so it does not show up again.” The exact rewrite was still present in Live Studio row `36e59565-46a7-491b-9e62-ec32df4b3acb`, updated `2026-09-07T08:20:26.999535Z`. The old passage remained in the local fallback source and both generated reader partitions; the offline snapshot contained no override for this key.

Replaced only `authored/sky-lunation-macro/new-moon/virgo` with the exact saved 249-word body, preserving its headline. Receipt: `docs/content-management/owner-copy/virgo-new-moon-2026-09-07.json`, SHA-256 `3c017d688f550206e4d49b017ce87417e9f04ad248c930f9907839c3c64200ec`. The bundled package version advances to `v3-2026-09-07c` to invalidate older cached package copies. Generated partitions, content book, and evidence hashes are rebuilt. Historical revision/audit records remain historical and are not reader fallbacks.

The dedicated regression checks exact body equality in Node, browser source, shipped resolver, and both generated partitions. A You-page browser regression checks the recovered opening and final sentence and rejects the old checklist opening. This is a prepared source replacement; production deployment remains pending.

The actual You-page regression passed after updating the legacy fixed-opening guard to recognize the recovered Virgo opening. TypeScript, CSS/token, package-cache, and publication regression checks also pass.
