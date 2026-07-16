# Admin/Web Split Plan

## Recommendation

Keep the public web app and the content dashboard in this monorepo first, but split them into separate workspace apps. A separate repository can come later if deployment, access control, or team ownership needs justify the extra coordination cost.

The immediate goal is a bounded monorepo split:

- `apps/web`: public reader-facing TLDR Astro app.
- `apps/admin`: internal content dashboard.
- `packages/astro-knowledge`: shared astrology/content knowledge.
- `api/admin/*`: admin-only server routes until server ownership is split.
- `api/*`: public/server routes shared by the web app.

## Current Coupling

- `apps/web/src/main.tsx` detects `/admin/content` and `/admin/generated-content` before loading public styles.
- `apps/web/src/App.tsx` lazy-loads `GeneratedContentAdminDashboard` and renders it for admin paths.
- `apps/admin/src/GeneratedContentAdminDashboard.tsx` owns the dashboard UI and imports `./admin.css`.
- The admin component imports shared content and service modules from `apps/web/src/content/*` and `apps/web/src/services/*`.
- Admin API calls currently live as direct `/api/admin/*` fetch strings inside the dashboard component.
- Admin QA lives in shared Playwright/report scripts under `tests/visual` and `scripts`.

## Phase 1: Guard The Boundary

Status: done.

- Add `npm run qa:admin-boundary`.
- Treat `App.tsx` and `main.tsx` as temporary bridges.
- Fail future QA if public app code starts importing admin components, CSS, routes, or APIs outside those bridges.
- Record the current known bridge list in `test-results/admin-web-boundary/latest.md`.

## Phase 2: Create The Admin App Shell

Status: done.

- Add a real `apps/admin` Vite app with its own `index.html`, `src/main.tsx`, and style entry.
- Mount the existing dashboard component from its current location first.
- Add `dev:admin`, `build:admin`, and `preview:admin` scripts.
- Keep shared content/service imports stable until the admin shell is proven.

## Phase 3: Move Admin Source

Status: done.

- Move `apps/web/src/admin/*` to `apps/admin/src`.
- Move admin CSS into the admin app style graph.
- Extract shared modules that both apps need into `packages/*` or a deliberately named shared app package.
- Replace direct `/api/admin/*` strings with a small admin API client module.

## Phase 4: Split QA And Deploy Targets

- Give public web and admin their own build/typecheck/visual QA commands.
- Move admin Playwright flows to admin-owned route fixtures.
- Keep the shared full report command, but make it orchestrate web and admin sub-reports.
- Configure admin-only deploy credentials and public-app credentials separately.

## Phase 5: Consider Separate Repositories

Move to separate repositories only when one of these becomes true:

- Admin code needs stricter repository access than public web code.
- Public deployment should never include admin dependencies or history.
- Different teams will release admin and public web independently.
- CI time or repo size becomes a real operational drag.

Until then, a monorepo split gives most of the safety with less friction.

## Success Criteria

- `npm run qa:admin-boundary` passes with only documented temporary bridges.
- Public app builds without importing admin CSS or dashboard code.
- Admin app builds from `apps/admin` without the public app shell.
- Web and admin visual QA can run independently.
- Public and admin environment variables are documented separately.
