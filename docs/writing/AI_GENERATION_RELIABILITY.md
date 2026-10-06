# AI Generation Reliability Architecture

Status: active project architecture
Updated: 2026-09-21

## Scope

TLDR Astro AI generation is one governed system even when the reader surfaces and admin workflows use different endpoints. Reliability work must be evaluated across the full generation path rather than declaring AI generation fixed after one endpoint, pull request, or deployment succeeds.

The current generation surfaces covered by this architecture are:

- Content Studio evergreen placement article writing
- Content Studio dated / template-field Sky article writing
- You Day generated reports
- You Week generated reports
- Friends generated reports

## Required generation path

A successful generation must complete the relevant version of this path:

1. Build and validate calculated facts and governed evidence.
2. Load the applicable owner writing evidence / approved writing memory.
3. Construct a prompt that does not contradict the output validator.
4. Reserve any billing/checkpoint state required before a provider call.
5. Call the selected writing provider.
6. Persist the provider response or checkpoint before continuing when checkpointing applies.
7. Run deterministic fact, placeholder, register, and writing validation.
8. Run the independent quality judge when the surface requires it.
9. Give a bounded corrective pass when the returned draft is structurally usable but fails a correctable deterministic or judge finding.
10. Revalidate corrected copy against the original governed facts and writing rules.
11. Persist the finished draft/result.
12. Mark the job complete only after the persisted result is available to the consuming surface.
13. Verify that the reader/admin UI can load the persisted result.

A successful merge, provider response, checkpoint, judge score, or deployment is not by itself a successful generation.

## Reliability rulings

### Evidence failures

Valid selected source material must have a production evidence identity before a provider call. Weekly Moon material is a supported report source even when its technical reading has no numbered house. Evidence adapters must not require an unrelated house or aspect merely to authorize an otherwise governed source.

### Prompt and validator compatibility

Generation-control placeholders must not be supplied to a writer as immutable prose and then rejected when the writer returns them. Output fields that require finished prose have zero licensed unresolved placeholders. Template workflows that intentionally preserve variables must provide the licensed variable inventory separately and reject only unlicensed variables.

The Content Studio evergreen article writer must not use `{{articleDraft}}` as immutable model context. Existing reader-facing article prose is context when available; the requested `articleDraft` field is declared separately as output.

### Correctable output failures

A structurally valid model response must not become a terminal product failure merely because a correction introduces a mechanically identifiable writing violation. When safe and bounded, deterministic validation findings may receive one targeted cleanup/correction pass followed by full revalidation. The correction may not add facts, loosen evidence rules, lower owner-voice requirements, or bypass the independent judge.

### Checkpoint and retry safety

Checkpointing exists to prevent duplicate billing and unsafe replay, not to turn every infrastructure error into a terminal report.

- A confirmed provider failure with no usable response saved may start a fresh logical attempt within the existing retry budget.
- A checkpoint reservation failure that occurs before the provider call is retryable because no provider call occurred.
- Ambiguous states after a provider may have returned a response remain fail-closed when automatic replay could duplicate billing or overwrite an uncertain response.
- Changed evidence/instructions after a saved checkpoint require a fresh reviewed run rather than replaying an incompatible checkpoint.

These checkpoint rules are shared by You and Friends report generation.

### Provider account rejection

For You Day, You Week, and Friends reports, a confirmed provider credit or
credential rejection is an operational failure. It must not be converted into
a completed report assembled from source passages, even when source completion
is the selected delivery policy. Stop automatic retries, preserve the failed
checkpoint and sanitized operator diagnostic, and show the reader that report
writing is unavailable.

An explicit retry after account recovery starts a fresh checkpoint attempt and
must reach the writer/reviewer workflow, including across worker handoffs. It
must not be mistaken for an exhausted quality cycle that selects source-only
delivery. Replenishing provider credits does not rewrite an already-saved report.
Regression coverage lives in `test-transit-source-completion.mjs` and
`test-report-provider-schemas.mjs`; fixture success does not prove live writing
quality or recover an existing production result.

### Quality gate

Quality standards are not reduced to improve completion rate. A high aggregate score does not override required owner-voice, natural-language, factual-traceability, or other hard criteria. Unsupported invented circumstances remain a valid reason to reject a report.

The system should use specific judge findings as correction feedback while keeping the original governed brief as the factual authority.

## Production acceptance standard

