# Studio variables in any editable field — 2026-09-16

The Content Studio variable picker may insert built-in or custom `{{variableName}}` tokens into any editable reader-facing field.

Built-in variables are now snapshotted as non-resolving bindings during draft validation. This lets package validation recognize them as approved Studio variables without replacing them before the normal calculated-variable resolver runs. Custom variables continue to freeze their authored values and resolve through the existing publication boundary.

The shared variable walker now includes `tldrWhat` / `TLDR_What` alongside the existing TLDR fields so the Sun-in-sign editor and equivalent package fields participate in the same contract.

Regression intent:

- `{{planetTitle}}`, `{{signTitle}}`, `{{entryDate}}`, `{{exitDate}}`, and other generated built-in variable names may be added to an editable package field even when the package original did not already contain them.
- Custom Studio variables retain their existing snapshot, stale-definition, deletion, and publication checks.
- Built-in variables remain unresolved at the custom-variable layer and continue to be resolved by their owning calculated-variable renderer.
