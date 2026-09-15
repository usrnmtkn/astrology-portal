# Calendar period workspaces

Calendar Write-ups contains Daily Sky, Weekly Sky, and Monthly Sky. Daily Sky uses the existing Moon-sign workspace and its CRUD controls. Weekly and Monthly Sky open exact saved template keys, preserving the complete saved pattern and editor-only purpose. Missing templates start as unsaved reference drafts; retrieval errors never replace saved work. Sky Write-ups keeps the shared summary, placements/lunations, and transit workspaces. Existing Lunar Calendar and earlier Sky forecast links are preserved, including search state.

Delivery is inside the existing Content Studio at `https://tldrastro.vercel.app/admin/content`, using its existing owner session and saved content. The Calendar navigation opens the three period views on that same origin. A feature-branch deployment is only release testing infrastructure; it is not a separate dashboard for the owner to adopt or manage, and is not completion of the production request.

These templates are writing references with an interactive preview. Saving a template does not generate new astrology prose or publish an overview to the public Calendar. No reader prose, serving resolver, or generated content package changes are included.

## Interactive preview

Daily, Weekly, and Monthly Sky show the saved template before opening the editor. Preview, Template pattern, and Variables tabs share one source of truth. Unsaved template edits appear in the preview; saving preserves the complete pattern and editor-only guidance. The new Daily reference uses `slot-template/calendar/daily-overview/v1` and does not replace the public Calendar day-card template.

Choose signs updates the Sun introduction and one complete eligible Moon passage. Use ephemeris obtains the selected instant's Sun/Moon signs and degrees, Moon phase, retrogrades, and Moon ingress from the same Swiss worker as the reader. Weekly dates, daily Moon signs, and event times use the calculated Monday–Sunday week. Monthly dates and key events exclude adjacent grid days. Live mode refreshes the instant each minute; selecting a date stops the clock. The browser timezone and exact UTC instant are available as read-only variables. A nonexistent local time is rejected. Example signs never carry degrees or event times from a real calculation.

Daily timing and monthly key dates include timed events only. The engine's `retrograde-passage` rows start at local midnight to represent an ongoing state; they are not exact station events. Those rows remain represented by the current `retrogradePlanets` variable and are excluded from the event timelines. True station, ingress, lunation and aspect times retain their calculated timestamps. Regression coverage verifies a real ongoing retrograde, an explicit exact-station fixture, a quiet-day fallback, and both rendered timelines.

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

The final integration also preserves main `62e0fdf53` and its combined House Transit editor, including complete shared-source fixtures and both navigation guards. The existing 4,000-byte House Transit allocation brings the aggregate limit to 473,500 bytes. Loading the Calendar workspace and template definitions on demand keeps the combined entry within its unchanged cap: 178,744 gzip / 616,900 raw bytes, with 472,458 aggregate gzip bytes. The bundle regression requires the Calendar workspace to remain deferred. No authentication or account flow changes are included.

## Overview writing and zodiac seasons

The weekly/monthly workspace now separates the narrative from its supporting facts. New templates contain an opening overview, the complete season and polar-axis sources for the period's opening sign, the closing season when an ingress falls within the period, a lunar-cycle passage, a planetary-change passage, and a closing. Weekly templates retain all seven complete daily passages. Monthly supporting dates include New/Full Moons and eclipses, planetary ingresses/stations, and non-lunar aspects; the complete event list remains available through `keyDates` for custom patterns.

The existing editor now has five editable overview passages in `sections.calendarOverview`. Named variables inside these passages resolve from calculated facts and complete saved season sources. Insert buttons put a token at the selected overview-passage caret, or append it to the pattern when no passage is selected. The existing variable rail also exposes `zodiacSeason` and `zodiacSeasonPolarAxis` for Calendar templates. Previewing is read-only; Save uses the existing version-checked reference-row API. Existing pattern bodies, editor guidance, and unrelated sections are preserved. The owner can explicitly choose **Use overview structure** to replace a legacy pattern in the draft before saving.

`zodiacSeason` and `zodiacSeasonPolarAxis` use the selected instant's Sun sign (or manually selected example Sun). `openingZodiacSeason`, `openingZodiacSeasonPolarAxis`, and their `closing` equivalents use the calculated period boundaries. `seasonSign`, `seasonStart`, `seasonEnd`, `openingSeasonSign`, `closingSeasonSign`, and `seasonChangeDate` supply the corresponding facts. Bounding Sun ingresses are retained from the existing Swiss calendar response separately from visible events. Current-season selection compares exact timestamps; late ingresses on the last local day remain part of the period. No fixed season date table or calculation algorithm is introduced. Admin previews include complete saved season drafts, labeled separately from saved live writing. Missing and nested-placeholder sources stay unavailable. Reader publication eligibility is unchanged; all complete source text is preserved exactly. The template's own authored passages remain private reference writing.