Do not describe AI generation as fixed until production has demonstrated successful end-to-end generation, validation, persistence, and retrieval for the affected surface.

For a broad AI-generation reliability claim, verify at minimum:

- one evergreen Content Studio article generation
- one dated/template Sky article generation
- one You Day report
- one You Week report
- one Friends report

For reports, acceptance requires a completed job with a persisted result identifier/body that opens successfully in Reports. A `Checking`, `Preparing`, `retry`, or deployed-code state is not completion.

## Memory Graph role

The Memory Graph is evidence and architecture context, not permission to publish and not a replacement for calculated astrology facts or validators.

Generation workflows should recall the relevant writing rules, owner corrections, approved examples, and this reliability architecture before making broad changes to AI writing or declaring generation repaired. Live Studio feedback may augment repository memory, but repository architecture remains the durable project record.

When a new AI generation path is added, it must document:

- surface and endpoint
- factual/evidence source
- writing-memory source
- provider and output contract
- deterministic validators
- quality/judge stage, if any
- retry/checkpoint behavior
- persistence target
- production acceptance test

## Current project ruling

Reports and Content Studio AI generation are part of the same broader reliability audit. Fixes to one surface do not prove another surface is healthy. Production failures must be traced through the actual generation lifecycle and added to this architecture when they expose a reusable reliability rule.

## September 21 report repair: scope and verification

Status: local checks passed; production recovery remains unverified. Source: owner task `thread:01a0c440-92d0-7822-bda6-af3338840786`. The investigation snapshot contains ten failed jobs with no saved result: four You Day, one You Week, and five Friends. Eight retain writer/judge checkpoints; two older failures lack enough checkpoint evidence for a sentence-level diagnosis. These counts describe the inspected failures, not an overall failure rate. Private report bodies and job identities stay in protected storage.

You reports answer the reader's day/week question in second person from the locked personal-transit brief. Friends reports describe the selected friend's temporary conditions in third person; second person is permitted only in explicitly supplied relationship context. Each has one headline, one visible TLDR (`tldr` and `summary` are identical storage aliases), and a body. Their writing standard is the governed source material, approved report owner evidence, deterministic checks, and the September 7 report-specific judge contract. A later narrow report ruling must not silently be replaced by an older general writing rule.

Repair order and boundaries:

| Priority / defect class | Observed weakness | Repair and evidence |
| --- | --- | --- |
| 1 / recovery correctness | Final deterministic recovery omitted the latest draft; cross-attempt feedback could attach an old judge to a newer writer response and omitted deterministic-only failures. | `transit-reading-generation.ts` carries the latest draft into targeted recovery; `transit-reading-checkpoints.ts` matches step order and revalidates the latest draft. Regressions: `test-generated-report-correction.mjs`, `test-transit-reading-checkpoints.mts`. |
| 2 / prompt and validator mismatch | Friends prose used second person in a follow-on sentence without the name and relationship required by the sentence-level validator. Initial output instructions also requested fields outside the provider schema. | `friend-transit-reading.ts` states the exact sentence rule and four-field output; errors identify reader field and sentence without duplicating every pronoun. Regression: `test-friend-transit-reading-contract.mts`. |
| 3 / unsupported interpretation and editorial defects | Saved judges rejected invented week/year comparisons, unsupported interpersonal consequences, repetition, and low voice scores even when aggregate scores were high. | Preserve all release floors. Revision prompts restate the existing timing and temporary-condition evidence boundaries. Current owner evidence remains the writing authority. Success needs fresh governed generation and owner review; local prompt edits alone do not establish better prose. |
| 4 / adjacent premium-report exception | An invalid owner-voice evidence citation could fail after a critique was recorded as successful. | `report-writer-chain.ts` validates eligible citations within the existing metered response-retry boundary, before successful checkpoint persistence. Regression: `test-report-fulfillment.mjs`. This is not proof that the historical premium report has recovered. |

No calculation defect has been established by this investigation. One interrupted You job has an uncertain provider outcome; keep its checkpoint fail-closed and reconcile it before authorizing a fresh run. Do not reset checkpoints or raise time/call limits based on that single incident. Older jobs without checkpoints need new observed evidence, not an invented diagnosis.

