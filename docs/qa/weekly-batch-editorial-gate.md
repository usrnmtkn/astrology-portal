# Weekly batch editorial gate

New Weekly batch approvals use `weekly-batch-editorial/v1`. Before a new sign
is drafted, one shared request plans twelve concerns against each sign's actual
calculated developments and house activations. Each concern names its event,
possible situation, stakes and distinctive observation. The planner compares
all twelve and must report distinct concerns, grounded houses and no invented
biography. Unsupported event IDs, missing signs and identical normalized
concerns fail validation before prose starts.

Each sign writer receives the complete shared plan plus its own concern. The
saved Weekly profile, full examples and current owner corrections keep their
authority. Shared concerns supply interpretation, not sentences to copy.
Existing reader text stays intact.

New Weekly sign requests also receive `previousReadings`, a server-owned
`weekly-previous-readings/v1` packet appended after saved template expansion.
It includes complete current saved earlier readings from this same edition in
Aries-to-Pisces order: Aries has an empty set, Taurus can see Aries, and Pisces
can see eleven earlier signs. Self, future, blank, active, held and exact rejected
passages are excluded. An old rejection does not exclude a newly saved version.
Each passage retains its full headline/body, exact hash and word count. The
packet records edition/window, target hash, context hash and source row version;
metadata-only saves do not invalidate it. The batch orders pending signs by the
canonical zodiac order even if a stored passage array is reordered. Selected
signs and resumed batches use the actual current eligible earlier readings.

Earlier readings supply comparison only, never approved voice, instructions,
biography or calculated facts. Literal template braces inside them remain data;
there is no new editable profile variable. This writer may compare only supplied
earlier readings; the separate final gate compares the complete twelve-sign set.
The packet is saved in private receipts with the native provider request before
dispatch. Complete context larger than 256 KiB fails before spend without
truncation. If earlier or target text changes while a writer or prose check is
running, the candidate is held for editing/rejection and newer text is preserved.
No automatic rewrite, replacement or extra paid stage is introduced. Requests
already dispatched without this contract retain their pinned behavior.

Once all twelve readings are complete, a separate whole-set request compares
interpretations, phrases, endings, house-specific stakes, unsupported history
and technical filler. It receives every complete reading, the complete saved
profile and examples, current corrections, calculated developments and shared
concerns. Exact sentence and ending matches are triage leads; necessary repeated
astrology terminology is allowed. Semantic findings require exact supporting
quotes from the current readings, with at least two signs for repetition.
Missing checks, invented quotes, refusal and malformed responses fail closed.

A fresh twelve-sign batch has at most 26 paid requests: one shared plan, twelve
writers, twelve existing per-sign prose checks and one whole-set review. No
shared failure automatically rewrites or retries. The editor displays findings
and their quotes, preserves every saved draft, and offers explicit one-request
checks after editing. A new review is invalidated by changes to exact readings,
saved rules, facts, outlines, writer selection or the shared plan. Publication
requires a current passing comparison for batches using this version; an
owner fact-parser override cannot bypass it. A passing comparison is not prose
approval. Final wording and publication still require the owner's action.

Shared request reservations and provider IDs are saved before continuing.
Progress only retrieves that request. An unknown send remains held until an
explicit acknowledged release after the waiting period. Review results cannot
replace newer edits. Full private requests and receipts remain server-side;
`weeklyEditorialHistory` uses the existing lossless Weekly history archive.
The editor receives only concerns, findings, result metadata and pending state.
Old in-flight batches retain their pinned paid-stage contract. A complete
manual edition can opt into one explicit whole-set check without generating
new prose. Daily, Monthly and Seasonal generation retain their own workflows.

## Verification

Run from an isolated checkout with its own `npm ci` dependencies and the
protected reference fixtures required by the standard API runbook:

```sh
node --import tsx scripts/test-weekly-batch-editorial.mts
node --import tsx scripts/test-weekly-previous-readings.mts
node --import tsx scripts/test-horoscope-durable-batch.mts
npm run test:content-studio-api
npm run typecheck
npm run qa:css-audit
npx playwright test -c playwright.horoscope-reader.config.ts weekly-batch-editorial.spec.ts
```

The request and handler regressions use synthetic model responses and isolated
storage. They cover ordering, complete request delivery through OpenAI, native
Claude and Gemini codecs, request bounds, evidence validation, failed and stale
checks, publication, draft preservation, manual editions, legacy recovery and
unknown outcomes. Browser coverage uses a fresh build and verifies findings,
loading, edits, explicit rechecks and persistence at desktop/mobile widths in
both themes. These checks establish the implementation contract; live editorial
quality still needs owner evaluation of actual generated sets. They do not
spend money on model samples or alter production content.

## Local acceptance — October 25, 2026

Base revision: `ad951d80eafb8dcc6f626108788b0e81dc098650`. Runtime, test and
configuration fingerprint: `9c7780e0eb358208d08c91d63ff3d7ef645cd4abdbabcc6db7c91bce460fb468`.
The fingerprint hashes sorted changed/new paths outside `docs/`, then each path,
a NUL, its complete bytes and another NUL. This fingerprint identifies the pre-commit verification snapshot; the release pull request records the commit and deployment.

| Criterion | Result and evidence |
| --- | --- |
| Plan before prose; complete facts and saved rules reach each stage | Passed: actual-handler request assertions; all twelve OpenAI requests and native Claude/Gemini codec coverage. |
| Compare all twelve; explain repetition with current quotes | Passed: distinct checks for interpretations, phrases and endings; incomplete, invented and incorrectly located quotes fail closed. |
| Preserve text, control calls, recover safely | Passed: 26-request fresh batch, concurrent reservations/retrieval, explicit unknown-outcome release, edit invalidation, exact full history and legacy stage preservation. |
| Publication respects the gate and owner decision | Passed: failed/stale checks block even a fact-parser override; passing check plus explicit exact owner approval reaches the isolated reader unchanged. |
| Discover, generate, edit, recheck and reopen in Studio | Passed: eight fresh-build browser cases, desktop/mobile and both themes; includes full generation and existing held-draft recovery. |
| Storage, types and design boundaries | Passed: actual PostgreSQL CAS checkpoints, lossless history, web/server typechecks, CSS/token and lazy-boundary audits, source/built privacy scans. |
| Standalone Admin bundle | Passed: aggregate JavaScript gzip 843,063 bytes against the unchanged 843,350-byte ceiling; entry 234.1 kB gzip. |
| Full Content Studio API suite | Passed: unfiltered `npm run test:content-studio-api` exited 0 with isolated storage, synthetic providers, local IPC and protected reference fixtures. |

No production change or paid model sample is included in this verification.
