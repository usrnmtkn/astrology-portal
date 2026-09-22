# Create a missing exact Calendar aspect write-up

Owner request on September 22: an absent five-value Calendar aspect must be writable
from the selected planet, sign, aspect, other planet and other sign. This change is
based on main `a62a1b049ed918f3130fe7b2835461c7d859c374`.

## Behavior and boundaries

The Calendar Aspects workspace offers Add write-up for a complete selection. It
opens a blank draft with its complete sign-specific title and identity. The Create
menu uses the same action. Incomplete selections remain useful optional browsing
filters; creation does not require changing the browsing contract.

Before opening a new draft, Studio reads all saved versions of the six supported
identity spellings (three key families, either planet order). An existing hidden,
archived, or packaged entry opens for editing. A failed lookup leaves creation
unstarted and allows retry. Canonical planet/sign ordering prevents a reversed
selection from creating another identity, and storage conflicts cannot overwrite
a competing save. No existing generic three-value passage is rewritten.

New copy remains DRAFT until the owner saves, runs writing checks and explicitly
approves the saved version. Approval now clears the manual draft's metadata review
hold so the approved row can actually reach readers. Save preserves the manual
author metadata (also used by the cron overwrite guard), and the public reader
adapter retains the saved LIVE status required by the aspect selector. The Calendar prefers an
eligible owner-authored five-value passage over generic three-value writing.
Existing governed composed-card publications retain their established priority.
Named North/South Node identities and the legacy nodes identity remain distinct;
reader lookups preserve canonical point/sign pairing and the older key aliases.

No astrology prose, calculated placements, source approvals, or production
content rows are supplied or changed by this implementation.

## Verification

- `npm run test:content-studio-api` exercises the actual handlers with isolated
  storage, including new draft creation/read, duplicate refusal, writing checks,
  version-bound approval, reader admission and exact selection. Cases include the
  reported Moon/Aquarius square Venus/Scorpio, reversed selection, Lilith and nodes.
- `test-admin-calendar-aspect-sources.mjs` checks canonical creation, blanks,
  identity aliases, invalid selections and the existing optional-filter matrix.
- `calendar-aspect-create.spec.ts` uses real handlers with isolated storage and the
  deployed reader projection. It covers missing/create/save/reopen/check/approve,
  generic-vs-specific selection in the Calendar card/detail, unavailable lookups,
  hidden archived entries across all six key spellings, and optional partial
  filters. The viewport/theme matrix is 390/1440 pixels, light/dark. It checks the
  editor's semantic heading level, visible label order, computed typography against
  an existing editor, and horizontal overflow. Screenshots are local test artifacts.
- Existing Calendar tab-retention, signed-title/filter and Review Queue flows are
  regression coverage. Web/admin typechecks, CSS/token audit, reader-copy boundary,
  public-asset privacy and bundle checks remain release gates.
- Production verification is read-only. Browser and API mutations in these tests
  target isolated fixtures, never owner production records. Exact commit/check and
  deployment receipts are recorded on the release PR.

The fresh local create/reader and tab-retention run passes all 14 cases. The
existing composed-card routing (24 cards) and exact Calendar routing (758
directions) also pass. Both application typechecks and the complete CSS audit pass.

## Measured bundle allocation

Separate npm-ci checkouts built main and the feature using the workflow's public
Supabase placeholders. Standalone Studio entry changes from 743,783 raw / 216,973
gzip bytes to 747,275 / 217,912; aggregate Studio JavaScript changes from 731,852
to 732,804 gzip bytes. The new caps are 747,500 raw entry/largest, 218,250 entry
gzip and 733,250 aggregate gzip bytes.

The complete web aggregate changes from 3,457,136 to 3,458,170 gzip
bytes. Its aggregate cap increases from 3,457,500 to 3,459,000. Every reader
startup, CSS, individual deferred chunk and forbidden-payload limit stays unchanged.
No dependencies or new content payloads are added.

### Integration with the later main update

Main advanced to `058583c62` during release. All 23 targeted browser cases and the
full API contract pass after the clean rebase. Its new Sky summary import pulled
the complete seasonal catalog into startup: an independent build of unchanged
main measures 471,011 app boot / 524,497 reader boot bytes, above existing caps.
Move the twelve existing bridge passages and identity helpers into a lightweight
module, keep the old exports compatible, and import that module from Sky. The
bridge/helper bytes and complete seasonal catalog compare exactly with main;
all-sign bridge, handoff catalog and Calendar summary tests pass. Regenerate the
Studio variable index to include main's new `sunTransitionPlacementLink` slot.

The final web build uses 458.7 kB app boot / 512.2 kB reader boot, inside unchanged
startup caps; total JavaScript is 3,459,541 bytes versus clean main's 3,457,742.
Allocate 1,000 additional aggregate bytes (3,460,000 cap) for the inherited change
and module compression cost. Standalone Studio measures 748,125 raw / 218,126 gzip
entry and 734,427 aggregate, versus main's 744,640 / 217,198 / 732,510. Its final raw
entry/largest cap is 748,500, entry gzip remains 218,250, and aggregate is 734,750.
No runtime CSS, dependencies, calculated facts or source wording change.

## Pre-existing broader test failures

The optional `test:sky-aspects` aggregate does not pass on the untouched baseline:
Node 22's strip-types runner cannot resolve `calculation-api.js` from a TypeScript
import. Running the adapter with `--import tsx` passes. The integration test then
asserts an obsolete judge-prompt sentence, and the hydration script asserts the
old direct `.in("content_key", batch)` transport. Both source assertions were
reproduced in the clean main checkout at the baseline SHA. They are not reported
as passing. The actual new-draft API/reader selector and rendered Calendar flows
verify the affected behavior independently. Matrix/ephemeris parity, exact Calendar
routing and the cron-entrypoint test pass. The separate major-exact completeness
script also fails on untouched main because its stored Moon/sextile/Lilith copy
differs from its expected owner projection; this change does not alter either
source passage.
