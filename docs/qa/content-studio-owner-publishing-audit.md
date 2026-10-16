# Content Studio owner publishing audit

Owner request, October 15, 2026: “do the full content studio audit and fix publishing everywhere. i should be able to publish my own content from any editor. test every flow and deploy the fixes.”

## Acceptance contract

An authenticated owner's explicit publish action approves the exact saved reader wording. It does not require a model's prose verdict, an unrelated review-status dropdown, or an artificial edit to an unchanged saved draft. Generated drafts and automated publication retain their existing editorial policies. Publishing never rewrites or compresses the author's content.

Technical publication requirements remain: owner authentication, the opened source version, a valid reader identity/destination, complete required fields/audiences, signed calculated windows, valid variables, current dependencies, exact publication state, and separation of reference material from finished copy. A source-only editor must lead to its owning reader editor or composition workflow; saving reference material is not a successful reader publication.

## Distinct editor paths and evidence

The matrix describes editor flows, not an assertion that every possible astronomical key or existing production record has been tested. All write tests use isolated storage and synthetic content. The release requires the complete unfiltered API gate and browser release gate on its exact head, plus deployed-asset verification.

| Editor/path | Lifecycle and reader evidence |
| --- | --- |
| Standalone Articles & Guides; new/saved articles | `content-dashboard-admin-user-flows`, `article-library`, actual generic handler CRUD |
| Compiled Sky article editions and revisions | `studio-article-memory`, `sky-placement-article-save`, actual immutable edition publication and reader selection |
| Sky aspect manual copy and saved revisions | `studio-owner-publishing`, `test-studio-owner-publication`, `review-queue-workflow`; explicit owner approval without a fabricated model/lint pass |
| Sky placement reusable source/legacy review | `sky-placement-legacy-editor`, `sky-secondary-editor-crud`; owning serving article editor, no false Live claim for import-only material |
| Canonical placement articles, fallback sections, Moon writing, sentence composition | `sky-summary-studio`, `content-dashboard-admin-user-flows`, `test-sky-placement-studio-api`, package revision handler and shipped reader |
| Natal placement introductions, signs, houses and exact overrides | `studio-owner-publishing`, natal finder cases in `content-dashboard-admin-user-flows`; unchanged saved Draft is publishable |
| Natal aspects | `studio-owner-publishing`, `test-natal-aspect-content-studio-serving`; exact owner metadata and complete reader copy |
| Personal Transit shared/exact/six-part/return; You and Friend | `studio-owner-publishing`, `personal-transit-copy-versions`, actual-handler roundtrip and shipped resolver |
| Combined House Transit; You/Friends, shared/retrograde/legacy | `house-transit-combined-editor`; save/reopen, publish unchanged draft, failed second source, conflicts, lost replies, full copy |
| Synastry and compatibility exact/directional passages | `studio-owner-publishing`, `compatibility-aspect-create`, actual-handler roundtrip and both reader directions |
| Composite and relationship-type variants | `studio-composite-review`, `content-dashboard-admin-user-flows`, actual generic handler |
| Astro 101 chapter/article | `studio-formatting-publication`, `astro-101-reader-recovery`; draft/live transitions, formatting and reopened reader |
| Daily/Weekly/Monthly/Seasonal horoscope editions | `test-horoscope-owner-publication`, `horoscope-review-recovery`, `studio-dedicated-editor-routing`, horoscope browser suites; exact copy and signed windows |
| Dated New/Full Moon and eclipse writing → reader article | `lunation-writing-studio`, `studio-dedicated-editor-routing`, `test-lunation-studio`, `test-lunation-saved-writing` |
| Reusable New/Full Moon sign macros, including new keys | `studio-owner-publishing`, `calendar-review-queue-api`; actual publish and Calendar reader hydration |
| Calendar aspect base/retrograde/directional content | `calendar-review-queue-api`, `calendar-aspect-create`, `calendar-aspect-retrograde`, actual SQL publication lifecycle |
| Calendar planetary transitions and Moon sources | `calendar-planetary-studio`, `calendar-moon-editor`, actual ingress source/reader tests |
| Calendar complete passages: day/week/month; shared/date | `calendar-passage-editor`, `test-calendar-passage-editor`; draft isolation, source changes, publication and reader selection |
| Calendar overview/transition templates | `calendar-summary-studio`, `calendar-template-preview`, `calendar-season-transitions`; source editor and calculated composition |
| Sky summary, supplied copy, Moon/day, forecasts and debility | `sky-summary-studio`, `sky-forecast-studio`, `test-sky-daily-summary`, `test-admin-daily-glance-studio`; source save/publication and real composition |
| Template/vocabulary/phrase/composition source editors | `studio-variables`, `studio-variable-crud`, `studio-owner-publishing`, actual template/variable validation and package CRUD |
| CSV offline edits and batch publishing | `studio-csv`, `test-studio-csv`; explicit publish marks, version checks, partial-failure receipts and reopen |
| Aspect-pattern authored write-ups | `test-aspect-pattern-writeups-admin`, runtime/fallback tests; draft/review/approved lifecycle and reader eligibility |
| Delivered-report unit corrections | `test-generated-report-correction`, report-reader contract; private correction draft and explicit publication |
| Source library, writing guidance, experimental variant-family drafts | Source-only boundary tests, `sky-secondary-editor-crud`, `review-queue-workflow`; no direct publication of unused/reference records or accidental generation |
| Shared publication recovery and retirement | `studio-publication-recovery`, `test-studio-owner-publication`, publication API/concurrency suite; confirm current availability without replaying writes |

## Fixes

- Eligible package drafts expose a direct owner publish action even when the saved text has not changed and its review status is still pending. The action stages exact copy and uses the existing version-checked package publication handler. Personal-transit specializations keep their established approval actions.
- The inline natal source editor can publish an unchanged saved Draft rather than requiring an artificial edit.
- Sky aspect authors can save and publish their wording explicitly. The server derives canonical card identity and records an exact content hash. Editorial lint/model judgments remain visible evidence for the existing check-based workflow, not permission to override the owner's explicit wording decision.
- Horoscope publication uses the same explicit owner action. Current reader facts and signed window integrity remain checked; author punctuation and vocabulary are not automatic-publication vetoes. Paid generation and its semantic admission are unchanged.
- Approval receipts are server-created, bound to all saved reader fields, and cannot be supplied by a client to approve changed wording. Reader projection exposes only the required receipt fields.
- An uncertain owner publication reply is recovered by reading the saved-version approval and current publication ledger. It does not replay a publish request or label retired writing live.

## Verification record

At authoring time: the new owner API/reader regression passed; all four horoscope-period owner API cases passed; the first eight desktop/mobile owner browser cases passed before the recovery extension. CSS audit and server/admin types passed. The broad 82-case rendered editor matrix, final bundle checks, and exact-head release gates must finish before release. Update this record with final evidence rather than treating this draft record as a completion claim.

The local report-correction test and the late part of the unfiltered API suite require protected report-reference documents that are unavailable in this isolated checkout. They are verified in the repository's established hosted test environment; no unrelated private reference store is copied into this checkout.
