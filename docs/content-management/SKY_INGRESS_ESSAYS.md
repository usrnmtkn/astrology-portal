# Dated ingress essays in Studio

Status: October 9 authoring format integrated; generated wording still requires exact owner review before serving.

Open **Sky Write-ups**, select the planet/sign article template, and use
**Create a complete edition → Ingress essay · October 9 format**. Load the
reference date's calculated facts, complete the fields, and compile a draft.
The separately written TL;DR remains explicit. The previous saved-template
workflow and its twelve house passages remain available in the format selector.
Each format has its own saved workspace, so switching does not replace the other
format's saved writing. Fixed owner templates are unchanged.
Each new edition key includes its visit's entry date, so a retrograde return in
the same year cannot replace the earlier visit's article.
Passage-scoped correction memory retains that date too. A correction for one
visit cannot affect another visit unless the owner explicitly widens its scope.

The executable contract is
[`skyIngressEssay.mjs`](../../apps/web/src/content/skyIngressEssay.mjs).
It contains the eleven named fields, section guidance and scoped writer rules:

1. Summary: When, What, Takeaway. The API supplies the title and exact ET window.
2. Overview: sign, traditional ruler, planet and supported dignity, connected to
   recognizable experience. Aim for 120–180 words.
3. Major transits: exact dates, participant degrees, signs and motion, supported
   dignities, meaning, possible experience and practical response. Aim for
   100–180 words per transit.
4. Optional prior occurrence, with a verified search covering the claimed interval.
5. Optional other dates, with later follow-through labeled separately.
6. An event-specific close explaining conditions and reader choice, followed by
   a practice and whole-sign house direction. Aim for 60–100 words.

A full essay with two or three major transits generally runs 600–900 words.
An empty optional field omits its heading and section. The agency sentence must
vary with the event; it is not a reusable disclaimer. The horoscope companion is
separate. These instructions qualify the older reusable-placement structure only
for this dated ingress format. Calendar and other horoscope profiles are unchanged.
The current [contextual writing rule](../writing/RHETORICAL_PATTERN_PROTECTIONS.md)
and governed owner evidence continue to apply.

## Calculation and source receipts

`GET /api/admin/sky-article-facts?planet=sun&date=YYYY-MM-DD&format=ingress-essay-v2`
uses the project's packaged Swiss Ephemeris calculation, matching Sky and Calendar.
It records the exact reference instant, calculated visit bounds, time zone,
engine/version/flags, retrieval time and event-search coverage. In a multi-visit
residency, the essay covers the visit containing the reference instant.
Times use `8:05 PM ET` with `America/New_York` daylight-saving conversion.

The event packet includes major aspects involving the selected body and Calendar
ingresses, lunations and stations. Participants are calculated at each exact
event. Event searches span at most 366 days; a longer visit is explicitly marked
partial. A complete visit includes 30 days of labeled follow-through. No historical
recurrence scan is implied. The prior-occurrence field is withheld from the writer
until such evidence exists; an editor may leave it empty.

The server also requests one reference-instant longitude from the
[NASA/JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html), retaining
the request, signature, response hash and angular difference. Its result is
`matched`, `disagreement`, `unavailable` or `unsupported`. A disagreement blocks
writing. An unavailable comparison is visible and does not become a verification
claim. This comparison does not certify ingress times, exact aspect roots or
recurrence. Unsupported calculated points are never substituted with planets.

NASA explanatory text is a separate source role. The API retrieves complete
relevant paragraphs from curated NASA Science sources for the Sun and for
Mars/Saturn, recording the source URL, retrieval time and source/text hashes.
Other bodies explicitly record `not-retrieved`; a failed retrieval is
`unavailable`. The writer must not invent a NASA attribution. NASA science can explain astronomy, while governed astrology
sources supply meaning and owner passages supply voice. Private editorial
attachments remain outside Git and reader payloads.

## Publication and reader

Compilation stores the exact article and private calculation/generation receipts
as an owner-review draft. The existing version-checked approval action binds the
complete edition hashes. Public projection exposes the article format and exact
reader fields, without private instructions or receipts. Sky selects an approved
dated ingress essay only during its calculated visit. Otherwise its existing
placement reading remains in place. No runtime model writes reader content.
The reader discovers dated edition keys in the publication ledger and loads
their exact rows before showing the article. Compiled editions do not depend
on the separate fallback-package cache.

Verification: `node --import tsx scripts/test-sky-ingress-studio.mts`, the existing
compiler and slot tests, `npm run test:content-studio-api`, both application builds,
and the fresh browser flow. Synthetic tests cover authenticated handlers, Swiss
event roots, actual provider-request assembly without paid calls, preserved fields,
optional sections, separated companions, exact reader projection, expiry and DST.
