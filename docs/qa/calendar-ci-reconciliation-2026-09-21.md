# Calendar CI reconciliation — 2026-09-21

PR #991 preserves the Day (`week` internally), Week (`weekly`) and Month redesign.
Event cards open the accessible Event detail dialog. Read article is the separate
Sky navigation action. Complete approved passages and the published monthly
overview remain covered by browser regressions.

## Remaining loading repairs

- Import the fragment-only YouRoute wrapper directly. The profile page remains
  lazy; removing this extra Suspense boundary avoids a second reveal delay.
- Prioritize foreground astronomy requests over queued personal-transit timing
  enrichment. The same single Swiss worker and calculation functions remain in
  use. Yield between jobs to receive new route requests; preserve each request's
  input, result ID, failure response and background FIFO order.
- Measure first visible Friends detail in the browser, preserving the visible
  card assertion and all original timing limits. Mobile Friends setup waits for
  its menu instead of unrelated completed Sky calculations.

The worker regression executes the actual worker queue with controlled
calculation fixtures. Existing Calendar preview tests compare two actual Swiss
calculations and time zones; the cross-surface browser test remains unchanged.

## Studio bundle measurement

Measurements use separate Git worktrees, each with its own `npm ci`, and the CI
Supabase environment. `node scripts/check-admin-bundle-budgets.mjs` measures gzip
with Node's level-9 compressor.

| Checkout | Entry raw | Entry gzip | All JavaScript gzip |
| --- | ---: | ---: | ---: |
| Main `d654e8b68` | 730,352 | 212,353 | 544,332 |
| Repaired Calendar branch | 736,617 | 214,006 | 566,468 |

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

## Visual evidence

Linux Calendar light and dark baselines come from PR-head run 35564360699 and
were visually reviewed. The intentional changes are the Day/Week/Month header,
selected-day reading, check-in control and event-card layout. Dark Day/Today
controls have readable contrast. Screenshot tolerance remains unchanged.

The exact final PR head must pass the unfiltered Content Studio API workflow
and the complete required browser matrix before merge. Production verification
must use the automatically deployed main merge commit.
