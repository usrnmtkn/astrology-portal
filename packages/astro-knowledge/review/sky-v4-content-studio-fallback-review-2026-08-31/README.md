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

The panel also provides a batch **Continuous placement fallbacks** review workspace for all 120 continuous placement records. The batch view can be filtered by planet, sign, and fallback field and supports saving fallback edits as Content Studio drafts.

## Safety boundary

- The underlying SKY V4 data model is unchanged.
- Structural/calculated fields remain read-only.
- Saving from either grouped editor writes `sections.packageDraft` with `reviewStatus = needs_review`.
- Existing API behavior forks edits away from a LIVE SKY V4 baseline into a non-serving `sky-v4-reader-copy-draft` row.
- The panel contains no serving-state mutation.
- The approved serving baseline remains unchanged until a later owner approval/release.

## Regression coverage

`test-sky-v4-preview-api.mts` now asserts:

- the grouped Main reader copy and Fallback copy editor is present;
- Hook/Lived/Turn remain the nested `fallback.*` fields;
- the 120-record batch review exists;
- batch loading is scoped to Sky rows;
- saves write a package draft at `needs_review`;
- the Content Studio update signal is emitted;
- the panel does not mutate `serving_enabled`.
