# Load errors: handoff 10

Implemented locally on `codex/ui-handoff-review-20261026`, based on
`5eddffa5d38ac38b594781f576ba24387d439b6d` plus the preserved UI handoff work.
Fetched main is `84c8c5e8a9bc1a95c6c8cb7013b8ac32bbce81d5`: 0 ahead / 11 behind.
This is local implementation evidence, not production verification or merge readiness.

Source: owner-supplied `GitHub app design system (10).zip`, SHA-256
`51fdd0c9b0ebdcc42064a26e53c4fdbe4ec28ccb9fd6a8f1b0c6380e6dfa093d`.
Read the README and the load-error / not-found design HTML as reference material.
The archive's support JavaScript was not executed.

## Acceptance

| Criterion | Result and evidence |
| --- | --- |
| Main Sky failure has one message, no empty wheel or placement sections | Passed in the actual app at 390/1440, light/dark. Real navigation, page title and date control stay visible. |
| Retry returns to calculated content, which survives reload | Passed with isolated failure fixtures and the actual `api/sky` handler / Swiss Ephemeris for recovery. |
| Page card, mobile sheet, section row and exact interface typography | Passed at 320/390/800/960/1440 in both themes. Page text uses the handoff's UI 16px role; section text uses UI 14px; narrative content retains its existing roles. |
| Retry state, focus after failure, third failure, offline copy, reduced motion | Passed in the shared component matrix. Disabled retry/spinner, three failures, Go to Today and success are exercised. Browser offline detection has separate checks. |
| Page and section consumers | Sky, Calendar, Horoscopes, You, Friends, Articles/Guide, Learn and Reports use the shared feedback. Independent failures retain the rest of the page. |
| Missing records remain distinct from temporary transport errors | Passed, including report 503 versus 404 and missing-reader navigation. Existing 404 copy/actions remain; artwork is shared. |
| Existing report access, saved reports, archive, ready toast and article contents | Passed in isolated authenticated / signed-out fixtures; no owner reports were created or changed. |
| Existing chart pages, Patterns & Insights, complete readings and return navigation | 56 targeted checks passed after correcting the old selector that hid a new error row. Includes both audiences, themes and screen sizes. |
| Loading transitions and planetary horoscope navigation | Passed in the main regression run, including exact publications, retirement, complete body text and return to the owning page. |
| Tokens, types, full saved copy | CSS/token audit, web TypeScript and reader-copy boundary pass. Full-detail integrity passes for 1,880 protected multi-paragraph passages across 17 consumers. No protected source files changed from the starting snapshot. |

The main run passed 253 checks. The separate chart-flow run passed 56 checks
after the final selector fix. Both runs used fresh production builds in dedicated
strict-port previews with reuse disabled. The matrix includes 360/768/1440 page
states and the five-width component checks above. These are synthetic outage
tests, not injected failures in the owner's browser. Localhost was restarted
from this checkout and the real Sky page was verified read-only in the in-app browser.

## Delivery and size

`LoadError` and its CSS are part of the initial UI: a browser that already loaded
the app can present recovery while offline without fetching a new error chunk.
The existing data loaders, calculation inputs, API contracts and protected prose
are unchanged. The error component uses an available numeric HTTP status, error
message or offline signal; where a legacy loader discards HTTP details, it uses
connection copy rather than guessing a server status. Existing full-document
reload recovery remains for the root asset boundary and natal calculation error;
retry counts are local to the mounted error state.

Same-environment gzip measurements before / final:

| Measurement | Before | Final |
| --- | ---: | ---: |
| App boot JavaScript | 393,274 | 395,860 |
| Reader boot including CSS | 449,791 | 454,200 |
| Reader initial CSS | 56,517 | 58,340 |
| Total CSS | 141,792 | 143,080 |
| Shared Memory CSS | 31,367 | 31,681 |
| Total JavaScript | 3,667,720 | 3,669,130 |

Five narrowly affected CSS/startup allowances record the requested feedback UI's
cost. Total JavaScript, source chunks, dependencies, deferred-content boundaries,
calculation accuracy and timing limits stay unchanged. The updated web budget
check passes. Memory's CSS difference comes from canonical shared theme tokens,
not graph-specific styling.

## Evidence and release limits

Evidence is in `test-results/load-errors-handoff10-2026-10-27/`: receipt,
both browser reports, bundle measurements, four Sky error screenshots and a
native localhost capture. The error screenshots use synthetic failed requests.

Existing release gaps from the prior handoff remain: the complete Studio API
suite requires protected ingress voice-reference fixtures, and the standalone
Admin build has its previously documented size overages. These are not waived.
The 11 newer main commits are not integrated into this dirty owner checkout.
No commit, push, deployment, owner-content write or paid generation was performed.
