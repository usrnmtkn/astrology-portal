# Reader loading and transit recovery — 2026-09-08

Based on main `6597729573012209137f31e2dd9f7331443da822`.

## Findings and changes

- Friends could fetch connections successfully after an initial failure while keeping the error screen. Successful refresh now restores availability. Returning to the tab or regaining a network connection retries the read. The Friends RPC has an eight-second transport deadline inside the existing ten-second UI deadline.
- You calculated active transits but hid rows without approved detail, then displayed “No major updates.” Calculated aspects and house placements now remain as static, non-clickable rows until reader-eligible detail exists. Available details remain clickable. All 14 house placements are shown instead of silently truncating the list to four.
- Calendar ignored the shared `?date=2026-11-27` when the hash lacked a date. It now reads that date, preserves more-specific Calendar links, and synchronizes Calendar selections back to the shared date before navigating to You.
- Calendar's content reads had no transport deadline. Targeted reads and surface pagination now share an eight-second deadline and fall back through the existing publication-aware snapshot path. Static snapshot fetches are also bounded. Missing approved interpretation ends the skeleton while retaining calculated event facts.
- Aspect date formatting requested year and day without month, producing ICU text such as `2026 (day: 8)`. Same-day, same-month, cross-month, cross-year and timezone cases now produce ordinary dates.

No astrology prose, source rows, review states, retirement records, or resolver artifacts were changed. A missing Lilith station interpretation remains an editorial coverage gap: no Lilith station/retrograde key exists in the current approved offline snapshot. The UI must not invent writing or keep pretending to load it.

## Validation

- `npx playwright test -c playwright.reader-recovery.config.ts`: four tests passed on a fresh production build with synthetic authenticated identities and API fixtures. Friends focus/online recovery, all 14 You house rows during a stalled content request, static facts without empty article links, November Calendar selection, bounded skeleton completion, and Calendar → You date synchronization.
- Desktop and 390px mobile You screenshots inspected; no horizontal overflow. Calendar screenshot inspected.
- `node --experimental-strip-types scripts/test-sky-aspect-date-range.mjs`: five date cases passed.
- `node scripts/test-you-transit-live-content-wiring.mjs`, `node scripts/test-social-friends-contract.mjs`, `node scripts/test-content-studio-last-known-good.mjs`: passed.
- Typecheck, CSS consistency/token audits and production bundle budgets passed. Reader boot remained below its existing 465 kB gzip cap.
- `npm run test:performance-contracts`: all startup, Friends, package, and deferred-runtime checks passed. The Friends ordering assertion also requires recovery of the visible list after a successful refresh.
- The new browser/date regressions run in the existing Sky summary CI job.

## Production database limitation

The earlier authorized Fast database reboot completed. During this investigation Supabase reported Healthy and a small SQL read confirmed that social storage responded, but its advisor still reported elevated Data API failures. That does not prove the owner's authenticated Friends request is consistently healthy. The separately proposed Nano → Micro resize has not been applied; it still requires the outstanding user approval. No further database restart or resize was performed in this change.