The implementation owner is the repairing agent; the product owner controls billed batches, exact reader-copy approval, and release approval. Checkpoints are: synthetic regressions and the Content Studio API gate; review of the concrete patch; exact-head hosted checks before merge; then bounded, explicitly authorized live recovery. Exclusions are source-content rewrites, calculation changes, lower judge thresholds, broad UI redesign, and bulk regeneration of completed reports.

Completion requires a verified completed You Day, You Week, and Friends job, each with a persisted result identifier/body that opens in Reports. A representative pass validates that surface, not all ten failures: each affected job must be individually reconciled and its recovered result or remaining blocker recorded before claiming all failures fixed. Preserve entitlement, target window, governed facts, and billing history. Keep premium recovery separately tracked.

Diagnostic memory records symptoms, confirmed recovery defects, implementation paths, regression evidence, and unresolved production checks. It must retain provenance and stay ineligible as positive writer evidence. Raw failed prose and judge opinions never become broadly active writing rules automatically; reusable editorial corrections require the existing owner-review process.

Local verification on September 21: Content Studio API gate; typecheck of affected report modules; focused report correction, checkpoint, lifecycle, judge, schema, and delivery regressions; premium fulfillment regression; all 21 memory tests; privacy scan; and five browser tests from a fresh production build covering Reports and Friends saved-result transitions. The delivery tests exercise 21 synthetic pipeline cases. All model transports/storage used by those tests are fixtures. These checks establish local behavior, not actual provider writing quality, deployed memory freshness, or recovery of a production report.

## Horoscope period planning repair — September 27

Surface: Content Studio Horoscopes, `POST /api/admin/horoscope-writing`.
Writer v3 prepares each sign from the signed local-period brief and governed
planet/sign/house meanings in `horoscopeDevelopments.mjs`. The former reference
Sun/Moon remains an evidence-retrieval anchor, not a compulsory thesis. Calculated
ingresses join lunations and stations in new briefs; exact aspects remain outside
coverage. Existing Calendar and You lunar-only range callers retain their original
coverage through an opt-in calculation flag.

The canonical writer receives three complete eligible owner weekly passages,
scoped corrections, the saved Studio profile, distinct event meanings and local
times. Profile instructions develop emotional meaning without assuming biography
or imposing a confrontation/compromise narrative. The Supabase profile and edition
snapshot are live writing inputs; repository memory describes their relationship.
Private feedback from other families is not silently widened to horoscopes.

Generation retains one reserved provider call per sign, a persisted response ID,
source/profile/plan/request hashes, exact draft text and an immutable historical
check receipt. Fresh fact validation distinguishes a lunation from a reference
Moon and checks each named house against its own placement. Current facts replace
obsolete fact warnings at publication, while other historical checks remain.
No model approves voice, rewrites reader copy automatically or publishes it.

Actual-handler tests inspect every dispatched sign request and persisted receipt,
exercise old brief coverage, source completeness, wrong lunations/houses, multiple
dates against direct Swiss calculation and local time zones. Fresh browser tests
cover plan review, generation recovery, editing, publication and reader retrieval
with isolated storage/provider fixtures. These tests prove routing and persistence,
not that new live prose matches the owner's voice. A paid sample and exact owner
review are separate evidence; no new paid sample is implied by this repair.

## Lunar article workflow repair — September 27

Content Studio > Calendar Write-ups > New & Full Moons & Eclipses opens the
Dated articles & eclipses view by default. Events load for the chosen month and
time zone. Each event has a Write/Open action leading directly to its saved
writing plan. The owner reviews that plan before the single paid Generate draft
request; existing writing is never overwritten by opening an event. Reusable
sign readings and shared guidance remain available in the adjacent tab.

`lunationArticleHash` orders nested object keys before hashing so a PostgreSQL
JSON round-trip cannot invalidate an unchanged plan. Array order, exact source
text, factual edits, guidance revisions and scoped feedback still affect the
fingerprint. Old plans can be refreshed with Update writing plan.

The reader-draft handoff retains deterministic findings. Dated lunar publication
recalculates the event from the content key and validates the final title,
summary and body, including edits made in the reader editor. Client-supplied
facts or removed check metadata cannot authorize a factual error. Corrected text
receives a fresh publication check while the historical handoff check remains
available. Voice and cadence findings remain advisory; the owner decides prose.

