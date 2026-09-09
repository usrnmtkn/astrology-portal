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

## Release verification

PR #716 publishes the Sky variable changes from `codex/sky-placement-variable-editor`
on main `7c10524316bd9754a3d30da599a66d78b5dbab41` (PR #714). The owner
approved publication to `usrnmtkn/astrology-portal` on September 9. PRs #666,
#669, and #712 were already merged. No production CMS rows are modified.

Local checks passed: Admin/Web typechecks; resolver source/browser/shipped
parity; the full Content Studio API suite; evergreen section regressions;
fresh Admin/Web builds; bundle budgets; CSS audit; generated manifest and
knowledge/phrase-index checks; and the rebuilt Saturn reader route with the
retrograde window and article/fallback paths.

All 15 Studio browser scenarios have successful local results across 390/1440
pixels and light/dark themes. Twelve passed in the full rerun, then three
interrupted cases passed separately. Trace evidence identified a network-change
chunk failure, browser-context startup timeout, and mocked API read timeout.
The local host had load averages above 700. A temporary configuration allowed
240 seconds per test; repository limits and assertions were unchanged. GitHub's
clean runner subsequently passed the complete Sky placement Studio job using
the repository configuration, including publication, variable editing,
retrograde refresh, and Studio crash recovery.

The broad content lifecycle is not reported as green. Its resumed report
fulfillment, judge, and calibration prechecks passed, as did the 878 published
detail identity checks. The historical Friends owner-signoff test was run
separately and reproduced the documented main failure at
`scripts/test-friends-owner-signoff-ruling.mjs:161`: actual hash
`84bcb9343e221991b2efe9f363d75aeaf926212319896c82a7c8878484acf4ee`, expected
`9ae494a7998e4441a03799c477e8e0819028e0822908a7a3ca4aeafb1e1415f5`.
The script, transit-synastry source rows, and every approval input it reads are
unchanged from main. After reproducing it directly, the long-running broad
local attempt was stopped; its unrun remainder is not counted as passing.
This is the same baseline failure recorded in
`docs/qa/natal-placement-inventory-audit-2026-09-08.md`. No approval hash or
assertion was changed.

The first PR CI run passed grammar and knowledge-index freshness but caught a
stale production Sky request-comparison artifact. Regeneration from the
current knowledge index changed only fingerprint fields. All other values,
including serving and approval state, stayed identical; no provider calls were
made. The corrected artifact is committed for CI to verify before merge.

The first complete Visual smoke workflow passed all three jobs: generic app
and client flows, Friends loading matrix, Sky summary/auth/recovery, and Sky
placement Studio/reader/crash recovery. The generated-artifact correction does
not change the product bundle. CI must pass again on the final commit.

## Production verification boundary

Main after PR #714 passed a read-only browser check with no API mocks:
Saturn's exact copy and retrograde duration were visible, and the duration kept
the same vertical position through 30 one-second samples at 1440 px. The 390 px
Saturn layout and Studio sign-in screen were visually inspected. Studio's owner
sign-in link retained the encoded return path to Sky Write-ups. No page errors
were recorded. Authenticated production inventory was not verified; the public
Studio sign-in screen cannot establish that coverage.

The Sky variable feature still requires its own successful main deployment and
post-deployment reader check. Deployment status is available through GitHub's
Vercel integration; direct Vercel connector access is unavailable.
