# Horoscope editions

Readers open **Horoscopes** from the main navigation or mobile menu. The route is
`/#horoscopes?period=weekly&sign=aries`. Today and This week select complete published twelve-sign editions. This season
adds a shared introduction before the twelve sign readings. This month selects one
shared calendar-month overview for all readers. The calculated window must include
the current instant. Individual sign readings use whole-sign houses.
An available profile supplies the initial rising sign; any reader can change it.

An unpublished period has an empty state. Loading failures have a retry action.
Expired editions never substitute for the current period. Conflicting overlapping
editions fail for editorial resolution. The complete headline and passage render
without shortening, preserving paragraphs and supported formatting. The edition's
time zone appears with its date range. Existing calendar subscription URLs are
unaffected.

## Content Studio

Published-edition links preserve their period, sign and edition ID when a saved
account finishes reconnecting. They remain readable after the edition ends.
The reader's empty period view offers current published editions with their exact
date ranges and reference time zones, preferring the selected zone. A reader
explicitly chooses another edition; a weekly reading never silently substitutes
for Today, and another zone's prose is never relabelled as local timing. Available
edition links preserve the selected sign and exact edition ID. Missing or failed
discovery also leaves links to Sky and Calendar; failed discovery can be retried. Reader regression coverage includes delayed account
restoration, reload, archive links, sign switching and empty-period discovery in
`tests/visual/horoscope-published-navigation.spec.ts`.

Open **Write → Horoscopes** (`/admin/content#horoscopes`).

1. **Dates:** choose daily, weekly, monthly or seasonal, a date, and a city or time zone.
   **Continue to writing plan** calculates the period, saves an empty draft and
   prepares its plan without a model call. An existing edition opens with its
   writing intact. **Continue a saved edition** reopens previous work.
2. **Generate:** review the exact plan using the sign buttons. Writing instructions
   are optional; saved instructions are selected automatically. To change them,
   expand **Writing instructions**, save the profile, and select **Use latest saved
   instructions**. Review the refreshed plan before generating. The approval box
   and **Generate 12 drafts** action stay together in the footer, with a clear
   explanation of missing approval and the number of paid calls. Each completed
   sign saves automatically. **Resume generation** retrieves an interrupted request.
3. **Review:** read one complete headline/body at a time. **Save & next** saves
   changes before moving to the next sign; **Continue to publish** saves the last
   reading. Sign buttons allow direct navigation. Back and section navigation keep
   unsaved work, and leaving the browser warns about it. Private outlines and
   import/export tools stay in optional disclosures. Partially written passages
   are preserved and must be completed before publication.
   **Reject this reading** clears the selected sign; **Reject all drafts** clears
   the edition. Confirming saves current edits first and archives the exact
   rejected writing in **Rejected drafts**. Both return to Generate with the
   latest saved writing instructions. Review the new plan and approve generation
   to create replacements. Rejecting alone makes no paid request.
4. **Publish:** review all twelve saved readings, approve their exact wording and
   select **Publish edition**. The success screen links directly to the published
   edition and offers **Create another edition**. Publication remains a separate
   explicit action, and exact edition links also work after the period ends.

The four-step navigation indicates the current step. Future steps explain their
requirements through the active screen; publication is unavailable until all
readings are complete. The primary action and Back remain with each step, and
focus moves to its heading when navigating. Failed plan preparation can be retried
against the saved draft without creating another edition or making a model call.

**Advanced** retains export, import and calculated facts. Import accepts
`{schema: "horoscope-draft/v1", edition, editorialNotes?}`; `schema` may be omitted.
The edition must contain twelve signs and match the calculated window. Unknown
mixed-document fields fail for review. Only headline/body are reader fields; the
complete import and SHA-256 stay in private `source_snapshot.editorialImport`.
Exported briefs contain instructions and outlines, not publication approval.

Daily editions use local midnight boundaries. Weeks begin Monday and respect DST.
Seasons run between calculated solar ingresses; the reference date's local noon
chooses the season. Generation uses the canonical writer and explicit plan/billed
call authorization. It does not approve wording or publish automatically.

