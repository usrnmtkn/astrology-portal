# Loading cards handoff — 2026-10-26

## Source and scope

Implemented the fresh owner-supplied `GitHub app design system (6).zip` loading-state handoff. Archive SHA-256: `d2a9bc6d473dfd7785d2aacfbd49b2ad433a743124fc622b5c30b7fb158a2bda` (27,049 bytes). Its README and HTML are design references; document labels do not authorize content publication or generation.

Local integration branch: `codex/ui-integration-20261026`, HEAD `947523bfc7459c0a5d002f07d170e7e5e04619f5`, **0 ahead / 9 behind** refreshed `origin/main` (`5eddffa5d38ac38b594781f576ba24387d439b6d`). These are uncommitted local changes. No deployment, content publication, account change or paid generation was performed.

## Implemented behavior

- Reader PageLoading now owns card/prose/wheel skeletons; advanced list/cover/settings patterns and Calendar styles stay in deferred page bundles. The existing shared error/retry and asset-recovery behavior is preserved.
- Placement skeletons fill the existing grid track, use one full-size neutral disc, bounded percentage bars and an arc. Planets/Points/Angles headings remain real. Angle placeholders and loaded angle cards stay disabled.
- Reading, feed, person and article-cover variants follow the supplied shapes. Article headings, search and filters remain visible while data loads. In-page report preparation uses the same skeleton treatment.
- Calendar keeps real civil weekday/date labels in day/week/month placeholders; placeholders do not invent lunar or event facts. Month-cell bars have a real width, including mobile cells.
- Inline spacer characters were removed from SkeletonBar: they were creating anonymous rows inside the new grid layouts. Pure bars no longer create large vertical gaps.
- LoadingStatus announces once per pending region. Decorative placeholders are hidden from assistive technology and cannot receive focus. Pulse uses 1.4s / 0.55 opacity; system reduced motion and saved motion Off remove animation. Existing minimum holds and reveal treatment are retained.
- The 48px native orbit is first-launch only. It starts no Lottie or image request. Its cool background reuses the existing startup-paper role; dark surfaces use theme roles.
- Authored bodies, publication eligibility, source selection, calculation policies and the seven private synastry drafts were not edited.

## Verification

Fresh isolated production artifact: `/private/tmp/tldrastro-loading-delivery-dist`, served on port 4296 using the browser suite's synthetic API configuration. The actual local app remains on port 5173. Test fixtures do not change the owner's browser session or production data.

**30 / 30 loading and transition cases passed**:

| Cases | Evidence |
|---|---|
| 8 | All template variants at 320/390/768/1440px × light/dark; bounded bars, avatar/action dimensions, no spacer rows or overflow, reduced motion and saved Off. |
| 4 | Delayed Articles & Guides requests retain the real heading/search/filters; release reveals the complete saved article; reload preserves its final sentence. |
| 2 | First-launch orbit size, theme and reduced-motion behavior; no page-level orbit. |
| 4 | Sky cold load, reload, placement return and background revalidation; full-width grouped placeholders, populated disabled angle placeholders, 48/52px discs, stable resolved reading geometry. Screenshots wait for page snapshot transitions to finish. |
| 8 | Calendar monthly TLDR and Journal five-step save/retry/reload in both themes and widths. |
| 4 | Exact-today Friends content, feed priority, complete detail/back journey, loading/error/retry. |

A separate five-case run also passes the four current Handoff 6 blog filter/empty/error/retry/full-reading journeys and the birthday sidebar during delayed/failed transit reads. Its loading assertion now checks the required hidden status text plus the visible skeleton instead of expecting a visible status label.

Typecheck, CSS/token architecture audits and canonical reader-copy boundary checks pass. The copy audit covers 10,955 rows / 19,217 fields with no findings. All 198 protected files in the original checkout still match the pre-integration preservation manifest.

React review: hooks remain unconditional; errors bypass presentation holds; content requests and publication semantics are unchanged; skeletons have no active controls; no new dependency or illustration runtime was added. Visual review included actual Sky and Blog loading pages plus the template captures, Calendar month cells and startup states.

Local evidence is in `test-results/loading-handoff-2026-10-26/`: provenance, source hashes, JSON results, audit logs, bundle measurements and unedited browser screenshots. The final loading artifact uses the source hashes in that receipt. A broader diagnostic run and its limitations are recorded in the local QA receipt; it must not be described as a green full-repository suite.

## Measured delivery cost

The requested layouts add a small amount of interface code and shared CSS. This is an absolute final-build allocation, **not** a matched-baseline performance comparison or speed claim.

| Metric | Final gzip bytes | Previous cap | New cap |
|---|---:|---:|---:|
| App boot | 392,558 | 392,000 | 392,750 |
| Reader boot including CSS | 448,237 | 447,000 | 448,500 |
| Aggregate CSS | 138,558 | 136,700 | 138,750 |
| Shared deferred Studio/Memory CSS | 30,951 | 30,950 | 30,975 |

Advanced patterns and Calendar CSS were separated from initial reader styling. The remaining cost is explicitly recorded in `loadingCardsHandoff20261026` in the budget file. Startup CSS (55,679), App chunk (87,951), aggregate JavaScript (3,659,734), dependencies, source-payload boundaries and runtime limits remain under their unchanged caps. The normal budget checker passes against the isolated artifact with only its repository/dist paths redirected; budget logic is unchanged.

## Broader diagnostic limitations

The additional 219-case diagnostic completed with **210 passed / 9 failed** on the preceding isolated acceptance build. It is not a green repository-wide result. One failure expected a named, visible transit-loading status; the handoff requires that announcement to be visually hidden. Its assertion was updated to check hidden status text and the visible skeleton, and the birthday loading/failure journey passes in the separate five-case rerun.

Eight older Horoscope assertions remain unchanged and failing: four `horoscope-reader-ux.spec.ts` variants expect twelve button controls in the previous zodiac group, and four `horoscope-reader.spec.ts` variants require the removed “Published edition” label. Their failure output shows the complete fixture reading in the current design. The current Horoscope handoff fidelity, navigation, empty-state and planetary placement journeys pass in the broader run. These eight older specs need a separate update to the current control/metadata contract; this loading implementation does not claim those legacy tests pass.

Final delivery loading tests (30 cases) were rebuilt and rerun after the last Sky glyph/bar/disabled-placeholder refinements. Broader diagnostic output and the focused birthday/blog rerun are retained separately in the local evidence receipt, rather than being merged into a misleading single green count. No production mutation or deployment was used to verify these states.
