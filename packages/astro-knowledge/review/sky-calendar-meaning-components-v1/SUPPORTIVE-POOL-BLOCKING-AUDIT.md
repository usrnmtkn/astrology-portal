# Sky Calendar supportive-pool blocking audit

Status: audit only. No realization wording, classification, approvals, serving rows, or composition-wave artifacts changed.

## Plain result

The composer now has to stop when the aspect's required realization type is missing. For trines and sextiles, that required type is `supportive`.

The 215 LIVE source records do not store signs, so a source record is not permanently blocked or unblocked. A Calendar occurrence becomes sign-specific at runtime. This audit therefore tests every exact sign route each LIVE trine and sextile record can take: 24 per record, covering both zodiac directions.

- LIVE exact records: **215**
- LIVE trine/sextile records: **85**
- Possible exact-sign trine/sextile cards: **2040**
- Cards that would fail closed today: **1345 (65.9%)**
- Only placement A lacks support: **323**
- Only placement B lacks support: **701**
- Both placements lack support: **321**
- Soft-aspect record templates with at least one blocked sign route: **85 of 85**

## By aspect

| Aspect | LIVE records | Possible exact-sign cards | Blocked | A only | B only | Both |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Trine | 42 | 1008 | 670 | 164 | 352 | 154 |
| Sextile | 43 | 1032 | 675 | 159 | 349 | 167 |

## What the named source layers prove

All **85** LIVE trine/sextile records carry supportive material in each of the requested governed layers: `modern`, `business`, `cyclic`, and `arcApplying`. The complete per-record result and source path are in [supportive-pool-blocking-audit.json](./supportive-pool-blocking-audit.json).

Those four layers belong to the planet-pair/aspect record. They explain why a trine or sextile can help. They do **not** say how a specific planet in a specific sign expresses that support. Using them to fill `sky-sign/{planet}/{sign}` would erase the sign distinction the new architecture was built to preserve.

## What the 64 empty sign pools contain in their own evidence

The separate sign-source check found:

- Supportive material exists but was not extracted: **64**
- Genuinely one-sided under current governed evidence: **0**
- New realizations written in this audit: **0**

This means the gaps are editorial extraction gaps, not doctrine gaps. The owner can authorize a later extraction pass, but the composer must remain blocked until those realizations are written and approved.

