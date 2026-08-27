# Full QA and repair report — 2026-08-27

Status: **PASS with non-blocking editorial and coverage debt**

This pass was run from a clean worktree based on the exact `origin/main` revision `5ad280a3`. The primary working folder at `/Users/mprez/Code/tldrastro` was not changed.

## Release summary

- All applicable saved unit, content, writing, type, database, browser, visual, CSS, and bundle gates pass.
- The production friendship records inspected are intact. The Friends Circle failure was a recoverability defect in the reader, not deleted friendship data.
- Sky placement alternate-source rendering is intentional and approval-gated. The reader does not invent prose to fill a gap.
- The production fallback mirror is current at 9,563 rows and includes the missing topic-vocabulary and Jupiter content.
- The approved writing examples index, canonical inventory, unresolved queue, knowledge index, and Lilith fixtures were regenerated from governed sources.
- No snapshot update command was used globally. One obsolete admin-mobile image was reviewed and intentionally replaced after confirming the new responsive layout.

## Repairs completed

### Friends and production data

- Rejected auth verification promises are no longer cached indefinitely. A focus refresh or explicit retry can recover after a transient Supabase failure.
- The Circle tab stays selected and displays a retry action when friendship loading fails.
- A failed refresh preserves already-rendered friends instead of publishing an empty list.
- Failure of the signed-in user's own profile query no longer prevents friend rows from loading.
- Production verification found two accepted friendships for `@satori`, including `@matthew_mezo` and `@prezz`; no relationship records were repaired or rewritten.

### Content source governance

Sky placement detail uses this governed precedence:

1. approved article;
2. approved Moon-ingress article;
3. approved continuous-placement record;
4. approved four-slot composition;
5. source-gap state.

Legacy generated placement prose remains prohibited by contract. An alternate source can therefore appear when a higher-priority record is absent or not approved, but the resolver cannot promote an unreviewed row merely to avoid a blank page.

The production fallback mirror now verifies:

- package version: `v3-2026-08-25c`;
- rows: 9,563;
- authored records: 2,771;
- hooks: 4,421;
- vocabulary rows: 720;
- templates: 39;
- live-serving records: 4,093;
- content hash: `ef7316e65ffd88a20738e0cc2c177b76`;
- key-manifest hash: `24baf72e2904e28a491d9d2809a7b01`.

### Writing and canonical inventories

- Unresolved queue/dashboard: 215 current items.
- Canonical content: 2,906 units across 1,428 slots, with zero owner decisions outstanding.
- Approved writing examples: 11,451 total (6,897 serving, 1,082 empty-house dual-register, and 3,472 matrix examples).
- The 39 exact sign-and-house natal placement records are explicitly represented in the canonical source-family allowlist rather than silently disappearing as unreferenced content.
- Historical Lilith hashes remain historical; the newly approved exact row is handled through a narrow post-baseline allowlist.
- Attribution policy now passes without changing historical hashes.

### Editorial mechanical correction

The sole mechanically actionable warning was corrected from “The version of you you muted” to “The version of yourself you muted” in the authoritative source and regenerated serving records. The correction is documented in a dedicated review record. No governed prose was bulk-rewritten.

### Test lifecycle and visual baseline

- Client, content-copy, and admin Playwright reports use dedicated ports so aggregate execution no longer reuses a conflicting preview server.
- The stale Jupiter cache fixture now asserts the current approved Jupiter article while continuing to prove that an old browser cache is removed.
- The admin mobile baseline was updated only after reviewing the expected, actual, and diff images and confirming the compact mobile header is the intended layout.

### Bundle headroom

The report-article stylesheet was removed from the global startup stylesheet and imported only by report surfaces. Startup CSS decreased from 45.6 kB to 44.8 kB gzip.

## Test results

| Area | Result |
| --- | ---: |
| TypeScript | PASS |
| Root/content/writing contracts | PASS |
| Client browser report | 70/70 |
| Admin browser report | 37/37 |
| Full saved visual/browser smoke | 118/118 |
| Visual regression baselines | 3/3 |
| Friends performance matrix | 7/7 |
| Friends database/retention/model/auth contracts | PASS |
| CSS consistency audit | 0 findings |
| Form typography audit | 0 findings across 267 rules |
| Bundle budget | PASS |
| Attribution policy | PASS |

## Performance

| Measurement | Result |
| --- | ---: |
| App JavaScript boot graph | 384.2 kB gzip |
| Reader boot including startup CSS | 428.9 kB gzip |
| Reader startup CSS | 44.8 kB gzip |
| Largest JavaScript chunk | 308.9 kB gzip |
| Relationship fallback | 194.7 kB gzip |
| Total JavaScript | 2.59 MB gzip |
| Total CSS | 108.2 kB gzip |

Friends timing remained within every enforced budget:

- cold list: 239 ms median, 251 ms maximum (800 ms budget);
- warm detail: 61 ms median, 73 ms maximum (500 ms budget);
- direct Synastry: 393 ms median, 404 ms maximum (1,500 ms budget);
- mobile navigation: 135 ms median, 140 ms maximum (1,000 ms budget);
- incomplete-chart repair: 1,665 ms median, 1,670 ms maximum (2,500 ms budget);
- slow-network relationship content after the detail shell: 1,620 ms median, 1,635 ms maximum (2,200 ms budget).

The diagnostic, deliberately ungated cold relationship calculation measured 5.599 seconds median. The reader still painted the loading state in 795 ms and the detail shell in 824 ms, both within budget.

## CSS and tokens

The CSS audit scanned 35 files and found:

- zero eyebrow mismatches;
- zero hardcoded spacing, font-size, font-weight, line-height, radius, shadow, or letter-spacing declarations;
- zero raw component surfaces;
- zero untokenized container boundaries.

## Remaining non-blocking findings

1. Editorial QA reports 130 human-review warnings: 81 vague-boilerplate and 49 directional-copy findings. Eighty-eight are in the lunation book. Two warnings occur in exact owner-approved passages and were preserved intentionally. There are zero blockers and zero mechanically actionable repeated-word findings.
2. Production identifier coverage still quarantines 3,328 non-serving identifiers: 24 unmapped shapes, 3,216 missing records, 28 permission failures, and 60 empty-evidence records. These fail closed and are not newly introduced by this repair.
3. Report manifestation coverage still records 2,602 source gaps, concentrated in slow-transit report material. Reader-app content coverage and the report diagnostic fixture pass; this is an expansion project rather than a regression.
4. The lunation fallback chunk is 211.8 kB gzip against a 215 kB budget, so it has little growth headroom even though the release gate passes.
5. Playwright emits harmless `NO_COLOR`/`FORCE_COLOR` warnings, and Babel notes that `App.tsx` exceeds its 500 kB code-generation optimization threshold. Neither affected runtime tests.

## Recommended next work

1. Owner-review the 88 lunation-book editorial warnings in small governed batches; do not bulk-rewrite them.
2. Define mappings for the 24 unknown production identifier shapes before attempting to fill the larger missing-evidence inventory.
3. Expand report slow-transit manifestation coverage independently of reader-app serving content.
4. Split or defer part of the lunation fallback before adding more content to that chunk.
5. Keep the Friends transient-failure scenario and fallback-cache self-heal test in the release gate.

