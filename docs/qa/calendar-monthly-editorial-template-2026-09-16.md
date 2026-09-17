# Calendar monthly editorial template wiring — 2026-09-16

## Scope

This installs the monthly overview editorial layout into the existing Content Studio Monthly Sky workspace without converting saved writing or publishing a reader edition.

Included:

- Step 2a/2b phrase and nested-template definition validation, resolved in Calendar preview only when names are not reserved calculated facts or overview fields;
- opt-in **Use monthly editorial structure**, separate from the existing overview structure;
- new monthly fields for seasonal opening, selected planetary highlights, independent New Moon and Full Moon writing, and optional lunation connection;
- three alternative seasonal-opening starters and lunation/eclipse starters;
- calculated `hasNewMoon`, `hasFullMoon`, eclipse flags, `entryDate` / `exitDate` from the opening Sun visit, and `hasSeasonTransition` from a closing ingress.

Deliberate boundaries:

- default Monthly Sky pattern, labels `Monthly overview` / `Season transition` / `Lunar cycle` / `Planetary changes` / `Closing passage`, and Step 3 starters stay for compatibility;
- `seasonOverview` remains the existing saved season-transition field; the spec opening uses the new `seasonOpening` field so saved transition prose is not remapped;
- lunation starters use `newMoonDate` / `newMoonSign` and `fullMoonDate` / `fullMoonSign` because the current preview resolver is flat and cannot give `signTitle` / `eventDate` a per-section context yet;
- highlight selection is the presence of authored `planetaryHighlights` writing, not automatic ranking of every calculated event;
- dignity meaning, edition storage, Memory Map / AI writing, horoscope embedding, and reader publication are not included;
- PR 874 remains the held documentation source and is not merged by this change.

## Preservation

Existing `sections.calendarOverview` strings remain until the owner edits them or confirms a starter. Choosing the editorial pattern replaces only the template body after confirm. Empty new fields stay empty.

## Verification

- `node --import tsx scripts/test-content-studio-editor-state.mjs`
- targeted Calendar preview browser cases for overview-structure preservation and editorial-structure opt-in
- CSS/token audit after the editor/preview change
