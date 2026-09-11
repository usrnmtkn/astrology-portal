# Daily Sky Summary event grammar

Owner request: current task `01a08b82-0b3a-77d2-90fd-cfc0a527231a`, 2026-09-10.
The complete replacement Virgo New Moon clause is preserved with its SHA-256
and word count in `docs/content-review/sky-summary-owner-revision-2026-09-11.json`.
Publish that exact clause through Content Studio. The Sun source is unchanged.

## Reader contract

- The Sun and Moon meanings have separate sentences, with complete calculated
  placement links. The current lunation uses its own event-specific Moon source.
- Ingresses and stations precede exact aspects. Empty groups produce no paragraph.
- One/two/three-or-more exact aspects have separate agreement rules. Ingresses
  distinguish one from multiple. Counts and lists are computed, never pasted
  from an example date.
- Join a single retrograde station to the current Rx count only when its exact
  timestamp is at or before the snapshot timestamp and its planet is in that
  snapshot's retrograde list. Future, direct, multiple, unknown-time, and
  unmatched stations keep an independent sentence.
- An unchanged Rx list follows the events as background. It never interrupts
  the Sun/Moon opening. No importance score is invented for individual aspects.
- Preserve complete approved ingress TLDRs when available; never shorten owner
  passages to force the example's paragraph length.
- Former exact default templates normalize to current wording in Studio and
  the reader. Preserve genuinely customized templates. Reject new assembly
  wording containing “Also today,” “There is/are,” or “Today brings.” The
  legacy JSON is migration evidence, never the default reader template.

## Verification on future updates

Run `npm ci`, `npm run build:knowledge`, `npm run test:sky-daily-summary`,
`npm run test:content-studio-api`, `npm run typecheck`, and `npm run qa:css-audit`.
The event-grammar test asserts the full owner example, cardinality, chronology,
source integrity, saved-template migration, and custom layout omissions.

Run the fresh Studio browser suite and the daily summary, paragraph, supplied
copy, and Sky placement aspect browser tests. Check desktop/mobile and both
established themes. Verify the real production route after main's deployment;
for the owner's New York example use September 10 locally while keeping the
September 11 UTC lunation link. Confirm exact revised Moon and unchanged Sun
wording from the live reader and reopen the published Studio source.

## Measured release size

The fresh build with CI's Supabase configuration measures 422,509 bytes of
startup JavaScript and 470,706 bytes including startup CSS (CI measured 422,512
and 470,709). The new shared grammar, station timestamp guard, and exact former
default migration exceed the previous caps by 509/456 bytes locally. Allocate
1,000 bytes to each startup cap for this requested behavior. All CSS, total
JavaScript, and per-route caps stay unchanged; no dependencies or source banks
were added to the reader. `npm run qa:bundle` must still pass.

The Linux desktop Sky baseline was reviewed and refreshed from CI run
34565031251 on the privacy-cleaned synthetic fixture after the intentional
sentence/paragraph changes. Both CI attempts produced the same result. The wheel and
navigation are unchanged; the taller summary moves the following cards down.
The dark Sky baseline is a controlled loading state and stays unchanged. No
screenshot tolerance or assertion was relaxed.

CI's eclipse regression reached the initial Moon before its event-time
calculation completed within the default five-second DOM assertion window.
The same test passed three fresh local repetitions. Its initial reader-copy
assertion now uses the existing 15-second reader readiness budget, retaining
all exact eclipse wording, exclusion, and link assertions. No application
selection or calculation logic was changed for this test timing correction.

The combined transit editor repair defers its reader preview component. The
configured standalone admin entry measures 624.5 kB raw / 177.9 kB gzip, so the
original admin caps remain unchanged. The combined reader boot measures
422.8 kB JavaScript / 471.0 kB with CSS and passes the documented reader caps.
Both built bundles and the public-download privacy scan pass.

The inventory recovery regression also used a five-second DOM wait while
injecting two invalid responses, real retry backoff, and paginated loading of
the saved inventory. Both starting destinations passed three fresh repetitions
(six total) with the existing 15-second readiness budget. Recovery waits now
use that budget; three-attempt limits, content visibility, persistent-failure
handling, manual retry, and browser-error assertions remain unchanged.

## Combined release verification

The combined release is PR #759, stacked on privacy remediation #756. Exact
code revision `009110d8363ba988786e80c96adad048cf17bcba` passes the full API
suite, 24 standalone summary Studio cases, the summary source/grammar matrix,
Node/browser/shipped transit parity, CSS audit, and typecheck. The four Lilith
editor variants passed twice on fresh builds. CI's deterministic comparison
receipt refresh is retained in commit `9461f81e`. No source prose was changed.

The full content suite is not green on privacy base `845f16da`: the historical
natal-aspect metadata projection in `test-natal-exact-copy-routing.mjs:49`
does not match its pinned hash. Neither that test nor its source/review inputs
is changed here. Main before privacy cleanup also fails the historical Friends
signoff checksum. These failures are recorded, not waived or re-approved.

After a bot-generated commit, rerun the required API workflow on the new exact
head. Production verification of the merged code remains required before this release can be described as live.


## First-save publication regression

Live UI verification found that creating the approved Virgo New Moon summary
saved a `LIVE` serving row without a publication ledger identity. The create
handler omitted `x-content-publication-action: publish`; update and revision
publication already sent it. The existing database trigger intentionally refuses
to create or replace publication identities without this explicit instruction.
The fix adds it only after the normal publication validation passes, and only
for a created LIVE row. No database gate is weakened or migration changed.

The API roundtrip suite now sends the actual create handler's headers through
the production SQL trigger in isolated PGlite, then verifies ledger identity,
Content Studio reader status, and the browser serving loader. It covers both
Save draft and first Save & publish. Before the fix, it fails because no
publication exists; after the fix, all three reader checks must agree. Keep this
case in `npm run test:content-studio-api` for future repository updates.

The exact owner-approved New Moon body was saved to
`cms/sky-daily-summary/moon/virgo/newMoon` through authenticated Studio. A normal
republish of the saved revision repaired its missing publication identity;
the reader-status check now confirms this exact wording is available to readers.
The Sun body and transit hooks were not edited.

CI's first combined summary job passed its 30 reader and 24 Studio browser
cases, then failed the entry bundle cap. Deferring the publication readiness
panel until an editor opens reduces the configured entry to 622.0 kB raw /
176.8 kB gzip. The original admin budgets remain unchanged.
