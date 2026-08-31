# SKY V4 reader serving release verification

Date: 2026-08-31

## Immutable release boundary

- Canonical package: `SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30`
- Canonical JSON SHA-256: `9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750`
- Owner-approval ledger: `sky-v4-reader-copy-280-owner-approval-v1.json`
- Released-key-set SHA-256: `b641e7bc7abe4bb8018500b7da8488ff08dfe83a6325d6df71d311f83e12f17b`
- Serving-release ledger SHA-256: `3ef1c6829b1133f9d52a82a64647356090988da2eca90a1512299dfbb67e1c63`
- Reader-copy drift: `0`
- Serving records: `280/280`
- Configuration records kept dark: `25/25`

## Released counts

| Content type | Count |
| --- | ---: |
| continuous-placement | 120 |
| new-moon | 12 |
| full-moon | 12 |
| eclipse-event | 4 |
| eclipse-fallback | 48 |
| generic-eclipse-fallback | 4 |
| node-axis | 12 |
| node-module | 24 |
| node-education | 1 |
| lilith | 12 |
| lilith-station | 1 |
| retrograde | 9 |
| overlay | 9 |
| seasonal | 12 |
| **Total** | **280** |

## Product-surface reachability

- Resolver reachability: `280/280` released records resolve through a governed selector or exact content key.
- Product-surface reachability: `193` records are direct pages or composed sections; `87` are conditional children of a real placement, lunation, eclipse, Node, or Lilith surface.
- Direct page/section families: continuous placements, New Moons, Full Moons, Node axes, Node education/modules, and Lilith articles.
- Conditional families: exact/sign-aware/generic eclipse records, contextual overlays, retrograde modifiers, the Lilith station condition, and hemisphere-aware seasonal context.
- No released record depends on a standalone artificial route. Conditional records render only when their governed trigger matches.

## Representative production-reader routes

| Case | Selected canonical key | Resolution / conditional evidence |
| --- | --- | --- |
| continuous Sun | `sky-placement/article/sun/leo` | canonical article |
| continuous Mercury | `sky-placement/article/mercury/gemini` | canonical article |
| Venus contextual overlay | `sky-placement/article/venus/aries` | overlay `sky-context/venus/aries/retrograde/mercury-retrograde-aries` selected after base article |
| placement retrograde | `sky-placement/article/mercury/aries` | released Mercury retrograde condition selected only when retrograde |
| governed aspect | `sky-placement/article/venus/virgo` | existing approved `fallback-hook/sky-aspect-sign/venus/virgo/trine/saturn/capricorn`; placement heading remains `Aspects shaping this transit` |
| New Moon | `sky-lunation/new-moon/gemini` | canonical lunation |
| Full Moon axis | `sky-lunation/full-moon/taurus` | canonical Taurus Moon / Scorpio Sun axis |
| exact eclipse | `sky-lunation/solar-eclipse/2025-09-21-virgo` | exact-event |
| sign-aware eclipse fallback | `sky-lunation/fallback/solar-eclipse/south-node/virgo` | sign-aware-fallback |
| generic eclipse fallback | `sky-v4/eclipse-generic/solar-eclipse/south-node` | generic-type-node-fallback |
| Node axis | `sky-nodes/axis/aquarius-leo` | exact current axis on the Node placement surface |
| North Node module | `sky-nodes/north-node/aquarius` | exact current module |
| South Node module | `sky-nodes/south-node/leo` | exact current module |
| Lilith article | `sky-lilith/article/sagittarius` | exact article |
| Lilith station | `sky-lilith/station` | selected only when calculation reports station support |
| seasonal context | `sky-placement/seasonal-context/aries/northern` | exact sign and hemisphere |
| zero optional conditions | `sky-placement/article/sun/taurus` | canonical article; no empty optional headings |

All 17 cases selected the approved serving baseline, never a draft. No natal-placement substitution or generated unapproved prose appeared. Overlay/aspect arrays contained no duplicates. The eclipse chain resolved in the required order: exact event, sign-aware type/node/sign, generic type/node, then facts-only.

