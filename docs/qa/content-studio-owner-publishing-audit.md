# Content Studio owner publishing audit

Owner request, October 15, 2026: “do the full content studio audit and fix publishing everywhere. i should be able to publish my own content from any editor. test every flow and deploy the fixes.”

## Acceptance contract

An authenticated owner's explicit publish action approves the exact submitted reader wording at the opened saved version. It does not require a model's prose verdict, an unrelated review-status dropdown, or an artificial edit to an unchanged saved draft. Generated drafts and automated publication retain their existing editorial policies. Publishing never rewrites or compresses the author's content.

Technical publication requirements remain: owner authentication, the opened source version, a valid reader identity/destination, complete required fields/audiences, signed calculated windows, valid variables, current dependencies, exact publication state, and separation of reference material from finished copy. A source-only editor must lead to its owning reader editor or composition workflow; saving reference material is not a successful reader publication.

## Distinct editor paths and evidence

The matrix lists automated fixture coverage for distinct editor flows; it does not assert that every astronomical key or production record has been tested. Automated writes use isolated storage and synthetic content. Native production acceptance uses only owner-authorized temporary content and exact restoration, and is recorded separately against the deployed merge SHA. The release requires the complete unfiltered API and browser gates on its exact head.

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
| Daily At-a-Glance paired headline/passage; You/Friend | `content-dashboard-admin-user-flows`, `test-admin-daily-glance-studio`; separate draft/publication, complete reader copy, partial failure, stale versions and lost receipt recovery |
| Combined House Transit; You/Friends, shared/retrograde/legacy | `house-transit-combined-editor`; save/reopen, publish unchanged draft, failed second source, conflicts, lost replies, full copy |
| Synastry and compatibility exact/directional passages | `studio-owner-publishing`, `compatibility-aspect-create`, actual-handler roundtrip and both reader directions |
| Composite and relationship-type variants | `studio-composite-review`, `content-dashboard-admin-user-flows`, actual generic handler |
| Astro 101 chapter/article | `studio-formatting-publication`, `astro-101-reader-recovery`; draft/live transitions, formatting and reopened reader |
| Daily/Weekly/Monthly/Seasonal horoscope editions | `test-horoscope-owner-publication`, `horoscope-review-recovery`, `studio-dedicated-editor-routing`, horoscope browser suites; exact copy and signed windows |
| Dated New/Full Moon and eclipse writing → reader article | `lunation-writing-studio`, `studio-dedicated-editor-routing`, `test-lunation-studio`, `test-lunation-saved-writing` |
| Reusable New/Full Moon sign macros, including new keys | `studio-owner-publishing`, `calendar-review-queue-api`; actual publish and Calendar reader hydration |
| Calendar aspect base/retrograde/directional content | `calendar-review-queue-api`, `calendar-aspect-create`, `calendar-aspect-retrograde`, actual SQL publication lifecycle |
| Calendar planetary transitions and Moon sources | `calendar-planetary-studio`, `calendar-moon-editor`, actual ingress source/reader tests |
| Calendar complete day/week passages; shared/date | `calendar-passage-editor`, `test-calendar-passage-editor`; draft isolation, source changes, publication and reader selection |
| Calendar Monthly handoff | Canonical Monthly Horoscope edition owns the complete overview; old passage publication is refused |
| Registered lunar journal entries | `test-calendar-planetary-studio`, `test-cross-surface-admission`; exact body, rendered journal blocks and unsupported-key refusal |
| Calendar overview/transition templates | `calendar-summary-studio`, `calendar-template-preview`, `calendar-season-transitions`; source editor and calculated composition |
| Sky summary, supplied copy, Moon/day, forecasts and debility | `sky-summary-studio`, `sky-forecast-studio`, `test-sky-daily-summary`, `test-admin-daily-glance-studio`; source save/publication and real composition |
| Template/vocabulary/phrase/composition source editors | `studio-variables`, `studio-variable-crud`, `studio-owner-publishing`, actual template/variable validation and package CRUD |
| CSV offline edits and batch publishing | `studio-csv`, `test-studio-csv`; explicit publish marks, version checks, partial-failure receipts and reopen |
| Aspect-pattern authored write-ups | `test-aspect-pattern-writeups-admin`, runtime/fallback tests; draft/review/approved lifecycle and reader eligibility |
| Delivered-report unit corrections | `test-generated-report-correction`, report-reader contract; private correction draft and explicit publication |
| Source library, writing guidance, experimental variant-family drafts | Source-only boundary tests, `sky-secondary-editor-crud`, `review-queue-workflow`; no direct publication of unused/reference records or accidental generation |
| Shared publication recovery and retirement | `studio-publication-recovery`, `test-studio-owner-publication`, publication API/concurrency suite; confirm current availability without replaying writes |

