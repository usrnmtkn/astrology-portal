# Sky evergreen sections: audit and release evidence

Baseline: `origin/main` at `26ff5cb9353238a6277d6eaa8d8275763fe7d00e` (PR #694), fetched before this work. Work branch: `codex/sky-evergreen-sections`. This audit uses the current source, generated package, and app consumer separately.

## Which system the editor manages

The Saturn editor in the screenshots manages canonical SKY V4. `sky-placement/article/saturn/aries` contains the shared article, two TLDR fields, and the evergreen `fallback.hook`, `fallback.lived`, and `fallback.turn` fields. `sky-placement/retrograde/saturn` supplies a separate opening shared across signs. The article source is shared by direct and retrograde pages; selecting retrograde does not replace its fields with retrograde-only writing.

The source stage file's `servingEnabled: false` is historical staging metadata, not a current Live status. The canonical release/approval files, reader source-reference corrections, and exact current publication determine serving. Release verification finds 280 released reader records (including 120 continuous planet/sign articles) and 25 configuration records. Their approved source prose is unchanged by this release.

The older V3 system still exists in `renderTransitSynastry`. Its `fallback-template/sky-placement-frame-v3` is not the template controlling the V4 editor. On this baseline the source inventory still has 168 rows in each hook/lived/turn/tagline family, and 11 `sky-sign-copy` rows marked `needs_review`. These inventory counts do not establish which writing the app selects. Claims from the August checkout about all 168 current pages cannot be applied to the V4 route.

The app resolves V4 through `fallbackArchitectureV3SkyPlacementBundle.ts` and `createPublishedSkyReader`; the folder's V3 name does not mean the active prose is V3. The previous `skyPlacementPreview=fallback` URL explicitly bypassed V4, which made the reader preview disagree with the source editor. It now selects V4's evergreen tier.

## Final behavior

- The full placement article retains priority. Evergreen is reusable placement prose, without a birth chart or live generation requirement.
- A canonical continuous source can save `fallback.sections`, an ordered list of existing field references and additional text sections. An absent list preserves the original order. An explicit empty list preserves the decision to show no evergreen prose.
- Studio can add a section, name it for editorial organization, edit its body, move it up/down, and remove an added section. Names are never rendered as reader prose. Empty sections are omitted.
- The Composition Map, canonical preview, reader route, and published revision projection share the same ordered source helper.
- The retrograde opening remains separate. Calculated dates, aspects, and rising-sign horoscopes retain their existing reader sections.
- All-empty canonical publications retain their identity through the reader loader, so clearing the article and evergreen tier does not reveal an older bundled article. Current-sky prose validation still applies to nonempty writing; an intentionally empty body does not require a prose time anchor.
- Legacy V3's optional planet/sign lore now skips missing optional rows. Required prose, unresolved-slot errors, publication retirement, and approval gates remain intact.

No approved astrology source, review approval, or source baseline was rewritten. Generated package version is `v3-2026-09-08b`; manifests and the knowledge index were regenerated, and the content book was rebuilt with no output changes.

## Verification

- New API roundtrip: canonical source create/save/publish, second edit/publish, structured section order, blank section, deliberately empty layout, exact publication refresh, actual dashboard loader, installed reader payload, and immutable original.
- Source and shipped-dist resolver agreement; V3 missing optional lore agreement across Node/browser source/dist.
- V4 canonical stage, continuous approval, reader approval/release, Studio lifecycle/POV, and production-parity preview checks pass.
- Existing Content Studio API lifecycle suite passes, including stale edits, concurrent first save, archive/restore and guarded delete.
- Fresh browser builds: 8 existing Studio checks plus 4 new evergreen add/reorder/clear/publish-twice/reopen checks, and 4 rendered reader evergreen checks at 390/1440 widths in both theme contexts. Studio keeps its established fixed palette; reader themes differ. Screenshots inspected; no horizontal overflow and shared typography assertions pass. Normal Saturn article opening/final sentence remain present after leaving evergreen preview.
- Typecheck and CSS/token audit pass. Fresh Admin and full web builds pass.
- A stale static assertion expecting aspects inside the article was updated to the already-shipped separate aspect section contract; rendered ordering remains covered by the reader browser suite.
- After regenerating the package-hash index, the full `test:content` command reaches the pre-existing Friends owner-signoff payload hash assertion (`test-friends-owner-signoff-ruling.mjs:161`). Its script and all source/approval inputs are unchanged by this branch. No assertion or approval hash was changed.
- The independent immutable `test-content-contract.mjs` also stops on the pre-existing bare V3 `sun/aries` SOURCE_GAP. The main commit's shipped renderer reproduces that exact failure with the same adapter inputs. The arbiter and adapter are unchanged. These broad legacy failures are not reported as passing.

## Bundle allowance

Fresh CI-environment measurements before the final small loader restriction: Admin aggregate 307,626 bytes gzip (entry 174.9 kB gzip, 615.4 kB raw); complete web aggregate 2,930,973 bytes gzip. The deferred editor remains independently loaded. No corpus was added.

Admin's aggregate allowance increases from 307,000 to 309,000 bytes; the full web aggregate allowance increases from 2,930,000 to 2,933,000 bytes. Entry, boot, CSS, and individual chunk limits stay unchanged. The final build must pass these bounds.
