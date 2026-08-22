# Content Dashboard Admin QA User Flows

Date: 2026-07-16

Scope: TLDR Astro content dashboard admin, centered on `GeneratedContentAdminDashboard` and its five primary editorial destinations.

QA role: content operations admin who needs to create, review, diagnose, and publish reader-facing astrology copy without leaking fallback scaffolding, internal notes, source-framework language, or directional copy to public surfaces.

## Main User Flows

1. Admin entry and dashboard shell
2. Review Queue landing and workstream triage
3. Write: new article flow
4. Write: exact content browse and edit flow
5. Write: reusable phrase or clause flow
6. Write: import flow
7. Composition: templates flow
8. Composition: slot dictionary flow
9. Composition: vocabulary and phrase banks flow
10. Composition: fallback hooks flow
11. App Surfaces: surface map audit flow
12. App Surfaces: Sky content path flow
13. App Surfaces: Natal content path flow
14. App Surfaces: Transits content path flow
15. App Surfaces: Friends and Synastry content path flow
16. App Surfaces: Composite by relationship type flow
17. App Surfaces: Soul's Purpose and Career safety flow
18. Publish: review queue triage flow
19. Publish: status filter flow for scheduled, published, and archived rows
20. System: API and connection status flow
21. Operations / Advanced disclosure flow
22. Default reference and retired-row visibility flow
23. Responsive admin layout flow for desktop and mobile widths
24. Error, empty, and degraded connection states
25. Reader-safety regression flow for fallback and directional copy

## Flow 1: Admin Entry And Dashboard Shell

Goal: Confirm the admin dashboard loads into a stable, navigable shell.

Preconditions:
- Tester can open the admin dashboard route.
- Local or test API credentials are configured if the flow is being tested with real data.

Steps:
1. Open the content dashboard admin.
2. Verify the default page is Review Queue; there is no separate Studio Home page.
3. Confirm the seven primary destinations are Review Queue, Content Library, Articles, Compatibility, Composite Review, Composition, and Aspect Patterns.
4. Open Composition and move through Templates, Slots, Vocabulary, Fallback Hooks, and Surface Map as workspace tabs.
5. Expand Operations / Advanced and verify Sky Aspect Drafts, Users, Reports, Connection, and Diagnostics remain reachable.

Expected result:
- Every page loads without a blank state, runtime error, or broken navigation state.
- The active page has a matching title and breadcrumb.
- The active nav item exposes `aria-current="page"`.
- Admin-only language is allowed inside the admin, but no public preview panel should display raw source-framework notes, placeholder instructions, or emergency fallback copy as if it were approved reader copy.

Failure examples:
- Clicking a nav item changes the URL or state but leaves the previous panel visible.
- A page title does not match its selected admin page.
- The dashboard shows a loading state forever.

## Flow 2: Review Queue Landing And Workstream Triage

Goal: Validate that opening the dashboard takes an admin directly to actionable editorial work.

Steps:
1. Open Content Studio without a hash, or with the legacy `#home` hash.
2. Confirm Review Queue opens directly.
3. Review queue counts and filters.
4. Open the Composite saved view and return to All review.

Expected result:
- The landing page contains actionable review records rather than duplicate navigation tiles.
- Legacy `#home` links resolve to Review Queue.
- Composite review is a saved Review Queue view, not a separate top-level page.

## Flow 3: Write: New Article

Goal: Confirm article authoring is separate from fallback hooks and vocabulary.

Steps:
1. Navigate to Write > New article.
2. Confirm the Articles page opens.
3. Create or open an article draft.
4. Enter title, summary/excerpt, body, source metadata if present, and status.
5. Save the draft.
6. Reopen the draft after navigation away and back.

Expected result:
- Article rows are created or edited only in the article area.
- Long-form copy is not mixed into fallback hook rows or vocabulary rows.
- Save feedback is clear.
- Unsaved changes are protected before leaving.

## Flow 4: Content Library Browse And Edit

