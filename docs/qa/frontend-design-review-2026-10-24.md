# Frontend design review — 2026-10-24

The web frontend now uses the supplied design system across the app shell, Sky, zodiac wheels, profiles, Friends, horoscopes, articles, authentication and account surfaces. Calendar keeps its existing Day/Week/Month navigation, journal and subscription structure. The implementation uses existing calculated facts and admitted reading sources; prototype fixture prose is not runtime content.

Branch: `codex/frontend-design-system-20261024`. Base: `2baa1b170dc7ca553cc80e338821798ede2c0f78`. Refreshed `origin/main`: `1fb8ddd1a26ff9020d73b7bdf0c570b66faa22c1`; committed divergence 0 ahead / 28 behind. Changes are local and uncommitted.

## Requirement review

The [requirement audit](frontend-design-audit-2026-10-24.json) maps every requirement to its source frame, implementation and verification evidence. It includes the 27 HTML reference inventory, all 51 requirements, source hashes and explicit data dependencies.

| Surface | Review status |
| --- | --- |
| foundations | verified-local |
| navigation-menu | verified-local |
| wheels | verified-local |
| sky | verified-local |
| you-profile | verified-local |
| friend-profile | verified-local |
| friends | partial, requires-data-contract, verified-local |
| horoscopes | verified-local |
| articles | verified-local |
| calendar | verified-local |
| account-settings | verified-local |
| loading | verified-local |
| auth | retained-live-unverified, verified-local |
| learn-guides | verified-local |

`verified-local` describes local rendered and source checks. It does not imply production deployment or live third-party authentication acceptance.

## Browser evidence

The earlier overhaul acceptance pass had **30 passing scenarios**: all 24 page journeys at 390 and 1440 pixels in light/dark, four calculated wheel/inspector journeys, natal outage/retry and Account journal access. It verifies saved profile edits after reload; complete sect/Insights readings and original paragraph boundaries; natal and transit fullscreen; stable Friends tabs and keyboard controls; invitation link creation; calculated feed dates and exact reading links after reload; horoscope edition/sign navigation; and Guide/Learn complete readings.

Additional checks passed for header overflow, Calendar controls at 320/390/430/1440 pixels, four persistent subscription/feed scenarios, Sky summary/linked-reading scenarios, and loading geometry/reduced motion. Full-page screenshots temporarily enable offscreen card painting during capture; runtime scroll/click checks retain the actual content-visibility optimization.

Local logs and screenshot names are recorded in the JSON audit. The Content Studio API regression ran successfully in two segments after ignored protected test evidence was provisioned. It used injected provider responses and made zero live provider calls. CSS/token architecture, production build/typecheck, bundle budgets, Friends routing/contracts and privacy checks pass.

## Remaining data dependencies

- Birthdays need a privacy-safe, consented social data contract. Shared charts do not expose raw birth dates.
- Three-day Friction/Flow cards now use locally calculated fixed-composite facts. The prototype's historical feed catalogue and interpretation summaries still need production content contracts; proposed conjunction meanings are not served.
- Descendant/IC cards show calculated facts for reliable birth times and open existing Learn guides. Personalized story copy remains gated on approved source rows. Sky angles similarly do not show invented timing arcs.
- Live identity-provider verification, native external sharing and paid report purchases were not exercised. Existing integrations remain in place.

## Bundle cost

Matched independent npm-ci builds use Node 22.20.0, identical visual-smoke public configuration and the natal-aspect flag. Values below are gzip bytes.

| Measurement | Main | Candidate | Change |
| --- | ---: | ---: | ---: |
| App JS boot | 472,961 | 478,323 | +5,362 |
| Reader boot including CSS | 528,073 | 535,836 | +7,763 |
| Startup CSS | 55,112 | 57,513 | +2,401 |
| All JS | 3,653,873 | 3,661,615 | +7,742 |
| All CSS | 119,571 | 127,196 | +7,625 |
| Shared Studio/Memory CSS | 30,442 | 30,881 | +439 |
| Deferred horoscope reader | 3,781 | 4,400 | +619 |

Retired Sky styling was removed and profile/Friends styling stays deferred. Narrow CSS, aggregate JS and horoscope-reader allocations record the cost of the requested interface. App/reader JS startup, dependency, source-payload and runtime performance caps are unchanged. This is not a production loading improvement claim.

## Reproduction

Run `npm run qa:css-audit`, `npm run test:friends-routing`, `node scripts/test-social-friends-contract.mjs`, `npm run privacy:check`, and the suites listed in the JSON audit. Browser suites use the repository's fresh production-build preview configuration. Protected local test evidence is ignored and must never be committed.

## Glyph and typography refinement

The follow-up review found two interacting glyph problems: legacy retrograde rules collapsed the tile, and an auto-sized grid track kept the planet against the left edge. Retrograde motion no longer changes tile geometry; the grid now fills its tile. The remaining legacy neutral filter was removed so retrograde and direct symbols use the same teal treatment. Desktop arc cards use a 48px planet tile without the sign overlay; phone rows use the reference's 52px tile and 24px corner sign badge.

Exact prototype roles replace the earlier generic sizes: desktop Sky cards use Newsreader 26px titles and 17px/1.5 copy; phone rows use system sans 17px titles and 15px/1.45 copy. Sky readings use Newsreader 19px. Article titles/body use 60px/26px on desktop and 34px/19px on phone. Article retrograde cycles now use the shared Calendar cards: Newsreader 22px disclosure titles, 17px dates and 14px metadata, with the same comparison table and date controls. Approved prose and calculation data are unchanged.

The focused regression in `tests/visual/design-handoff-type-glyphs.spec.ts` checks all 14 placement tiles, including Mercury/Venus retrograde, with actual ephemeris facts at 390px/1440px in light/dark. It checks loaded assets, exact dimensions, centering, hit testing at the planet, consistent color, loaded Newsreader, computed type, article facts, heading order, overflow and reload. The live unmocked app was also reviewed; capture: `test-results/refined-live-sky-review.png`.

Final refinement acceptance: **54 distinct browser scenarios passed** across the broad pass and focused Calendar rerun. The broad run passed 50 scenarios; four Calendar assertions still expected pre-handoff font metrics and radii. Updating those expectations to the established 17px narrative / 32px raised-card roles allowed all five Calendar/retrograde scenarios to pass in the focused rerun. Product sources were unchanged between those runs. CSS/token audit, typecheck, fresh production builds, privacy (11,427 files), bundle ceilings and whitespace checks pass. Detailed receipts and product-source hashes are in the JSON audit.

## Article retrograde cycle cards

Article pages use the Calendar’s actual `RetrogradeCycles` component inside their existing on-demand disclosure. Previous/Next sections, comparison rows, local-zone Open links and keyboard controls share one implementation and stylesheet. Changing article context remounts the disclosure, clearing an old receipt. Shared component typography overrides the surrounding narrative article scale; date pills retain the Calendar control color in both themes.

The reader/Calendar browser journey covers calculation loading and retry, Previous/Next collapse via keyboard, comparison values, historical/future Calendar navigation, reload, bounded missing results and computed style parity at 390/1440px in light/dark. Live Mercury rendering matches the supplied screenshots’ November 2025 / October 2027 dates. Capture: `test-results/article-calendar-cycles-live.png`.

The full-detail integrity audit also identified overview preview selectors introduced by the earlier redesign. Its exact preview registry now includes those four selectors; PostCSS correctly handles the comma inside `:is(...)`. Full article guards and the protected multi-paragraph source checks remain active.

