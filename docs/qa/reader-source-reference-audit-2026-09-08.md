# Reader author/source-reference audit — September 8, 2026

Owner request: “do a deep audit of the reader facing content, it's using my name Marie  - from Project Author. Find anywhere a sentence is referrencing the author or source material, and flag and remove it.”

Task: `01a07f51-c67a-7553-b2fa-46e1c2fff842`. Worktree branch: `codex/reader-source-reference-audit`; base: `aca1ba81`, refreshed `origin/main` at audit start (0 ahead / 0 behind).

## Findings and removals

| Content | Finding | Change |
| --- | --- | --- |
| `sky-nodes/education` | Sentence names Marie, contrasts her writing with “owner-approved transit language,” and describes the app's editorial choices. Shared by all 24 North/South Node sign routes. | Deleted that complete sentence in an exact, separately versioned source record. Remaining paragraphs are unchanged. |
| `knowledge-matrix-v9/transit/uranus\|aries\|retrograde` | “This source offers little…” discusses the limitations of the source instead of the transit. | Exact deletion-only source version. |
| `knowledge-matrix-v9/transit/uranus\|any\|direct` | “This source does not support…” discusses source limitations. | Exact deletion-only source version. |
| Lilith in/transiting the third house | “The source also links…” attributes a sibling claim to source material. | Deleted the sentence in both knowledge entries and the CSV import inputs; rebuilt derived corpora. The draft transit remains a draft. |
| Cached weekly Moon summaries | Attribution to Project Author followed by conversion/rotation instructions. | Cleared 35 editorial-only summaries; preserved bodies and edit history. Exact keyed corrections also apply at live-row loading and snapshot export, so the same old values cannot reappear. |
| Four cached content summaries | Approval note and ephemeris implementation note. | Cleared those summaries using the same exact-version correction mechanism. |

Exact removed text, affected keys, and files are in [the audit ledger](reader-source-reference-audit-2026-09-08.json).

## Scope and interpretation

The initial JSON sweep covered 3,471 files and 65,263 potentially reader-facing fields across app content, public snapshots/matrices, and knowledge data. All 210 unique broad search candidates were reviewed in context. Searches covered names, author references, source/source-material terminology, editorial notes, books, manuscripts, and related attribution language. App TypeScript/TSX was also searched for direct attribution.

Ordinary uses such as “source of support,” the reader checking an information source, or working as an author were not classified as attribution to the app's author. Non-rendered provenance, writing instructions, source URLs, immutable imported manuscripts/workbooks, and historical review evidence remain intact. Their instructions were not treated as the owner's request.

The V9 flagged entries share runtime keys with other rows; the audit does not claim both currently win selection. Corrections are tested both with current precedence and with each flagged row selected first. The locked workbook and its original JSON hashes remain exact. The new source records match the original text by SHA-256 before selecting the deletion-only version; newer owner copy is preserved.

## Validation

- New regression: 17,956 source prose fields, all 280 released Sky records, all 24 node routes, V9 browser-source/shipped-bundle parity, and 3,605 snapshot rows.
- Exact source corrections prove deletion only and preserve newer/unrelated text.
- Canonical Sky stage, reader approval, serving release, V9 runtime integrity, and last-known-good snapshot contracts pass.
- Rebuilt knowledge package, knowledge evidence index, fallback manifests, content book, and shipped browser resolver. Package version: `v3-2026-09-08a`.
- Web build/typecheck and CSS audit pass.
- Fresh-preview Playwright regression passes for North Node, South Node, and Lilith reader routes; checks absence of author/source attribution plus preserved node opening and closing text.

The complete `npm run test:content` suite was attempted after regenerating the knowledge index and clearing the sandbox IPC prerequisite. It passes the changed-content audit and continues through report checks, natal composition, fact-boundary, and duplicate-key gates, then fails at `scripts/test-friends-owner-signoff-ruling.mjs:161`. Actual hash: `84bcb9343e221991b2efe9f363d75aeaf926212319896c82a7c8878484acf4ee`; historical expected hash: `9ae494a7998e4441a03799c477e8e0819028e0822908a7a3ca4aeafb1e1415f5`. This exact existing failure is documented in [the earlier main-baseline audit](natal-placement-inventory-audit-2026-09-08.md); neither its test nor the transit-synastry source/approval inputs is changed here. The full suite is not green and the approval invariant was not waived.

The browser screenshot is `test-results/reader-source-reference-north-node.png`. Source diffs pass whitespace checking with the existing CSV CRLF line endings recognized (`git -c core.whitespace=cr-at-eol diff --check`).

## Release status

The owner authorized commit, merge, push, and production release in this task on September 8, 2026: “please proceed with merge, commit nad push live”. Release verification will be recorded in the task after the main-branch deployment. No remote database mutation is included. Local corrections protect the identified node article and exact old summary values after deployment. This audit covers checked-in content and the checked-in published snapshot; it is not a claim that every current private/live CMS row was inspected. Production verification and any remote synchronization remain a release step.