Goal: Confirm exact content rows can be found, inspected, edited, and saved without exposing unsafe rows to readers.

Steps:
1. Navigate to Write > Exact content.
2. Use status filters: All, Draft, Needs Review, Reviewed, Published, Archived.
3. Use category filters: Sky, Natal Aspects, Natal Angles, Natal Chart, Relationship, and Condition Modifiers.
4. Use class filters: Rich content, Fallback hooks, Vocabulary / phrases, References / articles, User-generated, Archive.
5. Search for a known content key.
6. Open a row and inspect copy fields, source fields, and status.
7. Edit a non-public draft row and save.

Expected result:
- Filters combine predictably and never strand the user in a misleading empty state.
- Reader-ready labels match the row's actual publish and safety status.
- Archived, reference-only, review-hold, and missing-reader-copy rows are visibly blocked from reader surfaces.
- Public preview areas do not show internal notes or source-framework language.

## Flow 5: Write: Reusable Phrase Or Clause

Goal: Confirm reusable language can be created or updated in the vocabulary system.

Steps:
1. Navigate to Write > Reusable phrase or clause.
2. Confirm Vocabulary & Phrases opens.
3. Filter by Planets, Houses, Angles, Zodiac, Lunar, Eclipses, Career, and Relationship.
4. Open an existing phrase row.
5. Edit phrase copy, status, and metadata.
6. Save, then verify the row remains discoverable through the same filter.

Expected result:
- Phrase rows remain short, reusable, and slot-safe.
- Phrase copy does not contain full public paragraphs unless the row type explicitly supports it.
- Copy is grammatically safe when inserted into templates.

## Flow 6: Write: Import

Goal: Confirm import entry points route to the right editor and do not silently publish imported rows.

Steps:
1. Navigate to Write > Import.
2. Confirm the Content Library opens or an import panel is visible.
3. Import or stage a small test payload.
4. Verify imported rows are marked Draft or Needs Review.
5. Confirm the import result lists successful rows, rejected rows, and validation errors.

Expected result:
- Import never publishes rows automatically.
- Invalid rows produce actionable validation feedback.
- Imported content keeps source, tier, and status metadata.

## Flow 7: Composition: Templates

Goal: Confirm templates can be edited and previewed safely.

Steps:
1. Navigate to Composition > Templates.
2. Open a template.
3. Verify template body, slot usage, sample context, and preview output.
4. Change a non-public draft template.
5. Save and reload the page.

Expected result:
- Mustache slots render in preview using sample data.
- Missing slots are called out clearly.
- Preview copy does not show raw `{{slot}}` tokens unless the test intentionally checks missing-slot behavior.
- Template changes do not alter unrelated templates.

## Flow 8: Composition: Slot Dictionary

Goal: Confirm admins can understand each slot and jump to its source.

Steps:
1. Navigate to Composition > Slots.
2. Filter by source: All sources, Calculated, Vocabulary, and Fallback.
3. Filter by status: All statuses, Calculated, Ready, Draft exists, Local only, Needs rows.
4. Search for a known slot such as `planetTopic`, `houseTopic`, or a relationship slot.
5. Use the row action to open the supplying editor.

Expected result:
- Each slot has a readable label, source, status, and definition.
- Actions route to the correct page, such as Vocabulary or Fallback Hooks.
- Missing rows are clearly marked and do not look reader-ready.

## Flow 9: Composition: Vocabulary And Phrase Banks

Goal: Confirm phrase bank coverage and status controls work across language categories.

Steps:
1. Navigate to Composition > Vocabulary and phrase banks.
2. Filter by category and status.
3. Search for representative rows in planets, houses, angles, zodiac, lunar, career, and relationship language.
4. Open rows that feed known public surfaces.
5. Verify preview or usage examples if available.

Expected result:
- Rows are grouped in the expected category.
- Draft, Reviewed, Published, Archived, and Needs Review statuses are visually distinct.
- Relationship language avoids romantic-only wording unless gated to romantic contexts.