Final article-cycle acceptance: **9 passed** using a fresh production preview (`/private/tmp/tldrastro-article-cycles-final.log`). Computed font family, size, weight, leading, tracking, color, radius and padding match between article and Calendar. Typecheck, CSS/token architecture, bundle limits, heading deduplication, full-detail integrity (1,880 protected multi-paragraph passages), privacy and whitespace checks pass.


## Updated placement handoff and Sky highlights

The second ZIP (SHA-256 `153289a7856e9cb838a54e61242a7471b35ed5202e55e4097f934e8b4ce9cc61`) adds `Sky Placement Retrograde.dc.html`. This supersedes the earlier article typography and outer Retrograde cycles disclosure described above for current Sky placements. The original handoff remains the reference for other article types.

Current Sky placement pages use a 64px planet circle, 44px desktop / 34px compact Newsreader title, calculated dates and a mint retrograde badge. The reading remains complete in its own white card. Key dates, Previous retrograde and Next retrograde each have their own raised container, separated by 8px. Native disclosures support keyboard operation, and the comparison tile reuses the Calendar cycle calculation and date controls. Article cycle dates use system UI 18px/600 on desktop and 17px/600 on compact screens, with 14px metadata. Back navigation now shares the main navigation row (superseding owner correction below); Previous/Next follow the Sky order.

Key dates retain their exact timestamps through rendering and open the selected location’s Calendar day. The first upcoming event gets one Next marker; earlier events use muted text. Approved Key dates introductions, Gifts/Lessons, rising-sign passages and article prose remain intact. The reference’s sample natal contacts are not imported; this pass uses the app’s existing calculated collective timeline and does not add a personalized natal-event catalogue.

Sky’s retrograde-count and void-of-course phrases now use flat `#a7f2d7` mint (sampled from the supplied screenshot), Geist Mono, a 4px radius and cloned line backgrounds. These highlights follow actual calculated conditions; example counts and countdowns are not hardcoded.

The new Key dates module stays deferred from shared natal/aspect article readers. Retiring 115 unreferenced token names offsets the added CSS, while preserving dynamic mood tokens, startup roles and the required body alias. Existing startup and CSS limits pass. The route and aggregate JavaScript budgets explicitly allocate the small requested control increase; the rationale and exact measurements are in `scripts/web-bundle-budgets.json` and the JSON audit. No new runtime dependency is introduced.

Final fresh-build Chromium acceptance: **34 passed** (`/private/tmp/tldrastro-placement-v2-acceptance.log`). Current source checks pass for typography/token architecture, protected full-detail copy, heading deduplication, calculated placement timelines, bundle budgets and privacy. Live review evidence: `test-results/placement-handoff-v2-live.png`; synthetic highlights: `test-results/sky-summary-light-1440.png`.


## Article disclosure defaults

Following the owner’s interaction correction, current Sky placement articles start with Key dates, Previous retrograde and Next retrograde closed. The reader expands each section. Reload and navigation to another placement restore the collapsed defaults; normal rendering does not override a reader’s chosen expansion. Calendar’s existing cycle disclosure defaults remain unchanged. The local review capture is `test-results/placement-article-collapsed-live.png`.

Verification: 17 browser scenarios passed across desktop/mobile and light/dark, including explicit expansion, reload/navigation reset, comparison and Calendar parity. The CSS architecture, protected-copy and bundle checks pass. These changes remain local.


## Child-page Back alignment

The owner’s navigation correction supersedes the prototype’s separate Sky button below the header. Sky placement articles now use the existing shared Back control in the same row as the main navigation. Shared child controls use matching heights and vertical centers across desktop, tablet and phone. Desktop header space keeps the Back control clear of the nav; compact controls use the circular pattern with accessible names preserved. The article disclosure defaults remain closed.

Verification: 8 new child-page cases pass across 390/768/1024/1440 in light and dark, covering a populated Sky article, unavailable guide and Settings child route, scrolling, reload and parent navigation. The 9 existing header cases also pass on the same app source. CSS architecture, protected full-detail copy and unchanged bundle ceilings pass. Captures: `test-results/child-back-1440-light.png` and `test-results/child-back-live.png`.


## Light/dark tokens and navigation parity

The shared recessed, sheet, symbol and track roles now resolve to dark surfaces in dark mode. Profile and menu cards retain readable text; glyph images use the dark foreground filter. Accent avatars, count badges and authentication buttons use the existing inverse foreground role. Dark account warning text has a readable warning color, paired with inverse text on its confirmation button. An older chart rule now targets direct angular labels, allowing inverse ASC/DSC/MC/IC badge text to remain readable.

Shared primary navigation is Sky, Calendar, Horoscopes, Guide, You, Friends in the app header and drawer. Guest navigation retains its existing first four destinations. The Reports header and menu now include Horoscopes and Guide in the same positions. Secondary Learn, Reports, Account and Settings links retain their existing access rules; the global Reports layer remains their single report-entry owner.

Final fresh-build acceptance: **49 passed** in Chromium, across light/dark and compact/desktop. Checks cover rendered text/surface contrast, angle badge SVG contrast, direct and retrograde glyph visibility, navigation order and responsive overflow, theme switching and reload persistence, profile/account/authentication/friend/education routes, article disclosure defaults and Back alignment. The static audit scans 59 stylesheets with zero unresolved active token references or raw component visual values. Typecheck, protected-copy and heading integrity, privacy and unchanged bundle limits pass. The QA JSON pins the source hashes and exact measurements. Live captures: `test-results/theme-menu-dark-live.png`, `test-results/theme-menu-light-live.png` and `test-results/theme-sky-dark-live.png`.

Changes remain local and uncommitted on `codex/frontend-design-system-20261024`, 0 ahead / 2 behind fetched `origin/main` (`ac4bbd9d9a9475a3006366c02105d166e4da567f`). The live worktree app is left on the Mercury article with the original light theme restored.


## Profile overflow menu layout

The profile's options button now shares a flex group with the Transits / Natal Chart control. This replaces positioning inherited from the old identity card, including its absolute offsets and compensating tab margin. On compact layouts the controls use a full-width row below the identity; desktop keeps the identity and controls on one row. The dropdown retains the existing viewport-aware placement and Edit details action.

Live worktree verification covers both views at 320, 390, 768 and 1440 in light and dark: all 16 variants have identical tab/button vertical centers, a 16px gap and no page overflow. The dropdown opens 8px below its trigger with matching right edges at phone and desktop widths. Edit details opens the existing editor, which was closed without saving; Escape restores trigger focus. Alignment persists after reload. CSS/token and protected-copy audits pass. The normal browser viewport and original light theme were restored, with You open for review.

Evidence is from the running development app. A fresh production build and bundle measurement were not rerun for this follow-up; earlier production-browser receipts remain pinned to their earlier source hashes. Captures: `test-results/profile-options-desktop-live.png`, `test-results/profile-options-dark-desktop-live.png` and `test-results/profile-options-mobile-live.png`.


## Login return and Requests routing — October 25

An old Requests tab could become the login destination through restored portal state or a saved reader return. Root visits now use You for this saved state, and Requests auth returns normalize to You. Starting a new login clears stale return state even if its starting page has no supported return route. Deliberate navigation to Requests remains available; Circle, Calendar, Account/journal and Reports returns retain their existing behavior.

Email-login acceptance also found a completion race: a hash-only return could interrupt account bootstrap after the form had already navigated to You. Same-document returns now let verified profile loading finish. Login is available after sign-out even when a cached local chart profile remains.

Final fresh production-preview acceptance: **44 passed**, including saved-session restoration/reload, OAuth and email login with old Requests state, callback cancellation/retry, existing feature returns, stale account/invitation response rejection, and the existing navigation/profile/account/friend/education journeys. Deterministic auth isolation and Friends routing tests, typecheck, CSS/token, protected-copy, privacy and bundle checks pass. Identity/API fixtures are synthetic; no real owner account or saved content was modified. The source hashes and exact evidence are in the QA JSON. This fresh build also includes the preceding profile-menu layout correction.

