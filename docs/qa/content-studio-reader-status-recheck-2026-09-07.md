# Content Studio reader-status recheck

## Trigger and missed coverage

The owner showed the live Sun-in-Virgo Daily Sky summary opening as a new
"Not live" CMS draft. The previous verification covered saved rows and V3
package mirrors, but did not assert the editor status of installed Daily Sky
copy before a CMS row exists. Passing those tests did not establish Studio-wide
status parity.

## Confirmed defects and corrections

- Daily Sky defaults were absent from the server's live-copy inventory. The
  status API now compares all 31 catalog fields with the same installed defaults
  used by the reader, then applies current publications and retirement.
- Opening installed copy created an unsaved row whose status was unconditionally
  Not live. Unchanged installed wording now requests its actual reader status;
  different unsaved writing remains Not live.
- Supplied working copy could replace newer installed wording in the editor.
  Current installed wording takes precedence; supplied unpublished wording remains
  a draft where no installed copy exists. No astrology prose was rewritten.
- CMS surface editors retained a mandatory save-then-publish sequence. They now
  offer Save & publish for new and existing rows, with Save draft as an explicit
  alternative. Package-specific approval and held-source gates remain in place.
- Daily Sky bypassed publication retirement and could reveal local wording when
  the current publication was unavailable. It now observes retirement and exact
  publication identity. Removing a timing passage keeps the remaining summary
  valid, without restoring old prose.
- Ordinary saved-row status could bypass the publication callback. Eligibility
  now requires the selected publication record.
- Cached status comparisons discarded PostgreSQL microseconds. They now use the
  shared publication timestamp comparison.
- Current Sky status requests unnecessarily loaded the entire legacy partition.
  With the initialized ledger, they read only requested rows, matching keys, and
  publication identities. The compatibility path remains for uninitialized stores.

## Verification

- Full Studio and offline suite: 76 browser tests passed. This includes repeated
  saves, source lifecycle, Live filters, source maps, Empty Houses, Sky selectors,
  and offline retirement.
- Daily Sky browser suite covers desktop/mobile and light/dark states, unchanged
  builtin copy, separate unsaved drafts, first publication, second publication,
  reload, and retirement/unavailable-publication behavior.
- Status contracts cover 23 shipped lunation macros, 439 Calendar exact-aspect
  rows, all 31 Daily Sky fields, ordinary rows, personalized rows, package
  overrides, and authenticated endpoint behavior.
- All 144 Sun/Moon combinations compare Studio assembly with the reader.
- Publication contracts cover Node, browser source, shipped resolver artifacts,
  Sky source isolation, current identity, and Daily Sky retirement.
- Admin/web typechecks, CSS/token audit, and production-style Node API startup
  passed.

These checks cover the listed paths and states. They are regression evidence,
not a guarantee that every possible content combination is defect-free. No live
owner content was edited to perform the tests.

## Integration with the subsequent Sky release

Rebased onto PR #679 and preserved its owner-approved finite-verb wording,
linked placements, selected-day events, ingress editing, and reader-only
Composition Map. The combined 12-test Studio browser suite passed. Status
comparison follows the reader's explicit approved-wording migration. The new
ingress-summary fallback also observes retirement and current publication
identity, with regression coverage for older TLDR suppression and republish.
