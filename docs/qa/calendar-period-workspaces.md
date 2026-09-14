# Calendar period workspaces

Calendar Write-ups contains Daily Sky, Weekly Sky, and Monthly Sky. Daily Sky uses the existing Moon-sign workspace and its CRUD controls. Weekly and Monthly Sky open exact saved template keys, preserving the complete saved pattern and editor-only purpose. Missing templates start as unsaved reference drafts; retrieval errors never replace saved work. Sky Write-ups keeps the shared summary, placements/lunations, and transit workspaces. Existing Lunar Calendar and earlier Sky forecast links are preserved, including search state.

These templates are manual writing references. Saving a template does not generate an overview or publish it to the public Calendar. No reader prose, serving resolver, or generated content package changes are included.

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

CI results and the production merge/deployment receipt belong to PR #816 and its final head. Live verification is read-only for saved owner templates; browser write fixtures use isolated test data.