The final aggregate JavaScript size is 3,664,035 gzip bytes, 35 above the previous aggregate ceiling. The budget explicitly allocates 100 additional bytes for the requested routing and bootstrap correctness guards, with 65 bytes of measured headroom. Startup, individual chunk, CSS and runtime timing ceilings stay unchanged. The official Supabase redirect documentation and changelog were checked; no SDK or deployment configuration changed. Changes remain local and uncommitted on `codex/frontend-design-system-20261024`.

Final repository comparison: the local frontend branch is 0 ahead / 4 behind fetched `origin/main` (`fea4c7da56ccc8e5df5bd42ee70dc0cbffbc16d3`). New main commits were not merged into the uncommitted redesign.

## Friends birthday sidebar — October 25

The Friends Feed sidebar now follows the D1/D2 birthday treatment from the updated handoff: centered names and dates, an avatar cluster for up to three upcoming birthdays, and a button opening the full birthday list. The redundant Circle and Charts links are removed. Each birthday opens the existing person’s natal chart. The sidebar uses shared theme/type roles and stays hidden on compact layouts, as specified for the right column.

Birthday dates come from the viewer’s existing saved person charts. Events, missing or invalid dates and future birth dates are excluded. Sorting follows the selected location’s civil date, includes birthdays today and handles year rollover and February 29 without moving the birthday to another date. No age, solar-return fact or connected-friend birthday is inferred. ConnectedSocialFriend still has no birthday-sharing field; the existing shared-chart privacy boundary is unchanged. Birthday display is independent of transit loading/error, and an empty saved-date list shows a factual empty state.

Fresh production-preview acceptance: **9 passed** across two fresh-build runs: eight desktop/phone and light/dark journeys, plus an isolated transit loading/read-failure check. Tests cover the existing calculated feed, filtering, keyboard navigation, person/chart actions and reload, plus populated/empty birthday cards, order, dates, additional-birthday dialog, Escape/focus, semantic heading order, computed title typography, contrast and overflow. Date regressions, typecheck, CSS/token audit, protected-copy integrity, Friends routing, privacy and whitespace checks pass. The held-then-503 published-transit request confirms the birthday card and dialog remain usable through loading and the local transit error. Blocking a shared app asset invokes the existing global recovery screen and is outside this sidebar’s independence guarantee. Synthetic identity/API fixtures only; no owner content or real account was modified. Captures include `test-results/design-birthdays-1440-light.png` and `test-results/design-birthdays-1440-dark.png`; the QA JSON pins tested source hashes.

The requested interface adds 628 aggregate JavaScript and 318 aggregate CSS gzip bytes relative to the preceding build. The budget allocates 700 / 400 bytes, leaving 137 / 136 measured bytes; startup, individual chunk, dependency and runtime limits stay unchanged. The local app remains open on Friends Feed. Its review browser is signed out, so authenticated acceptance uses isolated fixtures. Changes remain local and uncommitted on `codex/frontend-design-system-20261024`, 0 ahead / 4 behind the fetched main revision above.

## Friends feed article return — October 25

Opening a feed aspect previously pushed a readable friend URL and then pushed the same reading again as a hash. Article Back returned to that intermediate reading. The route now creates one canonical article entry with the immediate reader parent, preserves that parent through reload and handle upgrades, and avoids another push during article hydration. Older duplicate entries recover to Feed. Readings opened from a friend’s profile retain that profile as their parent.

Forward testing exposed a second race: the child’s raw history listener could open the reading before the main page transition committed, allowing that transition to cancel the article. Friend route replay now runs through the existing article-history event inside the main transition. The main history router recognizes friend article keys, and transit replay follows navigation and the eligible content list.

Fresh production-preview acceptance: **13 passed**, covering 390/1440, light/dark, an animated desktop Friends journey, article Back, reload, browser Back/Forward, one-entry history, legacy duplicate recovery, profile-origin returns, existing Sky nested articles and birthdays. The original Back loop was reproduced before implementation. Routing/parent and auth-isolation unit tests, typecheck, CSS/token, protected-copy, heading, privacy, bundle and whitespace checks pass. Test identities/API responses are synthetic; no owner content or real account was changed. Captures: `test-results/design-feed-return-1440-light.png` and the corresponding compact/dark variants. The QA JSON pins source hashes and logs.

The correction adds 322 aggregate JavaScript gzip bytes, measuring 3,664,985. The budget adds 300 bytes above its prior ceiling, using existing headroom and leaving 115 bytes. Startup, CSS, individual chunk, dependency and runtime limits stay unchanged. This is a local correctness fix, with production unverified. Work remains uncommitted on `codex/frontend-design-system-20261024`, 0 ahead / 4 behind freshly fetched `origin/main` (`fea4c7da56ccc8e5df5bd42ee70dc0cbffbc16d3`).

## Friends Feed Friction and Flow — 2026-10-25

The requested three-day cards now lead Today in Friends Feed. They use the existing fixed circular midpoint composite and Swiss Ephemeris motion, with six composite targets (Sun, Moon, Mercury, Venus, Mars, Saturn). Every qualifying contact is searched across each full local date, including DST changes and contacts away from noon. Continuing influences remain on every qualifying day. Exact roots and station minima are refined; timestamps are not guessed from speed.

`composite-daily-v1` keeps this selection separate from You. The tight orb is 1°. Moving-body weights are Sun/Mercury/Venus 100, Moon 35, Mars 125, Jupiter 150, and Saturn through Pluto 200. Daily strength is rounded weight × (1 − 0.75 × closest orb). Sextiles/trines contribute flow; squares/oppositions contribute friction. A total of 30 is significant. Mixed requires both totals to reach 30 and the weaker to be at least half the stronger, with distinct displayed drivers; otherwise the larger total yields Easy/Tense. A significant conjunction remains unrated and yields Active. Neither total reaching significance yields Quiet. This is an explicit local calculation policy; it does not promote the ZIP's proposed meaning rules or prose.

The updated handoff's A11 variant permits rating and factual aspects without a summary. No synthetic people, dates, fixtures, summary prose or proposed conjunction meanings enter runtime. Cards require mutual chart sharing and explicit known birth times on both natal snapshots. The Moon-sensitive forecast is omitted when birth time is unknown. Existing personal-transit readings remain byte-identical.

Each tile opens its own dated detail, with drivers, other contacts, exact times or closest orb. Tiles stack below 600px. Theme tokens own all five color states. The overflow explainer distinguishes composite transits from compatibility. Hide persists only pair IDs under the current owner, with Undo and a Show hidden cards action after reload. Loading has no rating; one failed date can retry without clearing successful dates. No new dependency or server contract is required.

The fresh production-preview acceptance passed ten scenarios across both themes at 390/1440px, including existing Feed article return/Forward/reload, birthday sidebar/actions, new day details, filters, consent, birth-time omission and DST date selection. After adding the final skeleton and app-based restoration after reload, all five affected Friction/Flow/Feed scenarios passed again. Computed heading metrics, visible/semantic order, overflow, color contrast and focus recovery are asserted. Calculation regressions cover all ratings, distinct drivers, unknowns, early Moon contacts, stations, circular longitudes, midnight ownership, 23/25-hour dates and year rollover; three independent handoff Swiss reference dates match. Typecheck, CSS/token audit, copy integrity (1,880 passages), heading/routing, privacy and bundle checks pass. Exact logs and source fingerprint are in the JSON audit.

