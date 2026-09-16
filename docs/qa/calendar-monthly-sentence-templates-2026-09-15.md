# Calendar monthly sentence templates — Step 3

## Scope

This is Step 3 of the owner-requested monthly authoring system. It changes only the existing Monthly Sky overview editor and preview contract:

- `monthlyOverview` and `seasonOverview` remain the existing saved fields and content key;
- each field may now hold a reusable sentence pattern containing smaller variables;
- the editor offers opt-in starter patterns and never auto-converts an existing saved passage;
- primary and secondary monthly themes use separate flat conditional blocks;
- the lead-event sentence uses its own flat conditional block;
- `monthName` is a calculated preview fact;
- weekly authoring remains unchanged.

Phrase values are intentionally not bound or persisted in this step. Event selection, lead-event facts, season phrase lookup, monthly edition storage, lunar/eclipse routing, Memory Map retrieval, AI generation, fallback assembly and publication remain later steps.

## Preservation rules

An existing `sections.calendarOverview.monthlyOverview` or `seasonOverview` string remains byte-for-byte until the owner explicitly chooses the matching starter or edits the field. The starter action confirms before replacing a non-empty, different value. Calculated facts remain literal values and the Step 1 recursive overview resolver continues to stop circular references.

The starter does not use the retired catch-all `monthlyFocus`. Month-specific themes use `primaryMonthlyThemeFocus` and optional `secondaryMonthlyThemeFocus`; zodiac-season language uses separate opening/closing season phrase variables.

## Bundle allocation

The CI-configured Admin production build for this feature measures approximately **484.2 kB aggregate JavaScript gzip**, against the prior **483.5 kB** cap. The initial entry remains approximately **180.1 kB gzip**, inside its unchanged 180.25 kB cap. The change is confined to the existing deferred Calendar preview/editor chunks and adds no dependency, reader bundle, ephemeris payload or new route.

Allocate **1,000 aggregate gzip bytes** for this requested authoring feature, raising only `totalJavaScriptGzipBytes` from 483,500 to 484,500. Entry, raw-entry, largest-chunk, memory-graph, CSS and forbidden-payload limits remain unchanged.

## Verification

The Content Studio contract test covers:

- Step 1 recursive overview resolution and literal facts;
- Step 2 phrase registry boundaries;
- opt-in monthly/season starter availability;
- absence of starters from weekly authoring;
- no `monthlyFocus` regression;
- preservation of existing saved prose;
- primary, secondary and lead-event template rendering;
- opening/closing season rendering; and
- calculated `monthName`.

Release checks also include the Admin TypeScript/build gate, bundle budgets, project privacy, ephemeris release gate and the existing Content Studio/browser smoke suites. No production content row is written by these tests.
