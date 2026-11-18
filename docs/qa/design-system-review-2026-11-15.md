# App CSS and design review · 2026-11-15

This review compares the React web app and responsive web-mobile layouts with the owner-supplied **GitHub app design system (8).zip**. The supplied `CLAUDE.md` identifies approved screens; `design_handoff_tldr_astro/README.md`, `TLDR Astro DS v2.dc.html` and the named screen HTML supply the comparison values. Some bundled PNGs depict earlier iterations, so exact values were read from the HTML and representative files were rendered directly.

Implementation branch: `fix/article-typography-20261115`, based on `69545b58fb1b3fede25e909ba62db4269d65df64`. Source fingerprints and local browser evidence are recorded under `test-results/design-system-review/`. The owner authorized commit, merge and production deployment after required checks pass. Exact candidate checks and release results belong to the associated pull request and deployment records.

## Owner choices

The owner resolved two conflicts in this chat on 2026-11-15:

- “Keep the current profile shortcut and menu theme control.” Preserve the existing avatar navigation and theme placement rather than the older standalone toggle.
- “Use Newsreader 19px, following the design-system rule.” Profile summaries retain the shared reading role rather than the 15px system-sans treatment still present in the profile HTML.

These are UI decisions. They do not approve or change any reader wording.

## Corrections

| Surface or role | Corrected treatment | Reference |
|---|---|---|
| Article reading | Newsreader 26 / 1.45 on desktop, 19 / 1.5 on mobile; aspect previews 20 / 1.45 desktop | Screens - Articles; Articles Web Mobile |
| Mobile article titles | 34 / 1.08, −0.015em | Articles Web Mobile |
| Mobile article layout | 16px outer gutter; transit-card padding 32 / 20; natal/transit article radius 28 | Articles Web Mobile |
| Horoscope reading | Newsreader 26 / 1.45 desktop, 19 / 1.5 mobile; −0.005em tracking | Horoscopes Container; Horoscopes Mobile |
| Horoscope date | 44 / 1.1 desktop, 34 / 1.1 mobile; year 18 / 1.3 | Horoscopes Container; Horoscopes Mobile |
| Horoscope context | Context title 32 desktop / 24 mobile; Explore signs 28 | Horoscopes Container; Horoscopes Mobile |
| Mobile Sky title | Newsreader 34 / 1.05; normal tracking | Sky Web Mobile |
| Sky effort section | 20px desktop card titles; 30px mobile section title; three columns on desktop/tablet, one on mobile | Sky Detriment and Fall States |
| Account and Settings | Mobile title 34 / 1.05 | Account and Menu |
| Metadata | Shared 14px role uses 1.4 leading | README typography table |
| Segmented controls | System-sans 15px labels, including compact variants | README typography table and profile screens |
| Natal hierarchy | 20px section headings; 28px card/group radii | Profile Web - Mobile |
| Recessed surfaces | Separate inset elevation for recessed natal tiles and groups; no recessed shadows in dark mode | DS v2 surface levels |
| Lunation macro lead | First paragraph 26 / 1.35 on desktop; later paragraphs and mobile 19 / 1.5 | Root-level approved Lunation Section |
| Report library title | Compact title 17 / 1.3 uses the row-title role rather than metadata leading | README Reports + shared row-title role |
| Report surfaces | Shared raised-card hairline elevation on report covers and chapters | DS v2; README Reports |

## Reviewed areas

- Shared font loading, font families, type roles, surfaces, spacing tokens, radii, shadows and responsive overrides.
- Sky overview, placement articles, related aspects, dignity cards and dialog.
- You natal/transits, Friend profile layouts and related readings, Friends feed/Circle/Charts/Requests, and Patterns & Insights.
- Calendar Day/Week/Month hierarchy; existing Calendar UX is retained.
- Daily/Weekly/Monthly/Seasonal/planetary horoscope styling, navigation and unpublished states.
- Article/Guide library and existing Learn reading surfaces; no Learn rebuild.
- Reports navigation and typography; Account, Settings, menu, auth, loading, empty, missing and error surfaces.
- Desktop/mobile light and dark themes, accessibility font mode, and intermediate viewport containment.