Final aggregate gzip is 3,668,603 JavaScript / 128,617 CSS bytes, versus 3,664,985 / 127,514 before this feature (+3,618 / +1,103). Using existing headroom, the explicit allocation adds 3,600 / 1,100 bytes to the aggregate ceilings; startup and every individual chunk cap stay unchanged. App boot is 478,944, reader boot including CSS 535,676 and startup CSS 56,732. This records feature cost, not a production performance claim.

Latest refreshed branch status: `codex/frontend-design-system-20261024`, 0 ahead / 4 behind `origin/main` (`fea4c7da56ccc8e5df5bd42ee70dc0cbffbc16d3`). Changes remain local and uncommitted. The dev review tab is on Friends Feed and signed out; isolated synthetic browser acceptance is not live owner-account verification. No deployment, commit, push or paid writing occurred. Connected-friend birthdays, historical prototype event catalogues and reviewed forecast summary prose remain separate data/content work.

## Feed sources: All, Circle and Charts — 2026-10-25

The feed now includes viewer-owned saved person charts alongside Circle connections. The dropdown contains exactly **All**, **Circle**, **Charts**, in that order. All is the default and combines both sources. The selected source applies before both the transit-reading and three-day composite calculations. The choice persists per owner, including through reload, full-reading navigation and return to Feed.

The source adapter verifies saved-chart ownership and completeness, keeps Circle sharing controls separate, and namespaces chart identities so a chart ID or matching name cannot merge with a connected user. Existing known-birth-time requirements remain for composite forecasts. Saved charts do not acquire fabricated friendship/consent records. Event charts remain in their existing event-chart workspace; they are not personal relationship forecasts. The per-person four-reading limit remains, while the old global 24-row cutoff no longer drops later saved charts. Existing saved-chart birthdays remain independent of the source dropdown.

Fourteen distinct isolated browser scenarios pass across 390/1440px and light/dark. The broad pass completed seven, then stopped on a loading assertion still expecting the old Circle-only text. The focused pass completed that corrected case, the remaining desktop-dark feed/birthday cases and four new empty-state scenarios. Product sources were unchanged between these passes. Checks cover both card types under all three sources, full saved-chart readings and immediate parent return after reload, Circle Back/Forward/legacy recovery, selected-source persistence, composite day details, consent/birth-time boundaries, retry, hide/restore and sidebar loading/error independence. Empty labels retain the same computed heading contract across sources; populated layouts retain existing title metrics, contrast and no overflow. Earlier test-only corrections replaced a curly-apostrophe assumption and accounted for a pre-existing forward history entry after the new saved-chart journey.

`npm run test:friends-feed-sources` passes ownership, incomplete/event chart exclusion, source-ID collision, consent, empty-Circle, exact filter values, invalid preference and per-owner persistence cases. Typecheck, CSS/token audit, routing/social contracts, full-copy integrity, heading checks, calculation regressions, privacy and bundle checks pass. No prose source, calculation policy, CSS or dependency changed. Aggregate JavaScript is 3,668,708 gzip bytes (+105 from the preceding feature), eight above the prior ceiling; an explicit 150-byte allocation leaves 142 bytes. Aggregate/startup CSS and existing startup/individual chunk caps remain unchanged.

Latest refreshed status: `codex/frontend-design-system-20261024`, 0 ahead / **28 behind** main (`1fb8ddd1a26ff9020d73b7bdf0c570b66faa22c1`). Main advanced during the local redesign work. Changes remain uncommitted in the existing worktree and are not deployed. Integration with current main is still separate from this local source-filter acceptance. Exact product fingerprint, logs and synthetic-profile screenshots are recorded in the JSON audit.


## Saved-chart profile layout refinement — 2026-10-25

The saved-chart profile now uses the handoff's 1052px content rail, shared 7:5 chart/reading columns and compact section tabs. Identity and controls share the desktop header; long names wrap naturally, the edit control stays at the right edge, and compact layouts put tabs on their own row. Legacy full-width tab, header-padding and wide-page overrides were removed. Back remains aligned with the main navigation on phones and desktop.

Explicit grid rows keep all five profile sections below the identity bar. Removing an old mobile auto-row override also restores natal/event wheels above their placement lists. Missing-chart natal content spans the rail without creating an empty column. Compatibility cards use shared title/glyph roles and theme-aware zodiac assets. The visible Authored debug badge is removed; source traces and all reader-copy selection remain intact.

The final fresh production-preview run passed all **16 scenarios** at 320/390/960/1440px in both themes. Coverage includes every profile tab, compact More menus, edit-dialog focus recovery, reload and return to Charts, long names, event/missing/Circle variants and four adjacent Sky/You/account journeys. Tests assert computed title metrics, heading order, maximum width, column alignment, wheel-before-list order, theme contrast and the shared zodiac icon filter. Earlier iterations corrected both actual CSS conflicts and test-only assumptions before the final complete run. Synthetic profiles were used throughout.

CSS/token audit, web typecheck, full-copy integrity (1,880 passages), heading/routing/social contracts, privacy and bundle checks pass. Final aggregate gzip: 3,668,593 JavaScript / 128,423 CSS bytes, within existing limits. No budget increase or dependency change. Product-source fingerprint: `bf0e44aca98c6995f1415c2f243b096b9b8d7ee03e2a4e2ed328fa438c7df082`. Exact logs and captures are in the JSON audit.

Fresh remote status remains `codex/frontend-design-system-20261024`, **0 ahead / 28 behind** `origin/main` (`1fb8ddd1a26ff9020d73b7bdf0c570b66faa22c1`). Changes remain local and uncommitted. No deployment or live owner-account verification occurred. Approved prose and calculation policies were not changed.


## You → Transits handoff — 2026-10-25

The personal Transits page now follows the latest handoff: the unboxed daily reading and two-column Do/Don’t sit beside the wheel, the report strip spans the rail below the overview, and short-term/long-term/house transits use three-card previews with See all and Show less. The shared 1052px profile rail, desktop identity/control alignment, compact wrapping, ring legend and fullscreen action remain. Cards use existing source headings, precise orbs and calculated dates, shared aspect colors and centered circular chevron cues. A missing detail has no false opening cue.

Reader prose, the four-contact daily admission policy, whole-day calculation, weekly/special-date content and paid-report behavior are unchanged. No prototype people, prose or price labels were copied into runtime. Missing-city setup appears beside the wheel on desktop and below it on compact layouts. Existing report account recovery and pending/ready/error actions remain functional.

Fresh production previews passed 37 broad scenarios, then 25 affected surface/timing/report cases after the mobile layout refinement. The final glyph-alignment CSS correction passed eight complete Transits journeys again at 320/390/960/1440px in both themes, asserting both circle and symbol centering, heading metrics, contrast, card expansion, full reading Back/reload and Natal/Transits switching. The final product fingerprint is `41d7ca63c2c9e82ccec5c492dfb80a641f9da14d12f70e6d747f6f2eb7eabab0`. Tests use synthetic profiles and mocked report requests; no owner-account or paid-generation claim is made.

CSS/token audit, web typecheck, 1,880-passage copy integrity, full-day Swiss regressions, assembly/heading/routing checks, server-governed report contract and privacy checks pass. Stale assembly assertions were aligned with existing URL restoration, the four-contact policy and the assembled Calendar fallback; production behavior was not changed to satisfy those assertions. Exact logs and captures are in the JSON audit.

Final aggregate gzip is 3,669,219 JavaScript / 129,764 CSS bytes (+626 / +1,341 from the preceding profile refinement). Aggregate allowances add 700 / 1,500 bytes with the measured rationale in the budget file. Startup CSS stays 56,705; all startup and individual chunk limits stay unchanged. No dependency was added.