Regression coverage uses the actual handlers with isolated storage and provider
fixtures, including reordered JSON objects, incorrect placements, forged facts,
corrected copy, direct and bulk publication. Browser coverage exercises automatic
event loading, event filters, plan review, generation, save/reopen and reader
handoff across desktop/mobile and light/dark themes. These checks do not establish
live model quality or authorize a paid sample or publication of owner content.

### Lunar background progress and recovery

Background result polling must not toggle the editor's foreground busy state.
Doing so repeatedly disables and re-enables controls while a valid stored
request is still running. Show a stable progress panel beside the generation
action, elapsed time, and the fact that reopening retrieves the same request.
Keep the empty article editor hidden until the request finishes; completion
loads the persisted body and focuses the article field for review.

Transient retrieval failures pause polling with an explicit same-request retry.
Terminal provider failures must reconcile the returned saved row, including
its cleared active request, before showing the error and restoring generation.
Leaving or switching drafts cancels pending client work so a late response
cannot replace a different open draft. Tests must exercise multiple pending
checks, reloads, retrieval errors, terminal errors and eventual completion;
an immediately completed simulated response does not cover this workflow.

## Daily and weekly editorial flow — September 27

Horoscope writer v4 extends primary owner sign-forecast retrieval to daily runs.
The complete eligible weekly passages supply voice behavior; daily instructions
name that adaptation explicitly and do not reuse their dates, stories or weekly
scope. External product examples are not ingested as positive owner evidence.
The saved daily and weekly Studio profiles control focused human subjects,
connected examples, brief specific astrology and earned endings, without a fixed
five-sentence formula. Publication windows select reading dates and do not imply
transit durations. Unsupplied exits, future events and personal history remain
outside factual coverage. Seasonal evidence selection remains unchanged.

Reader controls default to the available rising sign, offer a Sun-sign shortcut,
and preserve explicit shared URLs. Midnight refresh follows the selected location
and works when no edition was previously available. Both signs read the same
published twelve-sign edition; no second generation or personalized rewrite runs
in the browser. Existing drafts remain exact saved text. To use new profiles on
an existing edition, use its latest-instructions action or Reject all drafts,
then review the new plan before generation. Saving a profile alone never rewrites
or publishes an edition.

Verification is documented in `docs/content-management/horoscope-editions.md`.
Actual-provider input regressions use injected fixtures and do not establish the
quality of newly generated live prose. The owner remains the voice reviewer.

### Owner edit guidance and horoscope restart

Writer v5 uses the editable daily and weekly profiles to carry the owner's
requested principles for coherent imagery, direct human meaning and focused
examples. The existing writing call finishes the draft against those saved
instructions; no extra reviewer call, automated taste gate or new banned-word
list is added. Protected owner evidence is never compressed. Changing a profile
or writer version invalidates the prepared plan; old bodies remain unchanged until
the owner requests regeneration. Rejection preserves the exact former reading in
history and adopts the latest profile before preparing the replacement plan.

Do not describe this as automatic learning from horoscope edits. The current
private correction-memory scopes still exclude horoscope editions. A distinct
feedback control and scoped retrieval would need their own implementation and
verification. This update uses the existing saved-profile path explicitly.

## Seasonal voice and complete examples — September 30

Writer v6 supersedes the September 27 statement that seasonal selection is
unchanged. The owner supplied Pisces, Gemini and Virgo Season 2025 as positive
examples and authorized applying the seasonal voice plan. All 36 complete sign
readings already exist in the governed long-form owner corpus. A horoscope-only
adapter resolves registered spans in those originals; it does not rebuild the
discarded voice subsystem or replace the global voice index. Each seasonal sign
receives its three matching complete readings, with exact hashes and word counts.
Missing, changed, duplicate or incomplete registration fails before generation.

Editable Voice, Structure, Sources and Prompt fields remain the execution path
for owner preferences. Preserve the seasonal 450–600-word editorial target and
existing owner word choices while permitting short openings, early astrology,
questions, connected lists, varied cadence and developed emotional meaning.
Do not convert every passage into an administrative task or fixed advice ending.
Complete primary examples and the saved horoscope profile take precedence over
general long-form sentence-length preferences. Factual boundaries and exact
owner publication approval still apply. Source dates and stories are historical
prose evidence, never the new edition's calculated facts.

The provider receives one sign per call. Remove instructions claiming it can
compare all twelve unseen readings; that comparison is available to the owner in
Content Studio's complete Publish-stage preview. Finish the individual draft
within the existing writing call. No paid judge, automatic revision loop or
prose-quality blocking heuristic is introduced. Applicable shared principles
also reach daily and weekly profiles without changing their own formats.