Every one of the 280 released records also passed a direct production-reader-boundary reachability check. No approved record is structurally unreachable. Conditional records remain intentionally dormant until their governed fact or trigger matches.

## Real application surfaces integrated

- Sky Placement detail: canonical article, contextual overlays, retrograde/Lilith station conditions, seasonal context, rising-sign layer, and the existing governed aspect layer.
- Calendar selected-day detail: New Moon, Full Moon, exact eclipse, and the governed eclipse fallback chain.
- Sky Next Lunation detail: the same canonical lunation/eclipses resolver used by Calendar.
- Node placement detail: Node education, exact current axis, and matching North/South module.
- Lilith placement detail: exact canonical Lilith article plus calculated station copy only on the station day.

Browser routes assert the canonical body itself in the DOM and reject natal-placement substitution, generated unapproved prose, duplicate conditions, and the superseded Sun-in-Virgo generic paragraph. Placement aspects retain `Aspects shaping this transit`; lunation/eclipse aspects use `Key aspects`.

## Content Studio lifecycle

The approved serving baseline remains `LIVE`. Editing a released SKY V4 record forks a separate `studio-draft` row with event type `sky-v4-reader-copy-draft`; the draft is non-serving and cannot replace the baseline without a later owner approval and release.

The 24 template records and `sky-v4/settings/contextual-overlays` remain configuration-only, `needs_review`, `owner_approved=false`, and `serving_enabled=false`. Existing aspect governance was not changed.

## Generated artifacts

- `dist/tldr-content.js`: `9127ac3070fa64e7bcb9828ec9176dd5ae6b49635ac50f3c5f1f00ae4d031629`
- `bundled-manifest-v3.json`: `d2dbfa66b245ab69ee3b7848072663f8b559d659f16689719f3b08125413b3b1`
- `content-book.html`: `c4c568786d8a082acbb3d8dd5bc0be3d896c9f464a8c9a31855892bf75f0130a`
- knowledge index: `ff9020ef5c4da073b31fbe4f176ebb615ffea0a3318992bbd5d9b351daf843c1`
- production Sky kernel comparison: `c6a2de39ff2077dce10fab87641913fe62af6ff55d7c8d4b2470dce79a3911e5`

## Verification

- Full governed content suite: all SKY V4, governance, schema, grammar, placement, aspect, Calendar, report, and affected reader checks PASS. The wider suite stops at the documented current-main knowledge-matrix V13 baseline (`291 !== 301`); the same failure reproduces from clean `origin/main` `912a5cfe`, and this PR changes no matrix files.
- SKY V4 canonical/package/approval/release tests: PASS.
- 280-record direct reachability and 17-route reader-runtime suite: PASS.
- Content Studio contract and preview API: PASS.
- Content Studio API round trip: PASS; draft hidden from reader.
- TypeScript: PASS.
- Production web build: PASS.
- Web bundle budget: PASS under the CI environment. The immutable canonical corpus is emitted as an on-demand JSON asset; it is not part of the reader boot graph. App boot is `383.7 kB` gzip, reader boot is `430.6 kB` gzip, and total JavaScript is `2.69 MB` gzip. The total-JavaScript allowance increased by exactly `1 kB` for the deferred product-surface resolver; the app and reader boot limits did not change.
- Deferred Sky Placement runtime parity: PASS in both supported module forms. Vite loads the canonical corpus through its on-demand asset URL; the Node/esbuild startup-contract harness consumes the parsed JSON module without attempting an invalid URL fetch.
- Focused real-product browser suite: PASS (`9/9`): ordinary placement, contextual overlay + retrograde, governed placement aspects, New Moon, Full Moon, exact eclipse, sign-aware eclipse fallback, current Node axis/North/South modules + Lilith, seasonal context, and exact-day Lilith station. The first GitHub Visual smoke run exposed a missing screen-reader-only `Aspect details` hierarchy heading; that accessibility contract was restored without changing any reader copy, and the failed hierarchy case plus all focused SKY V4 routes pass locally.
- GitHub CI: pending after push; merge remains blocked at the final serving review wall.
