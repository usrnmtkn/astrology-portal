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
