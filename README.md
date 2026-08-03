# TLDR Astro Monorepo

This repository owns the production app and the canonical astrology knowledge package.

```mermaid
flowchart LR
  sources["packages/astro-knowledge/data\nSource material and reviewed content"]
  build["packages/astro-knowledge/scripts/build.js\nBuilds dist/knowledge.json"]
  package["@tldr/astro-knowledge\nWorkspace package export"]
  web["apps/web\nVite app"]
  sky["Sky surfaces\nCurrent placements, current aspects, forecasts"]
  natal["Natal surfaces\nChart profile and insight collections"]

  sources --> build
  build --> package
  package --> web
  web --> sky
  web --> natal
```

## Workspace Layout

- `apps/web`: the TLDR Astro web app.
- `packages/astro-knowledge`: the source of truth for astrology content, schema, voice files, generators, and timing helpers.
- `services/tldrastro-api`: FastAPI calculation service for charts, timing, relationship facts, and content-ready astrology facts.

The web app imports `@tldr/astro-knowledge`. Do not vendor a copied knowledge JSON file into the app. When the knowledge package changes, run the root build so `packages/astro-knowledge/dist/knowledge.json` is regenerated before the web app builds.

## Calculation Integrity

TLDR Astro uses Swiss Ephemeris for real-time astrology calculations and
NASA/JPL Horizons as an independent verification layer. A daily integrity
workflow compares supported planetary positions, motion, and aspects against
Horizons. Its latest status and dated history are persisted in a GitHub monitor
issue, and the `nasa-jpl-freshness` release check rejects a pull request when
the newest main-branch comparison failed or is more than 36 hours old.

The daily monitor assigns and mentions the configured GitHub alert recipients
when a comparison fails. Set the repository Actions variable
`EPHEMERIS_ALERT_LOGINS` to a comma-separated list of GitHub usernames; when it
is unset, the repository owner receives the alert.

The Settings screen repeats the calculation-method statement for readers. In
development, or when `VITE_ASTRO_DIAGNOSTICS=true`, the Sky screen also exposes
a collapsed diagnostic with the calculation timestamp, timezone, engine and
library version, zodiac frame, house system, lunar-node model, calculation
version, cache age, and snapshot validation status.

Horizons is deliberately not called during reader requests. Houses, angles,
nodes, stations, shadow boundaries, and exact-hit searches remain outside the
current Horizons adapter's coverage and continue to use the primary engine.

## Content Management and Precedence

Start with the [content-management README](docs/content-management/README.md).
The detailed [content architecture](docs/content-management/ARCHITECTURE.md)
maps facts, package rows, resolver selection, review state, dashboard hydration,
and every reader surface.

Two subsystems inside this monorepo share content ownership:

- `packages/astro-knowledge` owns astrology meaning, schemas, voice contracts,
  and timing/ranking helpers.
- `apps/web/src/content/fallbackArchitectureV3` owns most deterministic
  reader-facing prose and its authored-or-assembled resolvers.

The calculation API and ephemeris own facts. Content rows explain those facts.
React must not invent either.

Within the V3 package, resolution is:

1. exact approved authored unit;
2. approved hook/template/vocabulary assembly;
3. `SOURCE_GAP`.

Some surfaces first request an exact live generated row by content key and use
the package or a knowledge bundle as their fallback floor. Trace the call site
before changing precedence. Missing interpretation copy must omit the unit and
log the source gap; it must not be replaced by emergency prose in UI code.
Async registry loading must also be monotonic: a broad fallback may fill a blank
field, but it must never replace more specific personalized, generated,
authored, or approved copy that is already visible.

## Social Friends Architecture

Social friendship data is owned by Supabase. The browser is an RPC client and
must not recreate authorization rules locally.

```mermaid
flowchart LR
  account["Account\nhandle, privacy, chart sharing"]
  friends["SocialFriendsPanel\nsearch, requests, circle, invitations"]
  service["services/socialFriends.ts\nauthenticated RPCs + Realtime"]
  database["Supabase migrations\nRLS, rate limits, canonical relationships"]
  settings["BlockedAccountsSettings\nblock management"]
  deletion["api/account.ts\nexport and permanent deletion"]

  account --> service
  friends --> service
  settings --> service
  service --> database
  deletion --> database
```

Primary ownership:

- `apps/web/src/features/friends/SocialFriendsPanel.tsx`: Friends-page state
  and interaction UI.
- `apps/web/src/services/socialFriends.ts`: typed Social RPC calls, invitation
  URL handling, and Realtime subscription.
- `apps/web/src/App.tsx`: account privacy/sharing orchestration, request count
  in global navigation, invitation capture, and account-level settings.
- `apps/web/src/features/settings/BlockedAccountsSettings.tsx`: the dedicated
  blocked-accounts screen.
- `apps/web/supabase/migrations/20260725190000_social_handles_friendships.sql`
  through
  `20260726123000_social_invitation_management.sql`: the cumulative database
  contract. Apply every migration in timestamp order; later files replace some
  earlier RPC definitions.
- `apps/web/supabase/tests/social_friend_authorization.sql`: rollback-only
  cross-user authorization test.
