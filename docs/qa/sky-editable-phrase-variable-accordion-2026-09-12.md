# Sky editable phrase-variable accordion QA — 2026-09-12

## Owner request

Editable phrase variables must be easy to find directly below the calculated Sky-variable reference in Content Studio.

## UI contract

`SkyPlacementVariableKey` renders two sibling accordions in this order:

1. **Calculated Sky variables** — read-only runtime facts such as planet, sign, motion, dates, and calculated aspects.
2. **Editable phrase variables** — the named prose-source registry used by the V5 placement composition.

The editable phrase-variable accordion groups the registry by the same `SKY_WRITING_LIBRARY_GROUPS` used by the actual Writing Library editor, so the reference cannot silently drift from the editor. Each entry shows the exact `{{variableName}}`, its editorial label, description, and reuse scope.

The phrase-variable accordion is a reference surface. The prose value itself remains edited through **Writing library & placement composition** for the selected planet and sign. This preserves the distinction between calculated facts and authored prose while making both registries discoverable from the same place.
