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

1. Select daily, weekly or seasonal, a reference date, and an edition time zone.
   **Prepare edition** calculates dates and facts without a writer call or storage
   mutation. If that edition already exists, its saved version opens instead.
2. Daily editions run midnight to midnight in the edition zone. Weeks start Monday
   and end the following Monday, respecting DST. Seasons run between calculated
   solar ingresses; the selected date's local noon chooses the solar season.
3. Edit each sign's private outline, reader headline and complete reading. Save
   retains all twelve together. Edits survive navigation to other Studio sections;
   leaving the browser warns about unsaved work. Replacing an unsaved edition asks
   before discarding changes. A version conflict preserves the local edits.
4. **Edit AI writing instructions** opens the separate period profiles.
   **Use latest writing instructions** explicitly replaces the edition's retained
   profile snapshot. Save to keep it. **Export writing brief** exports calculated
   facts, all twelve draft fields, private outlines and that profile snapshot.
   It is planning input, not the canonical harness request schema or a generation
   receipt. Unsaved starter profiles are identified as such.
5. **Import draft** accepts `{schema: "horoscope-draft/v1", edition, editorialNotes?}`;
   `schema` may be omitted. The edition must contain all twelve signs and match the
   opened calculated window. Unknown mixed-document fields fail for review.
   Only headline/body are reader fields. The complete original import and SHA-256
   remain in private `source_snapshot.editorialImport`; source notes never serve.
6. Save, expand **Review all twelve readings**, and review exact complete wording.
   The explicit approval checkbox enables **Publish edition** on the saved version.
   Publishing is a separate version-checked action. Editing reader fields returns
   the edition to Draft even if another editor tries to save with `status=LIVE`.

This increment adds no model calls, billing, automatic approval or background
generation. The writer's existing evidence, exact-outline, paid-call and exact-prose
approval boundaries still apply. Reader wording is not approved by publishing code.

## Data and access

The existing `generated_interpretations` table stores one `mode=article`,
`surface=sky` row under `horoscope/{period}/{UTC-start-digits}`. No migration is
required. `sections.horoscopeEdition` uses `horoscope-edition/v1`: a calculated
window and exactly twelve `{sign, headline, body}` passages. The row body preserves
the same full reader text for the generic copy-boundary scanner. Publication rejects
incomplete passages, placeholders, invalid boundaries or conflicting identity/body.

Authenticated `generated-content?horoscopeBrief=true` calculates Swiss Ephemeris
positions, lunations and stations. It clearly identifies that the event list does
not cover every aspect or ingress. Whole-sign house numbers are derived from the
calculated signs. A server HMAC protects the brief against edited facts. Canonical
JSON makes verification stable after PostgreSQL jsonb reorders object keys.
The existing generated-content function explicitly packages the Swiss WASM assets.

`generated-content?horoscopeEditions=true` lists the latest thirty editions; preparing
a specific date performs an exact lookup beyond that list. Generic saves retain the
existing owner authentication, optimistic version checks and publication ledger.

The public `content-reader` query `{horoscope:{period,at}}` filters period and window
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

The reader uses the app’s saved location and requests only published editions for
that time zone. Changing the location persists the preference and refreshes the
reading. An edition from another zone is never silently relabelled as the local
day or week. Editorial coverage is explicit: publish an edition for each time
zone you want to serve; an uncovered zone displays an honest empty state.

Verification: `scripts/test-horoscope-generation.mts` exercises the actual API
handlers with isolated storage and a synthetic provider, including billing
reservation, reload recovery, all twelve persisted passages, conflicts, separate
publication and local date boundaries. `playwright.horoscope-reader.config.ts`
exercises generation → editing → publication → local reader selection at desktop
and mobile widths in both themes. Synthetic provider checks do not demonstrate
live provider availability or approve the writing quality.
