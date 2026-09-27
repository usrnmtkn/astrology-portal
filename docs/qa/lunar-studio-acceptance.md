# Lunar Studio acceptance

Scope: Calendar Write-ups → New & Full Moons & Eclipses, including existing
Calendar readings and the dated generation workflow. A saved database row,
successful build, or completed provider response alone does not satisfy this
workflow. Evaluate the owner journey in the deployed editor before calling it
ready for review. Editorial approval of generated prose remains the owner's.

| Acceptance criterion | Required evidence |
| --- | --- |
| Earlier New Moon and Full Moon readings are visible in the consolidated Calendar section. | Saved write-ups lists all twelve signs for both phases; no Daily Sky filter workaround is required. Draft and published sources remain available. |
| Lunar journal and eclipse entries remain discoverable. | Event readings lists those existing entries without mixing in season or leftover Moon-sign sources. |
| Opening an entry preserves the complete saved writing. | Compare the editor's full body with storage, including opening and final text, and confirm browsing makes no content mutation. |
| Editing an existing entry survives save and reload. | Actual-handler browser regression uses isolated storage and exact saved draft bytes. Opening a generation workspace does not replace a reader source. |
| Generation has a clear start and stable progress. | Calculated event → saved plan → explicit Generate draft; multiple pending polls do not disable/re-enable the whole form, and completion opens persisted text. |
| Reloads and errors preserve the same request. | Test reload, transient retrieval failure, terminal failure and completion in another tab, with provider-call counts. |
| Navigation, layout and empty states work. | Desktop/mobile, light/dark, direct link/reload, no-match/reset, accessible headings and shared typography, no horizontal page overflow. |
| Release evidence matches the delivered revision. | Local full Content Studio API gate, exact-head hosted API success, fresh browser suite, CSS and bundle gates, READY main deployment, repeated deployed flow and read-only real saved-row checks. |

Regression: `tests/visual/lunation-studio.spec.ts` covers the saved library and
reusable writer; `tests/visual/lunation-writing-studio.spec.ts` covers the dated
writer. Both run through `playwright.lunation-studio.config.ts`. Write tests use
isolated storage, including when verifying production assets. Do not rewrite,
publish or generate real owner content merely to obtain acceptance evidence.

The September 27 recheck identified a navigation gap: all 24 reusable readings
were saved and reachable through Daily Sky, but the consolidated lunar section
exposed writing workspaces without the existing library. Saved write-ups brings
the original entries into that section using the existing inventory and editor;
it does not copy or migrate the prose. Test and deployment results are recorded
in the release PR, with any remaining failed or unverified criteria stated.
