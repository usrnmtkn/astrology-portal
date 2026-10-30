# Aspect editor loading repair — October 28, 2026

Base: `c0a7c91c9816003445a32249f7e959ff69f1a1b9`, refreshed `origin/main`.
Branch: `fix/studio-aspect-editor-loading`.

## Cause and scope

The Summary and Body controls for an ordinary Calendar aspect were rendered
through the deferred `SkyFallbackFieldsEditor` module. That module also imports
the advanced placement/article writers, composition tools and their dependencies.
A failed module download therefore blocked basic aspect editing even though the
saved record and reader preview had already loaded successfully.

`studioLazy` caught the rejected import and returned its error component as the
successful result of `React.lazy`. React cached that result for the tab, so
closing and reopening the editor could not recover it. The rejection itself
was discarded. The original failed request was not retained, so its HTTP status
and exact trigger cannot be established retrospectively. A stale deployment's
missing chunk reproduces the observed screen. See the upstream explanations of
[React's cached lazy result](https://react.dev/reference/react/lazy) and
[Vite's deployment load failures](https://vite.dev/guide/build#load-error-handling).

The repair renders those existing plain fields with the dashboard, using the
same native Studio controls, labels, layout and save handler. Advanced placement
and article editing stays deferred. Source identity keys still reset local field
state when another record opens. Optional import failures retain their original
error for the console and an Error details disclosure, without printing drafts
or editor props. Formatting can still return to plain text after a failed load.

## Verification

- An independently installed, untouched main checkout fails the regression with
  a 404 for `SkyFallbackFieldsEditor-*.js`: the same local load-error panel replaces
  the aspect fields.
- Fresh standalone Studio build: **6 browser tests passed**.
- Fresh website build at `/admin/content`: **6 browser tests passed**.
- The new desktop/light and mobile/dark regressions keep that module unavailable,
  assert no download is needed for aspect editing, edit the entire Body, save
  through the actual API handler, reload and reopen the new private draft.
  The complete original LIVE row remains byte-identical in isolated storage.
- Four existing formatting-failure regressions verify complete unsaved guide
  retention, original module diagnostics, plain-text recovery, save and reload
  across desktop/mobile and light/dark themes.
- Admin typecheck, CSS/token audit, web and standalone bundle gates, and the
  protected-policy scan of the built web assets passed.
- The complete `npm run test:content-studio-api` gate passed with exit code 0,
  using native ARM Node and the existing protected report/style test fixtures.

Browser writes use the real handlers with isolated fixture storage. External
requests are blocked. No owner record, publication, writer profile, dependency
or paid generation was changed. These are local checks, not deployment evidence.

## Bundle accounting

Matched independently installed builds of current main `c0a7c91c9` and the
combined repair use native ARM Node 22.20.0 and identical synthetic Supabase
settings. Entry raw/gzip and aggregate gzip change from
`813339 / 235895 / 855998` to `814861 / 236421 / 856374` bytes.
The eager editing controls cost 1,522 raw entry bytes and 526 gzip bytes;
aggregate gzip grows by 376 bytes. Preserve main's full-visit article allocation
and add only the scoped 1,600 raw / 500 gzip startup allowance. This leaves 239
raw and 229 entry gzip bytes. The aggregate cap stays at 857,000 bytes, leaving
626 bytes. Other boundary, reader-startup, memory-graph, privacy and runtime
gates remain enforced.

The first CI matrix exposed the independently repaired mobile pointer race in
PR #1367. The combined candidate passed its four deterministic pointer-race
cases and six recovery cases. All 55 applicable hosted checks subsequently
passed on `f79aec806`. Main then advanced through PR #1366; the final integration
preserves its full-visit article props, callbacks, writer/workspace packaging,
controls and API behavior. Only the bundle-accounting conflict needed manual
resolution. Fresh API and browser gates are rerun on that final base.

Commit, CI, merge and deployed verification are recorded on the release PR.

## Recurrence prevention

Both Vite production builds enforce the actual emitted dashboard import graph.
The complete native aspect fields must be reachable through static imports once
the dashboard loads. The optional article and formatting editors must remain
outside that graph. Missing core fields or a direct/transitive dependency on an
optional editor fails the build, including Vercel's production build.

`node scripts/test-admin-lazy-boundary-contract.mjs` exercises this plugin with
real Rollup bundles: standalone and website entry paths, a split shared-fields
chain, and eight broken builds that must fail. It also verifies that both real
Vite configurations install the guard. This command already runs in the required
Content Studio API workflow through `qa:admin-boundary`.

The existing required browser-release gate includes the missing-module editing,
complete draft save/reload and unchanged LIVE-record regression. The existing
post-deployment reader verification workflow now also runs all six Studio
recovery cases automatically after a successful production deployment, checks out
the deployment's source revision, and retains failure screenshots/traces. Those
tests use deployed frontend assets and isolated actual API-handler storage; they
do not save or publish an owner's production record. No new production credentials,
paid service or scheduled automation is introduced.
