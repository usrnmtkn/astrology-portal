# Sky writing systems: current contracts and reference history

Audited September 10, 2026 against `origin/main` at `1994179f` and the supplied
Downloads files. Use a feature name before a revision number. An ingress V5,
a Moon-summary V6, and an August placement voice-review V6 are different tracks.
The highest number across those tracks is not an application release.

## Current contracts

| Feature in Content Studio | Authoritative contract | Runtime and editable source |
| --- | --- | --- |
| Placement composition | [Placement composition, format 5](./SKY_PLACEMENT_V5.md) | `sky-placement/article/{planet}/{sign}#ingress`; shared `resolver/skyIngressComposition.mjs`, consumed by `resolver/skyPlacementV4Canonical.mjs` |
| Placement article / Fallback hooks | Complete article fields / ordered evergreen sections on the same canonical placement | `placementArticle`, motion-specific article fields, `fallback.*`, and the evergreen section layout; selected by `skyPlacementV4Canonical.mjs` |
| Daily Sky Summary | Summary layout, inline sentence-template, and Sun-summary contracts in `apps/web/src/content/skyDailySummaryCatalog.ts` | `cms/sky-daily-summary/*`, consumed by `skyDailySummary.ts`; Studio uses that same composer |
| Daily Sky Moon variants · V6 | [Frozen V6 source](../content-review/daily-sky-moon-v6-source.md) and `apps/web/src/content/skyMoonSummary.ts` | `cms/sky-daily-summary/moon/{sign}/{regular\|newMoon\|fullMoon\|solarEclipse\|lunarEclipse}`; `skyMoonSummaryBank.json` supplies the bundled defaults, while `skyMoonSummarySources.json` records source provenance |

The placement contract covers Sun, Mercury through Pluto, and Chiron. Moon,
Lilith, and the nodes retain their specialized placement structures. A proposal
for one of those systems does not replace the others.

`apps/admin/src/skyWritingSystems.ts` is the small editorial reference catalog
displayed under **Writing system & versions**. It is not a serving switch or a
publication database. Update this index and that catalog together when a
feature's authoritative contract changes. Preserve existing document paths for
links; `SKY_PLACEMENT_V5.md` keeps its historical filename.

## What the reader selects

For canonical placement pages, the first eligible published body wins:

1. Complete article for the calculated motion.
2. Shared complete article.
3. Enabled placement composition with its required modules resolved.
4. Evergreen fallback sections matching the motion, in their saved order.

TLDR, retrograde opening, calculated dates, and occurrence additions have their
own sources. Complete articles can be evergreen authored passages; they are not
necessarily dated editions. Sentence composition supplies a complete body from
named sources and executable templates. Fallback hooks are ordered evergreen
sections, not source aliases inside the complete-article field.

Studio's **Saved preview** can contain saved drafts. **Draft preview** in the
editor can contain unsaved changes. Neither chooses or proves the published
reader path. A **Live** badge comes from the existing source-eligibility check;
it does not mean every field is selected. **Open published reader** checks the
actual reader route. **Preview evergreen in app** explicitly forces that preview
path and is separate from the published-reader control.

Enabling a draft does not publish it. Save draft preserves the work; the normal
publication action and validation remain necessary. Proposal, superseded, and
historical labels below describe documents, not permission to retire prose.

The V6 Moon implementation merged in [#738](https://github.com/usrnmtkn/astrology-portal/pull/738).
It selects one regular, lunation, or eclipse source for the selected day. Missing
entries remain empty; they do not reuse the older Moon fields. Published owner
edits can override the bundled passage at the same key. The frozen source hash
matches the received V6 file in the ledger below. This version panel documents
that existing implementation; it does not perform another content import.

## Reference ledger

These are file modification times in America/New_York (EDT), not proof of
authorship, editorial approval, or deployment. Originals remain untouched in
the owner's Downloads directory. Hashes identify the exact received files.

| Reference file | Modified September 10, 2026 (EDT) | Relationship |
| --- | --- | --- |
| `planet-ingress-madlib-system-full.md` | 02:03:46 | Earlier ingress proposal |
| `planet-ingress-madlib-system-v2-project-author-language.md` | 02:05:25 | Earlier ingress proposal |
| `planet-ingress-madlib-system-v3.1-fixed.md` | 02:16:28 | Superseded ingress proposal |
| `planet-ingress-madlib-system-v4-project-author-deterministic.md` | 02:30:37 | Superseded ingress proposal |
| `planet-ingress-madlib-system-v4-project-author-deterministic (1).md` | 02:30:41 | Byte-identical duplicate of V4 |
| `planet-ingress-writing-system-v5-owner-author.md` | 02:43:39 | Latest supplied ingress proposal; implemented scope is defined by the format-5 contract above |
| `daily-sky-summary-moon-system-v5-source-locked-project-author.md` | 11:21:52 | Earlier Moon-summary proposal, unrelated to ingress V5 |
| `daily-sky-summary-moon-system-v6-owner-phrases-audited.md` | 11:31:02 | Latest supplied Moon-summary source; implemented in #738 with 35 populated and 25 empty entries |

SHA-256, in the same order (the two V4 copies share a hash):

```text
full   71d0a8f6f56fdccf6b6654f87dcf6117f97e353474ae567f83e3fb8a9ce8c8ab
v2     6f436b959c207f2995effcab9a2077ba8ba96269de31e064e5ef01b2941c469c
v3.1   df44650aca7cb76c406cd448fc7cf357963cffee6966acce52fcddf6b0ed9bf7
v4     b4f1df405e987cab40a6934c049789dfd48afb44f0725eec9301a3421ece34e9
v5     d55b79c35f78370cb3f06d47bbaeb922c9f5d66574b08e30736cca9ca7f8ef8e
moon5  3353e3c239e3142a9696307c094b9283b4d4a1373df88b2de95a85c9041b17b6
moon6  06a5fc3332bccb9d86c3964beb95cbba4563b477ae51ba252f18140ccd2e9ee3
```

The August 2 placement V6 voice review is separately recorded in
`packages/astro-knowledge/docs/sky-placement-voice-pass-v6-targeted-review-2026-08-02.md`
and `packages/astro-knowledge/review/sky-placement-voice-pass-v6-targeted-candidates.json`.
That bundle declares `needs_review`, `voice_pass_draft`, and
`promotionAuthorized: false`. It is a historical review, not the next ingress
composer. Do not infer serving state from a filename or move an active runtime
artifact into an archive because its directory contains an older version number.

## Maintenance

When a proposal changes, identify its feature, compare exact text and timestamps,
and update its reference relationship. When implementation changes, update the
feature contract and verify the current source, generated artifact, and runtime
consumer. When prose changes, follow its own review and publication workflow.
Keep all three events distinct; no automatic migration or promotion follows from
adding a document to this index.
