# Manual horoscopes within a Sky write-up

Owner direction, November 7, 2026: “i should be able to manually enter horoscopes for each sign, for a write-up”.

In a dated article, **Horoscopes** opens twelve sign fields for that article's
calculated period. Select a sign, enter its complete reading, and choose **Save
draft**. The same save retains the article and every entered reading. Closing
the panel keeps unsaved text in the article editor. The normal navigation,
conflict, revision and publication controls still apply.

A partial set can be saved privately. Once a set is started, all twelve readings
must be complete before publishing or approving a scheduled release. An article
without a sign set remains publishable. The public article displays all twelve
approved passages, and its Horoscopes link jumps to that section. Articles
without their own sign readings retain the existing link to the Horoscope page.

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
  backdating, immutable coverage and article body, tamper detection and JSONB
  ordering. It runs in `test:sky-placement-workspace` and the full API gate.
- `playwright.sky-cms.config.ts`: nineteen browser cases, including manual sign
  entry in both themes at desktop/mobile widths, partial save/reload, all twelve
  saved readings, closing/reopening unsaved fields and publication availability.
  The new sheet keeps its header outside the scrolling content region.
- Reader regression: sixteen cases across ingress articles, saved full-period
  aspects, dates/countdowns and complete manual sign readings, including the
  in-article jump and reload. Synthetic fixtures use isolated content storage.
- CSS/token audits, server/Web type checks and reader-copy boundary checks.

Matched independent main `020f885c07301b276640b2866ac260075bc51951` and candidate
builds use their own locked dependencies, native ARM Node 22.20.0 and identical
sanitized CI settings. The requested feature adds 1,925 gzip bytes to aggregate
Web JavaScript and 1,478 to aggregate Admin JavaScript. Six affected allowances
add only the measured positive feature delta, retaining the passing control's
exact headroom. All other numeric, graph, deferred-source, privacy and runtime
guards remain intact. Detailed measurements are retained in the existing budget
rationales. This is feature cost, not a performance improvement.

These are local integration results. Release additionally requires the full
unfiltered local content/API commands, exact-head hosted gates, and verification
of the actual deployed main revision. No production editorial save or publication
is part of verification.
