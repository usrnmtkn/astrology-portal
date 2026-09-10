# Sky placement hydration stability — September 10, 2026

Based on main 98965c0b. Reproduced the two supplied Sun-in-Virgo states with the actual web build and Swiss Ephemeris, fixed at September 10, 2026 in New York. A DOM observer recorded `Sun in Virgo`, August 23–September 23, without the lunar paragraph, followed by `The Sun in Virgo`, August 22–September 22, with the lunar paragraph and inherited legacy key dates.

The initial core snapshot had no calculated transit windows. The article adapter estimated endpoints and took its title/window from the legacy article renderer, even after selecting canonical copy. Lunar context defaulted to UTC before the enriched position supplied its time zone.

Changes:

- Route loading calculates the requested placement when transit endpoints are missing, preserving an existing same-route article during refresh. Card navigation also waits for calculated endpoints.
- Canonical copy uses the consistent placement title and calculated residency window. Key dates come from calculated position facts in the same time zone instead of legacy article metadata.
- Lunar context explicitly uses the selected location time zone.
- No authored source text, resolver artifact, or serving approval was changed.

Verification:

- Before-fix browser capture reproduced both screenshot states.
- New mutation-observer regression checks every observed title, date line, lunar-paragraph presence, and article body through loading and content revalidation, plus reload and title typography. All four mobile/desktop and light/dark variants pass.
- Existing reader regression run: 21 passed; two refresh-fixture cases initially captured the still-pending initial background enrichment. The fixture now waits for the initial enriched cache before holding subsequent refreshes.
- Final run: all 10 affected browser cases pass (four Sun stability variants, four retrograde card/article variants, two successful/failed live-refresh cases). The other 13 reader cases passed in the preceding run.
- Web typecheck, CSS audit, bundle budget, and 27-placement app-adapter/source/dist retrograde parity check pass.
- Registered the new regression in the existing Sky placement Studio CI job.

This is local verification; production deployment has not been performed for this fix.

## Production reload follow-up

Production verification of merge `f36b697e` passed initial rendering and content refresh but caught a transient `Aug 23 - Sep 23` header on cached reload. Published dashboard rows could mark the placement package ready before the canonical reader module loaded. The route now waits for canonical reader readiness as well as calculated timing; dashboard availability alone cannot release a provisional article. A failed reader load offers retry.

The stability regression now delays the canonical corpus fetch and checks every observed reload state, including title, date range, lunar paragraph, and full body. Package-failure coverage checks that no provisional article appears and that retry recovers.