Refreshed status remains `codex/frontend-design-system-20261024`, **0 ahead / 28 behind** `origin/main` (`1fb8ddd1a26ff9020d73b7bdf0c570b66faa22c1`). Changes remain local and uncommitted; nothing was deployed. The ZIP’s other new areas are outside this Transits request.


## Shared navigation clearance — 2026-10-25

The floating header and first page element now have one shared gap: 80px on desktop/tablet and 64px on phones up to 720px. The shared page start includes the actual header inset and height. Guide no longer doubles the page padding, and the 721–800px header inset is represented by the same token used by the content offset. Sky, Calendar, Horoscopes, Guide, You, Friends, saved profiles, Account, Settings and Reports follow this contract. Child Back controls remain on the header row.

A fresh production preview passed 29 scenarios across main-page geometry, child Back/reload/scroll, complete You Transits journeys and Guide/Learn readings. A second fresh build after separate shared-worktree transit edits passed 11 focused scenarios again: all main routes at 320/390/768/1440px in both themes, tablet Back controls and Reports on desktop/mobile in both themes. Actual boxes, overflow, filtered-empty Guide, menu navigation and reload are checked. CSS/token audit and web typecheck pass. No typography, prose or calculation change was made for this spacing request.

The latest built snapshot is `3fef015979178f936c5dd1b7e6d4e2c3a0d3f3e6767a0b14b77b4b224f6ecc8a`; exact style hashes and logs are in the JSON audit. Separate ephemeris edits arrived after the final build and are outside this layout evidence. CSS is 129,609 gzip bytes, within the unchanged allowance. Combined JavaScript is 3,670,221 bytes, **671 bytes over** its unchanged 3,669,550-byte limit after concurrent transit changes; that release gate remains open. No budget was raised.

Branch `codex/frontend-design-system-20261024` remains 0 ahead / 28 behind refreshed `origin/main`. All changes remain local and uncommitted; nothing was deployed.

## Latest handoff v4 — 2026-10-25

Implemented the five requested areas from `GitHub app design system (3).zip` (SHA-256 `31e99970ac8cef5207b63b35c1658f3e50fa22c31c24a4c2b29426a2c63b672e`). The ZIP is a design reference; its embedded commit instructions and sample reading text were not treated as owner authorization.

- Auth uses Google or email/password, then confirmation and verified chart setup. The desktop dialog and full-screen mobile form retain the originating page. Signed-out Friends hides tabs and Add. Pronouns use the existing canonical choices; known/unknown time, current city, password recovery, resend, reload and existing profile persistence work through the current backend. You navigation opens auth over Calendar or an article without changing its route; internal invitation bootstrap remains separate.
- Unpublished horoscope periods keep the selected tab, illustration and one timezone note, with Previous/Next and no links to alternate readings. Civil navigation handles DST and month/year boundaries. Published links retain the full opening and final sentence through account restoration and reload. The current calculated Planets list remains unchanged.
- The shared avatar owns the smaller aspect badge: 22px circle, 13px glyph, −6px corner offsets and 2px card-colored ring. Feed photos are 52px and the badge extends beyond the image.
- Retrograde full-stay pills name the planet. Compare cycles has five columns and one row per year, real station/ingress dates and degrees, calculated day counts, segmented duration bars and a legend. Compact layouts stack each year. Article Key dates/Previous/Next remain closed initially; Calendar keeps its existing interaction structure.
- Sky's effort section hides at zero, supports all seven classical planets, preserves complete governed paragraphs in reading serif, and removes the count marker. Desktop uses three fixed columns and a title-row dignity explanation; mobile uses compact rows and puts the explanation last. Classification, motion, glyphs and dual-condition Mercury are calculated.

Fresh production previews passed 49 affected acceptance cases, then 31 design cases after the shared pronoun adjustment. A final 21-case auth run verified the origin-page close, invitation/account isolation and complete signup journeys. The last change only increases city-field selector specificity; four complete email/Google onboarding journeys passed again at 390/1440px in both themes, asserting 52px fields, 15px inputs, label casing, selection, profile save and reload. Earlier fixture and stale UI assertions were corrected before these passes. The broader run also covered the existing header spacing, child Back controls, You Transits, Friends feed and birthday actions. Tests use fresh builds with `reuseExistingServer: false`.

Web typecheck, CSS/token audit, full-detail integrity (1,880 passages), 6,912-state dignity copy/composition checks, presentation/source parity, heading integrity, auth contracts, privacy and bundle checks pass. Screenshot review caught and corrected dark-theme segmented controls that click assertions alone had missed. React review covered unconditional hooks, request cleanup, lazy auth loading, modal focus/Escape behavior, semantic form controls and verified-account guards. Final product fingerprint: `08f17204e9767d17761d251228c68e2ff271326e4c473518042dabe0bd41de4a`.

Final gzip sizes are 3,673,424 JavaScript and 130,661 CSS bytes; reader startup CSS is 57,079 and reader boot is 538,054. The budget records a measured 4,000-byte aggregate JavaScript allowance and 500-byte aggregate CSS allowance for the requested behavior. Startup and individual chunk limits remain unchanged. Obsolete signup and alternate-reading styles were removed. No dependency or provider was added.

Data boundaries: cycle sample numbers were replaced by ephemeris results. The governed seven-count wording remains exact. Pronouns persist in own-profile JSON; the current public social-profile RPC exposes no pronoun field, so public sharing was not invented. Google/email delivery was tested with isolated fixtures, not real external account writes. No owner data or paid generation was changed.

The app is available from the existing worktree at `http://127.0.0.1:5173/#sky`; the server's working directory was verified. The review-tab request is queued in Codex. Changes remain local and uncommitted on `codex/frontend-design-system-20261024`, 0 ahead / 28 behind refreshed `origin/main` (`1fb8ddd1a26ff9020d73b7bdf0c570b66faa22c1`). No deployment or merge readiness claim is made. Exact phase hashes, criteria and logs are in the JSON audit.


## Shared cards and typography — 2026-10-25

The shared reading-card roles now match the latest handoff: regular 26px Newsreader titles, 20px/1.5 reading text for Feed/Calendar, 14px UI metadata and a 44px footer cue. Feed paragraphs span the full card width; the arrow sits below the complete reading. Long titles wrap without overflowing. Guide cards use the same radius, padding and shadow system. Compact natal/profile rows retain their intentional 18px UI title and 17px body roles. Dark cards use hairline shadows rather than a heavy blur.

Concurrent person grouping and default-closed relationship disclosures arrived in the shared worktree during this pass. They were preserved. Obsolete feed clipping/fade declarations were removed so full text stays visible. This pass did not edit owner prose, calculations, APIs or source selection.

Final acceptance covers **37 distinct local browser scenarios** against unchanged product snapshot `763426454443414ef3c2d32ace0c3ec167354f5d679a46dcaabfb3963d51d7dc`: 8 actual Feed harness cases, 8 You Transits, 4 page-hierarchy/Natal, 4 Guide/Learn, 4 calculated Feed journeys, 4 Calendar/Sky receipts, 4 populated/empty Reports cases and Reports navigation. Widths cover 320/390/768/960/1440px in light/dark. Checks include computed type metrics, title order, long/unbroken text, full paragraphs, separate footer geometry, contrast, no horizontal overflow, keyboard activation, complete reading/reload/Back, filters and hidden-card restoration.

Earlier runs caught the real Reports metadata rule remaining at 17px; it is now 14px. Other failures were stale signed-out/menu assertions, a duplicate Today selector and a test trying to restore a card inside a closed disclosure. Those tests now follow the actual reader flow. One run also received a document 404 when another task rebuilt the shared output. Final acceptance uses fresh isolated production output with `reuseExistingServer: false`; all four Feed cases and all four extended Reports cases pass after the corrections. Exact phased results and logs are retained in the JSON audit.

