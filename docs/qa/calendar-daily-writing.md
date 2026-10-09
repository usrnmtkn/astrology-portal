# Daily Calendar drafting

Content Studio → Calendar Write-ups → Daily writing keeps the daily Moon
paragraph separate from New/Full Moon articles and horoscope profiles. The
owner's private instructions and complete references are stored in a DRAFT,
reference-lane row with an empty reader body. No source documents belong in Git
or the public bundle.

Choose a date and time zone, save its thought and exclusions, then preview the
complete writer input. The server computes Moon sign durations and exact ingress
timing using Swiss Ephemeris and binds the request to the saved profile version.
The owner explicitly authorizes one call from that preview. No planner, evaluator,
retry, alternate candidate or automatic publication follows. Request reservations
prevent concurrent dispatch; an uncertain response remains reserved. Retrieval
checks the same stored provider response. Untouched valid and invalid results,
requests, reference provenance, hashes and usage remain private for owner review.

Validation:

- `npm run test:content-studio-api` includes the actual daily handler, access
  matrix, version conflicts, explicit approval, latest-input binding, concurrent
  dispatch, recovery, invalid results and publication denial with a mock provider.
- `npx playwright test -c playwright.lunation-studio.config.ts tests/visual/calendar-daily-writing.spec.ts`
  builds a fresh Studio and checks navigation, empty/saved states, full reference
  persistence, calculated preview, edits and conflicts on mobile/desktop in both
  themes. It makes no paid provider calls.
- The calculation cases include a late Leo → Virgo ingress, a full Virgo day,
  DST days and a positive UTC-offset zone.

Release verification must confirm the main deployment, private source hashes,
unchanged unrelated profiles, unauthenticated denial and owner-visible saved
settings. This is workflow verification, not a claim about generated prose quality.
