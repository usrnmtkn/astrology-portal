# Daily Calendar drafting

Content Studio → Calendar Write-ups → Daily writing keeps the daily Moon
paragraph separate from New/Full Moon articles and horoscope profiles. The
owner's private instructions and complete references are stored in a DRAFT,
reference-lane row with an empty reader body. No source documents belong in Git
or the public bundle.

Choose a date and time zone, save its thought and exclusions, then preview the
complete writer input. The server computes Moon sign durations and exact ingress
timing using Swiss Ephemeris and binds the request to the saved profile version.
The brief also includes the shared Calendar's exact events for the selected
local day and, separately, the next local day. Reference placements carry their
instant and exclude houses. The writer must distinguish an event exact today
from an approaching event exact tomorrow, and obey the saved length/output
contract and current owner rules. The underlying event scan and other writers
are unchanged.
Daily retrograde status rows do not become timed events: their direction remains
in reference placements, and their synthetic midnight starts are excluded.
The reference Moon phase label likewise does not establish a new phase event.
The owner explicitly authorizes one call from that preview. No planner, evaluator,
retry, alternate candidate or automatic publication follows. Request reservations
prevent concurrent dispatch; an uncertain response remains reserved. Retrieval
checks the same stored provider response. Untouched valid and invalid results,
requests, reference provenance, hashes and usage remain private for owner review.

Each completed result has **Review & edit**, which opens the existing dated
Calendar passage editor with the exact date, time zone and selected result ID.
The editor loads that result through the owner-only writing endpoint and verifies
its saved workspace, completion state and calculated date before showing its
complete candidate. Invalid, missing or mismatched results fail without opening
an editable passage or changing saved content.

The writer operation remains immutable. The owner edits a separate
`calendar-passage/daily/{date}/{encoded-time-zone}` draft and uses the existing
**Save draft**, reader preview, **Publish passage**, history and retirement
controls. A saved or published passage is retained when another result opens;
using the selected result requires an explicit choice before saving. Reloading
keeps saved owner edits. Draft saves use the existing exact-version checks, and
publication follows the existing owner-action transaction and public reader
gates. Only passage wording and a small source receipt cross into the Calendar
draft; private prompts, profiles and provider responses stay in Daily writing.
Opening a result, editing or saving cannot generate another paid call.

Validation:

- `npm run test:content-studio-api` includes the actual daily handler, access
  matrix, version conflicts, explicit approval, latest-input binding, concurrent
  dispatch, recovery, invalid results and publication denial with a mock provider.
  The same regression opens a selected result, creates its separate passage,
  checks stale writes and explicit publication through the actual content API,
  verifies reader admission and retirement, and retains the original operation.
- `npx playwright test -c playwright.lunation-studio.config.ts tests/visual/calendar-daily-writing.spec.ts`
  builds a fresh Studio and checks navigation, empty/saved states, full reference
  persistence, calculated preview, edits and conflicts on mobile/desktop in both
  themes. It also opens completed results, preserves existing edited passages,
  saves/reloads edits, publishes, checks the normal reader projection and preview,
  and retires the date-only passage. It makes no paid provider calls.
- The calculation cases include a late Leo → Virgo ingress, a full Virgo day,
  DST days and a positive UTC-offset zone.

Release verification must confirm the main deployment, private source hashes,
unchanged unrelated profiles, unauthenticated denial and owner-visible saved
settings. This is workflow verification, not a claim about generated prose quality.
