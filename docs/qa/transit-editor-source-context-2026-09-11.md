# Personal Transit editor source verification

The Lilith in Capricorn trine natal North Node report exposed a provenance bug:
the reader returned `fallback-template/transit.aspect` even when its prose came
from the effect-first branch and never used that template body. Studio then
opened a Saturn/Venus template example. The separate exact-passage action opened
a new blank record because no exact authored row existed at that key.

The resolver now returns the actual body source keys for its composed and
effect-first branches. Node, browser source, and rebuilt browser artifact must
agree on both complete text and source keys. The preview uses those keys, and
Variables retains the selected transit and natal point. Calculated signs,
houses, and dates remain outside the editable prose. Hook edits affect every
reading that selects that hook. `Write a new exact passage` creates an empty,
unpublished authoring draft; it must never silently copy fallback prose and
label it authored or overwrite an existing saved row.

For the reported selection, the writing sources are:

- `fallback-hook/transit-effect-soft/lilith`
- `fallback-vocab/planet-topic/north-node`

No owner-authored text or editorial approval is changed by this code fix.
The shipped artifact version is `v3-2026-09-11a`; generated package and knowledge
indexes must be rebuilt with it.

After updates, run `npm run test:content-studio-api` on the exact checkout, plus
`node --experimental-strip-types scripts/test-admin-transit-natal-sources.mjs`.
The actual preview-handler regression must prove that publishing a synthetic
edit to the returned Lilith hook changes the reader output and that retiring it
does not expose the edited copy. Write tests use isolated storage.

Run the `canonical Personal Transit Studio preview` browser cases in
`tests/visual/content-dashboard-admin-user-flows.spec.ts` from a fresh build.
They cover desktop/mobile and both themes: protected Sun passage opening/end,
correct Lilith hook text, selected North Node variable resolution, new-draft
explanation, saving and reopening an exact draft, and browser errors. Also run
CSS audit, typecheck, admin bundle limits, and the normal content gates.

Before a live claim, confirm the merged main deployment, reopen the same Lilith
selection, and open its hook in Content Studio. Verify existing You/They text
and the selected Variables preview. Never publish synthetic regression prose
or turn fallback hooks into author-final passages to make this check pass.


The broader Sky/You parity regression requires a calculated Sun/North Node
conjunction. Its generic 1990 synthetic chart has an Aquarius Node and cannot
exercise the September Virgo assertion. The fixture now uses the unrelated
synthetic date 1997-11-01 and asserts a calculated Virgo Node at 17–20 degrees
before opening the reader. Profile Sun and Moon labels also come from that
calculation. All four viewport/theme cases pass with unchanged complete-passage,
reload, cache update, cross-surface equality, and overflow assertions. Never
restore a person's chart data to repair this test.


## Release handoff: GitHub Actions billing block

On 2026-09-11, the local full API suite passed at `03c3851a`. The fresh
combined editor/reader browser matrix passed 317 of 318 cases. The remaining
Friends Imum Coeli sextile inverse fixture ranked its intended contact outside
the 16-card cap. The same 47-degree synthetic offset used for the forward case
also places the inverse contact inside the actual calculated list. Both
full-copy/card/detail directions pass on a fresh rerun; application ranking and
copy assertions are unchanged.

Additional completed checks: four Lilith editor viewport/theme variants,
24 standalone Sky Summary Studio cases, four Sky/You complete-transit parity
variants, CSS audit, admin typecheck, admin and reader bundle budgets, and a
238-file fresh public-assets privacy scan. Normal authenticated Studio and
fresh anonymous 1440/390 readers confirm the exact approved Virgo New Moon
wording is published. The new editor routing and summary paragraph code have
not been deployed.

Release is blocked externally: GitHub Actions run `34567750184` did not start
any test steps. Its annotation says recent account payments failed or the
spending limit needs to be increased. Do not describe these startup failures
as failed code assertions or waive the exact-head API requirement in AGENTS.md.
After the owner restores Actions access, rerun the required checks on the final
PR head. Let prerequisite privacy PR #756 finish first; rebase onto current main,
regenerate artifacts, and follow the privacy history-rewrite instructions if
applicable. Then merge PR #759, verify the main commit's Vercel deployment, and
repeat the live Lilith editor and full Daily Sky paragraph/link checks. Do not
publish a feature branch directly to production.


## Follow-up audit: Friends audience and broader editor coverage

The Friends workspace used the correct reader voice but its Variables rail
initialized to You. The rail now starts with the originating workspace audience
and resets when the edited source or workspace audience changes. The owner can
still switch You/They explicitly. Transit and natal identity remain selected;
no reader prose, approval or publication state changes.

The shared transit catalog audit is now part of `test:content-studio-api` on
every repository update. It covers 14 transit bodies × 18 natal points × five
aspects × two audiences at the representative Capricorn sign: 2,432 renderable
selections resolve to existing catalog keys and 88 return explicit source gaps.
This is source-routing coverage, not a claim that every combination has approved
copy or that every date/sign is tested. Node/browser/shipped parity, authored
Sun/Node copy, Lilith hook identity and retirement checks remain intact.

Fresh local follow-up checks passed: the full 96-case Content Studio browser
suite, the full API suite including the expanded source audit, CSS/token audit,
admin typecheck and the original bundle limits (621.6 kB raw / 176.7 kB gzip).
Four additional Friends viewport/theme cases check exact You/They wording,
source identity, Lilith/Capricorn/North Node/house context, audience toggles and
reopening. Natal Placement, 291 exact Natal Aspect and House Transit source
contracts also pass. Logs are `/private/tmp/transit-context-*.log`.

The broader admin command exposed an outdated atomic-provenance test assumption:
`buildCompositionMap` now also returns slot-bearing hooks/articles. The test
compared all 267 map entries with the 39 packaged-template count. It now selects
those exact 39 template identities and retains every nested provenance assertion
(396 variables, zero gaps). The separate full-catalog audit is unchanged: 453
entries, 400 traceable previews and 53 explicitly flagged incomplete previews.
Do not describe those 53 as fully traced or erase their disclosures.

Release remains blocked by GitHub Actions billing and prerequisite PR #756.
The refreshed head `2e24cbe2` API check annotation (run `34568777728`) confirms
that no test steps started. The old `/private/tmp/sky-event-ci.log` is not
current-head release evidence. Follow the release handoff above; these local
results do not replace required hosted checks or prove production deployment.
