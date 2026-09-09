# Sky Placement variables and source identity

The SKY V4 `placementArticle` field is a saved evergreen main passage for one
planet/sign pair. It takes priority over that record’s shorter fallback
sections. Its label describes its role in assembly, not a dated edition or a
claim that every sentence is a verbatim owner-authored original. The immutable
canonical corpus and approved correction packages retain the writing provenance.
This change does not edit those sources or their approval records.

Content Studio > Sky Write-ups > choose planet/sign/motion > Composition Map:

- **Main template** names each source block, for example “Saturn in Aries ·
  Fallback opening,” followed by `sky-placement/article/saturn/aries#fallback.hook`.
  It shows saved text and variable substitution in assembly order. The source
  identifier is a reference to a field, not an inline mustache token.
- **Reader preview** substitutes the selected placement identity and motion.
  It remains a saved-source preview, which may include drafts. It is not proof
  of publication and does not invent an event date.
- In a placement article or fallback section editor, expand **Sky variable
  key** to insert a variable at the cursor or replace selected text. The
  reference gives each token’s meaning and availability. Custom sections use
  the same reference, validation, and runtime substitution.

| Inline variable | Reader value |
| --- | --- |
| `{{planetTitle}}` | Calculated placement’s planet name without “the” or Rx |
| `{{signTitle}}` | Calculated placement’s zodiac sign |
| `{{motion}}` | `direct` or `retrograde` for that occurrence |
| `{{entryDate}}` | Calculated sign-residency entry date with year |
| `{{exitDate}}` | Calculated final sign-residency exit date with year |

Dates are sign-residency dates, not retrograde station dates. They use the
existing reader adapter’s calculation and date formatting. In a preview with
no calculated occurrence, date tokens remain marked as unresolved. The reader
rejects a selected passage with missing facts; it does not remove a token and
leave a broken sentence. An unused fallback path is not evaluated when the
main article is selected.

The initial variable scope is the continuous placement article and evergreen
fallback sections. It does not add variables to TLDR fields, shared retrograde
modifiers, natal passages, vocabulary, or dated article editions. Existing
supported placeholders in other families retain their own contracts. Unknown
variables and conditional-block syntax are rejected by the save API and
reported inline in the editor. Publication revalidates the contract.

## Verification

- `scripts/test-sky-placement-variables.mts`: source, browser entry, and shipped
  artifact parity; article/fallback paths; direct/Rx; missing and unknown facts;
  unused fallback isolation; unchanged canonical corpus.
- `scripts/test-sky-placement-studio-api.mts`: save/publish/readback through the
  real API handler and reader loader, with isolated in-memory storage. Tests
  built-in and custom fields, subsequent revisions, and invalid input rejection.
- `tests/visual/sky-placement-variables.spec.ts`: named source blocks, raw and
  substituted text, caret insertion, field switching, validation, empty state,
  and typography at 390/1440 px in light/dark themes.
- Existing composition, evergreen, content, typecheck, and CSS checks apply.

No production CMS rows or database settings are changed by this work. Runtime
package version: `v3-2026-09-09a`.

## Deferred editor cost

The fresh Admin build measures 175.4 kB entry gzip / 618.1 kB raw and
311.1 kB aggregate JavaScript gzip. The shared variable reference is a separate
2.3 kB gzip chunk imported by the two deferred Sky editors. No source corpus is
embedded in this component. Entry and largest-chunk budgets remain unchanged;
the aggregate allowance increases from 309,500 to 312,000 bytes (2.5 kB) for
the new reference and raw/resolved template comparison. The bundle check also
rejects this reference anywhere in the initial static import graph, including
shared chunks, so this allowance cannot move it into startup.

The complete website build includes these Admin assets and the reader variable
contract. With synthetic CI service configuration it measures 2,940,574 bytes
aggregate JavaScript gzip. Its aggregate allowance increases from 2,938,000 to
2,942,000 bytes. Reader boot (462.2 kB), startup CSS (47.4 kB), and all individual
chunk limits remain within their existing caps.

## Initial run and release status

The implementation is committed locally on `codex/sky-placement-variable-editor`,
based on main `01544a34a117065e43f29cebb71c373269e1e481`. It has not been
pushed, merged, or verified on production. No PR has been created for this branch.

