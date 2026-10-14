# Published Sky card copy

The live audit on 2026-10-14 found 12 dated published Sky editions. All exact
published article links rendered their saved general article without a copy
mismatch after accounting for Markdown headings/list markers and layout
whitespace. Published status and the unchanged-copy action bar agreed. This
included Mercury in Scorpio and Libra, Mars in Leo and Cancer, Sun in Libra,
Chiron in Aries, Jupiter in Leo, Neptune and Saturn in Aries, Uranus in Gemini,
Pluto in Aquarius and Venus in Scorpio. No article or approval was edited.

Older saved editions contain Summary and authored transit/date/closing headings.
Those are saved source headings, not an invented Overview label, and are kept.
The audited Sun, Moon, Mercury and Venus placement readers had no Overview.

All 10 currently active dated-article cards still used fallback placement
copy instead of their saved published TL;DR, even when the full article resolved
the current dated edition. Cold lists now resolve the ledger's exact
published edition keys alongside the existing source load, commit the admitted
rows before marking cards ready, and preserve those rows when ancillary Sky
copy resolves. Dated and seasonal publication revisions participate in source
identity so updates/retirement invalidate old cards. Returning from Calendar
waits for required published rows. Missing current rows produce the existing
retry state instead of presenting an older summary as published copy.

This changes selection and loading only: no saved article body, TL;DR, section,
publication, approval, house passage or authored source file is rewritten. Existing
source admission, date selection, review and owner-publication gates remain.

Regressions cover cold list → explicit saved summary → complete article →
reload in phone/desktop and both themes; a missing exact publication followed
by Retry; Calendar → Sky return with unavailable-publication recovery;
current revision/retirement invalidation and
unrelated-guide isolation. Existing editor publication regressions are retained.

The return-visit regression reproduced a retained ready status with missing
edition rows: it left Sky loading instead of showing the error and Retry.
Retaining a ready status now also requires that every published list edition
is present. The failed-return path reports the existing retry state and recovers
the exact published summary after Retry.

## Recurrence and shared response ordering

The dated ingress reader integration introduced a separate exact-edition load
for the detail route. Its original browser regression entered the detail route
directly, so it did not verify the same publication on the cold Sky list. The
list's placement-source gate neither fetched these edition rows nor included
their revisions in its identity. Subsequent ancillary loads replaced the shared
map. Fixing editor publication alone could not repair those consumer omissions.
The regression now starts at the list and requires the exact same published
TL;DR before opening the complete reader.

A deeper actual-handler regression reproduced a second, shared failure: an old
successful response can arrive after a newer publication has been installed by
another request. Monotonic ledger merging correctly retained the newer revision,
but `loadReaderRows` still returned the old row. Map-based loaders filter such
rows later; direct consumers such as Articles & Guides did not share that final
filter. The shared transport now rechecks every accumulated row against the
current ledger before returning the complete inventory. This also covers earlier
pages superseded while later pages load, and keeps unrelated current rows.
The public reader handler and client already use `no-store`; this is a response
ordering/consumer-admission defect, not evidence of CDN cache staleness.

The desktop dark regression also publishes a new synthetic exact edition via a
second same-origin tab's normal storage notice. The already-open full reader,
return to Sky list, and reload must show the new complete summary and body.
A draft notice preserves the current published copy. Fixtures never write
production content or change owner writing. Other-device readers use existing
focus/visibility/online revalidation and a five-minute foreground interval;
same-origin Studio notices refresh immediately. No cross-device push channel is
claimed.

The same browser case separately writes the newer publication cache from the
second tab without a Studio notice, less than 30 seconds after reload. Its
storage listener installs the new ledger before broadcasting `*`; the card and
full reader must immediately follow that revision. Retirement then removes
its complete synthetic body and TL;DR from the already-open reader and list.

The parallel-ledger regression also reproduced a missed publication notice:
`refreshContentPublications(true)` joined an existing read whose captured
revision preceded the Studio edit. Explicit edit/resume refreshes now wait for
that older request and start one fresh read; ordinary simultaneous loaders still
coalesce. Ledger installation's own `*` signal does not queue another forced
read, preventing a refresh loop. This matters for newly published edition keys,
which cannot be discovered through a request for an older known key.

## Signed owner aspect selection

The dated Sun–Neptune reader exposed another consumer mismatch: a published
five-value owner passage passed the factual boundary but Sky assigned it the
generated tier, below an older generic exact passage. Calendar already placed
that owner source in the authored exact slot. Both readers now use the same
signed-owner eligibility helper, retaining the existing composed priority,
generated fallback, publication retirement and source-owned Rx variants.
No saved writing or publication state is changed by this selection fix.

Four browser variants require the actual dated Neptune route to show the complete
synthetic signed opening and ending over competing generic exact copy, after
reload and after a new publication revision; retirement removes the passage.
Selector coverage also checks direct, retrograde, unknown motion, reversed
planet order, invalid facts/review, ordinary generated precedence, composed
priority and unpublished Rx refusal. Published acceptance uses read-only source
hash comparisons; owner passages are never copied into test fixtures.
