# Aspect editor loading repair — October 28, 2026

Base: `da913a5243da265a48d4ee194ca7f5d8c0d34f28`, refreshed `origin/main`.
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

Matched independently installed main/repair builds use native ARM Node 22.20.0
and identical synthetic Supabase settings. Entry raw/gzip and aggregate gzip
change from `810310 / 234777 / 853580` to `811832 / 235265 / 853972` bytes.
The eager editing controls cost 1,522 raw entry bytes and 488 gzip bytes; aggregate
gzip grows by 392 bytes. The recorded narrow allocation leaves 168 raw entry,
135 entry gzip and 178 aggregate gzip bytes of headroom. Other boundary,
reader-startup, memory-graph, privacy and runtime gates remain enforced.

Commit, CI, merge and deployed verification are recorded on the release PR.