## Fixes

- The paired Daily At-a-Glance editor has distinct Save draft and Save & publish controls for both sources and audiences. Opened versions remain fixed for concurrency checks; partial failures and lost receipts retain local writing. The Friend fields accept the canonical Daily runtime variables advertised in the guide, without licensing unknown tokens or unbound You variables.
- Standalone Articles and Guides use consistent reader identity/status. Guide/article custom variables publish as a validated frozen snapshot and private variable metadata stays out of reader responses.
- Reusable Composite sources and registered journal entries have narrow reader admission; private samples and unknown identities remain blocked.
- Primary, audience and legacy body mirrors stay synchronized across successive Personal Transit edits. Reopening an exact source uses its current You copy. Six-part previews preserve both house facts.
- Supported missing Friends openings/activations can be created without overwriting reverse-order sources. The activation preview reads its published record after reload.
- Aspect Pattern save receipts compare JSONB objects structurally while preserving array order and exact text.
- Dated article fact handlers emit valid Node imports and ship their Swiss assets. The Calendar storage constraint adds only its missing calendar_event block type.
- Reader startup helpers stay outside deferred editor groups; the reader startup sheet supplies loading styles without duplicating component imports, and standalone components retain their styling. Existing JavaScript, stylesheet and deferred-module limits remain unchanged.
- Calendar retrograde rows that also carry Sky metadata use one package publication action; the native Sky action is limited to non-package rows. The complete Rx flow and owner matrix pass 14 rendered rechecks.
- Eligible package drafts expose a direct owner publish action even when the saved text has not changed and its review status is still pending. The action stages exact copy and uses the existing version-checked package publication handler. Personal-transit specializations keep their established approval actions.
- Editor notifications sit in the editor flow instead of floating over its publication controls.
- The inline natal source editor can publish an unchanged saved Draft rather than requiring an artificial edit.
- Sky aspect authors can save and publish their wording explicitly. The server derives canonical card identity and records an exact content hash. Editorial lint/model judgments remain visible evidence for the existing check-based workflow, not permission to override the owner's explicit wording decision.
- CSV publication uses the same explicit owner action for non-package reader rows; importing author wording does not fall back to an automatic model gate.
- Horoscope publication uses the same explicit owner action. Current reader facts and signed window integrity remain checked; author punctuation and vocabulary are not automatic-publication vetoes. Paid generation and its semantic admission are unchanged.
- Weekly editor response projection retains the publication receipt, so a committed publication can be confirmed. Manual horoscope saves preserve author punctuation in both browser and API.
- Approval receipts are server-created, bound to all saved reader fields, and cannot be supplied by a client to approve changed wording. Reader projection exposes only the required receipt fields.
- Existing Sky drafts and live passages use one conditional save-and-publish write for the explicit owner action. A failed publication preserves the previous live row and the editor keeps unsaved local words.
- An uncertain owner publication reply is recovered by reading the saved-version approval and current publication ledger. It does not replay a publish request or label retired writing live.

## Verification record

Record the exact tested PR SHA, all gate outcomes and material limitations in the release PR. Earlier fixture passes are not evidence for a newer untested revision. The unfiltered API workflow, affected fresh-build browser journeys, server/admin types, CSS/token contracts, bundle/module boundaries and built-asset privacy checks remain required.

Owner-publication regressions cover exact reader selection, version conflicts, author wording, failed-live-write preservation, lost replies and retirement. Package tests also cover unchanged drafts and Return/six-part Save draft followed by explicit publication. Article revision tests verify the actual Review & publish → Publish changes controls and complete published copy in desktop/mobile themes.

Native acceptance must verify discovery, save, publication, complete reader output, reopen and cleanup for every distinct reader editor. Do not count fixture success or a visible button as native publication. Do not overwrite owner pending drafts, invoke paid generation, activate synthetic writing guidance, or grant/release reports to create QA evidence. Source-only instructions/references remain distinct from finished reader content.

Retiring a temporary override can suppress its bundled source. Cleanup must verify original reader availability and restore the exact previous source when necessary, without reactivating content the owner had already retired. Verify temporary feedback, future editions, private QA units and subscription events are inactive as well.

The unfiltered API suite’s report-generation and rhetorical checks require existing protected report-reference documents. An unavailable prerequisite is blocked, not a full API pass. Owner-authorized in-memory provisioning can complete the required local run without copying references or test output into the checkout or logs; exact-head hosted verification remains separately required. Private report-correction acceptance uses owned synthetic units and never grants, releases, or generates customer reports.
