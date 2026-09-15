# Calendar period workspaces

Calendar Write-ups contains Daily Sky, Weekly Sky, and Monthly Sky. Daily Sky uses the existing Moon-sign workspace and its CRUD controls. Weekly and Monthly Sky open exact saved template keys, preserving the complete saved pattern and editor-only purpose. Missing templates start as unsaved reference drafts; retrieval errors never replace saved work. Sky Write-ups keeps the shared summary, placements/lunations, and transit workspaces. Existing Lunar Calendar and earlier Sky forecast links are preserved, including search state.

Delivery is inside the existing Content Studio at `https://tldrastro.vercel.app/admin/content`, using its existing owner session and saved content. The Calendar navigation opens the three period views on that same origin. A feature-branch deployment is only release testing infrastructure; it is not a separate dashboard for the owner to adopt or manage, and is not completion of the production request.

These templates are writing references with an interactive preview. Saving a template does not generate new astrology prose or publish an overview to the public Calendar. No reader prose, serving resolver, or generated content package changes are included.

## Interactive preview

Daily, Weekly, and Monthly Sky show the saved template before opening the editor. Preview, Template pattern, and Variables tabs share one source of truth. Unsaved template edits appear in the preview; saving preserves the complete pattern and editor-only guidance. The new Daily reference uses `slot-template/calendar/daily-overview/v1` and does not replace the public Calendar day-card template.

Choose signs updates the Sun introduction and one complete eligible Moon passage. Use ephemeris obtains the selected instant's Sun/Moon signs and degrees, Moon phase, retrogrades, and Moon ingress from the same Swiss worker as the reader. Weekly dates, daily Moon signs, and event times use the calculated Monday–Sunday week. Monthly dates and key events exclude adjacent grid days. Live mode refreshes the instant each minute; selecting a date stops the clock. The browser timezone and exact UTC instant are available as read-only variables. A nonexistent local time is rejected. Example signs never carry degrees or event times from a real calculation.

The preview assembles existing complete passages; it does not invent the opening or integration. Those variables stay visibly unfilled until authored. Saved sources load through authenticated repeated `contentKeys` parameters. Approved package starters can supply existing app passages when no database row exists; draft/held database passages and the excluded base Cancer passage cannot fill Moon writing. Retrieval errors or changed calculation inputs remove stale results and offer retry. No calculated context is written into the saved template.

Verification includes two direct Swiss comparisons, a DST week, February boundaries, actual-handler creation/readback for all three reference templates, batched source retrieval, governed package fallback, and unchanged full source bodies. Sixteen fresh-build browser cases cover desktop/mobile, light/dark, populated/empty templates, instant edits, manual/calculated switching, all period views, source/calculation failures, save/reopen, existing Moon CRUD, old links, and shared summary access. CSS/token checks and computed heading comparisons use the existing Sun/Moon Studio preview as the reference.

## Verification

The isolated feature checkout has its own npm ci dependencies and local knowledge build. The full Content Studio API contract passes, including actual-handler weekly/monthly creation, exact structure/purpose readback, reader exclusion, and stale-write refusal. The fresh-build browser matrix covers 20 cases: desktop/mobile, light/dark, populated/empty templates, save/reopen, source failures, old links, Moon-sign CRUD, shared summary access, Friends context, and unsaved-change protection. Computed heading styles match the existing summary editor; heading and visible-label order are asserted. CSS and reader-copy boundary audits also pass.

## Bundle allocation

The clean base and feature were built in separate worktrees with their own dependencies, using the Memory graph browser contract workflow's VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY fixture configuration. Gzip measurements use the budget checker's level 9 setting.

| Measurement | Main b4a622a3c | Calendar workspaces | Change |
| --- | ---: | ---: | ---: |
| Entry JavaScript, raw bytes | 609,164 | 612,218 | +3,054 |
| Entry JavaScript, gzip bytes | 176,423 | 177,394 | +971 |
| All JavaScript, gzip bytes | 457,080 | 458,081 | +1,001 |

Shared sidebar rendering and shorter helper text reduce the added interface code. The aggregate budget increases from 458,000 to 458,500 bytes to account for the measured feature, leaving 419 bytes of headroom. Initial-entry, largest-chunk, memory-graph, lazy-boundary, and forbidden-payload limits remain unchanged. No runtime dependency is added. A default build without the workflow's configuration understates the release measurement.

The interactive follow-up was measured separately against `be85f9764` with the same CI configuration and isolated dependencies:

| Measurement | Previous Calendar workspaces | Interactive preview | Change |
| --- | ---: | ---: | ---: |
| Entry JavaScript, raw bytes | 612,218 | 613,325 | +1,107 |
| Entry JavaScript, gzip bytes | 177,395 | 177,777 | +382 |
| All JavaScript, gzip bytes | 458,055 | 465,992 | +7,937 |

Allocate 8,000 additional aggregate bytes (466,500 total, with 508 bytes of headroom). The initial-entry, largest-chunk, memory-graph, and forbidden-payload limits are unchanged. Both new preview modules must remain dynamic entries; a static-graph check rejects eagerly loaded preview UI. The preview reuses the existing Swiss worker and adds no runtime dependency.

CI results and the production merge/deployment receipt belong to PR #816 and its final head. Live verification is read-only for saved owner templates; browser write fixtures use isolated test data.

The integration with main `cfc75ea90` preserves the new shared Variables directory alongside Calendar Write-ups. Its independent 3,000-byte aggregate allocation combines with the Calendar allocation for a 469,500-byte limit. The combined CI-configured build measures 468,241 aggregate gzip bytes and 177,934 entry gzip bytes (613,979 raw). Initial-entry, largest-chunk, graph and deferred-content limits remain unchanged.
