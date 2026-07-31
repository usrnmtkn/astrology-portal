# Release Notes

## 2026-07-31: Ephemeris Reliability And Content Package Sync

### Calculation Reliability

- Added actual-engine reporting to API health checks and calculation
  provenance, including returned flags, fallback state, library version, data
  path, and calculation count.
- Made readiness fail when configured Swiss Ephemeris data is expected but the
  engine falls back to Moshier.
- Added weekly and manually dispatchable NASA/JPL Horizons shadow verification
  for supported planetary positions, motion, and aspects.
- Retained verification reports, summaries, and raw response caches as workflow
  artifacts for 90 days.
- Kept Horizons out of the synchronous reader path. It is an independent
  monitoring oracle rather than a production request-time dependency.

### Verified Sky Recovery

- Added a last-known-verified cache for current-Sky snapshots that passed fact
  validation and carry verified provenance.
- Isolated entries by date, coordinates, and timezone, limited them to 30
  minutes, and capped storage at 24 snapshots.
- Added reader notices for cached recovery and live refresh behavior.
- Excluded natal, synastry, composite, and other personal calculations so those
  surfaces continue to fail closed.

### Fallback Architecture V3

- Reconciled 7,382 Supabase rows with bundled package
  `v3-2026-07-31a`.
- Verified all 7,007 reader package keys with content hash
  `6e9a07ecf8e989d0bff2941683e957fc` and key-manifest hash
  `443892a75ab14c1362ab1f195532e7d7`.
- Finished with zero missing, stale, duplicate, or changed rows. The database
  synchronization changed package metadata without changing reader-facing
  copy.
- Hardened snapshot export for all authored-content roles, nullable headlines,
  dual-voice records, blank-review templates, staged overrides, and canonical
  source history.
- Fixed browser reconstruction for authored rows that use only `body_you` and
  `body_they`, and for vocabulary rows with optional `grammar_frame`.
- Preserved the approved Moon-in-Scorpio placement row and removed transient
  Saturn planet-topic vocabulary warnings on the Sky surface.
- Kept strict version, completeness, content-hash, and key-manifest validation;
  invalid remote packages fail closed to the bundled package.

### CI And Production

- Upgraded all GitHub-maintained workflow actions to Node.js 24-compatible v6
  majors: `checkout`, `setup-node`, and `upload-artifact`.
- Removed the Node.js 20 deprecation annotation without changing the Node.js 22
  application test runtime or workflow behavior.
- Passed aspect-pattern, content, social-security, database-authorization,
  typecheck, build, NASA/JPL, Vercel, and browser regression gates.
- Final `main` visual smoke passed in 6m43s with zero check annotations.
- Verified production Saturn rendering with no planet-topic or V3
  package-validation console warning.

Full operating notes, commands, limitations, and manifest details are in the
[2026-07-31 reliability release README](releases/2026-07-31-reliability-and-content-sync/README.md).

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
