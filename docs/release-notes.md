# Release Notes

## 2026-07-26: Beta Social Friends

### Friends Experience

- Rebuilt the Friends page as one persistent panel with live search, Circle,
  Charts, and a conditional Requests tab.
- Added unique social handles, account profile photos, and a single person-row
  pattern for search results, requests, and accepted friends.
- Added an empty-Circle invitation CTA and kept manually entered charts
  separate from account friendships.
- Added friend profile and compatibility views using the accepted friend's
  shared chart.

### Discovery And Consent

- Search supports names and `@handles`, ranks exact handles and name prefixes
  first, tolerates small spelling differences, and is rate-limited.
- Private accounts never appear in search, including exact-handle searches.
- Before friendship, discovery exposes only minimal identity and the Sun sign.
  Moon, Rising, birth details, and natal chart data remain private.
- Friend requests require acceptance before either account receives chart
  access. The Requests tab appears only when the signed-in member has an
  incoming request.
- `@tldrastro` is reserved for an account with the trusted admin app role.

### Sharing And Safety

- Accepted friends can independently pause or resume sharing their own chart
  without removing the friendship.
- Each friend row reports both sharing directions: the signed-in member's chart
  and the friend's chart.
- Making an account private removes it from discovery without removing existing
  accepted friends.
- Removing, blocking, or deleting an account revokes access at the database
  boundary.
- Blocked accounts are managed one level below Settings rather than displayed
  on the main Settings page.
- Account export and permanent deletion include or remove the Social records
  owned by the account.

### Requests, Realtime, And Invitations

- Friend requests, friendships, and acceptance notifications update through
  Supabase Realtime. Window-focus refresh remains a recovery path.
- Members can cancel outgoing requests, see request timing, dismiss acceptance
  notifications, and undo reversible UI actions.
- Email and phone invitations use a contact-bound, single-use private link that
  expires after 30 days.
- Invitation contacts and tokens are stored only as hashes; the inviter sees a
  masked contact hint.
- The web app opens the member's email or Messages app with the invitation
  text. TLDR Astro does not send email or SMS from a backend provider in this
  release.

### QA And Production

- Added the Social contract suite and rollback-only cross-user authorization
  test covering search privacy, simultaneous requests, acceptance, sharing
  changes, cancellation, blocking, invitations, and account deletion.
- Added a path-scoped GitHub Actions workflow for Social security, typecheck,
  production build, and optional database authorization testing.
- Applied and verified the production Supabase schema and Realtime
  publications through
  `20260726123000_social_invitation_management.sql`.
- Deployed beta commit `d53cf796` to
  `https://tldrastro.vercel.app`.

## 2026-07-15: Whole Sign Houses And Global Timezones

### Content Stability

- Documented the content precedence contract: fallback copy is a floor, not a competing source.
- Hardened the app against async copy downgrades where a broad `fallback-hook/...` or emergency template could replace specific authored, approved, or exact generated copy after content/registry loading finished.
- Established the expected source order for reader-facing copy: personalized/generated exact content, exact live rows, authored or approved knowledge-bank copy, template fallback for blanks, then emergency copy only when no specific copy exists.
- Added a non-blank neutral review state for unresolved copy so cards do not disappear into empty text or fake specificity.
- Added the rule to the README so future content and UI work can reference it when wiring new surfaces.

### Chart Calculation Integrity

- Standardized TLDR Astro on Whole Sign houses across web and API surfaces.
- Kept Ascendant and Midheaven as plotted angle points instead of treating them as 1st/10th house cusps.
- Added visible wheel labeling for the active house system.
- Added parity checks so web and API house assignments stay aligned.

### Global Timezone Resolution

- Replaced the old browser-side coordinate guessing path with API-backed timezone resolution.
- Added Google Time Zone API support as the production primary resolver.
- Kept `timezonefinder`/`tzdata` as the server-side fallback when Google is unavailable.
- Made timezone lookup fail closed when no reliable timezone can be resolved, instead of silently using UTC or browser-local fallbacks for birth charts.
- Updated Mapbox place search so selected cities are enriched with API-resolved IANA timezones before chart calculation.

### Regression Coverage

- Added a Jose / El Vigia, Venezuela regression proving 1979-02-08 9:00 AM local resolves to `America/Caracas`, `13:00 UTC`, and Pisces rising.
- Added a broad international timezone integrity script covering 29 coordinate/date fixtures across multiple countries, offsets, and DST cases.
- Added a Mapbox timezone enrichment script to catch missing timezone data in city-search results.
- Added API tests for Google Time Zone API usage and fallback behavior.

### Product/UI

- Shortened the friend profile segmented tab label from `Natal Chart` to `Natal`.
- Documented Cloud Run Secret Manager setup for the server-only Google Time Zone API key.

### Production Verification

- Cloud Run revision `tldrastro-api-00006-ww8` was verified ready.
- Production `/utils/timezone` was verified for El Vigia, Venezuela with source `google`.