Seasonal plans also retrieve the complete shared zodiac-season and learning-axis
sources for the calculated Sun season. **Full plan details** shows their exact
text and the two whole-sign life areas for the selected rising sign. All twelve
readings share the same season/axis sources; the audience sign changes the houses,
not which season is selected. These sources provide interpretive meaning, while
the complete historical owner readings remain prose examples and the signed brief
supplies current events and dates. The opposite sign is not itself a transit.

The latest editable shared source draft takes precedence over its live row. If
neither exists, the writer uses the complete registered source-bank entry.
Archived revisions are excluded. Empty saved sources and failed source reads stop
preparation before a paid call; they never silently select old text. Source edits
invalidate plan approval. Each generation receipt retains the exact source text,
identity, version, hash and word count used by that request, including on resume.
This authoring retrieval does not publish shared sources or change reader copy.

Seasonal prose can introduce selected events with their supplied month/day dates
in the edition's time zone. Dates need not lead every paragraph. The fact check
accepts supplied dates and checks an explicitly named nearest event in the same
sentence; it flags unsupported dates or mismatched events. This is a deterministic
check with bounded language coverage, not a complete semantic proof. Exact clock
times remain in the timing display. Daily and weekly timing instructions retain
their existing behavior.

Verification: `test-horoscope-seasonal-meaning.mts` covers all 144 season/audience
combinations, complete text/provenance, saved-source precedence, missing-source
failures, changed approvals, persisted snapshots and time-zone date boundaries.
`test-horoscope-generation.mts` inspects all twelve actual seasonal provider
payloads. `horoscope-seasonal-sources.spec.ts` exercises plan discovery, recovery,
full-text rendering, sign changes and reload on desktop/mobile in both themes.
Storage and provider calls in these tests are isolated fixtures, not paid samples.

## Data and access

The existing `generated_interpretations` table stores one `mode=article`,
`surface=sky` row under `horoscope/{period}/{UTC-start-digits}/{IANA-time-zone}`. Legacy keys without the zone remain readable and editable. No migration is
required. `sections.horoscopeEdition` uses `horoscope-edition/v1`: a calculated
window and exactly twelve `{sign, headline, body}` passages. The row body preserves
the same full reader text for the generic copy-boundary scanner. Publication rejects
incomplete passages, placeholders, invalid boundaries or conflicting identity/body.

Authenticated `generated-content?horoscopeBrief=true` calculates Swiss Ephemeris
positions, lunations, stations and planetary ingresses. It explicitly excludes
exact aspects. The weekly reference is local Monday noon, independent of the
selected day within that week. Whole-sign house numbers are derived from the
calculated signs. A server HMAC protects the brief against edited facts. Canonical
JSON makes verification stable after PostgreSQL jsonb reorders object keys.
The existing generated-content function explicitly packages the Swiss WASM assets.

`generated-content?horoscopeEditions=true` lists the latest thirty editions; preparing
a specific date performs an exact lookup beyond that list. Generic saves retain the
existing owner authentication, optimistic version checks and publication ledger.

The public `content-reader` query `{horoscope:{period,at,timeZone}}` filters period, local zone and window
in storage. A row must be LIVE, serving, without a review hold, complete, and admitted
by the exact publication ledger. The allowlisted public projection includes only
the edition window and passages. Calculated briefs, signatures, instructions,
outlines and import originals stay private. Existing same-tab/cross-tab updates and
focus/periodic revalidation apply; the reader also expires an edition at its boundary.

## Verification

Writer v6 uses three complete owner seasonal readings for each requested sign,
from the Pisces, Gemini and Virgo 2025 articles already in the governed corpus.
`data/writing/seasonal-horoscope-units.json` registers all 36 passages by exact
source offsets, article and passage SHA-256, word count and owner assignment.
`scripts/build-seasonal-horoscope-units.mjs --check` verifies that registration.
The seasonal adapter resolves full passages in place; it does not create another
corpus, shorten the readings, or expose private source files to the browser.
Missing or changed evidence stops preparation before a paid call.

Complete readings establish voice and movement. Historical astrology is never
current factual evidence; calculated period developments retain that role.
Collective essays remain supporting evidence. Daily and weekly calls retain
their existing complete weekly examples and their own saved writing formats.

