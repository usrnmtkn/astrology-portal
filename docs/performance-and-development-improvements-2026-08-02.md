# Performance and development improvements — 2026-08-02

## Outcome

The core performance plan is complete on `perf/runtime-foundations`. The work preserves the existing Sky and Friends UX while reducing startup work, prioritizing visible Friends data, and making expensive chart-profile behavior follow the active view.

Content editors can continue updating and reviewing astrology copy independently. The runtime changes do not alter calculation facts, approval state, or reader-facing prose.

## 1. Friends and chart-detail loading

- Saved chart rows hydrate from the account-scoped local cache before the remote list resolves.
- Visible friend rows no longer wait for own-profile hydration.
- Notifications and invitation history wait until a Circle-oriented view needs them.
- The app-wide request-count monitor pauses while the Friends panel owns the same work.
- Friends landing views do not wait for current-sky calculation or download natal, relationship, or deferred fallback content.
- Opening a profile requests content by active tab: Natal requests natal content; Compatibility, Transits, Synastry, and Composite request relationship content.
- Inactive tabs skip natal, transit, synastry, compatibility, and composite calculations.
- Leaving Composite or changing charts aborts an obsolete relationship API request.
- Incomplete chart repair runs after initial interaction and only for records actually missing natal or timezone data.
- Manual-chart cache hydration, repair, form state, and create/update/delete persistence now live in a focused controller hook instead of the application shell.

## 2. Startup and code-loading boundaries

- Friends route and workspace modules load in parallel and preload on navigation intent.
- Friends landing, detail, chart rail, fullscreen chart, modal, and individual tab presentations are deferred from the startup shell.
- Signup, account, settings, and profile presentation have route-appropriate lazy boundaries.
- The Sky detail article renderer moved out of `App.tsx` into a deferred, budgeted chunk.
- Shared article text and aspect normalization now live in focused utilities instead of presentation code.

## Bundle measurements

Measured from the final production build:

| Metric | Result |
| --- | ---: |
| App JavaScript boot graph | 485.7 kB gzip |
| Reader boot including awaited CSS | 530.2 kB gzip |
| Reader startup CSS | 44.5 kB gzip |
| App code chunk | 140.5 kB gzip |
| Deferred Friends workspace | 9.7 kB gzip |
| Deferred Sky detail article | 4.0 kB gzip |
| Deferred signup | 3.0 kB gzip |

The final Sky-detail boundary reduced the App boot graph by about 3.6 kB gzip and the App code chunk by about 3.6 kB gzip compared with the immediately preceding build. Bundle QA now has a dedicated 5 kB ceiling for the deferred article and rejects it if it returns to the boot graph.

## 3. Validation and stabilization

Passing checks:

- `npm test` (broad content contracts plus production web build)
- `npm run qa:database-friends`
- Friends performance, routing, chart retention, social, pronoun, and phone-auth contracts
- Friends synastry wheel and placement-table render contracts
- Guest, member, account, and settings render/routing contracts
- App startup performance contracts
- Deferred fallback runtime parity
- CSS consistency and form typography audits
- Verified Sky cache contract
- `npm run qa:bundle`
- Manual in-app checks for Friends/Charts navigation and Sky article open/back behavior

Some Vite-based Node checks log an `EPERM` warning when their optional HMR WebSocket tries to bind in the sandbox; the checks themselves complete and pass.

## Content-maintenance follow-up

The fallback manifest was regenerated after the concurrent astrology-content commit `449ac1ab`. Its package version, key-manifest hash, and 7,182-key inventory remain unchanged; only the content hash changed. The generator check and runtime parity checks pass against the synchronized artifact.

## Optional future work

The stateful manual-chart controller has been extracted from `App.tsx`. A further nonessential step would be moving the remaining Friends profile view-model calculations into feature modules. That is a broader content-rendering refactor and is not required for the completed performance plan or current bundle budgets.