| Missing placement unit | Blocked exact-sign routes | Governed evidence pointers |
| --- | ---: | --- |
| `sky-sign/chiron/aquarius` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/chiron/aquarius`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!31` |
| `sky-sign/chiron/aries` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/chiron/aries`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!4` |
| `sky-sign/chiron/capricorn` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/chiron/capricorn`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!29` |
| `sky-sign/chiron/gemini` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/chiron/gemini`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!15` |
| `sky-sign/chiron/leo` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/chiron/leo`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!19` |
| `sky-sign/chiron/libra` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/chiron/libra`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!23` |
| `sky-sign/chiron/pisces` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/chiron/pisces`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!33` |
| `sky-sign/chiron/sagittarius` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/chiron/sagittarius`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!27` |
| `sky-sign/chiron/scorpio` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/chiron/scorpio`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!25` |
| `sky-sign/chiron/taurus` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/chiron/taurus`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!10` |
| `sky-sign/jupiter/aries` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/jupiter/aries`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!36`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!168` |
| `sky-sign/jupiter/scorpio` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/jupiter/scorpio`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!89` |
| `sky-sign/lilith/aquarius` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/lilith/aquarius` |
| `sky-sign/lilith/aries` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/lilith/aries` |
| `sky-sign/lilith/gemini` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/lilith/gemini` |
| `sky-sign/lilith/pisces` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/lilith/pisces` |
| `sky-sign/lilith/sagittarius` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/lilith/sagittarius` |
| `sky-sign/lilith/taurus` | 0 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/lilith/taurus` |
| `sky-sign/mars/aquarius` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/mars/aquarius`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!223` |
| `sky-sign/mars/leo` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/mars/leo`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!168`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!40` |
| `sky-sign/mars/libra` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/mars/libra`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!187`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!42` |
| `sky-sign/mars/pisces` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/mars/pisces`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!236`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!47` |
| `sky-sign/mars/sagittarius` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/mars/sagittarius`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!203` |
| `sky-sign/mercury/aquarius` | 30 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/mercury/aquarius`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!445` |
| `sky-sign/mercury/aries` | 30 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/mercury/aries`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!251`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!84` |
| `sky-sign/mercury/capricorn` | 30 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/mercury/capricorn`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!429` |
| `sky-sign/mercury/scorpio` | 30 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/mercury/scorpio`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!392` |
| `sky-sign/moon/aquarius` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/moon/aquarius`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!118` |
| `sky-sign/moon/gemini` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/moon/gemini`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!511`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!110` |
| `sky-sign/moon/sagittarius` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/moon/sagittarius`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!521`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!116` |
| `sky-sign/moon/scorpio` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/moon/scorpio`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!515`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!115` |
| `sky-sign/neptune/cancer` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/neptune/cancer`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!537` |
| `sky-sign/neptune/capricorn` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/neptune/capricorn`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!549` |
| `sky-sign/neptune/gemini` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/neptune/gemini`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!535`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!242` |
| `sky-sign/neptune/libra` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/neptune/libra`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!543` |
| `sky-sign/neptune/scorpio` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/neptune/scorpio`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!545`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!247` |
| `sky-sign/neptune/taurus` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/neptune/taurus`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!533`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!241` |
| `sky-sign/neptune/virgo` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/neptune/virgo`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!541` |
| `sky-sign/pluto/aries` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/pluto/aries`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!599` |
| `sky-sign/pluto/cancer` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/pluto/cancer`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!605` |
| `sky-sign/pluto/capricorn` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/pluto/capricorn`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!617` |
| `sky-sign/pluto/gemini` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/pluto/gemini`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!603` |
| `sky-sign/pluto/leo` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/pluto/leo`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!607` |
| `sky-sign/pluto/libra` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/pluto/libra`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!611` |
| `sky-sign/pluto/pisces` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/pluto/pisces`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!647` |
| `sky-sign/pluto/sagittarius` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/pluto/sagittarius`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!615` |
| `sky-sign/pluto/scorpio` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/pluto/scorpio`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!613`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!151` |
| `sky-sign/pluto/taurus` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/pluto/taurus`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!601`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!145` |
| `sky-sign/saturn/aries` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/saturn/aries`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!654` |
| `sky-sign/saturn/capricorn` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/saturn/capricorn`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!705` |
| `sky-sign/saturn/leo` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/saturn/leo`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!671` |
| `sky-sign/saturn/libra` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/saturn/libra`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!676` |
| `sky-sign/saturn/taurus` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/saturn/taurus`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!665`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!193` |
| `sky-sign/saturn/virgo` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/saturn/virgo`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!673` |
| `sky-sign/sun/scorpio` | 28 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/sun/scorpio`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!838` |
| `sky-sign/uranus/aquarius` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/uranus/aquarius`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!953` |
| `sky-sign/uranus/capricorn` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/uranus/capricorn`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!951` |
| `sky-sign/uranus/scorpio` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/uranus/scorpio`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!947` |
| `sky-sign/uranus/taurus` | 36 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/uranus/taurus`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!911` |
| `sky-sign/venus/capricorn` | 30 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/venus/capricorn`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!1069`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!69` |
| `sky-sign/venus/gemini` | 30 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/venus/gemini`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!986`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!62` |
| `sky-sign/venus/pisces` | 30 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/venus/pisces`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!1093` |
| `sky-sign/venus/sagittarius` | 30 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/venus/sagittarius`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!1061`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!68` |
| `sky-sign/venus/taurus` | 30 | `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json#fallback-hook/sky-placement-hook/venus/taurus`<br>`tldr-astro-phrasebank/TLDR-CC-KNOWLEDGE-MATRIX-VOICED-AC-V9-OWNER-APPROVED-GOVERNANCE-LABELED.xlsx#TransitMeanings!978`<br>`tldr-astro-phrasebank/TLDR-LL-KNOWLEDGE-MATRIX-V13-DIRECT-LANGUAGE-OWNER-APPROVED.xlsx#PlacementMeanings!61` |

## Preservation

- Realization wording changed: **0**
- Realizations reclassified: **0**
- Approval statuses changed: **0**
- Serving rows changed: **0**
- Composition wave started: **no**
