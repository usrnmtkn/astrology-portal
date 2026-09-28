# Calendar lunar context: editable wording only

Owner request, September 28, 2026: remove the additional “The Full Moon was
yesterday.” sentence because it is outside the editable phrase.

The shared Calendar assembler now uses the nine New Moon, Full Moon and eclipse
context phrases without adding a separate relative-timing sentence. The facts
still select the applicable phrase. Published bodies and bundled phrase bodies
are unchanged. An owner can intentionally include a timing sentence in the
editable body; the renderer does not strip saved text.

The Studio description now says the lunar context is shown as written. Moon
sign/ingress timing and season passages are outside this correction.

## Acceptance evidence

Tested from main `57f4a2ce134e8b88e71170de3ca7f997325afc02` on
`fix/calendar-editable-lunar-context`. The six changed implementation/test files
have SHA-256 `159e7cbd5869cc339800c8aa30be6067ebce50851bca529227b1fa2b23b59ca2`
(sorted paths, each hashed as path + NUL + file bytes + NUL; this document excluded).

| Criterion | Result and evidence |
| --- | --- |
| Extra lunar timing sentences absent | Passed for all nine branches, with bundled and published phrase overrides, in `test-calendar-transition-phrases.mts` |
| Complete editable wording preserved | Passed, including a deliberately saved timing sentence; no text-stripping operation |
| Studio and reader select the same phrase | Passed through the shared preview/reader assembly for all context routes |
| Drafts remain private; publish/reopen preserves copy | Passed through actual API handlers with isolated synthetic storage for all 26 phrase sources |
| Rendered Day and Week omit the extra sentence | Four fresh-build Playwright cases passed at 390/1440 pixels in light/dark themes, both before and after reload |
| Opening and final saved sentence survive | Passed in both rendered views, with multi-paragraph synthetic copy |
| Existing Studio discovery and editing still work | Browser navigation, filter/search, save, reload, publish, deep link, loading/retry and empty-state assertions passed |
| Current owner writing remains exact | Read-only production reader API supplied the two current Aries/Full Moon phrases; revised local assembly matched the complete bodies with no added lunar sentence |

The browser writes use isolated storage and the real application handlers; no
production rows were edited and no paid generation ran. Screenshots were checked
for Calendar Week desktop light and Calendar Day mobile dark.

The runtime consumer is `LunarCalendar.tsx`, which imports this shared module
directly. Both the web and standalone admin bundles were rebuilt. This change
does not touch the V3 package resolver or its prebuilt distribution artifact.

## Checks

- Focused Calendar fallback, template preview, handoff and transition phrase checks: passed.
- Fresh-build browser regression: 4 passed.
- Typecheck, CSS audit, web/admin builds and bundle budgets: passed.
- Built web asset privacy scan: passed.
- Full `npm run test:content-studio-api`, including reader-copy boundary: passed.
- Full `npm run test:content`: stopped in the unrelated report-generation prerequisite because protected report evidence is not provisioned locally. This is not recorded as a pass; hosted checks use protected Actions secrets.
- Hosted release results: recorded in the pull request.

Local logs and read-only source verification are under
`/private/tmp/calendar-context-*`. Production deployment and rendered production
acceptance must be recorded separately; local results do not establish either.
