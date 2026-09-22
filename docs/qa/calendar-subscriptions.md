# Calendar subscriptions

The Calendar subscription sheet now creates a free, saved subscription. It has
no plan picker, checkout, or payment prerequisite. After creation it offers Apple,
Google, Outlook, and a copyable HTTPS URL. “Your calendar link is ready” means the
link was saved; the user still confirms the subscription in their calendar app.

## Adding and updating events

In Content Studio, open **Calendar Write-ups → Subscription events**. Use **Add
event**, enter its title, complete description, category, dates and optional
HTTPS link, then choose **Save draft** or **Save & publish**.

Drafts are private. Publishing adds the event to existing subscriptions that
include its category. Editing and publishing keeps the same event ID and advances
its version. **Cancel event** sends a cancellation with that same ID. An all-day
event's end date is exclusive; timed fields use the time zone shown in the form.
These additional events belong to the subscription feed; the website's calculated
Calendar continues to use the existing ephemeris.

The feed also includes selected calculated events for the current UTC year and
the following year. Eligible published Calendar descriptions are read on each
refresh through the existing reader/publication rules, using the subscriber's
selected time zone for dated content. Whole published bodies are preserved.
Weekly entries link to that week's Calendar; owners can publish additional weekly
forecast text in Subscription events. No generated or draft forecast is published
automatically.

The subscription URL stays unchanged when content or preferences change. Calendar
apps choose their own refresh interval and may cache updates; the feed advertises
a one-hour refresh hint. Adding a subscription is different from importing a
downloaded file once.

## Storage and endpoints

- `POST /api/calendar-subscriptions` creates an independent 256-bit read token
  and management token. `PATCH` requires both tokens and the last saved version.
- `GET` and `HEAD /feed/<token>.ics` return iCalendar, including stable UIDs,
  versions, UTC times or all-day dates, reminders, UTF-8 folding and ETags.
  This rewrite precedes the SPA fallback. The obsolete hardcoded custom domain
  and `/feed/2026.ics` are no longer issued.
- `/api/admin/calendar-feed-events` uses the existing owner authorization and
  compare-and-swap writes. Draft and published JSON are stored separately.
- The additive migration is
  `apps/web/supabase/migrations/20260922000528_calendar_subscriptions.sql`.
  Both new tables enable RLS and deny `anon` and `authenticated`; only the
  server's service role can read/write them. Database records contain token
  hashes, not raw capabilities. A read URL grants access to its feed, not editing.
- Creation and preferences are remembered in that browser. Clearing browser
  storage loses its editing credentials but does not invalidate an already-added
  subscription. No account or email collection is required.
- The server needs the existing `SUPABASE_URL` (or `VITE_SUPABASE_URL`) and
  `SUPABASE_SERVICE_ROLE_KEY`. `CALENDAR_PUBLIC_ORIGIN` optionally changes links
  inside events; its default is `https://tldrastro.vercel.app`. Subscription URLs
  themselves use the current website origin.
- Storage failures return an error, never a successful empty calendar. Invalid or
  revoked read tokens return 404. Preference changes advance event versions too.

## Verification

Local source is based on main `a05a04bce6da77dde37a4fdd368e34dd9df228d8` on
`codex/calendar-subscriptions`. These initial checks preceded the commit. The owner authorized commit and merge
on September 21, 2026; release checks are recorded on the PR.

- `npm ci` installed this worktree's dependencies; its knowledge build passed.
- `npm run test:content-studio-api` passed, including the new subscription test.
  The subscription regression runs the actual handlers against isolated PGlite
  PostgreSQL and applies the actual migration. It covers distinct URLs, access
  denial, publication, complete text, concurrent-edit rejection, cancellation,
  ETag/HEAD, reminder changes, outage handling and published-copy refresh through
  the same URL. Calculations are checked on two dates against Calendar's direct
  ephemeris calculation; a UTC/local-date boundary is also exercised.
- `tests/visual/calendar-subscriptions.spec.ts`: nine fresh-build browser tests
  passed. Reader and owner flows cover 390/1440px and light/dark themes, including
  empty/populated owner states and failure/retry. Browser requests use the real
  new handlers with isolated storage, not fabricated successful save responses.
- Web/admin typechecks, CSS/token audit, browser-suite coverage, workflow syntax,
  source privacy scan and built web/admin privacy scans passed. The standalone
  admin build also passed.
- The deferred owner event editor measures 2,394 gzip bytes. The fresh web build
  measures 3,443,155 aggregate JS gzip bytes, 655 above the prior total cap. The
  feature receives 1,000 aggregate bytes of allowance. Reader startup, CSS and
  individual chunk limits are unchanged; reader boot remains within its cap.
- Standalone admin measures 729,731 aggregate JS gzip bytes, 1,981 over the old
  cap. Its new deferred event editor receives 2,500 aggregate bytes. Entry,
  largest-chunk and content-boundary limits are unchanged, and the budget check
  requires the event editor to stay deferred. Both bundle-budget checks pass.

## Release work

Apply the additive migration to the same Supabase project used by the deployment,
then release the approved feature through the main-branch Git integration and
required CI checks. Verify that the public feed URL returns `text/calendar` over
valid HTTPS without login, a challenge, or an HTML redirect. Preview deployment
protection can prevent a calendar application's background fetch.

Local tests do not prove production routing, live database migration, or native
iPhone Calendar acceptance. After deployment, finish an actual iPhone subscription
and verify a subsequent published edit through its existing URL before claiming
the original device failure resolved in production. No production content, payment,
or native-calendar subscription was changed by these tests.
