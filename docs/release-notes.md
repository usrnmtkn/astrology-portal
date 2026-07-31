# Release Notes

## 2026-07-31: Web Bundle Cache Boundaries

- Moved the two largest reviewed fallback-content snapshots out of the main
  application bundle and into separate core and transit/relationship chunks.
- Reduced the production application entry from 7.27 MB to 606 KB raw and from
  1.09 MB to 161 KB gzip, without changing content resolution or synchronous
  fallback behavior.
- Added a build-time performance budget that verifies the application entry
  remains below 800 KB and that both content chunk boundaries remain intact.
- This release improves browser caching and deployment invalidation. It does
  not claim a comparable reduction in total first-page bytes because the
  synchronous fallback resolver still loads both content datasets at startup.

## 2026-07-31: Station-Boundary Monitoring and Failure Alerts

- Added Mercury fixtures immediately before and after the July 23, 2026 direct
  station, with exact motion, longitude, and station-time assertions.
- The daily NASA/JPL comparison now independently confirms the direction of
  Mercury's motion on both sides of that station boundary.
- Failed integrity runs now reopen the persistent monitor issue, assign the
  configured GitHub recipients, and mention them in the failure report.
- Added `EPHEMERIS_ALERT_LOGINS` for comma-separated GitHub notification
  recipients, with the repository owner as the default.
- Added a protected monitoring-contract test covering both station fixtures and
  failure-notification routing.

## 2026-07-31: True Lunar Node Parity and Calculation Transparency

- Standardized the web app and calculation API on the True Lunar Node, fixing
  the production/local discrepancy at the Aquarius-Pisces sign boundary.
- Added exact web/API node-longitude parity checks and boundary fixtures so a
  Mean Node/True Node split cannot silently return.
- Added the calculation-method statement to member and guest Settings:
  planetary positions are calculated with Swiss Ephemeris and independently
  verified against NASA/JPL.
- Expanded the optional Sky calculation diagnostic with timestamp, timezone,
  calculation engine and version, zodiac frame, house system, node model,
  calculation version, cache age, and snapshot verification status.
- Confirmed 244 NASA/JPL-supported facts with zero discrepancies during the
  release verification run.

## 2026-07-31: Daily NASA/JPL Calculation Verification

- TLDR Astro now documents Swiss Ephemeris as its real-time calculation engine
  and NASA/JPL Horizons as its independent verification layer.
- The Horizons comparison runs daily, retains its report artifacts for 90
  days, and persists the latest result plus dated history in a GitHub monitor
  issue.
- Pull requests receive a `nasa-jpl-freshness` release check that fails when
  the latest main-branch comparison failed or is older than 36 hours.
- NASA/JPL Horizons remains outside reader request paths; it verifies supported
  planetary positions, motion, and aspects without becoming a public-API
  runtime dependency.

## 2026-07-26: Beta Social Friends

### Friends Experience

- Rebuilt the Friends page as one persistent panel with live search, Circle,
  Charts, and a conditional Requests tab.
- The Requests tab now appears for received requests, outgoing member
  requests, or pending share links, and groups received and
  pending activity separately with cancellation controls.
- Added unique social handles, account profile photos, and a single person-row
  pattern for search results, requests, and accepted friends.
- Added an empty-Circle invitation CTA and kept manually entered charts
  separate from account friendships.
- Added friend profile and compatibility views using the accepted friend's
  shared chart.
- Grouped discovery privacy and blocked-account access in a dedicated Social
  card under Settings while keeping handle editing in Account.
- Expanded overflow-menu actions to full-width interaction and selected-state
  targets.
- Phone signup now sends the verification code using only the phone number.
  Profile details, including the member's full name, are collected after
  verification; phone numbers are never used as public display names.
- Phone authentication remains hidden behind `VITE_PHONE_AUTH_ENABLED` until
  the production SMS provider is configured.

### Discovery And Consent

- Search supports names and `@handles`, ranks exact handles and name prefixes
  first, tolerates small spelling differences, and is rate-limited.
- Private accounts never appear in search, including exact-handle searches.
- Before friendship, discovery exposes only minimal identity and the Sun sign.
  Moon, Rising, birth details, and natal chart data remain private.
- Friend requests require acceptance before either account receives chart
  access. The Requests tab appears whenever the signed-in member has received
  or pending outgoing social activity.
- Invitations now create a single-use private link that the member can copy or
  send through the device share sheet without entering a friend's contact
  information.
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