The saved Voice and Structure instructions take precedence over general
long-form cadence preferences in horoscope calls. Short openings, early astrology,
questions, lists and varied sentence lengths are available when they work in the
passage. Seasonal starters retain the 450–600-word editorial target. These are
composing instructions, not automated taste gates or publication approval.
One provider request writes one sign; the Publish stage already presents all
twelve complete readings for the owner's comparison. No paid comparison or
automatic rewrite call is added.

Saving a profile updates future editions. Existing editions keep their saved
profile until **Use latest saved instructions** is selected, and existing bodies
remain unchanged. A changed profile or evidence hash requires a refreshed plan.
The provider input retains the whole saved profile and all three primary passages;
the saved generation receipt identifies the profile, source and plan hashes.

`scripts/test-horoscope-editions.mts` uses the actual admin and public handlers with
isolated storage. It checks Swiss period boundaries, DST, a year boundary, multiple
solar seasons, a PostgreSQL jsonb roundtrip, exact passage bytes, incomplete and
stale publication refusal, fact tampering, ordinary edit demotion and private data
exclusion. It is included in the unfiltered Content Studio API suite.

`npx playwright test -c playwright.horoscope-reader.config.ts` builds a fresh web
preview. Its actual-handler fixture covers twelve-sign edit/save/publish/read,
all three periods, mobile/desktop, light/dark, private outline exclusion, mixed
import refusal, unsaved navigation, URL reload/back, empty states, error recovery,
main navigation and the typography contract. No production content is modified.

Equal-environment builds against isolated main `20713030b` measure 8,454 added
aggregate web gzip bytes and 5,605 Admin bytes. Aggregate allocations increase by
9 kB and 6 kB respectively; startup, CSS and existing per-chunk limits stay fixed.
New 2.2 kB reader / 4.5 kB editor chunk caps and explicit lazy-loading checks keep
both screens outside startup. The shared public edition validator remains in the
reader eligibility path; startup stays within its existing budget.

## In-app generation and local editions

Content Studio → Horoscopes now offers four stages: choose the period and local
reference date, review the calculated writing plan and generate drafts, read/edit
all signs, then publish the saved edition. Writing instructions can be edited
inside the Generate stage; “Use latest saved instructions” adopts that profile
for this edition. Import/export remains available under Advanced.

`POST /api/admin/horoscope-writing` requires Content Admin authorization and the
exact saved row version. `prepare` compiles an unapproved plan without a model
call. `generate` accepts the owner-selected plan hash and reserves one empty sign
before submitting a governed Responses request. `poll` retrieves the persisted
response ID, validates its reader fields and saves the draft. Reloading does not
start a second request. Every completed sign records its model configuration,
response ID, token usage, request/source/profile/argument hashes and writing
checks in private metadata. Confirmed failures are retried only on another owner
action. Uncertain starts remain reserved; explicit release is available after
five minutes, and known in-flight responses must be cancelled before release.
Neither generation nor model review authorizes publication.

The `reject` action accepts one sign or `all`, requires the exact DRAFT version
and refuses an active generation. It atomically preserves complete rejected
passages, their hash, original signed facts, outlines, profile, import source and
generation receipts in server-protected `horoscopeGeneration.rejections` history.
Generic edits cannot erase this history. It clears the selected reader fields,
outlines and current check receipts, and adopts the latest saved profile. A
single-sign rejection preserves the other eleven passages and their original
facts. Rejecting all recalculates the brief and requires the identical period
window/time zone before saving. This refreshes older, narrower fact coverage
without changing edition identity. Rejected prose is private reference history,
not positive writer evidence or automatically activated Memory Graph feedback.
Published editions are not rejected through this action; publication remains
separate. No database migration is required.

`scripts/test-horoscope-rejection.mts` covers daily/weekly/seasonal resets, full
history, updated profiles, old brief coverage, regeneration, version conflicts,
active-operation protection and unauthorized access through the actual handler.
The browser flow checks cancellation, unsaved-edit preservation, one/all controls,
history, fresh plan approval and replacement generation in all four screen/theme
variants, with isolated storage and a synthetic provider.

