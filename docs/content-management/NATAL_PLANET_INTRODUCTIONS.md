# Natal planet introductions

Content Studio keeps `fallback-hook/planet-lived/{planet}` in **Sky Write-ups →
Sky Placement**, labelled **Planet lived**. The seven existing sources (Moon,
Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto) remain editable across sign
and motion filters, including packaged sources with no saved Studio row yet.
Their complete source copy and publication state are preserved. These keys are
excluded from Natal Chart inventory and the natal composition map; natal short
introductions use the dedicated keys below. An already-open browser tab must
reload after deployment to receive changed Studio navigation.

Natal placement compositions select `fallback-hook/natal/planet-intro/{planet}`
for the optional `planetIntro` slot in both You and Friend views. Content Studio's
Natal Chart source cards, preview dependencies, template variable links, and
canonical natal composition slots use that same identity.

These sources begin with the complete previously approved `planet-intro` You and
Friend wording, reused without editing. Each new row records the original key,
source revision, and hashes of both passages. The original `planet-intro` and
`planet-lived` rows remain unchanged. Neither family is an introduction fallback
for a natal composition. A missing or unapproved natal introduction leaves the
optional slot empty; it does not import the general planet paragraph.

This routing repair does not alter complete authored placement overrides,
sign-specific or house-specific sources, angle sources, or the canonical V13
knowledge-matrix archive. The `lived` suffix alone does not determine a source's
surface or eligibility.

Edit the new sources through **Content Studio → Natal Chart → Planet placements**.
Choose the planet and a sign, then edit the planet's **introduction**. The same
source applies across composed natal sign placements. A complete authored
placement passage retains precedence. Saving creates a draft; publication is
required before revised copy reaches the reader.

If the new source has no saved Studio row yet, choose **Load and edit** to open
the complete packaged introduction, then **Save**. It will then support inline
editing in the natal source card.

Validation covers the Node, browser-source and shipped resolvers; both audiences;
source discovery; package publication and reader hydration; and Studio edits
after reload. The fix does not require changing or rematerializing the original
generic rows in the live database.

## Local acceptance, 2026-10-06

Tested in an isolated worktree with its own `npm ci` installation and generated
knowledge package. Final browser build: local changes on `22ad3aec2`, branch
`fix/natal-planet-introductions`, aligned with `origin/main`. No deployment or
owner database writes were performed.

| Criterion | Result | Evidence |
| --- | --- | --- |
| Natal source discovery and first save without a saved row | Passed | Actual-handler Studio browser fixture: Saturn and Neptune, Load and edit → Save → reload |
| Existing source editing, draft isolation, publication, and reload | Passed | Four desktop/mobile and light/dark Studio cases; both audience fields |
| Actual rendered natal reader uses dedicated intros after reload | Passed | Fresh web preview, Saturn Aries and Neptune Capricorn; desktop light/mobile dark |
| Complete authored passages retain precedence | Passed | Chiron reader route; 195 governed natal rows and Node/browser/shipped parity |
| Missing/unapproved natal intro cannot import general lived copy | Passed | `test:natal-planet-introductions`, both audiences and browser/shipped renderers |
| API persistence, publication, stale-edit rejection, reader hydration | Passed | `test:content-studio-api`, including dedicated Saturn/Neptune cases, isolated storage |
| Existing source copy remains unchanged | Passed | All pre-existing rows and metadata compared with Git; exact source hashes checked |
| Generated manifests, canonical slots, and source coverage | Passed | Manifest check, canonical check and targeted canonical tests, composition surface coverage |
| Typechecks, web/admin builds, CSS audit, reader-copy boundary | Passed | Local build and audit commands |
| Production deployment and live editor | Unverified | Local changes only |

The final fresh-preview browser run passed all nine tests in
`playwright.natal-introductions.config.ts`. The complete API suite passed on
`1d8045f17` plus these changes; subsequent main changes did not touch natal
sources or the tested API implementation. Targeted natal and canonical checks
and the full browser run passed again after the fast-forward. Release reruns of
the complete API suite, exact-head CI, and deployed verification are recorded in
the release PR.

The full content gate is **not green** in this environment:

- `test:content` stops in report-generation prerequisites because protected
  private report documents are not configured.
- `test:canonical-content` reaches a pre-existing known-failure fingerprint
  mismatch (240 observed versus 243 recorded). The complete failure multiset
  is identical on the unmodified `1d8045f17` baseline and this change.
- Additional adjacent checks reproduced existing baseline failures:
  `test-empty-house-refinement.mjs` cannot resolve a relative module from its
  data-URL test loader; `test-fallback-refresh-wiring.mjs` expects an outdated
  Chiron/Jupiter transit opening. These checks were not relaxed.

Regenerating the previously stale canonical index also refreshed existing
authored inventory counts (352 You, 60 Friend, 493 eligible exact rows, and
2,771 authored keys). These are current source inventory values; the fourteen
new intro hooks do not create new complete authored passages.

## All-placement introduction audit

The expanded `test:natal-planet-introductions` audit passes for all fourteen
planet/point introductions: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn,
Uranus, Neptune, Pluto, Chiron, Lilith, North Node, and South Node. Each uses
`fallback-hook/natal/planet-intro/{planet}` in the Studio source card, preview
dependencies, and composed reader paragraph. The generated package preserves
every reader and eligibility field and includes each key in the publication
manifest. Deferred hooks omit only editor annotations (`note`, `notes`, and
`source_migration`) from browser downloads; complete authoring sources, migration
receipts, and source hashes remain available to Studio and the lineage index.
This keeps the new natal sources within the existing bundle-size limit without
changing any reader wording or increasing the budget.

The audit covers 8,112 placement cases across all twelve signs, no house or each
of twelve houses, supported motions, and You/Friend voices. Node, browser-source,
and shipped resolvers agree: 6,877 cases use the composed natal introduction and
1,235 retain the complete authored passage. A further 672 forced-composition
checks prove the correct natal source is selected even where an authored override
usually hides it; missing or unapproved intros never fall back to shared copy.

All 96 angle/sign/audience cases also pass. Ascendant, Descendant, Midheaven,
and IC correctly retain `fallback-hook/angle-intro/{angle}`; these are dedicated
natal angle introductions, not planet or Sky introductions. No additional
misrouted short introductions were found in this local revision.