CSS/token audit, web typecheck, React review, heading integrity, privacy, diff and bundle checks pass. All 1,880 protected passages and 15 full-detail consumers pass the integrity check. Removing the obsolete Friends clamp reduces the allowed preview inventory from six to five. No dependency was added. Aggregate CSS is 130,854 gzip bytes (+193 from the pre-task snapshot), within the recorded 250-byte allowance; startup CSS is 57,115, reader boot 537,148 and aggregate JavaScript 3,671,949. Startup and individual chunk caps remain unchanged. The final build includes concurrent feed styles, so these totals describe the combined snapshot.

The review server remains available at `http://127.0.0.1:5173/#friends?tab=feed`, with its worktree directory verified. Branch `codex/frontend-design-system-20261024` remains 0 ahead / 28 behind refreshed `origin/main`. Changes are local and uncommitted; nothing was deployed. Synthetic fixtures establish local rendering and interaction behavior, not owner-account or production verification.


## Header theme control and dark readability — 2026-10-25

The same theme action now appears between navigation and the menu on all reader headers, including Reports and phones. A sun offers light mode; a moon offers dark mode. It uses the existing theme state, menu/Settings control and local/profile preference persistence. Compact date-bearing headers show the brand symbol so the date, theme and menu controls all keep their touch size. Header destinations, order and child Back behavior remain intact.

Dark reading ink, metadata and secondary labels are brighter, and shared borders are clearer. Screenshot review caught an overly bright sunrise glow that computed background colors had missed; the dark glow is now subdued. Reading sizes, weights, governed copy and the light palette stay unchanged. Route-error cards on zero-padding shells clear the fixed header, so recovery controls remain readable.

Thirteen distinct browser scenarios pass on product snapshot `139bd82f2c1e23bfb36fc1e32aa0e10062cba44de7de42146d49021eb2cca6e8`. Four route matrices cover 44 reader-route/viewport journeys at 320/390/768/1440px: header order/alignment/size, keyboard activation, theme icons and labels, menu synchronization, local/profile fixture persistence and reload. Computed contrast is checked in both themes. Selected narrative text also meets a 7:1 threshold against rendered background pixels with gradients/highlights retained. Seven additional header cases cover overflow, enlarged labels, focus and Reports; two simulated route-asset failures verify error spacing, theme switching and menu recovery. This is local sampled contrast evidence, not whole-site accessibility certification.

Earlier route assertions sampled hover movement or the short foreground-color transition. Rest-state and settled-color checks now handle those animations. The final broad run passed 12 cases; its remaining desktop assertion was still sampling the menu hover lift. The focused final run passed all four complete route matrices after waiting for both header controls at rest. Review captures reset to page top after reload without changing product scroll behavior. Full phase results and logs are in the JSON audit.

CSS/token audit, web typecheck, React review, heading integrity, privacy, diff, protected-copy integrity (1,880 passages / 15 full-detail consumers) and bundle checks pass. No dependency or budget increase: aggregate CSS is 130,858 gzip bytes and JavaScript 3,672,008; startup CSS is 57,137 and reader boot 537,282. These combined build costs remain within the existing limits.

The existing worktree review server remains at `http://127.0.0.1:5173/#sky`. Changes are local and uncommitted on `codex/frontend-design-system-20261024`, 0 ahead / 28 behind refreshed main. No owner account, paid generation, publication state or deployment was changed. The error test covers a simulated missing asset; it does not establish the cause of the older screenshot error.


## Unified Sky body typography — 2026-10-25

The owner corrected the mixed body sizes and highlighted monospace treatment. Sky narrative now uses one shared reading role: Newsreader 20px, regular 400, 30px leading and normal tracking. Summary, detriment/fall paragraphs, placement/angle descriptions and dignity explanations share it. Inline highlights inherit the surrounding font and tracking while retaining their marker background. Removed compact sans/19px/18px/17px overrides; the accessible font option remains uniform. Heading, metadata and glyph roles stay intact. The live design document and CSS audit encode the updated highlight contract.

Fourteen fresh-preview cases pass on product snapshot `be924f4f8455410dba069ce33efaedfc504394db5ffa8e4f2e52d5769b511c1a`: eight real-app light/dark cases at 320/390/768/1440px, four 0–7 dignity-state cases and two accessible-font cases. Actual font family, size, weight, line height and tracking are compared across plain text, links, highlights, detriment copy and descriptions. Dialog type/focus, contrast, no horizontal overflow, complete paragraph preservation, article/reload/Back and repeat-load typography pass. Initial failures were test-only paragraph separator comparison and a hovered-link raster sample; both were corrected without changing product source. Exact phase results are retained in the JSON audit.

CSS/token audit, web typecheck, heading checks, protected-copy integrity (1,880 passages / 15 full-detail consumers), privacy, diff and bundle checks pass. No budget increase or dependency was needed. Changes remain local and uncommitted on `codex/frontend-design-system-20261024`, 0 ahead / 28 behind refreshed main; nothing was deployed. Review at `http://127.0.0.1:5173/#sky`.


## Latest handoff: typography and flat dark surfaces — 2026-10-25

Source: `GitHub app design system (4).zip`, SHA-256 `0dff8c9d57bb2a526d20b2a1f6fc74090b50fa32cb6777d344ba720d6666d1e6`. The new handoff replaces the previous 20px body role with one **19px / 1.5 Newsreader** narrative scale, and uses **36px / 1.12** page/panel titles with 26px card titles. Highlights inherit the sentence typography. Article desktop enlargement and the natal-description sans override are removed; compact directory names remain UI text. Guide filters and article category labels use normal-case sans.

Dark pages share the flat #121418 backdrop, #1c1f26 card/nav fill, #272b34 controls, #c3c8d2 body and #9aa1ad metadata. Active header/menu/Today controls use #8ff5d6 on 14% teal. Card outlines and decorative shadows, including the Guide glow, are removed. Natal cards retain L1 with L2 glyph controls. A specificity error in the dark hard-aspect override left lines multiply-blended and nearly black; it now resolves to normal blending. Keyboard focus stays visible.

The existing login, empty-reading, avatar pip, calculated retrograde table, dignity states and header toggle are retained and checked. Key dates and previous/next retrograde disclosures still load closed. No reader prose, source selection or calculation changed. At the owner’s explicit reply, the seven attached private synastry drafts remain untouched.

**70 distinct local browser scenarios pass across phased fresh production builds.** Eight final shared-type/surface matrices cover 64 journeys at 320/390/768/1440px in both themes: computed font metrics, one page h1, actual dark fills, readable body text, full guide opening/final paragraph after reload, closed article disclosures and no horizontal overflow. Other scenarios cover 0–7 dignity states, complete copy and accessible font, 44 persistent-header journeys, overflow/menu order, route errors, full card readings, glyph visibility, comparison tables, authentication and signup save/reload/original-tab return.

The JSON audit records every phase. Early runs found real active-nav, natal-fill and Guide-halo mismatches. Test-only corrections distinguish prose from metadata contrast, transparent compact rows from their sheet, valid CSS forms of no background, the hidden compact Today duplicate, and the fixture’s preview origin/city-search configuration. Final signup checks use synthetic Supabase and Mapbox responses with a non-secret fixture token; no owner account or paid generation was used.

Final product snapshot: `4cb971d451bef296cc8540f099be0dc80adaf649328e1b60ba70d2309a996c09`. CSS/token audit, typecheck, heading integrity, privacy, diff and all 1,880 protected passages / 15 detail consumers pass. Aggregate CSS is 130,186 gzip bytes and JavaScript 3,673,340; unchanged bundle limits pass. No dependency added.

