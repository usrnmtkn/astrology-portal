# Content Studio natal editing and CRUD review

Implemented in `/Users/mprez/Code/tldrastro-natal-studio-crud` on `codex/natal-studio-crud-20260907`, initially based on `c384ac21` and subsequently fast-forwarded to refreshed `origin/main` at `549c7ce3`. The branch has no committed divergence from that base; the implementation is uncommitted. The original checkout and its owner edits were preserved.

## Reproduced save failure

The editor builds a `sections.packageDraft` proposal for changes to headline, summary, editorial notes, and copy. `isEditablePackageCopyPath` in `api/admin/generated-content.ts` accepted body fields but omitted headline, summary, and editorial notes. The UI exposed fields the server prohibited.

A regression first saved body copy successfully, then attempted a summary edit. Before the fix, the actual API handler returned HTTP 500 with `Package proposals cannot change read-only fields: summary.` The same mismatch affected titles and notes. The API now accepts these editorial fields while keeping identity, content role, grammar frame, and rendering policy protected. The regression repeatedly saves and publishes each field, then edits again.

## Other findings and changes

| Area | Finding | Change |
| --- | --- | --- |
| Source loading | The natal cards and variable rail searched the currently loaded library subset. Unloaded sources appeared blank or as zero matches. | A bounded exact-key batch loads the selected placement's dependencies after the library load completes. It includes authenticated, read-only starters from the installed package when a source has no Studio mirror. Saving a starter creates its first real row. |
| Template context | The generic natal template and sign-only selections missed the contextual preview condition. The rail defaulted to Sun/Leo. | Generic, planet-specific, node, house, and retrograde templates retain the selected planet/sign context; the rail receives matching dependency rows. |
| Source precedence | The visible introduction could point to `planet-intro` even though the resolver preferred `planet-lived`; complete house passages were not exposed. | The introduction card points to the preferred source when available, and complete house passages have direct editors. |
| Editing workflow | Editors had to navigate multiple cards and drawers to reach each copy field. | Inline You/Friend fields and Save revision / Save & publish actions appear directly on source cards. The complete sign passage spans the available width. Advanced templates remain available. |
| Version identity | Ordinary save derived its expected timestamp from the mutable inventory, not the draft's original row version. | Drafts retain the version they were opened or last saved from. A returned save updates that baseline. Real stale edits still fail with 409. |
| Review metadata | Package-specific field setters retained an existing exact-copy editorial decision after copy changed. | Shared copy setters invalidate that decision so the previous approval is not carried into the next revision. |
| Bulk publishing | Lightweight inventory records omit package proposals, but the handler used them to choose between status-only publishing and revision approval. | The retained bulk handler hydrates full records before deciding the action. |
| Partial bulk mutations | `Promise.all` discarded successful results when one row failed, leaving stale local state. | Successful updates/deletions are applied locally; only failed rows remain selected. Row selection remains internal, as required by the existing owner UI decision. The browser regression reveals those controls only inside its fixture. |
| Production preview | Preview construction read effective proposal content, which is an editorial view. | The effective-reader preview reads the installed/published package record and excludes unsaved package starters. |

## Uranus in Scorpio

The exact 256-word owner passage is stored in `docs/content-management/owner-copy/uranus-in-scorpio-2026-09-07.txt`, with its hash, task provenance, and update instruction in the adjacent JSON receipt.

It is installed at `fallback-hook/natal-you-placement-sign-final/uranus/scorpio`. This is the existing complete You-view sign slot, shared across houses. It takes precedence over generic sign assembly without splitting the passage into shared phrases. The house passage and the existing calculated retrograde modifier remain separate resolver responsibilities. No Friend rewrite was invented.

The package is `v3-2026-09-07a`. The resolver artifact, manifests, approved-serving projection, and content book were regenerated using the repository build tools. Rebuilding also incorporates reader-boundary source changes already present in the base commit but absent from its checked-in generated resolver artifact; the generated artifact was not hand-edited.

## Verification

Passed:

- Admin and web TypeScript checks; admin and web builds.
- Actual API-handler roundtrip: create/read/save/publish, repeat edits to body/title/summary/notes, stale-write rejection, protected structural fields, and missing-mirror source starters. Database requests are intercepted in the test; no production rows are changed.
- CRUD/hydration, atomic concurrency, special-mutation concurrency, and transit CRUD guards.
- Natal dependency/source mapping and preview API regressions.
- Owner text/hash/word count plus Node reference, browser source, and shipped-renderer parity for sign-only and all 12 houses in direct and retrograde contexts.
- Four browser flows against freshly built local previews: Natal navigation, template save/close/reopen, inline save/edit/save/publish/edit plus contextual variable lookup, and partial bulk mutation handling. The natal preview fixture uses the actual API renderer and shipped package.
- Desktop/mobile source-card screenshots, visible save controls, no horizontal overflow, analogous heading styles, and browser error checks.
- CSS/token audits, atomic variable provenance, composition runtime parity, reader-facing content contract, and `git diff --check`.

Broader gates are not green:

1. `npm run test:content` stops at `test-content-unresolved-studio.mts:36`, which requires `report.count > 0`; current main's checked-in queue contains zero items. The identical failure was reproduced in the untouched baseline worktree.
2. `npm run qa:admin-bundle` builds successfully, then fails existing bundle ceilings. A separate baseline with its own `npm ci` produced entry gzip 156.9 kB and total JavaScript gzip 221.1 kB, above the 152/203 kB limits. This implementation's measured build was 157.6/222.9 kB. No budgets were raised. Later checks in that chained command were not automatically reached; directly relevant checks were run separately.

## Release status

No commit, push, merge, deployment, or production dashboard synchronization was performed. Production still uses its currently deployed code and content. The changes and exact copy are prepared locally for review and the normal main-branch release process.

The subsequent [full CRUD audit](content-studio-full-crud-audit-2026-09-07.md) expands coverage and records additional autosave, navigation, inventory, and lifecycle fixes.
