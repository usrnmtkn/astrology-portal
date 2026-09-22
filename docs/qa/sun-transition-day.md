# Sun transition days

On September 22, 2026 at 2:52 PM in New York, the Sun is still in Virgo.
The calculated Libra ingress is `2026-09-23T00:05:14Z`, or 8:05 PM EDT.
The previously released Calendar season fix was live in main `f257fbe09`.
The remaining issue was explanatory: Sky said only “Sun enters Libra today,”
and Calendar's introduction did not explain the change later that day.

Sky and Calendar now use one before/after factual template, shown ahead of
the existing complete Sun interpretation. The calculated ingress supplies
the outgoing sign, incoming sign, local time and event identity. The template
changes tense at the exact ingress and appears only on its local civil day.
Both templates are registered in the existing Sky summary Studio catalog,
with required sign/time slots and the normal draft/publication boundary.
No stored interpretation, approved source row, calculation or publication
policy changes. A same-day lunation retains its separate geometry check;
its event-time Sun cannot advance the current placement on a transition day.

Sky's initial Today selection and midnight rollover also use the selected
location's zone. The new browser regression reproduced the old UTC-browser
rollover advancing New York to September 23 before its evening ingress.
Calendar continues to own its explicit selected date. Historical selections
retain the existing local-noon policy.

Verification from an isolated checkout with its own dependencies:

- Direct Swiss calculations on both sides of September and December ingresses
  across New York, UTC and Tokyo; existing year/midnight/DST date contracts.
- Shared template tests: exact boundary, local day, missing facts, event link,
  no duplicated untimed Sun event, complete interpretation, same-day lunation,
  editable sources, draft exclusion and required variables.
- Actual Studio handler using isolated synthetic storage: create draft,
  reopen, publish, reader retrieval, exact full template and stale-write refusal.
- Full Content Studio API suite, web/admin typechecks and builds, summary
  contracts, CSS audit, bundle budgets and built-web privacy scan.
- Fresh-build browser cases cover mobile/desktop and light/dark, Sky and
  Calendar, both sides of ingress, placement cards, event links, reload,
  focus recovery, automatic boundary refresh, local midnight, Calendar
  Day/Week/Month and existing complete-copy/Moon-clock regressions.

The added feature uses 982 aggregate JavaScript gzip bytes against the recorded
main build. Allocate 1,250 bytes in the aggregate budget; the measured total is
3,457,164 bytes. The unchanged detail chunk is 9 bytes above its old cap due to
changed shared chunk references, so its limit gains 50 bytes. Reader startup,
CSS, dependencies and other individual limits are unchanged.

The PR records exact tested heads, hosted gates and deployed-main checks.
