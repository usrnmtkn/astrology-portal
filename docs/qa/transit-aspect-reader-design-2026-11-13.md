# Transit and aspect reader design

The owner requested the supplied reader design across transit and aspect pages,
then authorized commit and production release after the required checks pass.
PR: https://github.com/usrnmtkn/astrology-portal/pull/1474.

Runtime candidate `7ce35cd01b84a6340dde998ed0efa832f56dee50` is based on
main `61a60346e09b72ba6b70774740f238e2f402cd76`. Follow-up changes update
affected assertions and the measured UI bundle allowance; runtime source stays
unchanged. Reader prose, publication state and ephemeris calculations are intact.

## Acceptance evidence

- Centered transit/aspect headers, planet badges, timing text, tags and compact
  facts use shared design tokens across You, Friends and Sky. House transits use
  the same article layout. Distinct authored headings remain visible.
- The separate Key dates card starts expanded and retains keyboard toggling,
  complete continuous-contact dates, every exact pass and the full series.
- Fresh production builds, CSS/token audits, selected-zone date checks, heading
  comparisons and staged/public-output privacy scans passed locally.
- Local browser cases cover desktop/mobile, light/dark, discovery, navigation,
  reload, unknown birth time and six complete protected-passage regressions.
  Four Calendar-to-Sky cases also verify the compact facts treatment and wait
  for navigation animations before capturing the resulting page.

## Retained failures and focused corrections

The first build failed because App's duplicate article type lacked the new
optional timeline field; the type was corrected. Initial local assertions also
compared unnormalized browser font names and floating-point line-height strings,
then rejected every section heading instead of only a repeated article title.
Those assertions were corrected and their affected cases rerun.

Exact-head CI on `7ce35cd01` failed the Key dates job because the old consumer
tests required no Friends timeline and a collapsed generic Sky disclosure.
The updated tests assert the requested separate expanded cards, complete date
rows, keyboard controls and reload preservation. The shared primitive's existing
collapsed, loading and empty-state tests remain unchanged. Related daily-aspect
and social-return assertions now account for the header planet badge, responsive
body spacing and the existing separate lunation group on main.

Two initial local social-return runs used a reader-QA build with the standard
visual-smoke fixture origin, then failed the unchanged network guard when those
origins differed. They must run with the standard CI build profile; no network
guard or authentication behavior was relaxed. Both social-return cases passed
after rerunning against that matched CI profile. The 26 shared/generic/Friends
disclosure cases and four daily-aspect cases also passed their focused runs.

On `a8f2e2c31`, CI passed the API, privacy, disclosure and auth/bundle gates.
Client-facing job `132285135288` still required the previous countdown pill on
You house articles. Mobile job `132285135131` repeatedly required the previous
aspect divider and single-glyph badge, then reached its job time limit. The
test-only correction requires the visible article timing, the divider-free
aspect header and both supplied glyphs. Both client journeys and all eight
mobile icon projects passed locally, including Chromium and WebKit. Runtime
source, the shared primitive, and all network and publication guards remain
unchanged. The final revision still requires its own release gates.

## Bundle measurements

Main and candidate were built in separate worktrees, each with its own
`npm ci`, native ARM64 Node 22.20.0, `VITE_ENABLE_NATAL_ASPECT_PATTERNS=true`,
and identical synthetic visual-smoke Supabase settings. Each build contains
307 JavaScript files and 24 CSS files.

| Gzip metric | Main | Candidate | Change | Previous cap | New cap |
| --- | ---: | ---: | ---: | ---: | ---: |
| Initial reader CSS | 58,675 | 59,091 | +416 | 58,750 | 59,262 |
| Total CSS | 148,295 | 148,711 | +416 | 148,382 | 148,894 |
| Total JavaScript | 3,777,292 | 3,778,219 | +927 | 3,777,593 | 3,778,617 |

Preserve the original hosted `auth-access` failure at job `132270766841`:
initial CSS exceeded its cap by 341 bytes, total CSS by 329 bytes, and total
JavaScript by 642 bytes. Hosted JavaScript measured 3,778,235, which is 16 bytes
above the matched local result. The bounded allowances record requested UI cost;
they do not claim a performance improvement. All other limits and boundary
assertions are unchanged. The updated local bundle check passed.

The repository selector requires the broad affected catalog for these shared
components. Require the current candidate's `content-studio-api`,
`browser-release-gate` and `project-privacy` gates before merging. Production
must come from the merged main commit, followed by rendered production checks.
