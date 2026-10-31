# Fallback horoscope library

Content Studio → Horoscopes → Fallback horoscopes opens the shared reusable horoscope sources at `/admin/content#horoscope-fallbacks`.

The library filters planetary placements, New Moons, Full Moons and eclipse components by planet/point, sign and rising sign. Search and source selection retain the complete passage. A source link identifies the canonical key in the URL; reload reopens that source. Loading, catalog failure, passage failure and empty filters have explicit states and retry actions.

The current catalog contains 1,314 complete source units: 984 placement house horoscopes, 288 ordinary RATM lunation passages and 42 released eclipse components. All 14 supported planets and points have authored coverage. This is the available authored inventory, not a claim that every possible planet × sign combination has prose. Missing combinations remain visibly empty. The held whole-card eclipse drafts are not eligible source units.

`house-horoscope-core/…` and ordinary RATM keys use the same saved-row preference as Sky Placement's related horoscopes: a saved source wins over its package starter, and the newest saved version wins among duplicates. Browsing does not create database mirrors. The library hydrates full documents and invokes the existing version-checked editor and owner publication action. Sky's house preview includes the saved package draft, and links back to its exact library source. Its publication badge still describes reader eligibility separately.

Save draft keeps a revision private. Save & publish validates and publishes the exact saved revision. Dated article horoscope sections retain their existing precedence over reusable fallbacks. No resolver selection, approved source body, chart calculation or writing profile changes are part of this interface change.

The owner requested exclusion of tarot from horoscope write-ups on 2026-10-31 in `thread:01a189cd-3bdd-75f2-8843-02aafc84e64f`. Publication rejects explicit Tarot/Tarotscope or Major/Minor Arcana references in these fallback source families, including the older Publish again action. Draft saving preserves full originals and proposed wording. The owner separately authorized holding the 123 known RATM passages containing those references; publication-ledger tombstones prevent bundled originals from returning while replacements are being written. This is a publication hold, not deletion or editorial rewriting.

## Verification

- `scripts/test-fallback-horoscope-studio.mts` verifies all source identities, whole-sign house mappings and matching library/Sky selection under duplicate versions. Actual API handlers exercise retirement, draft save/reopen, rejection through both publication actions, unchanged originals, clean-rewrite restoration and exact reader output using isolated storage.
- `tests/visual/fallback-horoscope-studio.spec.ts` verifies parent/child discovery, complete source opening and ending, filters, catalog/passage retry, empty results, selection after reload, draft save/reopen, publication rejection, clean publication and the rendered lunar reader. A second journey edits a planetary fallback through both library and Sky Placement, verifying the same single saved source.
- Both journeys cover 390/1440 widths and light/dark themes. The shared page-header typography is compared with Horoscopes, and the additional library heading uses the existing screen-reader-only treatment.
- The spec runs in the existing lunation-source-wiring workflow and its browser release aggregate. The actual-handler regression runs in the unfiltered Content Studio API suite.

Local results, exact tested revision, bundle measurements and production verification belong in the release record. A source or fixture pass alone does not establish deployment.
