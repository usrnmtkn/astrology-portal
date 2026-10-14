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
by Retry; Calendar → Sky return; current revision/retirement invalidation and
unrelated-guide isolation. Existing editor publication regressions are retained.