The horoscope family uses the canonical writer, a forecast-specific output
schema, actual owner passages, separately identified reviewed meaning doctrine,
scoped matrix/scene evidence, the selected writing profile and signed ephemeris
facts. Doctrine is not marked owner-authored or owner-approved reader wording.
Weekly generation reserves three complete owner-authored sign forecasts as its
primary prose examples, prioritizing the requested sign. These include eligible
paragraphs under horoscope headings, not only generic article paragraphs.
Topical season/lunation references remain separate support. Missing eligible
forecast examples stop preparation before a provider call. Exact source text,
IDs and hashes reach the prompt; source IDs are retained in the receipt.
Writer version v3 binds the complete signed brief and each sign’s development
packet into the reviewed plan hash, invalidating earlier prepared plans. Existing saved readings and editable profiles are preserved.
The weekly starter profile names calculated destination signs and explains life
areas in ordinary language. It follows complete owner examples without prescribing
one opening, paragraph sequence or advice ending. Supporting weekly developments
must already be verified in the supplied facts; editorial guidance cannot expand
the brief's event coverage. These instructions remain editable in AI Writing.
Deploying a starter change does not overwrite saved profiles or edition snapshots.
An authorized saved-profile update uses its exact current version; existing
editions adopt it through “Use latest saved instructions” before a new plan.
The actual-handler regression checks the full dispatched examples for all twelve
signs. It verifies retrieval and text integrity, not owner acceptance of new prose.
Current Studio feedback is checked without expanding another surface’s approved
correction scope. Sources, prompts and operation metadata never enter the public
reader projection. Blocking writing/fact checks must be resolved before a
generated edition can publish; editorial voice advice remains advisory.

New edition identities include the IANA time zone. Legacy identities remain
readable and editable. Daily boundaries are local midnight; weeks begin on local
Monday, and calculated Sun ingress boundaries define seasons. City search resolves
the time zone, with a manual zone selector when city search is unavailable.
These are geocentric rising-sign forecasts, so coordinates do not substitute for
a natal chart or change the whole-sign house count.

The reader initially uses the app’s saved location, or the device time zone when
there is no saved location. Horoscope location changes persist independently and
refresh the reading without replacing Sky coordinates with a time-zone-only
selection. The primary lookup requests published editions for that zone. When uncovered,
optional discovery queries current editions across zones through the existing
public reader contract. Only complete, publication-eligible editions appear;
conflicting editions for the same period and zone are omitted. Choices show the
original dates and zone and open only when selected. The reader's location stays
visible, with a timing note when the edition uses another zone. No prose or event
weekday is automatically converted. Publish a local edition for local timing.

**Change → Reset to device time zone** clears the horoscope override and saves an
explicit device preference, so reloading does not restore the app's saved city.
Sky's selected coordinates remain unchanged. Selecting a manual time zone clears
the old city label in the shared location control. The twelve-sign navigation uses
the existing SVG zodiac assets, with visible names, keyboard access and pressed
states, alongside the personal rising/Sun sign shortcuts. These paths are covered
at mobile/desktop widths in both themes by `horoscope-reader-ux.spec.ts`.
Equivalent IANA aliases are normalized during calculation and lookup. Studio's
published-edition link identifies the exact saved edition and sign, including
past editions; choosing another period returns to current local readings.

Verification: `scripts/test-horoscope-generation.mts` exercises the actual API
handlers with isolated storage and a synthetic provider, including billing
reservation, reload recovery, all twelve persisted passages, conflicts, separate
publication and local date boundaries. `playwright.horoscope-reader.config.ts`
exercises generation → editing → publication → local reader selection at desktop
and mobile widths in both themes. Synthetic provider checks do not demonstrate
live provider availability or approve the writing quality.

## Period developments and editorial consistency