## Verification

CSS/token audit passes with no unresolved active tokens, raw component visual values, or local raw token declarations. Four article checks and twelve focused changed-surface checks pass. A later mobile Sky override was caught by computed-style verification and corrected; the passing rerun is retained separately from the earlier failure.

Across the affected selection, **266 distinct browser cases pass**. This includes desktop/mobile light and dark themes, accessibility fonts, loaded/empty/error states, navigation/reload, and viewport containment at 390, 768, 1024 and 1440. Additional targeted layout cases cover 320, 820 and 1920. Passing evidence was reused only when relevant inputs were unchanged. The broad run retained 231 passes and three failures; two stale Friends reading-size expectations were updated, and the report title was moved from metadata to row-title leading. The affected 41-case rerun, four Friend lunation checks, and four delivered report/key-date checks pass. The complete remote CI suite was not run. The diagnostic calendar capture initially used an incomplete synthetic payload with no `events` field; that was a fixture limitation, not evidence of a production CSS defect. Reports uses the canonical `/reports/` route. These diagnostic captures are not counted as acceptance checks.

This document records the local design review and its verification scope. Hosted release gates and production verification are separate evidence. This review does not claim native-sheet implementation.

## Release candidate corrections

The initial hosted candidate `419848255dbb66065a694d9fd133baf1544a8195` passed Content Studio API, privacy and CSS checks, but failed the browser aggregate. Legacy expectations conflated full articles, related previews and compact fact rows, used the old horoscope title role, or reused compact article leading for Sky headings. Those assertions now retain the distinct approved roles. The mobile authentication heading keeps its established 36px modal title instead of inheriting the revised article title. A populated-member network timeout passed on its existing retry; no timeout or retry threshold was increased.

Fresh local reruns pass: four Sky effort heading cases, 19 reader cases (authentication, Friends, dignity states, planetary horoscope navigation and Sky summary), eight monthly/personalized horoscope journeys and four connection-detail cases. No live owner content or paid generation was used.

Matched fresh builds against the review base, each with its own locked dependencies, measured startup CSS at 59,223 → 59,470 gzip bytes, total CSS at 149,466 → 149,957 and memory-graph CSS at 32,961 → 33,065. The initial hosted build exceeded existing caps by 89, 304 and 51 bytes respectively. Bounded allowances add 128, 512 and 128 bytes to those caps; every other limit remains unchanged. The allocation and failure evidence are recorded in `scripts/web-bundle-budgets.json`. Current-main integration and exact-head hosted checks remain release requirements.

The release candidate integrates main `8aaea819c7ae39941e911960dafd6d64b8f5db96`, which adds the independent natal house resolver change without changing this review's CSS or dependency inputs. Knowledge and fallback artifacts were regenerated with no tracked drift. The fresh integrated Web build, CSS audit, bundle budgets and built-public-asset privacy scan pass. Mandatory memory context is unchanged on this main revision. Hosted checks must run on the final integrated candidate before merge.

Integrated candidate `342325300328324504320031a74c7511db84de1a` passed all functional browser jobs, API, privacy, authentication, CSS and Web bundle checks. The browser aggregate still failed because standalone Studio startup was 245,725 gzip bytes, 12 above its existing cap. Matched current-main and candidate Admin builds measured identical 844,373 raw entry bytes and 245,712 → 245,725 gzip bytes. Normalizing generated eight-character JavaScript/CSS filename hashes makes the entry code identical. `scripts/admin-bundle-budgets.json` records a separate 32-byte entry-gzip allowance for this packaging effect; raw size, aggregate JavaScript and deferred-boundary guards are unchanged. No failure is waived, and all required gates must pass on the resulting exact candidate.
