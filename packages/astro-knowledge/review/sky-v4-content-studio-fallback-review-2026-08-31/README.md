# SKY V4 Content Studio fallback review UX

Date: 2026-08-31

This change addresses the Content Studio usability defect exposed during the SKY V4 continuous-placement corpus review.

## Scope

For each `sky-placement/article/{planet}/{sign}` record, Content Studio now presents the six editable reader fields in two explicit groups:

### Main reader copy

- `tldrWhat`
- `tldrTakeaway`
- `placementArticle`

### Fallback copy

- `fallback.hook`
- `fallback.lived`
- `fallback.turn`

All 120 records remain individually discoverable in Content Studio. Opening one
record keeps its six related reader fields together on one page without loading
or duplicating the other 119 approved baselines into the editor.

## Safety boundary

- The underlying SKY V4 data model is unchanged.
- Structural/calculated fields remain read-only.
- Saving from the grouped editor writes `sections.packageDraft` with `reviewStatus = needs_review`.
- Existing API behavior forks edits away from a LIVE SKY V4 baseline into a non-serving `sky-v4-reader-copy-draft` row.
- The panel contains no serving-state mutation.
- The approved serving baseline remains unchanged until a later owner approval/release.

## Regression coverage

`test-sky-v4-preview-api.mts` now asserts:

- the grouped Main reader copy and Fallback copy editor is present;
- Hook/Lived/Turn remain the nested `fallback.*` fields;
- all six fields remain grouped on the exact placement record;
- the editor does not request an unrelated bulk Sky payload;
- saves write a package draft at `needs_review`;
- the Content Studio update signal is emitted;
- the panel does not mutate `serving_enabled`.