The writer receives a chronological set of calculated events and separately
labelled reference positions. Each supported Sun-through-Pluto placement/event
carries its own sign, whole-sign house, plain-language life area, reviewed meaning
source ID/path and local time. Points without a governed meaning remain in the
raw brief but are explicitly omitted from interpretation. Reviewed meaning is
never marked owner-authored voice. The canonical single-placement retrieval
anchor remains for evidence compatibility; it is labelled background and no
longer determines the whole reading's thesis or only allowed house. The argument
asks for a connected interpretation selected from the period, not twelve versions
of a Sun-sign placement. Older signed briefs retain their original coverage;
preparing a plan does not invent missing ingresses or silently replace facts.

The shared profile direction asks for emotional stakes, related examples that
deepen a concern, and an earned recognition or response. It does not prescribe
confrontation, family history, vulnerability, a fixed paragraph count or a
universal advice ending. Voice quality remains an owner judgment. Generation
cannot infer guaranteed personal events from exact sky-event times.

The v2 fact validator checks explicit New/Full Moon claims against their actual
lunation events, ordinary positions against the snapshot or a calculated ingress,
and numbered houses against the named planet/lunation. Events outside the edition
window do not license claims. Older daily/weekly briefs exclude exact aspects. Newly calculated seasonal and
monthly briefs include supported major aspects, verified as described below. At publication,
current fact checks replace obsolete fact findings while the original generation
receipt stays intact; other recorded checks, including private corrections, are
preserved. A successful fact check is not editorial approval.

The Memory Graph records architecture and provenance. The editable instructions
used by generation live in the existing private Supabase profile rows. No new
schema or broader feedback scope is introduced. Save a profile, then adopt it in
an edition and review the updated plan before generation. Existing bodies,
publication state, signed briefs and execution receipts are preserved by a
profile change. A code/profile deployment does not regenerate saved readings.

New generated headlines use “[Sign] & [Sign] Rising” through the provider output
schema. Existing saved/custom headlines remain unchanged. The calculated house
convention remains the edition’s declared rising-sign convention.

## Daily and weekly reading flow — September 27

Writer v4 gives daily and weekly runs three complete eligible owner sign forecasts
as primary voice references, with the requested sign first. The available complete
sign examples are weekly: the daily prompt explicitly identifies their use as
register evidence for a new daily passage, never a compressed weekly reading or
current factual source. Relevant owner articles remain additional topic evidence.
Seasonal source selection is unchanged. External product comparisons supply no
positive voice passages or reader text.

The daily and weekly profiles develop one recognizable experience with related
examples, brief specific astrology and an earned ending. A complication belongs
only when supported; there is no mandatory sentence sequence. Weekly readings
retain the connected developments of the week. The publication window is distinct
from a transit's duration. A daily may introduce an ingress or revisit an ongoing
placement; a duration, exit or future event still requires calculated evidence.
Current briefs supply reference positions and events within the local period,
not complete residency windows. No prompt licenses invented longer timing.

The reader opens Today and defaults to the profile's rising sign, then Sun sign
when rising is unavailable. Your rising sign and Your Sun sign buttons select
passages from the same published edition; the all-sign selector remains available.
Explicit sign/period URLs take precedence and survive reload and browser history.
The reader never derives a natal chart or changes published prose when switching.
Local-day selection follows the chosen city/time zone, including DST and fractional
offsets. It rechecks at the next local date boundary even without a published
edition, and at an earlier seasonal edition boundary. Exact archive links keep
their published date. The existing focus/online/periodic refresh remains active.

Verification: `test-horoscope-generation.mts` checks complete daily and weekly
source text/hashes and saved instructions at the actual provider boundary using
an unbilled fixture. `test-horoscope-editions.mts` checks day boundaries across
DST, skipped midnight, year boundaries and fractional zones.
`tests/visual/horoscope-personalization.spec.ts` covers personal sign shortcuts,
URL persistence, complete bodies, responsive themes, empty editions and midnight
rollover; the existing editor-to-reader test covers actual-handler publication.
These checks establish data and instruction routing, not owner voice approval.

## Owner edit guidance — September 27

Writer v5 applies the owner's requested editorial principles to daily and weekly
instructions: keep imagery coherent within a thought, name the real human concern
directly, explain its emotional consequence clearly, and remove activity lists
that distract from it. Useful specific examples and effective sentences remain;
this is not a brevity target, a global word ban or a single metaphor imposed on
every paragraph. Complete owner source passages stay exact and indivisible.

