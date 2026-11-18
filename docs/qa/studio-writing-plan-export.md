# Studio writing-plan export

Each supported writer exposes **Complete writing plan · copy or download**
before generation. Load the plan to read the complete instructions, calculated
facts, source material and requested output. **Copy all** copies the selected
edition; its selector can instead copy one complete writing unit. **Download
writing plan** downloads the same selected text as UTF-8 plain text.

The controls are available in:

- Horoscopes → Generate: Daily, Weekly, Monthly and Seasonal editions.
- Calendar Write-ups → Daily writing → Writer input.
- New & Full Moons & Eclipses → Reusable sign readings → Plan & evidence.
- New & Full Moons & Eclipses → a selected dated article or eclipse draft.
- Sky placement articles → AI writing, the dated visit writer and the saved
  template article-field generator.

An edition export includes every writing unit in that edition, including units
already drafted. Daily and Weekly contain all twelve signs. Monthly currently
uses one shared overview; exporting does not change its composition. Seasonal
uses its calculated edition composition. Manual-only editors and retired
generation formats do not acquire a new generation path.

The export is a portable brief, not an approval record. Weekly, Monthly and
Seasonal have additional in-app planning stages; decisions that do not yet
exist cannot appear in a free preview. A current saved Weekly shared plan and
eligible earlier readings are retained with their distinct roles. Export notes
identify the staged workflow. Unsigned outlines are labeled for review, and
normal generation still requires its existing approval checks.

Export uses the existing request builders and preserves complete saved source
passages, including JSON-encoded passages where that is the native input
format. It does not summarize sources or modify writing instructions. Only
instructions, input and output-schema fields enter the portable text; headers,
credentials and provider transport objects are excluded.

Requests remain owner-authenticated and uncached. Copying, downloading or
refreshing creates no provider call, approval, saved draft or publication.
Source text is loaded explicitly and is not persisted in browser local storage.
Unsaved changes disable export; changing the selected inputs invalidates the
previous result. Failed refreshes clear old text, and denied clipboard access
selects the complete text for manual copying. External writing tools receive
text only when the owner pastes it there.

Verification uses synthetic profiles and isolated storage:

```sh
npm run test:content-studio-api
npm run typecheck:server
npm run typecheck -w @tldr/admin
npm run qa:css-audit
npx playwright test -c playwright.horoscope-reader.config.ts studio-writing-export.spec.ts
npx playwright test -c playwright.lunation-studio.config.ts --grep 'Daily Calendar writing|Lunar writing workspace|Lunation writer saves'
npx playwright test -c playwright.sky-article.config.ts sky-article-writer-label.spec.ts
node scripts/check-admin-bundle-budgets.mjs
node scripts/check-web-bundle-budgets.mjs
```

Actual-handler regressions verify anonymous denial, stale versions, full source
delivery, all edition units and zero storage/provider mutations during export.
Planetary regressions compare exported instructions, input and schema with the
actual intercepted native request for both supported providers. Browser checks
cover discovery, copy, download, unit selection, reload, failed-refresh recovery,
clipboard denial and mobile/desktop light/dark layouts. The planetary browser
transport is synthetic; its request-fidelity evidence comes from the actual
handler regressions. No paid calls are required. Local acceptance does not
establish deployment or owner approval of generated prose.

Local acceptance on 2026-10-31 uses main base `5a9de6cddd` plus the export
changes. The release branch also includes main's `1d291ba4` production-browser
check correction. No production content is used for write tests.

| Criterion | Result | Evidence |
| --- | --- | --- |
| Horoscope discovery, complete edition and one-sign copy, exact download, reload | Passed | 10 fresh-build browser cases across all four periods |
| Daily Calendar, reusable Moon and dated lunar discovery, full-source copy, unchanged saved rows | Passed | 12 browser cases, mobile/desktop and light/dark |
| Reusable planetary, dated template and dated visit copy controls | Passed | 3 browser cases exercise all three paths, synthetic transport |
| Native planetary instructions, input and schema match | Passed | Actual-handler parity for both providers, intercepted transport |
| Source fidelity, anonymous denial, stale versions and no export mutation/dispatch | Passed | Focused handler regressions registered in the full API gate |
| Failed refresh, retry and denied clipboard fallback | Passed | Horoscope browser cases |
| Saving new guidance and editing/reverting input invalidate cached export text | Passed | Daily Calendar browser cases, all four viewport/theme variants |
| Complete Content Studio API gate | Passed | `npm run test:content-studio-api`, isolated providers and storage on the updated main base |
| CSS and bundle boundaries | Passed | CSS/token audit and both bundle checks |
| Large saved Weekly profile remains complete | Passed | Protected local read-only check: 12 units, 1.81 MB response, no source text saved in QA artifacts |
| Deployed UI and live source freshness | Separate release check | Local acceptance does not establish deployment; use the release PR and hosted verification |

Matched clean-main builds with independent lockfile installs use ARM64 Node
22.20.0 and zlib 1.3.1-470d3a2. Standalone Studio adds 558 raw entry bytes,
209 entry gzip bytes and 2533 aggregate gzip bytes. Integrated web adds 2638
aggregate gzip bytes. Each aggregate allowance increases by 3000 bytes for the
requested controls; existing startup, individual-chunk, CSS, memory, source and
runtime limits remain unchanged. These are interface costs, not performance
improvements. The integrated builds use the same synthetic Supabase settings;
standalone builds use the same default environment.
