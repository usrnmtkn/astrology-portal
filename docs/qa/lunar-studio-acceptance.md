# Lunar Studio acceptance

Scope: Calendar Write-ups → New & Full Moons & Eclipses, including existing
Calendar readings and the dated generation workflow. A saved database row,
successful build, or completed provider response alone does not satisfy this
workflow. Evaluate the owner journey in the deployed editor before calling it
ready for review. Editorial approval of generated prose remains the owner's.

| Acceptance criterion | Required evidence |
| --- | --- |
| Earlier New Moon and Full Moon readings are visible in the consolidated Calendar section. | Saved write-ups lists all twelve signs for both phases; no Daily Sky filter workaround is required. Draft and published sources remain available. |
| Lunar journal and eclipse entries remain discoverable. | Event readings lists those existing entries without mixing in season or leftover Moon-sign sources. |
| Opening an entry preserves the complete saved writing. | Compare the editor's full body with storage, including opening and final text, and confirm browsing makes no content mutation. |
| Saved writing reaches New Moon and Full Moon requests. | The complete matching lunar passage and Sun-season writing appear before supporting examples in the plan and actual provider input. Test a Full Moon with opposing Sun/Moon signs, newer draft precedence, changed-source plan invalidation, complete text/hash preservation, empty/archived sources, storage failure before billing and immutable polling receipts. |
| Editing an existing entry survives save and reload. | Actual-handler browser regression uses isolated storage and exact saved draft bytes. Opening a generation workspace does not replace a reader source. |
| An author can write a dated article without preparing a writer request. | **Write manually** opens a blank reference draft for the calculated event. Create, save, reopen, archive and restore read no writing profiles, feedback or source passages and call no provider. Existing event workspaces are detected by identity only and never replaced. Review & publish stages only the saved article into the ordinary reader editor; a reader collision preserves its existing writing. |
| Dated workspaces can be archived and restored. | The dedicated owner-authenticated endpoint conditionally changes only a reference workspace's DRAFT/ARCHIVED status. Complete copy, facts, sections, writing plan and rejection history survive. Active requests and stale versions are refused. Archived drafts are discoverable and read-only, and Restore returns a non-serving draft without a provider call or publication. |
| A published dated article reaches its reader. | Publish through the actual handler with the current validation metadata, then verify the Calendar event card and detail select its title and opening before Calendar → Read article and a direct reader reload preserve the complete saved passage. Retirement must remove it without revealing an older event excerpt. The validator's exact `legacy` profile label at the two known lunar lint paths is technical metadata, not a retired-source flag; other unsafe metadata and publication checks still apply. |
| Generation has a clear start and stable progress. | Calculated event → Create new draft → saved plan → explicit Create draft; one enabled primary action, no unrelated header Create menu, and no separate approval checkbox. Multiple pending polls leave Back to drafts available, and completion opens persisted text. |
| Reloads and errors preserve the same request. | Test reload, transient retrieval failure, terminal failure and completion in another tab, with provider-call counts. |
| Rejection preserves the draft and leads to an explicit replacement. | Reject & regenerate requires a reason and saved edits. Review replacement plan archives the exact title, body, facts, plan and request receipt in one conditional write. Regenerate draft explicitly approves the updated plan and starts one request. Test cancel, stale writes, failed refresh, history after reload, and no old text or saved-list controls while writing. Existing reader entries remain separate. |
| Navigation, layout and empty states work. | Separate list/editor screens, focused Back to drafts return, settings disclosure, desktop/mobile, light/dark, direct link/reload, no-match/reset, accessible headings and shared typography, no horizontal page overflow. |
| Release evidence matches the delivered revision. | Local full Content Studio API gate, exact-head hosted API success, fresh browser suite, CSS and bundle gates, READY main deployment, repeated deployed flow and read-only real saved-row checks. |

Regression: `tests/visual/lunation-studio.spec.ts` covers the saved library and
reusable writer; `tests/visual/lunation-writing-studio.spec.ts` covers the dated
writer. Both run through `playwright.lunation-studio.config.ts`. Write tests use
isolated storage, including when verifying production assets. Do not rewrite,
publish or generate real owner content merely to obtain acceptance evidence.