The writer finishes its new draft against the saved Voice and Structure guidance
within the original generation call. No additional model call or prose gate is
introduced. Supplied before/after wording is not installed as a recurring script
for every sign. The editorial principles remain editable in AI Writing. Existing
saved profiles require an explicit version-checked update; existing editions
adopt them through the normal latest-instructions or rejection workflow. A restart
retains rejected bodies, facts and profile snapshots before clearing draft fields.

Horoscope edits still do not automatically become private correction-memory
records. This change applies the owner's requested guidance through the existing
writing profile; it does not add or claim a per-reading feedback control. Actual
daily and weekly provider-input tests verify delivery of the saved guidance and
the instruction to finish against it. Voice quality remains the owner's decision.

## Reader navigation release verification — September 27

The location-reset and edition-discovery release was measured against isolated
main `4ee861263` with separate dependency installations and identical workflow
environment. Aggregate JavaScript grows from 3,493,646 to 3,494,417 gzip bytes
(+771); the deferred horoscope reader grows from 2,793 to 3,498 bytes. The
allocations grow by 1,000 aggregate and 800 reader bytes. Startup, CSS, other
individual caps and dependencies remain unchanged. No editorial content changes.


## Shared seasonal introductions and monthly overviews

A new **Seasonal** edition has thirteen writing units: a shared introduction,
then Aries through Pisces. The introduction receives the complete zodiac-season
and learning-axis sources without assigning personal houses. Each sign reading
keeps its own whole-sign interpretation. Existing twelve-reading seasons remain
valid, readable and editable without rewriting approved passages.

A **Monthly** edition has one `overview` passage and a `collective` audience.
Choose any date in the desired calendar month in Dates. The server calculates
local midnight on the first day through local midnight at the start of the next
month, including DST, leap years and December rollover. Generate one draft,
review/edit its complete text, then approve and publish it. The monthly Voice,
Structure, Sources and Prompt profile is separate from the seasonal profile.
Saving or deploying instructions does not regenerate existing bodies.

Both shared formats use three complete collective essays from the already
registered owner seasonal sources. `seasonal-horoscope-units.json` records their
exact boundaries, hashes, word counts and assignment provenance. Missing or
changed evidence stops preparation. The original essays stay intact; their
historical astrology is never current factual evidence. Shared prose uses direct
address for all readers, with no individual rising sign or personal house.
The seasonal introduction uses the saved seasonal voice and vocabulary while
its explicit shared-audience scope excludes sign-specific profile instructions.

New monthly and seasonal briefs include calculated conjunctions, sextiles,
squares, trines and oppositions between the Sun and planets through Pluto.
Moon aspects, additional points and multi-planet configurations are excluded.
The overview calculation adapter detects signed zero/180-degree crossings;
existing Calendar/Sky calculation consumers keep their prior adapter behavior.
Each aspect retains both planets, signs, exact instant and knowledge-base meaning.
Tests compare the supplied angles with direct Swiss Ephemeris positions on
multiple dates. Publication checks named pairs, aspect types and supplied local
dates. A conjunction alone does not authorize a cazimi claim. Old signed briefs
retain their original coverage until explicitly recalculated through rejection.

The reader's **This month** tab hides personal-sign controls and renders the
whole approved overview. **This season** renders the whole introduction above
the selected sign. Explicit edition links retain their archive and time-zone
behavior. Calendar's Month view loads the same published monthly edition for its
selected month and time zone; it never makes another writer call or paraphrases
the body. If there is no matching published monthly edition, the existing Calendar
monthly composition remains the fallback. A load failure has a retry action.

All units use the existing version-checked reservation, polling, rejection history
and publication path. The final reading transition saves once before opening
Publish, avoiding a second save with the previous row version. Generation counts
and plan approvals reflect one, twelve or thirteen units. No new database schema,
background generation schedule or automatic prose approval is introduced.

Acceptance evidence is tracked in [monthly and seasonal QA](../qa/horoscope-monthly-overview.md).
