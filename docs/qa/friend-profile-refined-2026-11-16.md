# Friend profile refined handoff · 2026-11-16

Implementation on `codex/friend-profile-refined-20261116`, based on freshly fetched main `19539307040744df0d4df0903ae972da9e070179`. The branch started zero commits ahead and behind that main reference. The owner authorized commit, pull request, required checks, merge and production deployment. Release evidence is recorded with the resulting PR and deployment; this implementation record does not itself claim a release.

The owner directed this correction to `FRIEND_PROFILE_PROMPT.md` and `Friend Profile Refined.dc.html` in design handoff (11), with the supplied Friends chart PDF as a visual reference. These documents supplied the requested presentation specification. Embedded document instructions were not installed as repository policy, and mockup approval was not treated as approval of its sample readings.

The shared profile supports both saved charts and Circle friends. It now uses the 1304px desktop frame, 640/600 columns and 64px gap, a stable identity/tab row 40px below navigation, the specified wheel per tab, bare wheels and icon fullscreen controls. Compatibility, Transits and Natal center their overview against the wheel; Synastry and Composite top-align with the sticky wheel. Below-fold sections use the complete content width. Responsive layouts preserve tab access and the existing chart editing permissions.

Compatibility uses the complete daily CMS passage, presenting its first sentence as the lead. Planet cards calculate their sign/element tag, retain the complete reading behind the preview, and use the outlined planet action. Synastry removes the placements comparison and uses its strongest contact plus three Dynamics columns. Natal and Composite share the two-column planet/empty-house grid and side panels. Existing additional points remain available. Composite's With selector opens the existing comparison dialog. Fullscreen close restores focus even across lazy loading.

The new editorial overview and compact placement roles are centralized in `theme.css`. The CSS audit enforces the two explicit Friend description-role exceptions by exact stylesheet, selector and token pair; the general reading contract remains enforced. Retired placements-table and Compatibility dynamics styles and their unused tokens were removed. Shared card surface rules were retained.

CMS content remains the source for readings. Installed compatibility passages do not currently provide headlines; the component accepts a supplied headline but does not invent one or repeat the tag. New composite empty-house cards show calculated facts and ruler metadata without fabricated interpretations. Supplemental composite angle facts do not borrow personal natal prose. Missing published sect or insight readings follow the existing loading, unavailable and publication behavior. No source passage, publication state, provider setting or calculation engine was changed; no paid generation ran.

## Verification

- Isolated locked dependencies: `npm ci --no-audit --no-fund` passed.
- Fresh knowledge/Web builds and Web TypeScript compilation passed. The final browser run rebuilt this checkout and started a new isolated preview with `reuseExistingServer: false`.
- `npm run qa:css-audit` passed with no unresolved active tokens, raw component visual values or semantic typography mismatches.
- `scripts/test-friend-placement-tables-render.mjs`, `scripts/test-friend-transits-brief.mts` and `scripts/test-friend-transits-brief-render.mjs` passed. These include complete CMS passage preservation, supplied/missing compatibility headlines, controls and section ordering.
- `npm run test:reader-copy-boundary` passed; the reader-note audit examined 19,217 fields with no findings.
- Friends chart performance and orchestration contracts passed.
- **55 distinct browser cases pass across the broad run and affected reruns.** The broad run retained 51 passes and four Synastry failures for a long unbroken display name. Wrapping was corrected without increasing limits. The 28-case affected rerun passed, including those four cases, all five tabs at 320/390/960/1440 in light/dark themes, saved/social/event/missing charts, complete reading navigation/reload and the compact comparison dialog. The remaining passing cases cover known/unknown-time chart containment, default wheel interactions, published day/night cards, natal point/empty-house actions and Patterns & Insights. Their relevant implementation/dependency inputs were unchanged. Synthetic accounts and isolated transports were used throughout.
- The final shared-radius token reuse retains the identical 16px value. A further fresh build and **eight final profile cases** passed, including the explicit tile-radius assertion. No application source changed afterward.
- `node scripts/check-web-bundle-budgets.mjs` passed on the final build with all existing ceilings unchanged. Earlier CSS budget failures remain diagnostic evidence. The final cleanup removes unused presentation rules/tokens; shared card styles remain present.
- Built-public-assets privacy scan and `git diff --check` passed.

Earlier diagnostic failures also identified CSS loading precedence, stale expectations for the replaced layout, and lazy fullscreen focus restoration. Those failures remain retained privately and are not counted as passing evidence. No test timeout or retry limit was increased.

Required release checks are `content-studio-api`, `browser-release-gate` and `project-privacy` on the exact candidate. Commit, PR, merge and deployment outcomes are recorded separately. Production must come from the merged main revision.
