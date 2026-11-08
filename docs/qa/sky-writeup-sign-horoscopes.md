# Manual horoscopes within a Sky write-up

Owner direction, November 7, 2026: “i should be able to manually enter horoscopes for each sign, for a write-up”.

In a dated article, **Horoscopes** opens twelve sign fields for that article's
calculated period. Select a sign, enter its complete reading, and choose **Save
draft**. The same save retains the article and every entered reading. Closing
the panel keeps unsaved text in the article editor. The normal navigation,
conflict, revision and publication controls still apply.

The panel includes the write-up's existing **Publication** controls after the
sign fields. Save the draft, then approve publication now, schedule a future
release, or use a previous publication date. The article and its manually
written readings publish together; publication timing does not change coverage.

A partial set can be saved privately. Once a set is started, all twelve readings
must be complete before publishing or approving a scheduled release. An article
without a sign set remains publishable. The public article displays all twelve
approved passages in its existing rising-sign horoscope section. The accepted
removal of the public header's misplaced Horoscopes link stays intact.

**Related horoscope editions** retains the existing overlapping daily, weekly,
monthly and seasonal edition panel. Those editions and the evergreen library
keep their separate identities. This change performs no paid generation and
does not migrate or rewrite existing owner content.

The optional `writeupHoroscopes` collection is part of the article's compilation,
revision hash, approval and explicit reader projection. Empty fields are draft
state, never published fallback copy. Existing article hashes remain unchanged
when the collection is absent. JSONB property ordering does not alter integrity
verification or the saved passage text.

## Verification

- `scripts/test-sky-writeup-horoscopes.mts`: actual handler POST/PATCH, partial
  draft round trip, incomplete publication rejection without a write, exact
  twelve-passage public transport and reader selection, stale edit rejection,
  backdating, future private scheduling and actual due-cron publication,
  immutable coverage and article body, tamper detection and JSONB ordering.
  It runs in `test:sky-placement-workspace` and the full API gate.
- `playwright.sky-cms.config.ts`: nineteen browser cases, including manual sign
  entry in both themes at desktop/mobile widths, partial save/reload, all twelve
  saved readings, closing/reopening unsaved fields and publication directly from
  the horoscope panel, including now, future and backdated publication.
  The new sheet keeps its header outside the scrolling content region.
- Reader regression: sixteen cases across ingress articles, saved full-period
  aspects, dates/countdowns and complete manual sign readings, including the
  removed header link and reload. Synthetic fixtures use isolated content storage.
- CSS/token audits, server/Web type checks and reader-copy boundary checks.

Matched accepted main `2c2eab8415fb678ab1ad7a3be44d464263818d8e` and integrated
feature source `4030f709b42d006eb7c76ba9be1d52fa33971745` use their own locked
dependencies and native ARM Node 22.20.0. Complete normal prerequisites run before
normalizing only the generated knowledge's validated top-level timestamp. The
complete normalized knowledge matches. Unchanged build bodies use identical
sanitized settings: standard CI for Admin, standard and native public-reader
profiles for Web. Maximum required-profile feature cost is 2,221 aggregate Web
gzip bytes and 2,106 aggregate Admin gzip bytes. Five affected allowances add
only that measured positive cost to accepted main, preserving its headroom.
No separate Sky detail chunk allowance is retained. All other numeric, graph,
deferred-source, privacy and runtime guards remain intact, with detailed evidence
in the budget rationales. This records feature cost, not a performance improvement.

Initial provisional Admin limits failed by 124 raw entry bytes and 618 aggregate
gzip bytes; those failures are retained. An exploratory standalone Admin build
using the Web-only native public-reader key also makes accepted main fail its
aggregate guard by 110 bytes. That separate baseline failure is retained and is
not added to the feature allowance or reported as a passing control profile.

These are local integration results. Release additionally requires the full
unfiltered local content/API commands, exact-head hosted gates, and verification
of the actual deployed main revision. No production editorial save or publication
is part of verification.