## Flow 10: Composition: Fallback Hooks

Goal: Confirm fallback-hook rows are reviewable safety templates, not accidental public final copy.

Steps:
1. Navigate to Composition > Fallback hooks.
2. Filter by Sky, Natal, Friends, Lunar Calendar, and Settings.
3. Open a representative fallback hook.
4. Inspect the hook label, copy, source, status, preview, and linked vocabulary.
5. Edit a draft hook and save.

Expected result:
- Fallback hooks are visible to admins with enough context to edit them.
- Public preview copy must not contain "Interpretation in review.", "Notice how this placement asks for attention in real life.", raw template instructions, or source-framework notes.
- Hooks that are not reader-safe are blocked from public surfaces.

## Flow 11: App Surfaces: Surface Map

Goal: Confirm the admin can audit which content systems power each public surface.

Steps:
1. Navigate to App surfaces > Surface Map.
2. Filter by the reader area where the copy appears: Sky, You, Friends, Calendar, or Settings.
3. Search for a visible feature such as `Sky aspect`, `weekly horoscope`, or `synastry`.
4. Follow the surface action to exact content, articles, compatibility, vocabulary, slots, templates, source drafts, or fallback hooks.
5. Filter by Editable and Partly editable and confirm local runtime gaps are labeled instead of being presented as saved content.

Expected result:
- Each surface maps to the correct content source.
- Links preserve the intended filter when moving between pages.
- Each card names the reader location where the content appears.
- Missing runtime editability is visible and actionable.

## Flow 12: App Surfaces: Sky Content Path

Goal: Confirm Sky rows resolve from exact or authored copy before fallback templates.

Steps:
1. Navigate to App Surfaces > Sky.
2. Filter to Sky content.
3. Open upcoming aspects, lunar calendar, placement article rows, and Sky Aspect Drafts.
4. Search Sky Aspect Drafts for an exact key such as `sky.sun.trine.chiron`.
5. Confirm held source prose opens in the editor with the reference lane and `NEEDS_OWNER_DECISION` review state.
6. Compare approved admin reader preview against the public Sky surface.

Expected result:
- Published Sky rows use approved authored copy.
- Fallback output is only shown when explicitly marked as fallback and safe.
- Directional admin copy never appears in public reader preview.
- The general editor refuses to make a held source draft LIVE.

## Flow 13: App Surfaces: Natal Content Path

Goal: Confirm natal placements, signs, houses, angles, rulers, and natal aspects resolve safely.

Steps:
1. Navigate to App Surfaces > Natal.
2. Inspect placement, angle, sign, house, ruler, and natal aspect content types.
3. Open at least one published and one draft row.
4. Compare the admin preview with the public You tab detail route.

Expected result:
- Public pages do not show placeholder placement copy.
- Draft or review rows are not treated as public final copy.
- Empty or missing exact content resolves to approved fallback only.

## Flow 14: App Surfaces: Transits Content Path

Goal: Confirm transit-to-natal content resolves with safe copy and no generic scaffold leaks.

Steps:
1. Navigate to App Surfaces > Transits.
2. Filter to transit-to-natal content.
3. Open rows by status and content class.
4. Confirm the public preview reads as authored guidance.

Expected result:
- Transit copy names the transit cleanly.
- Reader preview avoids mechanical fragments and internal composition labels.
- Missing rows are flagged for review rather than silently treated as complete.

## Flow 15: App Surfaces: Friends And Synastry Content Path

Goal: Confirm relationship content uses authored synastry records before emergency fallback text.

Steps:
1. Navigate to App Surfaces > Friends.
2. Filter to Relationship and Synastry content.
3. Open representative synastry aspect rows, including Ascendant square Mercury.
4. Compare the admin preview to the public Friends/Synastry detail route.

Expected result:
- Authored phrasebank or knowledge rows render before emergency fallback.
- Public copy does not contain generic stitched phrases such as "puts first impressions, outward style..." unless that wording exists in an approved authored row.
- Relationship names and pronouns render correctly.
- The same contact is consistent between list rows and detail pages.

