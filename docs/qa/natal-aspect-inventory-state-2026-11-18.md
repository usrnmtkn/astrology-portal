# Natal inventory preview state

Read-only production acceptance of PR #1507 on main
`ce3347038e6796a3f2048ba14bd5823a304a67df` confirmed the editing controls and
all six native Sun–Moon entries. It also caught a preview defect: a metadata-only
native row reported empty copy before its complete saved document loaded.

`studioListingRow` intentionally omits body, sections and other copy, marking the
row `inventory_only`. Those omissions are not evidence that writing is missing.
The finder now asks the owner to open that row to inspect saved fields. Hydrated
saved/empty documents and known virtual package records retain their coverage
labels. Source lookup, editor fields, publication, owner copy and privacy rules
are unchanged.

The existing actual-handler/shipped-App regression also renders the actual
finder with the real listing projection. It checks native and exact rows before
and after hydration, genuinely empty documents, and known virtual package copy.
An initial browser assertion expected an unloaded fixture after it had already
hydrated; that timing-dependent assertion was removed. Existing mobile/desktop,
light/dark editing, publication and reload flows remain intact. Current-head
browser/build results and every required exact-head gate are recorded in the
follow-up PR; no earlier failing result is waived.

All write tests use isolated fixtures. Production checks remain read-only and
use a fresh tab, preserving the owner's existing tabs and unsaved work.
