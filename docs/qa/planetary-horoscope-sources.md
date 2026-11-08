# Planetary horoscope sources

Owner direction, November 7, 2026: planetary horoscopes need manually written,
AI-generated and fallback readings.

The Sky write-up's twelve sign fields remain the authoring source. Enter text
manually, or choose **Write with AI** for one sign. Save the write-up first so
the writer can verify its exact version and calculated coverage. The free
writing export shows the governed request; **Generate draft** makes one provider
request. **Use this draft** copies the result into that sign's editable field.
Other signs and the article stay intact. Unused AI drafts and direction require
an explicit discard before leaving; generation never saves or publishes.

The existing write-up publication controls govern both manual and accepted AI
text. Partial sets stay private; a started set requires all twelve signs before
publication. Publishing now, scheduling and backdating retain the calculated
astrology period. Existing daily, weekly, monthly and seasonal editions keep
their separate publication identities.

**Horoscopes → Planets** cards and detail pages select the matching published
write-up's full sign reading and exact coverage. They use the shared Sky article
approval, publication version and active-period checks. An article without sign
readings cannot hide another eligible reading. When no matching reading is
published, the existing evergreen whole-sign-house reading serves. Required
published sources that fail to load show an error and retry instead of silently
substituting evergreen text. Reader wording is neither shortened nor rewritten.

AI drafting uses the existing governed transit-house writer, canonical
`transit-house/{planet}/{house}` meaning source and current writing memory.
Canonical node identifiers use underscores. For this server-built horoscope
schema only, transit-house sources enter as mechanism references. Doctrine-only
sources retain that restriction, cannot supply reusable prose or framing, and
receive no wider surface permission. Other writing requests keep their existing
usage. Free-preview checks cover all fourteen supported planets and points.
Only the saved planet, sign, calculated window and selected sign's whole-sign
house become facts. Caller-supplied astrology, stale versions and invalid saved
compilations fail before dispatch. Model output remains for owner review.
Generation metadata is returned with the temporary draft; this change adds no
persisted generation-history schema or automatic prose approval.

## Verification contract

- `test-planetary-horoscope-sources.mts` checks twelve exact passages, coverage
  boundaries, case normalization, body-only newer articles, malformed rows,
  private drafts, stale publication versions and retirement.
- `test-sky-writeup-horoscope-writing.mts` calls the actual authenticated handler
  with isolated storage and intercepted OpenAI/Claude responses. It checks free
  export, saved facts, source identity, rejected requests and zero storage writes.
- Sky CMS browser cases check generation review, discard protection, one-sign
  application, draft persistence and publication through the actual fixture
  handlers at mobile/desktop widths in dark/light themes.
- Planetary browser cases check exact card/detail text and dates, sign switching,
  reload, failure/retry and retirement to evergreen. Existing navigation, timing
  and fallback publication tests remain required.

Release additionally requires exact-head content/API and hosted gates, bundle
budgets, privacy/CSS/type checks and deployed-main verification. Synthetic tests
make no paid calls or production editorial writes.
