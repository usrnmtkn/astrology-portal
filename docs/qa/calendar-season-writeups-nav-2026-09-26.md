# Calendar season write-ups navigation

The owner requested a side-navigation entry for the full season readings shown
by the Calendar season label and event drawer.

Calendar Write-ups now includes **Season write-ups** in both the sidebar and
workspace tabs, at `#calendar-writeups?view=season-writeups`. It reuses the
existing passage table and editor, restricted to `authored/lunar-journal/season/`
rows. Sign, text and publication filters work without selecting a writing job
or content family. Exact-source links open the new view and the same full
passage editor. Short season transitions retain their separate view.

No reader copy, source keys, selection rules, publication logic or calculations
changed. Browsing does not create or save rows.

Validation in an isolated checkout with its own `npm ci`:

- Full unfiltered Content Studio API suite passed.
- Admin typecheck, CSS/token audits, browser-suite coverage and Calendar catalog
  wiring checks passed.
- Fresh web build and 13 targeted browser cases passed: 4 new season-navigation
  cases, 4 existing lunar-ingress cases and 5 season-transition cases.
- New cases cover mobile/desktop, light/dark, sidebar active state, selected-tab
  visibility, exact complete Libra passage/editor text, direct source links,
  reload, empty results, filter reset, no storage writes, runtime errors and
  overflow. Heading order and computed sidebar/table-label typography match
  the established components. Populated and empty screenshots were inspected.
- The initial mobile assertion attempted to inspect a navigation menu that had
  correctly closed. The test now reopens the menu to check its selected state;
  all four new cases passed unchanged product code on a second fresh build.
- Web bundle budget and public asset privacy scan passed.

Hosted exact-head API checks and the main deployment are recorded in the PR.
Production browser verification uses isolated storage; live editor verification
is read-only and does not change the owner's saved writing.

The hosted forecast suite also asserted the former six-entry navigation list.
Its exact expected list now includes Season write-ups in both the sidebar and
tab strip. All eight forecast browser cases passed against a fresh standalone
Studio build, bringing local affected browser coverage to 21 passing cases.
A remote preview automation attempt was blocked by Vercel SSO before reaching
Studio; deployment protection was left intact. The signed-in browser verified
the new preview sidebar, while complete saved-row verification is reserved for
the public production alias and the owner's existing Studio session.