## Flow 16: App Surfaces: Composite By Relationship Type

Goal: Confirm composite copy is reviewed by relationship type and romantic language is gated.

Steps:
1. Navigate to App Surfaces > Composite.
2. Switch through Romantic, Friendship, Family, Coworkers, Creative, Exes, and Complicated.
3. Open representative composite aspect rows.
4. Verify row status, copy, and preview for each relationship type.

Expected result:
- Romantic phrasing appears only in romantic rows.
- Family, coworker, creative, ex, and complicated rows do not inherit romantic assumptions.
- Draft or missing composite content stays in review.

## Flow 17: Soul's Purpose And Career Safety

Goal: Confirm Soul's Purpose and Career surfaces use narrative templates without authoring directions.

Steps:
1. Navigate to App Surfaces > Soul's Purpose.
2. Inspect mission statement content and previews.
3. Navigate to App Surfaces > Career.
4. Inspect career pattern content and previews.

Expected result:
- Copy reads as direct reader-facing guidance.
- Public preview does not show "write a sentence", "use this when", source-framework notes, field labels, or editorial instructions.
- Missing copy shows a blocked/review state rather than weak filler.

## Flow 18: Publish: Review Queue Triage

Goal: Confirm admins can triage rows that need review.

Steps:
1. Navigate to Publish > Review queue.
2. Filter by status: All statuses, Needs Review, Draft, Reviewed, Published, Archived.
3. Filter by evergreen mode: Hide evergreen, All, Evergreen only.
4. Search for a row needing editorial review.
5. Open the row, inspect copy, source metadata, reader-safety badge, and public preview.
6. Move a test row through the expected review action.

Expected result:
- Review counts update after action.
- The row does not disappear without clear status feedback.
- Review actions require enough context to avoid accidental approval.
- Rows with unsafe or placeholder copy cannot be marked reader-ready without correction.

## Flow 19: Publish: Scheduled, Published, And Archive Filters

Goal: Confirm publication state filters are accurate and reversible where intended.

Steps:
1. Navigate to Publish > Scheduled.
2. Confirm only reviewed/scheduled rows appear.
3. Navigate to Publish > Published.
4. Confirm only live reader-ready rows appear.
5. Navigate to Publish > Archive.
6. Confirm archived rows appear and are blocked from public preview.

Expected result:
- Status filters match row metadata.
- Published rows have reader-safe copy.
- Archived rows remain discoverable to admins but do not appear in public flows.

## Flow 20: System: API And Connection Status

Goal: Confirm admins can tell whether the dashboard is connected to required services.

Steps:
1. Navigate to System > API / connection status.
2. Verify API state, deploy links, settings, and access diagnostics.
3. Trigger any available refresh or diagnostics action.

Expected result:
- The dashboard clearly distinguishes connected, disconnected, degraded, and local-only modes.
- Failed connection states still allow safe read-only admin review where possible.
- No save action appears successful when the API is unavailable.

## Flow 21: Operations / Advanced Disclosure

Goal: Confirm infrequent operational tools remain available without crowding editorial navigation.

Steps:
1. Expand Operations / Advanced.
2. Open Sky Aspect Drafts, Users, Reports, Connection, and Diagnostics.
3. Return to a primary editorial destination.

Expected result:
- Advanced destinations are collapsed by default.
- The disclosure opens automatically when an advanced destination is active.
- No App Behavior or Release Notes placeholder page is present.

## Flow 22: Default Reference And Retired-Row Visibility

Goal: Confirm engineering/reference material does not overwhelm ordinary editorial work.

Steps:
1. Open Content Library.
2. Confirm reference-lane, archived, retired, decommissioned, disabled, and superseded rows are hidden.
3. Enable Show reference and Show retired independently.
4. Open Composition and confirm source/reference rows needed by its editors remain available.

