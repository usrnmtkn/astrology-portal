# PR #1277 saved-edition recovery editor allowance

The reviewed allowance changes only the deferred horoscope editor limit.

Matched independent clean accepted-main and candidate checkouts use Node 22.23.3, their own `npm ci`, identical lockfiles, no local environment files, and the same three build profiles. Main is `f203c906ed12bb9bcbb84541fbebbb960b43aacd`; candidate is `f8c4795cdb9f1457ac1ee9a9927177963c959f0e` plus the pinned repair batch.

| Profile | Main editor gzip | Candidate editor gzip | Delta | Candidate App boot | Candidate total JS |
| --- | ---: | ---: | ---: | ---: | ---: |
| ci | 16034 | 16371 | +337 | 514791 | 3596960 |
| formal | 16032 | 16368 | +336 | 514834 | 3597037 |
| reader | 16032 | 16368 | +336 | 514839 | 3597036 |

Change only `horoscopeEditorChunkGzipBytes` from 16,275 to 16,400 (+125 bytes), leaving 29 bytes above the largest measured result. The existing cap already includes 241 bytes above main, so the measured 337-byte editor increase needs 96 additional bytes; the reviewed ceiling adds a small 29-byte build margin.

The editor keeps a confirmed saved edition linked after date adoption, including a failed free plan lookup, and rejects successful late plan results after navigation. Open and Continue share operation ownership, route checks, error handling and cleanup. Draft fields and optimistic row versions are consolidated without changing request bodies. Full saved writing, dirty checks and owner publication rules remain intact.

A rejected alternative deferred historical failure details into the existing generation module. Controlled held-module failures exposed global preload-recovery interactions. That optimization and its loader-only tests were removed, with failures retained. The final implementation keeps static failure explanation and the original legacy tests. No preload interception or new chunk is introduced.

All aggregate, startup, CSS, dependency, runtime, and other chunk limits remain unchanged. Across the three profiles, App/reader startup decreases by 1,327–1,333 bytes; total JavaScript decreases by 6,675–6,809 bytes. Startup CSS stays at 55,073; total CSS is 118,795 (+14), below 119,050. These are byte comparisons, not latency measurements.

Evidence: `/private/tmp/connection-matched-budget-comparison/receipt.json` and `/private/tmp/connection-editor-budget-proposal.json`. Final exact-head full local/hosted gates and normal main deployment acceptance remain required.