`scripts/test-lunation-manual-draft.mts`, included by the dated writer API test,
rejects guidance/source reads and provider calls throughout the manual lifecycle.
It also covers stale saves, concurrent creation, malformed save receipts,
identity-only workspace collisions, and the actual staged-reader publication,
complete-copy read and retirement handlers. Manual drafts retain their own
writing only; preparation, export and generation actions require the separate
writer workflow and cannot implicitly prepare a manual draft.
The workspace list uses metadata-only storage projection; full writing and
plan snapshots load only when a saved document is explicitly opened by ID.

`scripts/test-studio-owner-publication.mts` also checks dated lunar publication
through the actual publish, reader and retirement handlers, including preserved
validation evidence, rejected unsafe metadata and exact owner-copy approval.
The dated cases in `tests/visual/calendar-lunation-preview.spec.ts` use those
handlers with isolated storage for Calendar and Sky delivery, reload and retirement.

`scripts/test-lunation-workspace-lifecycle.mts` covers the dedicated workspace
archive/restore contract and is included by the dated writer's API regression.
The archive/restore cases in `lunation-writing-studio.spec.ts` cover discovery,
reload, complete-text preservation, unsaved edits and concurrent changes at both
widths and themes. They also keep formatting open across archive and restore,
attempt typing and formatting shortcuts while archived, and compare the visible
writing and stored body before and after those attempts. Restoring re-enables
formatting without changing the saved writing. Execution results belong to the
tested revision's QA receipt.

Canonical dated Moon horoscope sets also need a visible archive/restore journey.
Check all twelve complete passages and their original import metadata through
publication, archive, reload, event selection, restore as a non-serving draft,
explicit republication and final retirement. Unsaved text must prevent archival;
archived fields must remain read-only. The handler must reject stale versions,
private-revision targets and combined copy edits. A failed retirement confirmation
must report an unconfirmed transition, preserve the saved writing, and permit
recovery by reloading the actual state; stale retries must never overwrite it.

The September 27 recheck identified a navigation gap: all 24 reusable readings
were saved and reachable through Daily Sky, but the consolidated lunar section
exposed writing workspaces without the existing library. Saved write-ups brings
the original entries into that section using the existing inventory and editor;
it does not copy or migrate the prose. Test and deployment results are recorded
in the release PR, with any remaining failed or unverified criteria stated.

## Rejection controls: local verification, 2026-10-07

Tested on `codex/calendar-lunation-writing-correction`, based on
`1b97a5176a948739dcd4abf9abd9d1cf9e4a31a3`, with uncommitted lunar changes.
This is local evidence; the controls are not deployed.

- The new actual-handler regression first failed because `reject` was not a
  supported action. It now passes, including current guidance, complete history,
  missing provider credentials, preparation failure, stale writes, reload,
  repeated rejection and one explicit replacement request.
- Computer-use checks against a fresh production admin build and isolated API
  storage passed: saved draft discovery, unsaved-edit protection, cancellation,
  required reason, injected save failure preserving text, successful rejection,
  refreshed plan, disabled regeneration before review, exact history after
  reload, one provider-fixture request containing the reason, saved replacement
  after reload, and retained rejected history. No real provider or owner-row
  writes were made. The rejection form was inspected at 390 and 1440 pixels in
  light and dark themes; labels use the shared field typography and there was no
  horizontal page overflow.
- API typecheck, admin build, CSS audit, reader-copy boundary and the focused
  lunar tests passed. The full Content Studio API command passed through the
  lunar checks, then stopped in its final rhetorical subgroup because protected
  report evidence was absent. That report test passed with evidence supplied
  only through its process environment; the final Ask judge test also passed
  separately using the matching ARM Node runtime. No failed assertion was waived.
- The extended Playwright suite loads all 12 tests. Its new assertions were not
  executed through Playwright locally; rendered verification used computer-use
  controls against the actual handlers and synthetic storage instead.
- Hosted CI, deployment and the live owner workflow remain unverified. Existing
  reader entries retain their own text and publication state.