Expected result:
- Reference and retired rows require explicit opt-in in Content Library.
- Owner-review source records remain visible in Review Queue.
- Composition continues to expose its required source material.

## Flow 23: Responsive Admin Layout

Goal: Confirm admin workflows remain usable at desktop and mobile widths.

Viewports:
- Desktop: 1440 x 1000
- Tablet: 1024 x 768
- Mobile: 390 x 844

Steps:
1. Run Flows 1, 4, 8, 10, and 18 on desktop.
2. Repeat navigation, filters, row open, and save/cancel checks on tablet.
3. Repeat read-only navigation and row inspection on mobile.

Expected result:
- Navigation remains reachable.
- Tables, filters, and editor panels do not overlap.
- Buttons remain tappable.
- Long content keys wrap without breaking the layout.
- Modals and side panels fit within the viewport.

## Flow 24: Error, Empty, And Degraded Connection States

Goal: Confirm admins get useful feedback when data is missing or services fail.

Steps:
1. Open the dashboard without API credentials or with a mocked failed API response.
2. Visit Content Library, Review Queue, each Composition tab, and Connection.
3. Apply filters that produce no results.
4. Attempt a save in unavailable mode if the UI allows it.

Expected result:
- Empty states explain what is missing and how to recover.
- Save controls are disabled or return a clear failure message.
- The dashboard does not pretend a failed save succeeded.
- Local-only rows are labeled as local-only.

## Flow 25: Reader-Safety Regression

Goal: Catch the exact class of content bugs found in prior QA: placeholders, emergency copy, and directional copy leaking to reader-facing previews or public pages.

Steps:
1. In Content Library, Review Queue, Fallback Hooks, Templates, and Surface Map, search public preview text for unsafe phrases.
2. Check a sample from Sky, Natal, Transit, Synastry, Composite, Soul's Purpose, and Career.
3. Compare admin public preview against the live client-facing route where available.
4. Flag every reader-facing preview that contains unsafe copy.

Unsafe phrases and patterns:
- `Interpretation in review.`
- `Notice how this placement asks for attention in real life.`
- `puts first impressions, outward style`
- `write a sentence`
- `use this when`
- `source framework`
- `fallback hook`
- `template`
- raw Mustache slots like `{{planetTopic}}`
- editorial labels presented as copy, such as `direction`, `notes`, `draft`, or `TODO`

Expected result:
- Admin-only diagnostic panels may show internal terms.
- Reader preview panels and public routes must never present internal terms as final content.
- Any unsafe reader preview creates a blocking QA bug with route, row key, visible copy, expected copy source, and steps to reproduce.

## Bug Report Template

Use this format whenever a flow fails:

```md
# QA Bug: [short title]

Severity: Critical | High | Medium | Low
Surface: Admin | Client-facing preview | Public route
Flow: [flow number and name]
Environment: Local | Staging | Production
Viewport: Desktop | Tablet | Mobile

## Steps To Reproduce
1. ...
2. ...
3. ...

## Actual Result
[What appeared, including exact visible copy if content-related.]

## Expected Result
[What should have happened.]

## Content Source Expected
[Exact content, phrasebank, vocabulary, template, fallback hook, or blocked/review state.]

## Notes For Fix
[Suspected component, resolver, row key, or data issue.]
```

## Automation Candidates

High-value automated checks:
- Admin nav smoke test for every `AdminDashboardPage`.
- Filter smoke test for Content Library, Review Queue, and each Composition tab.
- Reader-safety text scan across admin public preview panels.
- Responsive screenshot pass for desktop, tablet, and mobile admin layouts.
- Synastry regression row for Ascendant square Mercury using authored copy before emergency fallback.

Manual/editorial checks that should remain human-reviewed:
- Whether copy is emotionally appropriate and on-brand.
- Whether relationship-type gating feels correct in nuanced contexts.
- Whether phrase-bank language composes naturally across multiple templates.
- Whether publication readiness should be granted for borderline rows.
