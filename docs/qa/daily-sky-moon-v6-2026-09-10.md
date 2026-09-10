# Daily Sky Moon source bank V6

Owner request: “here is the updated phrase list, please impliment”, supplied in this task on September 10, 2026 with the V5 and V6 Markdown files. V6 explicitly replaces V5's composites. This implementation imports V6 verbatim; it does not generate, combine, trim, or independently certify the supplied writing.

The frozen source is `docs/content-review/daily-sky-moon-v6-source.md`. Its SHA-256 is recorded alongside all 60 source entries in `apps/admin/src/skyMoonSummarySources.json`. Every record has a body hash and word count; populated records preserve their supplied URL, source basis, and audit status. The 35 populated fragments serve from `skyMoonSummaryBank.json`; 25 gaps remain empty. The general phase phrase bank is reference-only and never fills gaps.

Active keys follow `cms/sky-daily-summary/moon/{sign}/{regular|newMoon|fullMoon|solarEclipse|lunarEclipse}`. The old twelve Moon fields are superseded, not used as fallbacks. An import-helper regression prevents event keys from inheriting old regular-Moon text. The original historical source files and their protected hashes are unchanged.

On the selected local day, selection is solar eclipse, lunar eclipse, New Moon, Full Moon, then regular Moon. The opening renders one selected Moon passage. Same-day lunation prose is not repeated at the end. Future lunation timing remains available on ordinary days. Special-event sign and degree come from the event ephemeris; an absent degree is omitted rather than borrowed from the current Moon. The linked passage opens the existing lunation article.

Content Studio exposes Moon Sign and Moon Event selectors, exact source editing, supplied audit status and URL, and an empty editor for gaps. The existing draft/publish lifecycle remains authoritative. An edited body is labeled Owner edit rather than inheriting the supplied audit claim. Importing a missing field never invents prose or publishes it.

Validation:
- All 60 records checked against their stored body hashes/word counts and the frozen source's hash; 35 populated and 25 blank.
- All 60 reader/Studio source selections, eclipse priority, legacy-import exclusion, and exactly-one-Moon behavior checked.
- All 144 regular Sun/Moon combinations, content retirement, editable templates, and event grammar checks pass.
- 15 fresh production-build browser flows passed, including mobile/desktop and light/dark typography, source editing, blank Full Moon in Virgo, eclipse override with calculated degree, article URL, and publish/reload parity.
- CSS/token audits and builds/typechecks pass.
- The content bank adds under 2 kB to startup JavaScript; budgets allocate 2 kB startup and 7 kB aggregate. The deferred Admin audit/source UI allocates 8 kB aggregate. No dependencies or startup CSS added.

No production content writes or deployment were performed. Browser persistence tests use isolated API fixtures. The update remains with the unmerged inline template editor on `codex/sky-inline-template-editor`.