Passed: Admin/Web typechecks; the new resolver source/browser/shipped parity
tests; the real Studio API save/publish/readback regression; evergreen section
regressions; fresh Admin and Web builds; both bundle-budget checks; CSS token
audit; regenerated knowledge-index and phrase-index checks. The rebuilt product
route test, `canonical evergreen placement renders the Studio hooks 1440 light`,
also passed, including the Saturn retrograde window and article/fallback paths.

The initial 15-test Studio browser run finished with five passing tests:
390 px dark source discovery, inventory-loading editor preservation, canonical
assembly order, two retrograde revisions, and 1440 px dark variable insertion.
The remaining ten tests timed out on the overloaded local host, including the
second evergreen save checks. They remain unverified; passing unit/API checks
do not substitute for that browser coverage. The captured 1440 px dark template
and variable-key screenshots were visually inspected. A rerun with longer
timeouts and the native ARM Node runtime could not start its fresh preview
listener in the sandbox (`EPERM`); the request for local-server access did not
complete. Assertions and repository test limits were not relaxed.

The full content lifecycle is incomplete. Its earlier engine/governance
prechecks passed; stale generated-index hashes were corrected and checked.
The resumed prechecks passed friend/calendar routing and report generation,
assembly, coverage, and runtime-asset checks. The production-report smoke test
then hit the sandbox's local-listener restriction, before the main content and
posttest commands ran. A native Node runtime resolved the initial Rosetta/esbuild
platform mismatch; the tsx loader avoided the CLI's blocked IPC socket.

Release remains gated on completing those checks and restoring GitHub access.
Git push failed because the CLI's stored login is invalid. The connected GitHub
blob upload did not return, and a subsequent read did not find the expected
blob. No remote commit or branch was created. After reconnecting, refresh main,
review the source diff, complete checks, push the local branch, and use the PR
and Vercel Git deployment flow. At that point, the separate PR #714 was not included.

## Release continuation

PR #714 was merged as `7c10524316bd9754a3d30da599a66d78b5dbab41`, and
Vercel reported a successful deployment for that main commit. The Sky variable
branch was rebased cleanly onto it. PRs #666, #669, and #712 were already merged.

All 15 Studio browser scenarios now have successful results. The fresh-listener
run with native ARM Node and a 240-second per-test limit passed 12 scenarios;
the three interrupted cases then passed in a targeted rerun. Trace evidence
identified `ERR_NETWORK_CHANGED` while importing a Studio chunk in one case;
another timed out creating its browser context; the last encountered a timed-out
mock API read during the second evergreen save. The targeted rerun passed both
desktop evergreen save/reopen cases and mobile-light variable insertion. No
assertions were removed or weakened. Repository test limits remain unchanged;
the longer local limit is recorded in the temporary run configuration only.

The full `npm run test:content-studio-api` suite passed on the rebased branch,
including its prerequisite knowledge build, both the Sky variable publication
checks and PR #714's malformed-response/deadline/index-parity checks, repeated
saves, immutable version protection, copy recovery, status parity, editor
hydration, and exact owner-copy preservation.

GitHub CLI authentication has been renewed successfully. The Sky variable
branch is still local: automatic approval review rejected uploading the new
`apps/admin/src/SkyPlacementVariableKey.tsx` source file to
`usrnmtkn/astrology-portal` without destination-specific disclosure approval.
The exact 35-file release scope has been submitted to the owner for approval.
No alternate upload route was used. The Vercel connector still returns no
accessible teams and denies the `usrnmtkns-projects` scope; the main deployment
status above was read through GitHub's Vercel status integration.

The live main deployment passed a read-only browser check with no API mocks:
Saturn's exact copy and retrograde duration were visible, and the duration kept
the same vertical position through 30 one-second samples at 1440 px. The 390 px
Saturn layout and Studio sign-in screen were visually inspected. Studio's owner
sign-in link retained the encoded return path to Sky Write-ups. No page errors
were recorded. Authenticated production inventory is not yet verified; the
public Studio sign-in screen cannot establish that coverage.

The remaining content lifecycle is still running. The previously blocked local
production-report smoke check passed after listener access was available. The
resume harness initially lacked the npm executable path; adding the repository
`node_modules/.bin` path allowed the remaining report checks to begin. This is
not yet a full content-lifecycle pass.
