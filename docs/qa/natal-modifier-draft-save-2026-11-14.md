# Natal modifier draft creation

Production draft creation on the Saturn/4 retrograde source failed the
`generated_interpretations_block_type_check` constraint: the creator supplied
`natal_placement`, which is absent from the database contract. The isolated
API fixture had accepted that unsupported metadata. No row was created.

The creator now uses `fallback_hook`, matching its existing `fallback-hook`
event and source identity. This also repairs complete natal override creation
through the same helper. Source keys, reader copy, review/publication controls
and database constraints remain unchanged. No schema migration is needed.

The regression derives allowed types from the latest block-type migration and
checks both draft creator paths plus the actual handler's stored row. The
existing 144-identity save/reopen/publication/reader contract and admin typecheck
pass with isolated dependencies and a fresh knowledge build. Fresh-browser and
exact-head CI results will be recorded in the PR.

The owner requested exact You and They writing be saved to the Saturn/4 modifier.
That wording stays outside Git. Production save/reopen verification remains
pending deployment; a successful fixture is not production write evidence.

The first CI run failed in the Sky Studio phase after correctly selecting no
browser cases for that phase. Its unconditional bundle check had no build to
measure. That step now builds Studio when its manifest is absent, preserving
the budget and deferred-boundary checks. Runtime test selection is unchanged.
