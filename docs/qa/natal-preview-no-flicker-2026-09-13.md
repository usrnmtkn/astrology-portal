# Natal placement preview no-flicker fix

The Natal Chart `What you see` / `What a friend sees` preview was flashing back to its loading state while Content Studio progressively loaded unrelated inventory rows.

The preview now:

- refreshes only when the effective override payload changes, instead of whenever the `rows` array receives another inventory batch;
- keeps the last successfully assembled preview visible during same-context source and publication refreshes;
- clears the surface only when the reader context itself changes (audience, planet, sign, house, or motion) or on the first load;
- aborts superseded requests and preserves the last good assembly if a background refresh fails.

The regression contract is `scripts/test-natal-preview-no-flicker.mjs`.