Profile updates must use optimistic concurrency and exact readback verification.
Existing edition snapshots and reader bodies remain unchanged until explicitly
refreshed or regenerated. Record source/profile/plan hashes in the existing
receipts. Memory records this behavior; it does not itself update saved profiles,
approve wording, or enable automatic learning from horoscope edits.

Regression coverage verifies complete evidence, all twelve actual seasonal
provider payloads, one request per missing sign, profile snapshot preservation,
explicit profile refresh and plan invalidation using isolated storage and provider
fixtures. These checks establish routing and persistence, not live prose quality.

## Seasonal meaning and dated developments — September 30

Owner direction adds the existing knowledge-base zodiac-season and learning-axis
material to seasonal horoscopes. Writer v7 resolves the exact complete entries in
`sign-season-content` and `sign-axis-tensions`, preferring the latest saved shared
Studio source draft, then the live row, over the original editorial source bank.
Archived rows are excluded; an empty saved source or storage failure does not
authorize falling back to older prose. No source text is rewritten or published.

The calculated season sign selects both sources. All twelve audience signs use
that same season/axis with separately calculated whole-sign houses. Meaning text
has its own provider section, distinct from calculated facts and complete primary
owner prose examples. It may deepen interpretation without imposing one lesson,
conflict or repeated paragraph on the edition. The symbolic opposite sign is not
an invented transit, aspect, lunation or personal history.

Plan/source hashes include the selected source identities, versions and exact
bodies. Receipts preserve these sources through asynchronous polling, even when
an owner edits a source after a request starts. Full plan details exposes the
complete evidence before generation. Daily/weekly source selection is unchanged.

The owner's first-mention calendar-date guidance also supersedes the old seasonal
numeric-date prohibition. The provider uses supplied dates in the edition's zone;
the fact validator accepts these dates and checks explicit event/date associations
within its documented language coverage. Clock times remain separately rendered.
Saved seasonal profile updates preserve owner wording and use optimistic version
checks plus exact readback. Existing edition profile snapshots and reader bodies
are not replaced automatically. These changes add no judge, retry loop, source
publication or automatic horoscope generation.

### Seasonal publication claim parsing — September 30

Fact validator v4 recognizes First and Last Quarter Moons as their calculated
lunation events, including leading-sign phrasing. It no longer compares those
events with the reference-instant Moon. Seasonal date checks associate dates
within coordinated event clauses before using proximity, and recognize
"stationing" as well as "stations". A numbered house may be repeated without
renaming its planet only after that house has passed an explicit placement check
in the same paragraph. A newly named body always receives its own factual check.

This is bounded language recognition, not a claim of general prose understanding.
Dates still use the edition's time zone and supplied events. Unsupported phases,
signs, houses and event/date combinations remain blocking. Publication recomputes
facts under the current validator while retaining the historical receipt and
non-factual findings; no saved horoscope wording is rewritten or regenerated.

The actual-handler regression `test-horoscope-publication-claims.mts` reproduces
the former publication refusal with synthetic copy, verifies exact persistence
and reader eligibility, and rejects incorrect claims and stale writes. The
matching fresh-build browser flow publishes and reloads the full saved reading
using isolated storage and no model calls.


## Seasonal relational depth and required punctuation (2026-10-01)

Owner direction in [the horoscope task](thread:01a0ce6e-69e0-7100-bdba-ad413d5c7804)
requires deeper seasonal interpretation and prohibits em dashes. Writer v9 now
supplies event-time major aspects, their orb and applying/separating state,
traditional season and lunation rulers, and simultaneous T-squares. Each
participant retains its own calculated whole-sign house. Coverage is explicit:
no invented historical recurrence, earlier cycle pass, unsupplied configuration
or whole-season duration may be inferred.

The explicit punctuation prohibition is a narrow blocking owner constraint for
horoscope headlines and bodies, qualifying the general advisory style policy.
It does not turn other prose preferences into automatic quality verdicts. The
single writing call is told to recast prohibited punctuation before returning.
An output that still violates the requirement is held in private correction
metadata and can be edited without a second paid call. New or changed reader
fields and publication enforce the rule, including encoded forms and quotes.
Original sources and existing saved copy are not automatically rewritten.

