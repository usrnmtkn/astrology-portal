# Memory technology review — 2026-09-11

Checked the lockfile, npm registry, npm audit, Supabase changelog and current
database access guidance. This is a maintenance record, not approval to upgrade
the renderer or framework. Existing Node runtime: 22.20.0.

| Package | Locked version | Registry latest observed | Decision |
| --- | --- | --- | --- |
| @supermemory/memory-graph | 0.1.8 | 0.2.3 | Keep pinned; checked upstream bundle patches require separate compatibility work |
| ogl | 1.0.8 | 1.0.11 | Keep current shader integration until a visual/reduced-motion review |
| react | 19.2.6 | 19.3.0 | No framework upgrade in this change |
| vite | 7.3.6 | 8.3.0 | Major upgrade needs separate migration/build review |
| typescript | 5.9.3 | 7.0.2 | Major upgrade needs separate migration/typecheck review |
| @supabase/supabase-js | 2.106.2 | 2.116.0 | Existing auth unchanged; latest requires Node >=22 |
| @playwright/test | 1.61.0 | 1.63.0 | Existing browser/runtime combination retained |

Version source: the official npm registry's `/PACKAGE/latest` endpoints, for
example [renderer](https://registry.npmjs.org/@supermemory%2Fmemory-graph/latest)
and [Supabase client](https://registry.npmjs.org/@supabase%2Fsupabase-js/latest).
Newer versions were identified, not fully compatibility-tested or endorsed.

The initial security audit reported two affected browser-tooling dependencies.
The lockfile updates browserslist 4.28.2 → 4.28.9 and baseline-browser-mapping
2.10.32 → 2.11.22 within existing dependency ranges, including their browser data
dependencies. The updated lockfile audit reports zero known vulnerabilities.
This does not establish that the application has no security defects.
Sources: [baseline mapping advisory](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv),
[Browserslist cache advisory](https://github.com/advisories/GHSA-c83g-rgw3-j3cx),
[Browserslist stats advisory](https://github.com/advisories/GHSA-73wf-gq98-2v4g).

[Supabase's changelog](https://supabase.com/changelog) includes changed Data API
exposure defaults. The new migration explicitly sets grants and RLS instead of
depending on project defaults, following [current RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).
It uses security-invoker functions restricted to the server role. The existing
owner authentication flow, renderer patch, shader, and fonts are unchanged.
Database verification uses the existing locked PGlite 0.5.8 test dependency.

Follow up on framework/renderer upgrades in isolated work after reviewing their
release notes, API/patch changes, licensing, bundle sizes and browser behavior.
This review creates no recurring automation and makes no deployment claim.
