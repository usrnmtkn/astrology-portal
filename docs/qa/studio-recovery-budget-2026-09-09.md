# Content Studio recovery bundle allowance

PR #712 adds retry, Review Queue recovery, local error details, and validation of live-status response records. The standalone Studio entry now includes the same error boundary as the production web entry.

CI for commit `01a16071` measured 175.5 kB gzip / 618.3 kB raw at entry and 309.3 kB aggregate gzip across 19 chunks. The local build measured 175.3 kB entry gzip / 617.8 kB raw and 309.1 kB aggregate gzip; the fixture environment accounts for the small difference.

Increase the entry gzip allowance from 175,500 to 176,000 bytes and the aggregate allowance from 309,000 to 309,500 bytes. Each increase is 500 bytes (under 0.3% of its previous allowance). Deferred content markers, the three lazy editor groups, and the composition/fallback dynamic-entry requirements remain enforced.

The original production tab subsequently displayed a null-response loading error. Commit `dcc5029e` adds response validation and bounded retries for invalid inventory pages, with browser regressions for secondary, transient, and persistent failures. CI measures 175.6 kB entry gzip / 618.6 kB raw and 309.4 kB aggregate gzip. Increase the entry and largest-chunk raw limits from 618,500 to 619,000 bytes (500 bytes, under 0.1%). The gzip allowances above already cover this addition.

CI passed the recovery and placement composition tests, all 30 Sky reader tests, and all 12 Daily Sky Studio tests before the size gate reported this narrow excess. This allowance covers the recovery interface; it does not permit an eagerly loaded content corpus or editor group.
