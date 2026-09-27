# Calendar New Moon and Full Moon writer

The editor entry is **Content Studio → Calendar Write-ups → New & Full Moons**:
`/admin/content#calendar-writeups?view=lunation-writing`. Optional `phase` and
`sign` parameters select an exact workspace, for example
`&phase=new-moon&sign=libra`.

The visible content key is
`authored/sky-lunation-macro/{new-moon|full-moon}/{sign}`. This writer targets
`calendar-lunation` and `renderLunationMacro`. It does not change aspect cards,
personalized lunar horoscopes, eclipse readings, or served copy.

## Studio workflow and saved guidance

The four sections are Writing guidance, Plan & evidence, Draft, and Corrections.
The shared instructions cover voice and clarity, phase context, reader and
intention, and calculated dates and links. They are editable in Studio and are
included in the canonical writer request, with their version and digest recorded
in its receipt. The endpoint uses the existing server `OPENAI_API_KEY`; no key is
sent to or requested from the browser.

Explain an intention before asking the reader to set one. A New Moon beginning
does not require another person. Use concrete referents rather than assuming
that the reader knows what “it” or “the beginning” means. A Full Moon reading
explains what the reader could notice or reconsider, without assuming a previous
ritual. These are coverage checks, not a fixed paragraph template. Neither phase
may promise an outcome or invent the reader's circumstances. Exact rejected
passages and their owner's reasons belong only in the private feedback store.

The owner saves the seven-part argument and scope examples, chooses an event
date and time zone, then prepares the plan. Preparation includes meaning, six
complete eligible owner passages, current corrections, and calculated event
facts. An exact argument approval is required before one paid writer call.
A matching previously saved thread approval remains valid; moving it into Studio
does not require the owner to approve the same plan again. Generation has no
model judge or automatic rewrite.

The result contains `body` and `journalPrompt`. The candidate and receipt stay
in the workspace for review. “Open content entry” opens the existing reader-copy
editor; it does not copy, approve, or publish a generated candidate. Existing
renderers own dates, event links, and journal actions. Publication remains a
separate owner-reviewed workflow.

## Storage and failure boundaries

Guidance is stored under `studio-writing-profile/calendar/lunations`; each
workspace uses `studio-writing-profile/calendar/lunation/{phase}/{sign}`.
Both are `DRAFT`, `reference` rows in `generated_interpretations`, with empty
root body and summary. Instructions and candidate text live in private sections.
Generic CRUD and publication reject the entire `studio-writing-profile/` prefix.
All mutations require the exact saved timestamp; conflicts preserve newer edits.

Corrections come from the existing private `studio_writing_feedback` table,
filtered to the exact content key and active version. The database denies
`anon` and `authenticated` access; only the authenticated admin endpoint reads
it with server credentials. Missing storage, malformed feedback, or unsupported
feedback types stop preparation. This endpoint consumes the existing feedback
schema; it does not create a parallel feedback store or expose it to readers.

The server reserves one operation with compare-and-swap before calling OpenAI.
The background response ID and request hash are saved. Retrieval polls the same
response; reload does not start another call. An uncertain provider outcome
keeps the reservation, avoiding duplicate billing. Paid output is saved before
validation; changed guidance or evidence flags the candidate for review without
throwing it away. Earlier candidate text is retained during a new generation.
Drafts retain `ownerApproved: false` and `promotionAuthorized: false`.

## Canonical evidence and facts

Dates and event identity come from Swiss Ephemeris. The selected date, phase,
sign, and time zone must match the calculated event. Eclipses require their
separate workflow. Related cycle anchors are calculated events, never six-month
arithmetic. Historical dates inside owner articles are not current event facts.
The meaning-plan hash binds the exact calculation packet to argument approval;
the Studio plan hash also binds the saved guidance and private feedback versions.

Positive register evidence is restricted to eligible owner-authored lunation
passages. Reviewed phase and sign doctrine supplies meaning separately; it is
not approved reader copy. Matrix and scene lookups remain required. Rejected
wording is excluded from positive evidence. Each reference retains its original
source ID, full text and hash.

Editorial findings remain advisory under the August 25 owner ruling. Facts,
grammar, protected text, placeholders and subject/register boundaries retain
their blocking checks. Exact wording still requires owner approval.

The CLI in `scripts/run-astro-writing-harness.mjs` remains available for
unbilled diagnostic preparation with `family: lunations`, calculated
`engineFacts` and an `argumentInput`. Private request and output artifacts must
stay outside Git. Preparing a packet never grants permission for a paid call.

## Verification

- `node tests/astro-writing/lunation-writing.test.mjs`
- `npx tsx scripts/test-lunation-studio.mts` (isolated actual-handler storage and provider)
- `npm run test:content-studio-api` (includes the Studio endpoint regression)
- `npx playwright test --config playwright.lunation-studio.config.ts`

Browser verification uses a fresh admin build, the actual API handler with
isolated storage, and synthetic copy. It covers both themes at mobile and desktop
widths, navigation, saving and reloading, preparing facts and evidence, edit
conflicts, and unpublished candidate storage. No tests make paid model calls.