Depth guidance asks for relationships, mechanisms, consequences and meaningful
distinctions, not extra keywords, examples or rhetorical intensity. The complete
owner passages remain the voice evidence. The owner judges new prose; these
calculations and deterministic checks do not certify literary quality. Saved
Studio instructions are separate private revisions, not Memory Graph prose.
See the horoscope writing Studio runbook for adoption and recovery.

## Automatic horoscope profile adoption (2026-10-01)

The owner's [horoscope task](thread:01a0ce6e-69e0-7100-bdba-ad413d5c7804)
asks to remove prompt re-entry and manual profile adoption. This supersedes the
earlier manual latest-instructions step: the authenticated horoscope prepare
action now adopts the latest saved profile for an idle edition with optimistic
concurrency and returns its confirmed row version and plan together. Generation
rechecks the saved profile before reserving a paid request. A changed plan needs
ordinary generation approval; it cannot run under stale approval.

Preparing instructions makes no model call and changes no reader text, facts or
per-reading historical receipt. In-flight requests and polling keep their original
profile and request identity. A failed profile read blocks fresh preparation or
generation, while retrieval of an existing response remains independent. Exact
rejection history and publication approval are preserved. The actual-handler test
`test-horoscope-latest-instructions.mts` covers all four periods; Monthly browser
coverage checks reopening an older edition and generating from its updated row
version. Tests use isolated storage and simulated responses, not paid generation.

## Monthly meaning fidelity and profile authority (2026-10-02)

Writer v15 separates the Monthly starter from Seasonal. The saved private
profile remains the editorial authority. Monthly scope no longer inherits a
permission-style ending from sign-reading scaffolding, and output-format
instructions do not repeat the profile's entire TLDR/prose review. The existing
synthesis stage preserves each development's particular meaning and consequence;
it must not replace sustained energy with audience approval or infer a hidden
motive from an external limit. No new model stage or automatic prose verdict is
introduced.

The owner authorized a full Monthly repair in the
[horoscope task](thread:01a0ce6e-69e0-7100-bdba-ad413d5c7804).
Private profile cleanup preserves the newer saved Voice, complete selected
comparison units and the three complete primary 2025 essays. Overlapping earlier
comparison variants and a locked historical TLDR leave the active request but
remain in protected history. Exact passage corrections retain their narrow
scope. Existing readings and in-flight requests are never rewritten by a profile
update. See [Monthly acceptance](../qa/horoscope-monthly-overview.md).

Provider-input and workflow checks establish delivery, not literary success.
Any paid passage comparison requires its own authorization and retained request
receipt. Only the owner can approve the resulting prose.

## Monthly response-budget repair (2026-10-02)