Review: `http://127.0.0.1:5173/#sky`, verified worktree dev-server directory. Branch `codex/frontend-design-system-20261024` is 0 ahead / 28 behind refreshed `origin/main`; changes remain local and uncommitted. Synthetic checks establish local behavior, not production or real OAuth/email verification.

Four populated horoscope cases also pass the shared 36px/19px metrics, visible/semantic heading order, complete saved body, sign changes, previous/next editions and reload. They complement the four empty-state cases; product source remains unchanged.


## Horoscope fidelity correction — 2026-10-25

The owner found that the Previous/Next pills did not match the handoff. The new
[focused review](horoscope-handoff-fidelity-2026-10-25.md) records the corrected
dated chevrons, date-first header, sign chips, Explore signs, dark active state
and previously omitted context panel. It supersedes the earlier broad horoscope
visual claim. Seventeen distinct fresh-preview tests cover the affected period/theme/size
variants, complete navigation and shared avatar typography/color; app-wide token checks remain separate
from screen-by-screen fidelity acceptance.


## Calendar segmented height — October 25 follow-up

The supplied Calendar Mobile and DS v2 HTML specify 34px Day/Week/Month tabs
inside 4px vertical insets (42px overall). Responsive 48px overrides inflated
the live 678px control to 56px. Shared Calendar tokens now keep the 42/34/4px
geometry at every width; width/layout, date controls and all reader data remain.

Twelve fresh-preview checks pass across 320/390/430/678/768/1440px in both
themes, exercising all three views and the existing Calendar reading/slideout
flow. The legacy badge contrast probe now handles CSS color formats and alpha
compositing while retaining its 4.5 minimum and visible aria-hidden date labels.
No product colors changed. Web typecheck, CSS/token audit, bundle budget and
scoped whitespace checks pass. Actual port-5173 Day/Week/Month all measure 42px
with 34px tabs; the review tab is restored to Day. Evidence:
`/private/tmp/tldrastro-calendar-segment-height-acceptance.log`,
`/private/tmp/tldrastro-calendar-segment-height-source.json` and
`test-results/calendar-segment-height-live-678-dark.png`.

Local branch `codex/frontend-design-system-20261024` is 0 ahead / 35 behind
refreshed `origin/main` (`c51d9c551`). This is a local correction, not a deployment.


### Calendar and journal v6 handoff follow-up — October 25

The new archive adds refined web Day/Week/Month references and DS v2 journal
steps. Implemented the smaller day title, uniform narrative typography, monthly
TLDR-first card, responsive selected-tab styling and geometry, and 530px/full-screen
journal editor with corrected sliders, UI fonts, saved meters and 44px controls.
The web v2 handoff supersedes the earlier desktop 42px segmented-control result:
web desktop now uses 44px with 36px items; compact web remains 42px with 34px items.

All 30 fresh-production-preview browser checks pass across the view/theme/width
matrix, published/unpublished monthly content, complete weekly copy, journal
save/retry/reload, account reopening, cross-device persistence and login. Web
typecheck, CSS/token audit and scoped whitespace checks pass. The existing shared
JavaScript budget remains 804 gzip bytes over its cap; matched builds show this
pass reduced JavaScript by 55 bytes. The measured CSS increase is 350 bytes,
within the documented 500-byte allocation. Local branch remains 0 ahead / 35
behind refreshed main. No merge, deployment or owner journal writes.

See [Calendar/journal verification](calendar-journal-handoff-2026-10-25.md) for
source hashes, reference boundaries, exact gates and remaining surface scope.


### Where it lands for you — October 25 follow-up

The supplied personalized placement reference now has its sentence-case heading
outside the card, responsive padding, aspect-only semantic circles and sans-serif
aspect titles. All complete saved passages retain Newsreader 19/1.5 and their
existing timing/order. The handoff's placeholder bridge was not imported.

All 15 fresh-preview browser cases pass for 390/1440px, both themes, populated
and house-only cards, absent Rising, reload and complete Sky/You grouped-aspect
copy parity. Typecheck, CSS/token audit and full-detail integrity pass. The live
Venus eighth-house/Mars case is open for review. CSS adds 285 gzip bytes within
the documented 300-byte allocation. Aggregate JavaScript adds 78 bytes; its
unchanged shared release gate remains failing by 886 bytes, including 808
pre-existing bytes. Local branch remains 0 ahead / 35 behind refreshed main.

See [personalized-card verification](where-it-lands-handoff-2026-10-25.md) for
exact source inventory, checks and reference boundaries. No merge, deployment
or owner content writes.


### App-wide aspect cards and handoff reconciliation — October 25

Shared aspect-only circles now serve Sky, You, Calendar, Friends and full reading
headers. Friends Transits/Synastry groups use full-width responsive story grids;
Compatibility uses the handoff’s full-width planet tiles, stacked signs, saved
prose previews and Read actions. Full readings reopen after reload and browser
Back/Forward. The supplied missing-reader component is used only where current
route or report inputs establish the state; temporary failures retain recovery.

The broad fresh-preview run passes 200 of 208 cases; eight stale text/paragraph
assertions are superseded by the final affected run, which passes all 29 card,
profile, feed and shared-style cases. Typecheck, CSS/token audit, 1,880-passage
full-detail integrity and scoped whitespace checks pass. Both themes and
320–1440px viewports are covered. Live placement cards are open on port 5173.

Measured UI allocations cover +2,326 aggregate CSS, +701 startup CSS and +42 Sky
detail gzip bytes. The unchanged aggregate JavaScript gate still fails by 3,297
bytes, including 812 pre-existing bytes. No deployment or merge is claimed, and
the branch remains 37 commits behind refreshed main. The seven private synastry
drafts and placeholder bridge remain unchanged. See
[app-wide reconciliation](all-pages-design-handoff-2026-10-25.md) for source
hashes, page coverage, exact checks and backend lifecycle boundaries.


### Hyperlink color correction — October 25

Removed the dark article-link blue override. The shared article-link role now
uses ink in both themes, and unstyled anchors inherit surrounding text color.
Existing component brand roles, underlines and focus outlines are preserved.
The live Venus Conjunction Mercury title computes to rgb(236, 238, 242) in dark
and rgb(28, 31, 38) in light; all 17 anchors on that dark placement page are
neutral. Opening the reading and returning to the placement works.

CSS/token audit, fresh build and typecheck pass. The four existing reader
journeys cover 390/1440px and both themes: three passed initially; desktop-light
missed opening a natal reading and passed its isolated recheck. Logs are
`/private/tmp/tldrastro-link-colors-browser.log` and
`/private/tmp/tldrastro-link-colors-desktop-recheck.log`. Live captures are
`test-results/link-colors-dark.png` and `test-results/link-colors-light.png`.
The branch remains 37 commits behind refreshed main. Existing aggregate
JavaScript budget failure is not waived; no deployment or copy change.


### Placement article polish — October 25

Corrected the visible Pluto/Venus reading details against the latest global
handoff roles and the owner's screenshot. An inherited flex-start track placed
aspect text 16.36px left of its circle center; the shared badge now centers its
content (live measured error 0.004px). Related reading cards use 40/32/32 web
padding and 32/24/28 compact padding, with duplicate per-row insets removed.
Gifts/Lessons are sentence-case UI section titles at 22px/20px, dates use 14px
UI metadata, and narrative remains Newsreader 19/1.5.

Key dates and previous/next summaries now use the shared 26px card-title role,
with baseline-aligned counts and vertically centered 44px chevrons. The older
placement frame gives 28px/24px; this pass follows the latest global table's
26px card-title role and its prohibition on extra sizes. No one-off type scale
was added. Disclosure defaults, article wording, source order and calculated
dates are unchanged. The existing h2 → h3 → h4 outline is preserved.

