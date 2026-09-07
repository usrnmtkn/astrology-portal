# Content Studio full CRUD audit

The audit covers the shared Content Studio editor, its source and composition workspaces, API persistence, and reader refresh behavior. Changes are local and uncommitted on `codex/natal-studio-crud-20260907` in `/Users/mprez/Code/tldrastro-natal-studio-crud`. The branch was fast-forwarded to refreshed `origin/main` at `fa1b7b55`, with no committed divergence. Unrelated owner work in the original checkout was preserved.

## Findings fixed

| Finding | User-visible consequence | Correction and evidence |
| --- | --- | --- |
| The package API rejected headline, summary, and editorial notes inside proposals although the editor exposed them. | A body save worked, but a later title/summary/notes save failed. | Editorial fields are accepted; structural fields remain protected. Actual-handler tests repeatedly save and publish each field. |
| First-revision creation used an unconditional upsert. | Two tabs starting from live copy could overwrite an existing pending revision. | Existing active revisions return 409 with guidance to open the saved revision; simultaneous inserts use ignore-duplicates and report conflict. Archived revisions can be reused through a version-checked PATCH. Actual-handler tests verify the preexisting-revision and insert-race cases. |
| Draft concurrency identity came from mutable inventory. | Background reloads could change the expected version independently of the text being edited. | Drafts retain their opening/last-saved timestamp. Actual-handler tests reject stale writes and deletions. |
| Progressive inventory pages replaced full documents with compact list records. | Hydrated copy and saved proposals could disappear from the row used for later actions. | Inventory merge retains full records at the same version and newer local saves; newer external versions still replace them. Behavioral tests cover partial pages and removal on full reload. |
| An article autosave response was discarded if another edit changed the sequence. | The next save could use the previous version and fail; a successful first workspace creation could be followed by another POST. | Article and workspace saves run serially, keep the returned row/version even when newer text is pending, and do not overwrite newer input. A browser test holds the first response while entering the second revision, then checks the second request's version. |
| Returning article fields to the original edition could skip persistence. | The editor displayed the original text while a prior revision remained saved. | Editing back to the original is treated as a save. The overlapping-autosave browser test verifies this. |
| Close/navigation checked the generic draft but omitted article autosave and inline natal edits. | Pending copy could disappear when changing context. | Close, source switching, placement changes, and browser unload account for unsaved copy. Tests reject navigation and confirm the text remains. |
| Hash/history navigation captured initial editor state and ignored a rejected close. | Browser navigation could leave the editor despite cancellation. | A current-state navigation guard restores the accepted URL when leaving is cancelled. Browser deep-link/history and explicit unsaved-navigation tests pass. |
| Opening a variable's source closed the rail before determining whether the template draft could be discarded. | Cancelling the source switch disrupted the editing context. | The rail remains open on cancellation; an accepted switch opens the source. Browser coverage exercises both outcomes. |
| Package archive set deprecated metadata but returned Draft; governed rows could reject archive as an unsupported approval state. | Archive status and filters disagreed, or archive failed. | Deprecated package records return Archived. Archive can remove governed copy from service without granting publication permission. Restore returns a held Draft and preserves body text. Actual-handler lifecycle tests cover archive/restore. |
| Sky fallback field changes retained an exact-copy review decision. | A later save could carry a review for earlier text and fail hash validation. | The specialized setter invalidates the old review, consistent with the shared copy setters. |
| Bulk actions discarded successful results if another row failed; package publication decisions could use compact inventory. | The list appeared unchanged after partial success, and repeat actions used stale rows. | Hydrate before publication decisions, apply each successful result, retain only failed selections. Browser coverage verifies partial update/delete. Existing hidden bulk controls remain hidden in production. |

## Live / Not live follow-up

The primary copy status is now **Live** (readers can currently receive this copy) or **Not live** (readers cannot currently receive this copy). Separate visibility, editorial, and connection columns have been collapsed into Status and expandable Details. Editorial-stage filters are under an expandable Editorial filters control; approval controls retain their workflow meaning. Compact tables repeat the status beside the content title so mobile readers do not need to scroll horizontally. Status verification failures say “Status unavailable” instead of guessing.

| Additional finding | Correction and evidence |
| --- | --- |
| Approved lunation `authored_card` imports fell into Draft/reference and could be classified as legacy. | Approved/reviewed authored cards materialize LIVE/serving. Lunation source metadata and historical-row classification identify authored copy. The actual materializer preserves the complete Virgo body. |
| A mirror's publication flag was treated as proof of reader visibility. | An authenticated, batched status endpoint compares exact copy against the installed reader package and eligible current overlays. All 23 shipped lunation macros pass the regression, including historical Draft/reference mirrors, differing proposals, and newer overrides. |
| Safety and source-boundary checks could drift between Studio and the app. | Ordinary copy eligibility and reader-boundary predicates are shared with the actual reader. Sky checks include whole-partition integrity; Compatibility and private user rows follow their separate reader paths. |
| New natal aspect keys could be published but omitted from the package overlay. | Valid exact natal aspect keys can extend the current package. Arbitrary keys, invalid aspects, same-body pairs, and source-material roles are rejected. |
| Explicit natal publication lacked the exact approval receipt required by the shipped reader. | Authenticated publication records a timestamp, addressable Studio source, and copy hash. Plain saves do not grant approval. The actual API → reader loader → shipped resolver test renders the entire saved passage. |
| An empty natal aspect could return a successful publication. | The UI disables publication and explains what to write; the API returns 400. Empty drafts remain saveable. |
| First-time natal writing used a proposal against an empty baseline and put Friend before You. | New natal aspects have explicit You/Friend fields and edit their new record directly. Saved/package-backed sources continue through revision handling. |