- `scripts/test-social-friends-contract.mjs`: static contract covering the
  complete migration and UI wiring.

The invariants that must survive future changes are:

1. A handle is unique case-insensitively, normalized at the database boundary,
   and changeable only from Account. `@tldrastro` requires the trusted admin
   app role.
2. Private accounts are absent from discovery, even for an exact handle.
   Search is authenticated, bounded, and rate-limited.
3. A stranger may see only minimal social identity and Sun sign. Moon, Rising,
   birth inputs, and the natal chart are not discovery data.
4. A request does not grant chart access. Access begins only after acceptance
   creates one canonical mutual friendship row.
5. Each side controls sharing of its own chart. A paused chart must be returned
   as `null` to the other member, not merely hidden by React.
6. Remove, block, and account deletion must revoke access in SQL immediately.
   Making an account private affects discovery but preserves accepted friends.
   UI state is not an authorization boundary.
7. Email/phone invitations are contact-bound and single-use. Store only contact
   and token hashes. The current beta opens `mailto:` or `sms:`; there is no
   server-side delivery provider.
8. Realtime is an enhancement, not the only consistency path. Keep the
   focus-refresh fallback.

Run the Social gates from the monorepo root:

```bash
npm run qa:database-friends
node scripts/test-social-friends-contract.mjs
npm run typecheck
npm run build:web
```

For a database-backed authorization run, execute
`apps/web/supabase/tests/social_friend_authorization.sql` against a seeded test
database. It wraps all mutations in a transaction and rolls back.

Release order matters:

1. Apply all committed Supabase migrations first.
2. Confirm `social_friend_requests`, `social_friendships`, and
   `social_notifications` are in the `supabase_realtime` publication.
3. Deploy the matching frontend commit.
4. Smoke-test search, request/accept, sharing pause/resume, remove, block, and
   an invitation with two authenticated sessions.

## Common Commands

```bash
npm run dev
npm run dev:web
npm run build
npm test
npm run typecheck
npm run qa:bundle
npm run build:knowledge
```

`npm test` is deterministic and does not require network access. Run
`npm run test:content:live` separately when validating the configured Supabase
content mirror against reviewed source rows.

See the [web performance guide](docs/web-performance.md) for current bundle
measurements, CI budgets, and the safety criteria for route-level content
deferral.

Use `npm run dev:vercel` for local app work that touches admin or backend routes. It starts Vercel dev on `http://localhost:3000`, so `/api/*` functions are available while Vercel runs the frontend dev command behind it. Use `npm run dev` or `npm run dev:web` only for pure frontend work; those start Vite by itself on `http://127.0.0.1:5173`, and admin API routes will fail unless an API server is also running on `127.0.0.1:3000`.

Vercel builds from the monorepo root with `npm run build` and serves `apps/web/dist`.

## Platform Access Notes

These notes are intentionally limited to accounts, projects, and public deployment details. Do not store private keys, API keys, service account JSON, Supabase service role keys, OpenAI keys, or Swiss Ephemeris license files in this repo.

### Google Cloud

- Account / organization: `goldeneclipse.com`
- Cloud admin account used during setup: `hello@goldeneclipse.com`
- Google Cloud organization: `goldeneclipse.com`
- Organization ID: `64115316714`
- Directory customer ID: `C02k29xpb`
- Production API project: `tldrastro-prod`
- Production API service: `tldrastro-api`
- Region: `us-central1`
- Public Cloud Run API URL: `https://tldrastro-api-27165565299.us-central1.run.app`
- Swiss Ephemeris bucket: `gs://tldrastro-prod-swisseph`
- Artifact Registry repository: `tldrastro`

The API originally deployed successfully in project `tldrastro`, but organization policy blocked public Cloud Run access. The active production API is now in `tldrastro-prod`. Public Cloud Run access required a project-level organization policy override for `iam.allowedPolicyMemberDomains` on project number `27165565299`, setting `allowAll: true`.

Useful checks:

```bash
gcloud config set project tldrastro-prod
curl -fsSL https://tldrastro-api-27165565299.us-central1.run.app/health
curl -fsSL https://tldrastro-api-27165565299.us-central1.run.app/ready
```

### Vercel

- Production web app domain: `https://tldrastro.vercel.app`
- Production branch: `main`
- Vercel builds from the monorepo root.
- Build command:
  `node scripts/assert-vercel-production-source.mjs && npm run build`
- Output directory: `apps/web/dist`
- Feature branches are preview-only. Do not promote a feature preview or point
  `tldrastro.vercel.app` at it. Merge approved work into `main`; the Vercel Git
  integration then creates the production deployment.
- The production-source guard rejects production builds when
  `VERCEL_GIT_COMMIT_REF` is missing or is not exactly `main`. This prevents a
  manual `vercel --prod` from an older feature branch from replacing the live
  app.
- Production environment variable required for the browser app:

```bash
VITE_TLDRASTRO_API_URL=https://tldrastro-api-27165565299.us-central1.run.app
```

This variable is safe to be non-sensitive because `VITE_` variables are bundled into browser JavaScript. After changing it, redeploy the Production deployment without relying on stale build cache.
