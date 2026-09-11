# Content Studio editorial-copy audit — 2026-09-11

The owner requested removal of internal drafting notes from all reader-facing
content and prevention of recurrence during AI/document imports.

## Confirmed causes and saved-data corrections

The owner-review Markdown importer used the first document heading as Headline
and copied the entire document into Body. This included batch/source preambles,
status tails, inline block-architecture notes and annotated variable instructions.
A separate authored-library importer fabricated workflow labels as summaries.
The package materializer copied editorial `note`/`notes` fields into Summary.

The authenticated database audit covered all 15,209 shared Studio rows and all
285 personalized rows. Recursive field inspection included nested section and
package-draft reader fields, while excluding provenance, prompts and editorial
metadata. Additional broad keyword candidates were manually inspected: legitimate
reader uses of “engine,” “drafting” and “external sources” were retained.

Saved corrections:

- 60 article/template documents now contain only the reader article, starting
  with its actual heading. All complete prose paragraphs are retained.
- Live browser follow-through found 48 `aspectHits placed per house` annotations
  across four of those editions, plus two remaining italicized production notes.
  All were moved to editor metadata, preserving named variables and full prose.
- Four specification/fill-plan documents now retain their complete original
  content in editor metadata, with an empty reader body and source-material role.
- 4,005 fabricated top-level REVIEWED workflow summaries were cleared.
- The final expanded scan found and cleared 2,520 nested feed/in-depth workflow
  summaries plus 54 additional top-level CONFIRMED summaries, across 1,338 rows.
- 235 technical slot-resolution specifications now keep their instructions in
  editor-only notes, with empty reader bodies/summaries and a source-material role.
- 4,613 exact mirrors of package editorial notes were removed from Summary;
  their package notes remain intact.
- Three lunation passages lost only their explicit `(Engine note: ...)`
  parentheticals. Their package records and repository source were corrected too.

These categories overlap: the three lunation rows also had package-note summaries.
The original documents, removed notes, slot descriptions and original field values
are preserved in `source_snapshot.editorialImport`, `editorialSummaryRepair`,
`editorialPackageSummaryRepair`, `editorialNestedSummaryRepair`,
`editorialSpecificationRepair`, `editorialEngineNoteRepair`,
`editorialSlotAnnotationRepair` or `editorialBlockNoteRepair`. Studio's existing
**Original import notes** disclosure exposes the separated import notes.
No draft was promoted and no review/lane state changed. Exact updated-at checks
protected article repairs; summary updates locked exact matching values and
versions. Post-write checks found zero changed article bodies in the summary
repairs, zero status/lane changes and zero remaining identified drafting markers.

The original resource documents are deliberately preserved as provenance outside
Git. Historical source archives and editor metadata may still contain drafting
notes; they are not reader fields.

## Prevention and verification

`editorialCopyBoundary.mjs` provides explicit reader-field traversal and rejection
of known drafting labels, workflow summaries, internal headings, engine notes,
annotated slots and AI-response wrappers. New/mixed formats must be reviewed;
regex detection is not a guarantee of semantic perfection.

The owner-review importer separates the known Markdown format and keeps balanced
slot descriptions in editor metadata. The slot-generation API reads those
preserved descriptions. Other importers no longer invent summaries from workflow
metadata. The package materializer preserves notes separately. Technical slot-resolution
imports now create source material with notes outside reader fields. Studio's single,
bulk, nested package and personalized writes reject contaminated supplied copy;
publishing a saved shared row checks the stored copy as well.

Run:

```sh
npm run test:reader-copy-boundary
npm run test:content-studio-api
node scripts/audit-reader-drafting-notes.mjs --rows=/private/path/complete-inventory.json
```

`--rows` accepts a row array or a `{ "rows": [...] }` export. Supply the complete
paginated inventory, not a first page. The read-only SQL companion in
`scripts/sql/audit-reader-drafting-notes.sql` scans the saved shared table without
exporting personal account data. It is a triage scan; inspect broader candidates
before changing text.

Local canonical audit: **10,935 rows / 19,177 reader fields**, no findings.
Fresh package materialization: **9,932 rows / 62,936 reader fields**, no findings.
The full mandatory API gate passed, including the new boundary and actual handler regressions.
All four fresh-build browser regressions passed: complete opening/final paragraph,
clean title, separate collapsed notes and viewport overflow in desktop/mobile,
light/dark. The CSS/token audit and template/lunation reader-contract checks passed.

Release status is separate from saved-data correction: this work belongs to
PR #759, based on prerequisite privacy PR #756. Production must follow the main
Git integration after the required exact-head checks pass; never waive them or
promote the feature preview to bypass the release gate.

The first hosted run caught stale knowledge-index source hashes after the macro
cleanup. The index was regenerated; the knowledge/phrase freshness checks and
generated-report judge-governance regression pass. This updates source hashes,
not approval/signoff records or assertions.


### Final release integration and startup regression

The release integrates main's report retry/source verification and report deletion
changes through `1991a3b3`. The combined local API suite passed without changing
owner copy or review state. On release head `83198f0b`, all 213 reader functional
cases and the Summary/Studio jobs passed, but four Friends timing scenarios
exceeded the original budgets. Main `bbbc8ed0` independently failed the direct
Synastry and incomplete-chart repair timing scenarios (workflow `34612895920`).
These failures are not waived.

Release trace `34613622490` shows Friends route/profile downloads starting only
after App is evaluated (roughly 600 ms into a representative cached-list load),
followed by another component download. Initial Friends routes now begin these
same imports as soon as App is evaluated, before publication setup and the
first React render. The existing App loader is reused to preserve chunk boundaries. Only the selected profile tab is preloaded; a bare
list still does not fetch relationship or natal/transit content. Vanity routes
receive the same preload after their route resolves. Import errors remain owned
by the mounted route's recovery boundary. The existing seven-scenario, three-
samples-per-scenario performance matrix and every threshold remain unchanged.

After route preloading, all seven local performance scenarios pass with their
original budgets, as do the startup performance contracts, CSS audits and
typecheck. CI runs the same performance step before the lengthy reader suite
so regressions fail earlier. Final hosted and production evidence belongs in
PR #759; local timings alone are not a hosted performance pass.
