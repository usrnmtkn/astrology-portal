# Calendar and journal handoff, October 25

Scope: Calendar Day/Week/Month and the shared five-step journal editor. Reference:
`GitHub app design system (5).zip`, SHA-256
`01e3347c5201281917e11e741679fde0e9d54fd7e26b90d59a38cab3a2d6b7d0`.
Compared the new Calendar Refined, Calendar Web Day/Week/Month v2 and DS v2
Journal check-in section, plus the web-mobile Calendar reference. Reference
scripts were not executed and document approval labels were not treated as
permission to change or publish copy. Seven private synastry drafts remain untouched.

Local branch `codex/frontend-design-system-20261024`, HEAD `2baa1b170`, is
0 ahead / 35 behind freshly fetched `origin/main` (`c51d9c551`). This checkout
also contains concurrent work. This is local review evidence, not a merge or
production-deployment claim.

## Implemented

- Calendar uses the shared light gradient and dark canvas. Page title remains
  Newsreader 36; the lunar day title is Newsreader 26/1.15. Weekly day labels
  and event-card labels use the established UI roles. All narrative copy remains
  Newsreader 19/1.5, including the weekly cards and monthly TLDR.
- Desktop Calendar tabs use 36px items with 4px insets (44px total); web mobile
  retains 34px items with 4px insets (42px total). Selected tabs are white on
  desktop light, teal on mobile light, and light with dark ink in dark mode.
  This supersedes the earlier all-width 42px geometry after receipt of v2 web.
- Month begins with the TLDR UI label and retains every authored TLDR paragraph.
  Its full edition headline remains an accessible, visually hidden heading.
  Read more is an outlined pill linked to the exact published edition. Missing
  monthly copy remains absent; no legacy composition is substituted.
- The journal editor is 530px wide on desktop and full screen through 760px.
  Its five questions use the shared Newsreader display role, with sans-serif
  dates, end labels, Tags/People pills and footer controls. Journal text and
  summary retain the body role. Each footer and close control is 44px.
- Mood illustrations are 40px in 44px controls. Sliders use a 36px track and
  30px knob; the numeric state resolves geometry on the track itself so both
  endpoints remain correct at every width. Keyboard focus remains visible.
  The saved card uses a gold mood meter, teal rest meter and violet social
  meter, with a readable rest-score pill and dark faces on gold mood stars.
- Save errors preserve both text fields and keep the footer visible. Storage,
  auth, account isolation and publication logic are unchanged. Existing login
  coverage now asserts the handoff's Log in heading and contextual journal
  paragraph instead of the obsolete contextual heading.

## Verification

All 30 browser cases pass. Acceptance results are recorded in the audit JSON and the final local log
`/private/tmp/tldrastro-handoff6-final-acceptance.log`. The Playwright command
uses `/private/tmp/tldrastro-handoff-fidelity-preview.config.ts`, which builds
current source and starts a new production preview with `reuseExistingServer:
false`. Browser fixtures isolate account storage, published editions and auth;
no owner journal entries were written.

The combined matrix covers:

- 320/390/430/678/768/1440px Calendar tabs, all three views, both themes;
- full weekly opening and final paragraphs, navigation, reload and day details;
- complete monthly TLDR, visible label order, hidden heading, type metrics,
  Read more/back, error/retry and unpublished-month behavior;
- five journal steps at 390/1440px in both themes, type metrics, slider keyboard
  endpoints, Tags, failed save/retry, exact stored fields, reload and reopening
  from Account Journal;
- signed-out journal login, draft preservation during auth recovery, independent
  desktop/mobile journal synchronization, failed-read retry, and Monday grouping.

`npm run qa:css-audit` passes with zero unresolved tokens, semantic body
findings or raw reader styling debt. Web typecheck is included in the fresh
preview prerequisite. Scoped whitespace checks pass. Actual port-5173 UI was
reviewed in Day and Month and the journal panel, with the review tab restored
to Day in dark mode. Evidence:
`test-results/calendar-journal-handoff-live-dark.png` and the test-generated
Calendar/journal screenshots.

## Bundle limits and remaining scope

Matched builds with the same synthetic browser settings and a read-only Vite
source override establish the pre-change baseline without replacing checkout
files. Baseline aggregate CSS is 131,014 gzip bytes; this UI measures 131,364
(+350). Allocate 500 CSS bytes, leaving 136 bytes under the 131,500-byte cap.
Startup CSS remains 57,116 bytes, under its unchanged 57,550-byte limit.

Baseline aggregate JavaScript already measures 3,684,909 bytes. This UI measures
3,684,854 (-55), still 804 bytes above the existing 3,684,050 cap. That existing
shared-worktree release gate remains failing; the JavaScript budget was not
raised. Startup and individual chunk gates pass. This is not a performance or
full-release sign-off.

The source hash inventory is `/private/tmp/tldrastro-handoff6-source.json`
(SHA-256 `35ca6785d705e12e87fcd1a1d59b584e68924fc3770b0d8ef05f6129beb6a62a`);
all recorded source files remain identical after the final acceptance run.
New Not Found screens and the Where It Lands timing/bridge references in this
archive are separate surfaces and are not certified by this Calendar/journal
pass. Native-app bottom sheets are reference only; this work targets the web.
