# Calendar monthly editorial template wiring — 2026-09-16

## Scope

This installs the monthly overview editorial layout into the existing Content Studio Monthly Sky workspace without converting saved writing or publishing a reader edition.

Contextual facts: `signTitle`, `entryDate`, `exitDate`, `eventDate`, and `eventDescription` resolve from the passage they appear in. Seasonal opening uses the opening Sun visit; season transition uses the incoming visit; New Moon and Full Moon passages repeat once per qualifying event, including the matching eclipse. Authored phrases stay empty until written.

Included:

- Step 2a/2b phrase and nested-template definition validation, resolved in Calendar preview only when names are not reserved calculated facts or overview fields;
- unsaved Monthly Sky starters use the labeled overview layout; **Use monthly editorial structure** remains opt-in;
- new monthly fields for seasonal opening, selected planetary highlights, independent New Moon and Full Moon writing, and optional lunation connection;
- three alternative seasonal-opening starters and lunation/eclipse starters;
- calculated `hasNewMoon`, `hasFullMoon`, eclipse flags, `entryDate` / `exitDate` from the opening Sun visit, and `hasSeasonTransition` from a closing ingress.

Deliberate boundaries:

- editor field labels `Monthly overview` / `Season transition` / `Lunar cycle` / `Planetary changes` / `Closing passage` stay for compatibility; the unsaved starter pattern prints those labeled sections until the owner opts into the editorial layout;
- `seasonOverview` remains the existing saved season-transition field; the spec opening uses the new `seasonOpening` field so saved transition prose is not remapped;
- monthly editorial starters and insert buttons use `signTitle`, `entryDate`, `exitDate`, `eventDate`, and `eventDescription`; labeled `newMoonSign` / `fullMoonSign` facts remain only so older saved compatibility writing still resolves;
- highlight selection is the presence of authored `planetaryHighlights` writing, not automatic ranking of every calculated event;
- dignity meaning, edition storage, Memory Map / AI writing, horoscope embedding, and reader publication are not included;
- PR 874 remains the held documentation source and is not merged by this change.

## Preservation

Existing `sections.calendarOverview` strings remain until the owner edits them or confirms a starter. Choosing the editorial pattern replaces only the template body after confirm. Empty new fields stay empty.

## Verification

- `node --import tsx scripts/test-content-studio-editor-state.mjs`
- targeted Calendar preview browser cases for overview-structure preservation and editorial-structure opt-in
- CSS/token audit after the editor/preview change
