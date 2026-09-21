# Calendar CI reconciliation — 2026-09-21

PR #991 preserves the Day (`week` internally), Week (`weekly`) and Month redesign.
Event cards open the accessible Event detail dialog. Read article is the separate
Sky navigation action. Complete approved passages and the published monthly
overview remain covered by browser regressions.

## Remaining loading repairs

- Import the fragment-only YouRoute wrapper directly. The profile page remains
  lazy; removing this extra Suspense boundary avoids a second reveal delay.
- On direct You links, fetch the profile page alongside App. Paint the saved
  profile before evaluating optional prose packages. A network regression holds
  App's response and verifies that the profile module is already requested.
- Share the You module resource between intent preloading, direct-link startup
  and rendering. A prefetched module renders synchronously. Paint the saved
  profile before chart-detail rendering, while direct article links receive
  their full data immediately. Leaving an unfinished Sky loading screen for
  You skips the expensive snapshot; completed-page transitions remain intact.
  Warm navigation measured 268 ms with 8x CPU throttling (800 ms limit).
- Measure warm You navigation from the browser's actual click to its first
  visible profile frame. Record Playwright's pre-click preparation separately;
  all original performance limits remain unchanged.
- Prioritize foreground astronomy requests over queued personal-transit timing
  enrichment. The same single Swiss worker and calculation functions remain in
  use. Yield between jobs to receive new route requests; preserve each request's
  input, result ID, failure response and background FIFO order.
- Measure first visible Friends detail in the browser, preserving the visible
  card assertion and all original timing limits. Mobile Friends setup waits for
  its menu instead of unrelated completed Sky calculations.
- Measure mobile Friends from the actual menu-item click to the first frame
  containing both the Friends heading and saved chart row. Under 4x CPU pressure,
  driver preparation took 344–579 ms before input while the app painted in
  446–753 ms. Record that preparation separately from the unchanged 1,000 ms
  navigation budget and retain both accessible-content assertions.

The worker regression executes the actual worker queue with controlled
calculation fixtures. Existing Calendar preview tests compare two actual Swiss
calculations and time zones; the cross-surface browser test remains unchanged.

## Final browser race repairs

- Capture the exact dated article href when the browser clicks it. Hydration
  can replace the link between a driver's earlier attribute read and input.
  Destination, article title, parent navigation and refresh stability assertions
  remain intact; the original race reproduced locally, and all four corrected
  mobile/desktop light/dark flows passed.
- Focus a requested Studio source field after the editor commits, observing
  deferred fields until they mount. Clear the request when closing the editor.
  The existing desktop/light and mobile/dark source editing flows both pass.
- Give article geometry assertions the same 60-second calculated-copy readiness
  window as other placement regressions, separately from the 15-second shell
  gate. All layout assertions and You/Friends performance ceilings are retained.

## Studio bundle measurement

Measurements use separate Git worktrees, each with its own `npm ci`, and the CI
Supabase environment. `node scripts/check-admin-bundle-budgets.mjs` measures gzip
with Node's level-9 compressor.

| Checkout | Entry raw | Entry gzip | All JavaScript gzip |
| --- | ---: | ---: | ---: |
| Main `d654e8b68` | 730,352 | 212,353 | 544,332 |
| Calendar after payload repair | 736,617 | 214,006 | 566,468 |

Main already exceeded the September 15 limits. Before repair, the Calendar
preview imported the full reader fallback runtime and the build measured about
754 kB aggregate gzip. The preview now uses its loaded source rows plus the
existing shared Moon-phase defaults. Source labels import a lightweight title
helper, keeping complete seasonal passages out of the initial Studio entry.
No approved source text changed in these repairs.

The reconciled limits are 740,000 entry/largest raw bytes, 215,000 entry gzip
bytes and 568,000 aggregate gzip bytes. All deferred editor/preview/graph and
forbidden-payload checks remain. Reader boot and You/Friends timing budgets are
unchanged.

With the final editor-focus repair, the standalone Studio build is 214.2 kB
entry gzip and 566.7 kB aggregate JavaScript gzip; it passes the same limits.

## Visual evidence

Linux Calendar light and dark baselines come from PR-head run 35564360699 and
were visually reviewed. The intentional changes are the Day/Week/Month header,
selected-day reading, check-in control and event-card layout. Dark Day/Today
controls have readable contrast. Screenshot tolerance remains unchanged.

The exact final PR head must pass the unfiltered Content Studio API workflow
and the complete required browser matrix before merge. Production verification
must use the automatically deployed main merge commit.

## Local validation before the final CI run

- Unfiltered Content Studio API suite: passed in the isolated checkout with its
  own dependencies and no owner environment file.
- Startup contracts (including worker scheduling), CSS audit and web bundle:
  passed. App boot is 456.1 kB gzip; reader boot with CSS is 508.8 kB.
- You performance: 5 passed. Friends performance: 10 passed. Limits unchanged.
- Unchanged light/dark cross-surface navigation test: passed.
- Calendar Studio preview and source editing: 9 passed across mobile/desktop and
  light/dark, including two actual calculated skies.
- Built output privacy: passed for 300 web and 72 standalone Studio files.
