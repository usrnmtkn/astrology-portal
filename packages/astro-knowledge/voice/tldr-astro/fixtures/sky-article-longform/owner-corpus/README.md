# Owner article corpus

This directory contains article bodies extracted from the owner's published
Marie Satori site mirror. It expands editorial coverage without silently
changing the active long-form judge calibration set.

The cohorts have distinct purposes:

- `calibration-candidates`: new same-surface examples proposed for a future,
  explicitly versioned calibration set;
- `diagnostic-same-surface`: planet articles exposed during the August 2026
  smoke and focused probes; they may inform diagnosis but are no longer a
  blind evaluation set;
- `adjacent-formats`: nodes, relationship-year, weekly, seasonal, yearly, and
  eclipse writing retained for separate surface work rather than treated as
  planet-article examples;
- `additionalSurfaceReferences`: the remaining 28 full article bodies from the
  mirror, structurally reviewed and grouped for future lunation/eclipse,
  season/solstice, overview, and weekly surface work. They are excluded from
  the paid planet-article evaluation.

The checked-in `manifest.json` records source URLs, extracted-body hashes,
fixture hashes, word counts, and the separation policy. The active calibration
manifest remains the parent directory's `manifest.json`.

Historical dates, degrees, and timezone labels in these articles are
evaluation text only. They do not become ephemeris fixtures, canonical dates,
or runtime application facts.

To reproduce the extraction from an owner-provided mirror:

```sh
node packages/astro-knowledge/scripts/import-owner-article-corpus.js \
  --source-root /path/to/mariesatori.com/blogs/astrology
```

Add `--check` to compare the checked-in fixtures with that mirror without
rewriting them. Neither command makes an API call.

Preview the expanded judge evaluation without making an API call:

```sh
npm run plan:owner-article-evaluation
```

The five-sample profile contains 14 judged articles per sample: four active
approved examples, four calibration candidates, four exposed same-surface
diagnostics, and two weak controls. That plan requires 70 judge calls. All 35
adjacent-surface references are excluded, including the annual Mercury
retrograde overview, which is not a single-event planet article.

## Blind-holdout availability

The source mirror contains 47 astrology HTML files, all now accounted for by
hash: four active fixtures plus 43 entries in this corpus. A full-body
structural review of the final 28 found no unused single-event planet ingress
or station article for this surface. They comprise 16 lunation/eclipse
articles, 6 season/solstice articles, 3 annual/monthly overviews, and 3 weekly
editions. Those formats must not be relabeled as a blind planet-article test
merely to enlarge the evaluation set.

The article-by-article disposition and source-preservation notes are recorded
in the [full-corpus surface audit](../../../../../docs/editorial-ai/OWNER-ARTICLE-FULL-CORPUS-SURFACE-AUDIT-2026-08-01.md).

A valid future blind gate therefore requires new, previously unused owner
articles on this same surface. Freeze their source slugs and body hashes before
the first judge run, keep them out of prompt or rubric revision, and report
their results separately from this diagnostic corpus. Four new articles plus
the two existing weak controls at five samples each would require 30 judge
calls. A preceding one-sample regression smoke over the current 14-text
diagnostic profile would require 14 calls, for a staged total of 44.

The live runner requires both the explicit `--authorize-live` command path and
the protected live-judge environment authorization. It does not change the
active model, production content, or model registry. Its report remains
non-promotable until a separately approved candidate release declares this
evaluation profile version.