The Virgo browser regression verifies Live → first edit/save → second edit/save → explicit publication → Live → close/reopen with the second saved passage. Tests use isolated QA text and do not alter production macros. The pasted browser discussion was treated as a reported diagnosis; macro headlines and owner prose were not shortened or rewritten.

Archiving a Studio source is distinct from retiring its checked-in package counterpart. If the installed package still contains the identical copy, readers may still receive it and the badge correctly remains Live. Global removal of that packaged copy requires a package change; this audit does not claim that deleting a mirror removes every fallback source.

The natal-specific source-loading, contextual preview, inline editing, and exact Uranus passage changes are documented in [the natal review](content-studio-natal-crud-2026-09-07.md).

## Audit coverage

| Area | What was examined and exercised |
| --- | --- |
| Shared Content Library | Create routes and required metadata; initial/transient/partial loading; open and hydrate; save/edit/save; archive/restore; close/reopen; search and filtering at production-sized fixture counts. |
| Natal placements and aspects | Contextual source lookup, inline revisions, explicit publication, You/Friend fields, approved-but-held rows, reader destinations, owner-copy preservation, and variable drilldown. |
| Composition | Vocabulary, audience variants, hooks, templates, slots, Daily At-a-Glance pairs, and saved revision publication. |
| Compatibility and composite | Dedicated navigation, scoped inventory, identity/filtering, content editor paths, and shared persistence contracts. |
| Sky, transits, Calendar | Held governed sources, transit-to-natal and house-transit passages, related aspects/houses, exact Calendar revision save/publication, article compile/validation, and article autosave concurrency. |
| Publication and deletion | Drafts excluded from serving reads; package proposal promotion; source material prevented from exact-copy publication; stale mutation rejection; LIVE hard-delete rejection; archived/draft deletion; reader cache invalidation. |
| Supporting APIs | Authorization, malformed responses, pagination, detail retrieval, personalized content update contracts, review-record routing, source decisions, and revision completion checks. |

## Verification and limits

- All 65 tests in the complete Studio browser suite, reader-destination flow, and needs-attention flow passed against a fresh local build on current main (`fa1b7b55`) with authenticated API fixtures. All six affected browser flows passed again after final source-card/attention label cleanup. Two further fresh-build browser checks verified the visible mobile status badge and responsive layout.
- All 32 focused script suites passed on that base, including the authenticated status API, exact macro materialization, actual mutation handlers, CRUD/concurrency/hydration, source navigation, private status scopes, and owner-copy parity. These are local isolated tests, not production database tests.
- The new API lifecycle regression verifies read/reopen, Draft → Reviewed → Live → Archived → Draft, two further edits, protected/stale deletion, successful deletion, and package archive/restore.
- The natal owner passage also passes exact hash/word count and Node/browser-source/shipped-renderer parity for every house and direct/retrograde context.
- Admin/web typechecks, application builds, CSS/token audits, and diff whitespace checks passed. Desktop/mobile source editing and light/dark variants were inspected during the natal work.
- Sky article workspace creation/restoration was reviewed in code and shares the serialization correction; its complete production authoring/approval lifecycle was not exercised against live storage. The article revision overlap was exercised in the browser.

Wider repository checks remain failing independently of these fixes:

1. `test:content` stops at an existing unresolved-queue test requiring a positive item count even though the current generated queue is empty. This was reproduced in an untouched baseline; tests later in that chain are not claimed as passed.
2. `qa:admin-bundle` builds but exceeds its existing budgets. The untouched baseline measured 156.9 kB entry gzip / 221.1 kB total gzip against limits of 152/203 kB. The expanded fixes measure 158.4/223.5 kB. Budgets were not increased.
3. The broader `test-fallback-refresh-wiring.mjs` also fails an old expected Chiron/Jupiter opening. It produced the identical failure on the untouched `549c7ce3` baseline. That separate wording assertion was not replaced to make this audit green.

4. Release CI also reproduces existing web bundle ceiling failures for reader startup CSS and the Sky detail chunk, seen independently on PR #654. No ceilings were raised.
5. The writing-kernel drift check fails on `api/_lib/transit-reading-generation.ts|provider_call`. The same failure was reproduced on clean baseline `549c7ce3`; this release does not change that provider call or relax the boundary.

## Release verification

Release PR: [#655](https://github.com/usrnmtkn/astrology-portal/pull/655). The owner authorized merging and pushing live in this task. The branch was rebased onto `04870234`, preserving the separately merged Calendar Write-ups navigation and draft CRUD. The delete conflict was resolved by clearing the editor only for successfully deleted rows while retaining failed rows for retry.

The combined browser run passed 65 of 66 flows; the remaining assertion selected the intentionally hidden mobile status badge on desktop. Its selector was corrected to measure visible badges. The API lifecycle, Calendar CRUD guard, exact owner copy, CSS audit, wiring labels, and usability assertions passed on the rebased code. Production deployment and final live-session evidence are recorded with the release PR rather than inferred from local tests.
