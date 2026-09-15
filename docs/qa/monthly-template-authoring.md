# Monthly sentence-template authoring

Implementation scope: owner-only Calendar → Monthly Sky → Open monthly phrase editor.
This is separate from the legacy Calendar overview fields; their saved writing is
not migrated, truncated, or replaced. All horoscope families remain separate.

## Authoring contract

- The main pattern references registered template definitions. Template definitions
  recursively reference templates, literal phrases, calculated values, and bounded
  conditional/repeating sections. Phrase text is never executed as a template or HTML.
- The starter uses monthlyOverview, seasonOverview, planetaryHighlights, separate
  New Moon / Full Moon / solar eclipse / lunar eclipse features, and optional bridges.
  Empty optional templates render nothing. Unknown names and cycles are editor errors.
- Opening and closing seasonal focuses resolve independently. Optional one/two monthly
  themes are editor choices, not an automatic consequence of two Sun seasons.
- Phrase definitions specify grammar and source scope: edition, opening Sun season,
  closing Sun season, or selected event. Literal values may come from a shared value,
  an explicit sign override, a saved Variables-library definition, or an edition override.
- Event phrases bind to calculated event identities, not list positions. Replacing or
  reordering events does not attach old event prose to a new event.
- The full calendar month is calculated on the server through the existing Calendar
  Swiss Ephemeris implementation. It is not a rolling 30-day window. Month/year/timezone
  and a fact fingerprint bind the edition. Calculation algorithms are unchanged.
- Automatic event suggestions are editorial rankings with explanations. The owner
  reviews the lead and up to two supports; Sun ingresses stay in seasonal context and
  daily Moon aspects do not crowd planetary selection.

## Source boundaries

The existing Calendar marks eclipse candidates using its true-node proximity
classification. This authoring adapter preserves that classification and says so
in its provenance; it does not assert an eclipse subtype, contact window, visibility,
or an independently validated astronomy catalog. An eclipse-classified lunation is
routed only to the corresponding eclipse section, not duplicated as an ordinary Moon.

The governed meaning index currently lacks general sign-keyed eclipse targets for
this new phrase authoring path. Those event phrases remain manually editable and
are explicitly excluded from the default AI batch. Selecting them explicitly fails
before a provider call. An ordinary New/Full Moon meaning is never substituted.
The existing lunar or eclipse articles are not rewritten by this action.

The template starter contains sentence frames, not imported third-party articles or
historical dates. No workbook text or new reader prose is promoted by this change.

## AI authoring

Generate monthly draft fills missing unlocked literal leaf phrases by default, or
only the explicitly selected phrase targets. The generator lives in the existing
content-generation service and uses its governed source gates, canonical owner
examples, provider configuration, and role instructions. Dates and event selection
are supplied by the server, not the model.

Repository correction memory is retrieved through the existing memory-map index.
Only current cross-surface and calendar-monthly corrections are eligible; conflicting,
retired, and differently scoped corrections are excluded. Private Studio feedback is
checked when enabled, but the existing card/article families are not widened to Monthly
Sky. A required memory-store outage stops generation before a paid call.

Generation returns a private suggestion and a metadata-only source receipt. It never
saves or publishes. Use suggested phrases changes only the chosen working values.
Changing the edition, template, or values invalidates a suggestion. Protected phrases
cannot be replaced through generation. New wording remains owner-review-only.

## Persistence and release boundary

The dedicated authenticated endpoint stores template and edition documents under
studio-monthly/ in DRAFT/reference rows with empty reader body fields. General CRUD
and reader eligibility reject that namespace. This release adds authoring and saving,
not a new public monthly-page consumer or automatic publication path.

Save reusable sentence templates updates the source for future editions. Save month
draft captures the month-specific template revision, event selection, literal overrides,
and minimal library snapshots. Later library/template changes do not rewrite an existing
edition. Refreshing the loaded library snapshot is explicit. Corrections and private
prompt bodies do not enter saved writing.

Versioned saves use compare-and-swap and stable initial row IDs. PostgreSQL owns the
returned updated_at. A per-write nonce permits read-only reconciliation after a lost
response; writes are not automatically retried. JSONB key order is not treated as a
content difference. Unsaved changes are guarded on close and normal Studio navigation.

## Verification

Run:

    npm run test:monthly-writing
    npm run test:content-studio-api
    npm run typecheck -w @tldr/admin
    npm run qa:css-audit
    npm run build:admin
    node scripts/check-admin-bundle-budgets.mjs
    npx playwright test --config=playwright.monthly-writing.config.ts

Tests use synthetic content, actual handlers, and isolated PostgreSQL for save/version
behavior. Provider tests intercept both API transports and incur no model charges.
Multi-date calculation checks compare the adapter with the canonical Calendar output.
Browser tests cover desktop/mobile, light/dark, nested template preservation, protected
phrases, save/reload, new-year isolation, and conflicts.

Official documentation checked 2026-09-15: OpenAI Structured Outputs (Responses
text.format JSON Schema, strict result shape, refusal handling) and React useEffect
cleanup/race guidance. No dependency or model default was changed.
https://developers.openai.com/api/docs/guides/structured-outputs
https://react.dev/reference/react/useEffect