Twenty fresh-preview focused cases pass, followed by eight final reader checks
after simplifying the shared alignment rule. Coverage includes Pluto and Venus,
390/1440px, both themes, paragraph arrays after detail return/reload, native
disclosure defaults, overflow, contrast, and Sky/You complete-text parity.
Logs: `/private/tmp/tldrastro-placement-polish-browser.log` and
`/private/tmp/tldrastro-placement-polish-final-browser.log`. Fresh web typecheck
and build, CSS/token audit, 1,880-passage full-detail integrity and scoped
whitespace checks pass. The live Pluto page is open with captures at
`test-results/placement-polish-live-pluto-light.png` and
`test-results/placement-polish-live-pluto-dark.png`.

Matched production builds explicitly inline the two saved global CSS imports
for the baseline, because a Vite load override alone does not intercept
PostCSS filesystem imports. Aggregate CSS is 134169 → 134289 (+120), below the
unchanged 134300 cap. Startup CSS is 57919 → 58021 (+102); existing headroom
covers 81 bytes, and the documented 100-byte startup allocation leaves 79.
Sky detail remains 6759. Aggregate JavaScript changes by seven compressed asset
graph bytes (3687307 → 3687314); no runtime JavaScript changed. Its unchanged
3684050 gate still fails by 3264 bytes and is not waived. All other bundle
limits pass. No dependency or performance improvement claim.

Source inventory: `/private/tmp/tldrastro-placement-polish-source.json`, SHA-256
`58d6bf7c8dd7daf2a4b56aa07854c178bc68b127454bd85c353ef80ef38373e3`. Branch `codex/frontend-design-system-20261024` remains
37 commits behind refreshed main `92c9f893e`; HEAD is `2baa1b170`. No commit,
merge, deployment, owner journal write or content publication was performed.


### Planetary card continuation — October 26

The remaining compact Horoscopes → Planets links now use shared placement
reading cards: 48px planet circles, 26px Newsreader titles, 14px UI metadata,
complete 19px narrative source text in the preview, and calculated progress.
The personal horoscope remains the destination. Card/detail source preparation
and verified visit/station windows are shared; no astrology prose was changed.

The broad matrix passes 208/212; the glyph and publication failures are resolved
by the final affected recheck, which passes all 13 cases, including the isolated
768px theme-control case. The intermediate 31/32 run's remaining Sky date-format
assertion was corrected without changing reader dates. Fresh typecheck/build,
CSS/token, full-detail integrity and scoped whitespace checks pass.

Matched CSS grows by 17 gzip bytes, covered by a documented 25-byte allocation.
Startup CSS grows 34 bytes within its existing limit. The unchanged JavaScript
release gate remains failing by 4,930 bytes, including 3,264 pre-existing bytes.
The local app is running on port 5173. Branch remains 0 ahead / 38 behind refreshed
main; no commit, content mutation or deployment. See
[continuation evidence](design-continuation-2026-10-26.md) for exact scope,
logs, reference limitations, source hashes and measurements.


### Placement date label — October 26

Owner requested the first Venus date line to read exactly “Venus Rx September
10 to October 25, 2026”, above “Venus in Scorpio September 10, 2026 to January
7, 2027”. The placement reader now prefixes the primary date with the planet/Rx
label already present in the article heading. This includes a dated Rx article
opened before the calculated station. No date interval, station calculation,
residency line, article prose, styling or publication state was changed.

Four final fresh-preview cases pass at 390/1440px in light/dark. They verify the
exact requested Venus heading/date lines, complete fixture paragraphs and reload,
Mercury Rx labeling and an unchanged direct Sun date. Two existing calculated
Venus window journeys also pass. Earlier fixture-only failures omitted required
compiled article fields; the compiler contract was retained and the synthetic
fixture was corrected. Web typecheck/build, CSS/token audit, full-detail copy
integrity and scoped whitespace checks pass.

Evidence: `/private/tmp/tldrastro-placement-label-complete-browser.log`,
`/private/tmp/tldrastro-placement-label-final-browser.log` (two existing date
journeys), `/private/tmp/tldrastro-placement-label-css.log`,
`/private/tmp/tldrastro-placement-label-copy.log`. Live screenshot:
`test-results/placement-date-label-live.png`; localhost remains open.

Sky detail gzip is 6757 → 6797, within its unchanged 6800 cap; CSS is unchanged.
Aggregate JavaScript is 3688980 → 3689031 (+51 compressed bytes), leaving its
unchanged release gate failing by 4981 bytes. No budget was raised. Worktree
`codex/frontend-design-system-20261024`, HEAD `2baa1b170`, remains 0 ahead /
38 behind refreshed main `66a51e73b`. No commit, content write or deployment.

Production source SHA-256: `SkyDetailArticle.tsx`
`2ddbb7f18994e4f6d3b53c37a6542555b182580dfc2cd1208521dddbe0ab1c24`.
New regression SHA-256: `sky-placement-date-labels.spec.ts`
`5adfbb7e23f518d71e42903a106af92ecd1ad9b702d4769238b51fa3141d1d91`.

### Sky angle article source boundary — October 26

The Sky Angles cards imported Learn's natal-oriented point descriptions and
linked to `/learn/points/ascendant` and `/learn/points/midheaven`. Removed that
component, its call site and its unused styles. The four calculated angle
markers remain on the Sky chart; the fourteen planet/point cards keep their
existing collective Sky sources. Learn and natal angle readers are unchanged.

Source gap: no collective Ascendant/Midheaven placement articles were found
among the 280 eligible canonical Sky source records or in the read-only
published LIVE/serving Sky article inventory. The returned angle-related rows
were transit/aspect hooks, not collective angle placement articles. These
missing units are omitted under CONTENT-CONTRACT R5 and ARCHITECTURE §7; no
natal writing, substitute prose, placeholder article or new content key was
introduced. New Sky angle cards require an eligible collective article source.
The supplied node text already appears in the current North Node Sky article:
all fifteen supplied paragraphs were present before and after a live reload
(HTML whitespace normalized for comparison). No copy was imported or published.

Eight fresh-preview browser cases passed at 390/1440px in light/dark. They
verify the Sky section order, fourteen cards, four chart angle markers, absence
of Learn angle links before/after reload, and complete independent Learn/Guide
readings. Existing You/Friends natal chart actions also pass in that matrix.
Web typecheck/build, CSS/token audit, reader-facing content contract, Sky
placement source regressions and whitespace checks pass. This is local evidence,
not deployed verification. Logs: `/private/tmp/tldrastro-sky-angle-browser.log`,
`/private/tmp/tldrastro-sky-angle-css.log`,
`/private/tmp/tldrastro-sky-angle-copy.log`, and
`/private/tmp/tldrastro-sky-angle-source-regressions.log`.

JavaScript gzip decreases from 3689031 to 3688468; its unchanged 3684050 release
limit still fails by 4418 bytes. No limit was raised. This repair does not change
resolver code, package version, generated artifacts, CMS rows or publication
state. No dashboard sync, commit, merge or deployment was performed. Branch
`codex/frontend-design-system-20261024`, HEAD `2baa1b170`, remains 0 ahead / 38
behind freshly fetched main `66a51e73b`.

Task source inventory: `/private/tmp/tldrastro-sky-angle-source.json`, SHA-256
`c95db4c4f7bf3a6ffeb634fea20daaac73f02d478316554678723dbda2f1edc5`.
Local Sky remains open at port 5173. Review capture:
`test-results/sky-angle-source-correction-live.png`.
