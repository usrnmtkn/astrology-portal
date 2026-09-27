# Horoscope editions

Readers open **Horoscopes** from the main navigation or mobile menu. The route is
`/#horoscopes?period=weekly&sign=aries`. Today, This week and This season each select
one complete, published twelve-sign edition whose calculated window includes the
current instant. Readings explicitly address rising signs using whole-sign houses.
An available profile supplies the initial rising sign; any reader can change it.

An unpublished period has an empty state. Loading failures have a retry action.
Expired editions never substitute for the current period. Conflicting overlapping
editions fail for editorial resolution. The complete headline and passage render
without shortening, preserving paragraphs and supported formatting. The edition's
time zone appears with its date range. Existing calendar subscription URLs are
unaffected.

## Content Studio

Open **Write → Horoscopes** (`/admin/content#horoscopes`).

1. **Dates:** choose daily, weekly or seasonal, a date, and a city or time zone.
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
selection. It requests only published editions for that zone. An edition from
another zone is never silently relabelled as the local
day or week. Editorial coverage is explicit: publish an edition for each time
zone you want to serve; an uncovered zone displays an honest empty state.
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
window do not license claims. Exact aspects remain unavailable. At publication,
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