Validation covers actual-handler passage/metadata roundtrip and stale-write protection, two direct Swiss ingress boundaries across New York and Sydney (including the year transition), a week entirely in one season, complete season source preservation and exclusions, and 14 fresh browser cases. The browser matrix includes desktop/mobile and light/dark, named-variable insertion, live preview, save/reopen, explicit legacy-structure adoption, empty and saved templates, source failures, old links, Friends navigation context, and the actual unsaved-editor close flow. Editor labels are compared to the existing template-pattern label style, and horizontal overflow is checked. The new editor is required to remain a lazy entry by the bundle regression.

The hosted web budget check exposed an inherited production-baseline overrun. Separate clean builds of `aa7de8ccf` and `1919ccaf4`, each with their own dependencies and the workflow environment, measured:

| Gzip bytes | Production main | Calendar correction | Change |
| --- | ---: | ---: | ---: |
| App startup JavaScript | 431,210 | 431,211 | +1 |
| Reader startup with CSS | 480,834 | 480,835 | +1 |
| All JavaScript | 3,077,942 | 3,081,336 | +3,394 |

Main already exceeded the previous 430,500 / 479,500 / 3,069,000 limits. Hosted Linux CI measured 431,204 / 480,828 / 3,081,334 for the correction. The reconciled limits are 431,500 / 481,000 / 3,082,500. This accounts for the inherited baseline and the measured deferred editor addition; startup CSS, per-chunk, graph, deferred-source, and runtime timing limits remain unchanged.


## Calendar variable editing and existing writing (September 15)

The Variables tab uses the shared Studio table with padded rows, separators, full-size narrative text, and stacked cells on mobile. Each writing row opens its exact source in the existing editor. Overview actions open and focus the named passage; an open template draft survives a trip into a shared source editor. Ephemeris facts stay read-only, and a period without a Sun ingress explains why closing-season variables are unnecessary.

The owner API prepares otherwise-unsaved season sources from the complete, independently authored `sign-season-content` and `sign-axis-tensions` entries in `editorial-source-bank-v1.json`. These are the existing season and axis writing fields, not shortened substitutes for protected longform articles. Original body, source key, bank version, SHA-256 and word count remain attached to the starter. Saved rows always take precedence, including intentionally empty rows. No database import or publication happens on preview. Starters and edits remain drafts until the existing publication workflow approves exact wording; the reader does not gain access to unapproved source material. Dated historical articles are not silently relabeled as current forecasts.

The overview editor can insert the existing Sun summary, complete Moon passage, opening season or season-axis passage into the selected field. The preview follows the selected signs and open editor changes. The new source-edit flow is covered by the actual handler's 24-source integrity, publication, retirement and stale-write tests, plus fresh-browser save/reopen and desktop/mobile light/dark checks. The full Content Studio API suite remains required.

After integrating main `2b4a29e51` (#826 Variables styling and #818 Sky loading), the shared Studio CSS measures 23,526 gzip bytes in the workflow-configured web build, inside main’s existing 23,550-byte limit. The combined Admin JavaScript measures approximately 477.0 kB gzip, just over its previous 477,000-byte limit; allocate 500 aggregate bytes to 477,500. All entry, largest-chunk, graph JavaScript, reader and CSS limits stay unchanged. The change keeps the canonical single stylesheet and adds no dependency. The integrated validation reruns all 15 Calendar workspace/preview browser cases and the unfiltered API suite. Main also supplies the Friends timing measurement fix, without changing its performance budgets.

## Shared-source labels and variable colors (September 15)

Season and polar-axis source editors identify themselves as **Shared zodiac season source**. Their metadata lists Calendar, Sky and other supported templates instead of presenting the generic stored `you` surface as their exclusive location. The shared-source editor does not offer a surface reassignment. Stored keys, surface metadata, source bodies, review state and publication behavior remain unchanged.

Calendar variable names, insertion controls, literal pattern tokens and resolved preview values use the existing six-color Studio palette. A variable's name determines its color, so loading sources, changing signs or switching Daily/Weekly/Monthly views cannot reassign it. Conditional pattern markers retain their exact text and share their variable's color. Labels and source-status descriptions remain available alongside color.

The desktop/mobile light/dark browser matrix compares actual rendered colors across the pattern, variable table, preview and editor, while retaining the existing copy, date, save/reopen and navigation assertions. The shared-source regression opens Details, checks the usage label, and confirms that saving still preserves the original surface and complete source body. The Calendar mobile cell selector covers all cells directly; its hidden table header stays hidden. This removes redundant first/last-cell selectors and keeps the stylesheet within its existing limit after integration of main's loading illustrations. No CSS tokens, dependencies or bundle limits were added. Final admin entry measures 179,202 gzip bytes within the existing 179,250-byte cap.