A saved Monthly prose attempt exhausted its 12,000-token allowance after using
11,302 reasoning tokens. The request inherited the general writer's extra-high
reasoning setting even though a separate synthesis had already planned the
month. New Monthly prose requests now explicitly use medium reasoning with the
same model and 12,000-token ceiling. Planning remains medium with 6,000 tokens.
This is a bounded configuration repair, not a guarantee of future completion or
prose quality. [OpenAI's reasoning documentation](https://developers.openai.com/api/docs/guides/reasoning#controlling-costs)
confirms that reasoning and visible output share the output allowance.

Existing operations retain their reserved settings. An explicit fresh retry uses
the corrected configuration and reuses a matching validated synthesis; progress
checks never create a new request. Truncated output remains a private failure,
not a completed or publishable reading. Studio dates the saved failure in the
edition's time zone, including after the writing plan changes.
The original failure, diagnostic and saved reader text remain intact.

Actual-handler regressions reproduce the reasoning-heavy incomplete response,
preserve the old operation settings and confirm one-stage retry without paying
for unchanged planning again. Browser regressions check the dated error after a
profile change, explicit retry approval and complete save/review/publication flow
with isolated storage and simulated responses. No paid generation is implied.

## Saved horoscope failures are history (2026-10-02)

Reopening or checking an idle failed edition puts its saved diagnostic in a
collapsed **Previous attempt** disclosure, rather than restoring a current red
alert. A newly observed terminal failure still produces an immediate alert.
Refreshing does not erase the diagnostic, clear a reservation, or generate text.
The current plan and explicit retry approval remain the way to start another
request. Browser regressions cover Monthly and seasonal failures, legacy
diagnostic retrieval, unchanged storage and request counts across reloads, and
fresh failures remaining visible. Existing shared disclosure styles are reused.

## Monthly developed-reason correction (2026-10-02)

The owner rejected the next complete Monthly result and requested one targeted
Voice instruction: develop the reason a person remains caught in a contradiction
instead of stacking balanced contrasts and short conclusions. Save that exact
direction in the private Monthly profile. Preserve complete primary essays and
selected comparisons; rejected prose remains negative history, never a positive
voice example. No automatic rewrite, prose approval or paid evaluation follows.

The active profile retains the scoped October forecast and Taurus paragraph
openings. The earlier historical TLDR lock was removed by the profile-authority
cleanup above; this correction does not reinstate it. A claim that the current
output violated a verbatim TLDR lock must first be checked against the actual
saved request. Profile delivery and successful completion do not establish voice
quality. The owner still judges the next exact prose.

## Horoscope run variables (2026-10-02)

The owner requested real support for five extra prompt variables in the
[horoscope task](thread:01a0ce6e-69e0-7100-bdba-ad413d5c7804), rather than removing
them from the Monthly template. Writer v16 supplies selected complete primary
and supporting owner prose, active marked comparisons, selected and saved scoped
corrections, and the current governed facts at those variable positions. The
four editorial variables remain required; run variables are optional and used
once. Unknown variables remain errors.

This changes assembly, not evidence selection or editorial approval. The saved
Source Guidance remains byte-identical; only its marked comparison/correction
sections move in the assembled request, avoiding duplicate full passages.
Complete comparison hashes are verified. Editor previews label future run data;
actual generation requires the selected evidence and calculated facts. Existing
requests and saved readings are unchanged. No paid generation follows from saving
a profile. See the prompt-authority acceptance record for fixture coverage.

## Horoscope startup recovery (2026-10-03)

Single-stage horoscope writing prepares the full governed request before its
first durable reservation. The request hash and operation are saved together
with optimistic concurrency before any potentially billed call. This removes
the earlier half-prepared reservation that could survive a preparation or
second-checkpoint failure without a retrievable response ID.

A caught dispatch exception without a response ID preserves the complete request
identity and sanitized diagnostic in `heldRequests`. The approved batch can
continue its other signs, but the held sign cannot be generated again without
explicit acknowledgment and fresh plan approval. Releasing a held request does
not itself generate anything. Known response IDs receive one conditional save
recovery attempt, then use ordinary retrieval.

Progress checks reconcile legacy/crashed startup reservations after 310 seconds,
beyond the handler's 300-second maximum. A reservation without a request hash is
archived as not dispatched; an uncertain dispatch is held without automatic
replay. This qualifies the earlier rule that progress checking never changes a
reservation: it may now reconcile an expired startup, while preserving all
writing and request history. It still never starts paid generation.

The original production exception was not retained, so its exact infrastructure
cause remains unverified. New records retain the failed lifecycle stage, status,
safe error category and time. See the [startup recovery acceptance record](../qa/horoscope-startup-recovery.md).

## Horoscope session renewal and recovery (2026-10-06)

Horoscope operations resolve the current owner session before each request,
including result polling, rejection and saving. A token rotation for the same
owner must not abort the generation loop or reopen the editor. An account
change still stops work. The server remains responsible for token verification
and owner authorization on every request.

Session refreshes share a promise within the tab and the installed Supabase
client's storage lock across tabs. Refresh writes include a new expiry derived
from `expires_in` when necessary and cannot overwrite a newer sign-in or restore
a signed-out session. Refresh transport failures have deadlines and remain
separate from rejected credentials.

One authentication retry is allowed only after the server's explicit
`content_admin_unauthorized` marker from `requireContentAdmin`, before storage
or provider dispatch. It uses a renewed token and the same request body and
version. Unmarked failures, timeouts and lost responses never authorize replay.
A rejected session stops background polling, clears the progress message and
links to sign-in with the saved edition as the return destination. Checking
saved progress after sign-in retrieves the existing response.

Regressions cover the real authorization handler, current-token selection,
refresh concurrency and expiry, denied accounts, no replay after uncertain
responses, a batch continuing through token rotation, exact reject-all history,
and saved-response recovery after failed renewal. Browser mutation tests use
isolated storage and provider fixtures. They do not authorize paid generation
or establish writing quality.
