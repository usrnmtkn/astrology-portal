# Sky summary source-bank integration — 2026-09-10

The supplied 72-record bank is an Admin review source. It is not a serving
manifest. The original attachment is preserved at
`docs/content-review/sky-summary-source-bank-v1.json`. Its embedded approval,
licensing-scan, and already-live claims are retained as document data, not
independently verified publication decisions.

## Owner workflow

Open Content Studio → Sky Write-ups → Daily Sky Summary. Each source whose
supplied wording differs from the current saved/bundled wording has **Review
supplied wording**. Expand it to compare the complete candidate with the
current wording. **Open supplied wording** opens an unsaved editor with the
canonical app key. **Save draft** holds the candidate; **Save & publish** is the
owner's explicit publication action. Reopening a saved source preserves its
identity and optimistic concurrency token.

No model calls, bulk database writes, prose rewrites, or automatic promotions
are involved. Virgo Sun is explicitly skipped because the bank requests that
the existing complete owner passage remain unchanged. Existing Sun/Moon source
banks remain byte-identical. An attachment's alternate wording, phase bank,
and eclipse layering do not become fallback paths on retirement or failed
publication. Those changes require their own approved source decisions.

## Key and provenance contract

- `ms/sky-summary/sun/{sign}` → `cms/sky-daily-summary/sun/{sign}`
- `ms/sky-summary/moon/{event}/{sign}` → `cms/sky-daily-summary/moon/{sign}/{event}`
- The Admin-only candidate projection loads as a separate JSON asset when this
  workspace opens, with retry on failure, and stores the original source key, complete
  text, SHA-256, word count, import action, source URL, and original alternate.
- The editor records a candidate receipt only when the complete body matches
  that candidate. File-level `promotionAuthorized: false` describes the
  attachment import, not a subsequent explicit owner publication.
- The reader never imports the candidate bank. Existing publication identity,
  review, retirement, and serving filters remain authoritative.

## Sign and event selection

Regular Moon previews allow all 144 sign pairs. New Moon/solar-eclipse examples
link the two sign selectors. Full Moon/lunar-eclipse examples keep them opposite.
Changing either selector updates its partner, yielding 192 valid examples total.

On an actual event day, the reader requests a Swiss Ephemeris snapshot at the
calendar event's exact UTC time. Both Sun and Moon placements are checked
against the event, including sign geometry and finite degrees. The Sun article
link uses that same event-time sign. While calculation is pending or fails,
the current placement summary remains and the unverified lunation unit is
omitted; no event claim or special-Moon prose is assembled from mismatched
timestamps. Invalid event
geometry is logged as `IMPOSSIBLE_SKY`, not classified as a missing prose row.

The owner correction on 2026-09-10 requires the Moon's sign in its own link,
even when it matches the Sun: “make sure the moon has the sign with it.”
The same-sign opening names both signs and preserves each body's degree and
article link. The exact former built-in template is normalized when loaded from
saved Studio rows; newly edited templates must include the Moon sign slot.
The 192-combination regression checks each complete Sun and Moon link label. Existing customized general openings continue to apply unless
the owner supplies the specific same-sign opening. The new template is editable
through the existing sentence-template workspace.

## Axis decision

Axis context belongs to Full Moon and lunar-eclipse detail, not every daily
summary or ordinary placement page. The canonical Full Moon article records
already contain axis meaning. The current reader route is
`currentSkyV4LunationDetailArticle` → `skyV4ReaderRenderer.renderRoute` → the
released article's full body. The older `renderSkyLunation` resolver also has
axis passages, but it is not the current detail route; its existence alone
would not establish coverage on the current page.

Do not append that legacy personal-register text to the collective summary.
A separate optional axis field would need an approved complete unit, a defined
reader purpose beyond the existing article, and preview coverage. This change
adds no duplicated axis section and does not silently extract or rewrite
approved paragraphs into one.

## Required verification for future changes

1. `npm ci` in an isolated checkout; `npm run build:knowledge`.
2. `npm run test:sky-daily-summary`: includes attachment/projection hashes,
   all 192 valid combinations through the actual renderer, single-Moon and
   exact-body preservation, impossible geometry, pending event behavior,
   and two real Swiss event-time pairs.
3. `npm run test:content-studio-api`: actual-handler draft/reopen/publication
   and reader-loader checks for canonical Sun and special-Moon candidate keys,
   plus the full existing CRUD suite.
4. `npm run typecheck`, `npm run qa:css-audit`.
5. `npx playwright test -c playwright.sky-studio.config.ts`: fresh web and
   Admin builds; desktop/mobile review under both document theme settings (Admin retains its
   established dark palette), source receipts, linked
   selectors, existing save/publish/retirement flows, and real reader composition.
6. Run the daily summary reader browser cases and inspect their screenshots.
7. Exact-head CI, current-main rebase, then main's Git deployment. Verify the
   deployed assets and rendered flow before claiming the change is live.

Browser write fixtures use isolated storage. They prove UI wiring; the separate
actual-handler suite is required and must not be replaced with mocked success.
No production content is published as part of verification.

## Local verification record

The isolated Studio flow passed 21 cases under UTC, including candidate-asset
retry and omission of an impossible calendar lunation.
The dedicated Content Studio API gate, typecheck, CSS audit, and Admin bundle
budget passed. Candidate bodies match the preserved original attachment;
existing approved source files are unchanged.

The repository-wide `npm run test:content` reached an unrelated existing
Friends historical approval checksum failure in
`scripts/test-friends-owner-signoff-ruling.mjs:161`. The same script and all of
its source inputs were extracted directly from `origin/main` at `cf4f03b1` and
reproduced the identical mismatch: actual
`84bcb9343e221991b2efe9f363d75aeaf926212319896c82a7c8878484acf4ee`, expected
`9ae494a7998e4441a03799c477e8e0819028e0822908a7a3ca4aeafb1e1415f5`.
This is not a passing full-content gate. No approval-history or reader-content
changes were made to suppress it. The release requires the exact-head CI
checks and the directly affected suites described above.
