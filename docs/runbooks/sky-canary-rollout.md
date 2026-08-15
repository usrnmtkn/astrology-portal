# Sky writing-kernel canary rollout

Status: owner-operated deployment procedure. Codex does not deploy or change production environment variables.

## Before deployment

Confirm the release contains the writing-kernel runtime bundle, the placement pre-call gate, and the human-review reader boundary. Run:

```bash
npm run test:astro-writing
npm run test:sky-placements
node scripts/test-index-store-guards.mjs
node scripts/test-catalog-reachability.mjs
node scripts/test-production-identifier-coverage.mjs
```

Do not proceed if any check fails or if either generated index is stale.

South Node source integrity is part of `test:sky-placements`: Leo must use
`data/placements/sign/south-node-leo.json` directly, and the other eleven signs
must return `missing-source` before any provider call. Opposite North Node prose
is not an allowed fallback.

Snapshot from the read-only production inventory on 2026-08-15:

- 36 placement base rows: 19 `LIVE/auto-publish`, 17 `DRAFT/human-review`.
- 132 of the 168 placement base keys are not present yet.
- 2 topper rows: 1 `LIVE/auto-publish`, 1 `DRAFT/human-review`.
- The rollout therefore hides 19 legacy generated base cards and 1 legacy generated topper. Approved package fallback content remains available.

The placement cron treats the 19 legacy bases as the first regeneration class. It never serves the replacements automatically: every replacement is written `DRAFT/reference/human-review`. A legacy topper is never accepted as `cached-live`; when it is current and has an eligible base, it is regenerated as a draft.

## 1. Deploy and test the serverless bundle

After the deployment is active, run the authenticated, provider-free smoke check:

```bash
PRODUCTION_BASE_URL=https://<deployment-host> npm run smoke:writing-kernel
```

`CRON_SECRET` or `CONTENT_GENERATION_SECRET` must already be present in the invoking environment. Do not paste the secret into tickets or logs.

A pass exits zero and prints:

```text
Deployed writing-kernel smoke passed at https://<deployment-host>; index <64-character SHA-256>.
```

A failure exits non-zero and prints `Deployed writing-kernel smoke failed` with an HTTP status and check name. The endpoint itself returns HTTP 503 for a missing index, stale index, missing source, or hash mismatch.

On failure:

1. Do not set or widen canary variables.
2. Search the function log for the precise `KNOWLEDGE_*` failure.
3. Confirm `vercel.json` bundled the index and the reported source family.
4. Rebuild locally only if the error reports actual index drift, then rerun all deterministic checks and deploy a new build.
5. Roll back the deployment if the existing Sky cron is failing.

## 2. Check the Sky Aspect cron history

In the Vercel project, open **Observability → Logs**. Filter to the production environment and the function path `/api/cron/generate-sky-aspects`. Search for:

```text
KNOWLEDGE_INDEX_MISSING
KNOWLEDGE_SOURCE_MISSING
KNOWLEDGE_INDEX_STALE
```

Check from the first deployment that introduced the production pre-call gate through the current deployment. Record whether the cron was failing, the first and last affected runs, and the deployment that restored it. Do not infer an outage from local tests; the serverless log is the evidence.

## 3. Pure-governance cycle: canary 0

Set these production variables and deploy the environment change:

```text
WRITING_KERNEL_GOVERNED_SURFACES=sky
WRITING_KERNEL_SKY_CANARY_PERCENT=0
WRITING_KERNEL_SKY_GLOBAL_ENABLE=0
```

At zero percent, governed evidence is validated but not appended to the prompt. Prompt bytes are unchanged. This is an allow/deny test of canonical identity, index freshness, evidence hashes, surface permissions, phrase isolation, and draft validation.

Watch one complete scheduled cycle:

- `/api/cron/generate-sky-aspects` at `15 10 * * *` UTC.
- `/api/cron/generate-sky-placements` at `25 10 * * *` UTC.

No `KNOWLEDGE_*`, `PRODUCTION_*`, or `PHRASE_*` block should reach the provider. A block is a correct fail-closed result but a failed rollout; diagnose it before widening.

### Expected first placement counters

Using the 2026-08-15 snapshot and the default `SKY_PLACEMENT_BATCH_SIZE=4`, the base-card report should begin with:

```text
requested: 4
candidates: 151
generated: 4
needsReview: 4
```

This assumes four successful writer/reviewer pipelines. The 151 candidates are
19 legacy bases plus 132 missing bases. Legacy bases are prioritized, so five
successful four-card batches are required to replace all 19. Every replacement
remains pending owner review. If a South Node target is encountered outside
Leo, it must appear as a `missing-source` skip with no billed call; the loop may
continue to later eligible candidates.

For toppers, inspect `enabled` first:

- If disabled: `generated=0`, `cached=0`, `needsReview=0`; the two currently active rows should be deactivated on the first run.
- If enabled: `cached-live` must be zero unless an owner-approved `LIVE/human-review` topper was added after the snapshot. The existing `LIVE/auto-publish` topper must either be regenerated as `needs-review`, deactivated because its contact is no longer current, or skipped/deactivated because no eligible base exists. It must never be reported as `cached-live`.
- A matching existing `DRAFT/human-review` topper may appear as `cached-needs-review`; this increments both `cached` and `needsReview`.

If the counts differ, compare the current database inventory, batch-size environment value, current contacts, source gaps, and per-card results. Do not explain away an unexpected counter.

## 4. Widen the governed-prompt cohort

After canary zero completes without blocks, change only:

```text
WRITING_KERNEL_SKY_CANARY_PERCENT=10
```

The cohort is a deterministic hash bucket of `contentKey`, so the same targets remain selected. At each stage compare selected and unselected drafts for:

- factual and temporal accuracy;
- placement/aspect identity;
- register and grammar;
- unsupported events, outcomes, or escalation;
- judge score and recommendation;
- validation failures and prevented provider calls;
- evidence packet, knowledge-index, and phrase-index hashes.

Nothing is automatically serving. Review the generated drafts and telemetry, then widen one step per owner review:

```text
10 → 25 → 50 → 100
```

Do not widen on averages alone. Investigate any target that regresses, any newly repeated formula, and any evidence packet that differs unexpectedly.

## 5. Rollback

To remove governed evidence from prompts while retaining the fail-closed gate, set:

```text
WRITING_KERNEL_SKY_CANARY_PERCENT=0
WRITING_KERNEL_SKY_GLOBAL_ENABLE=0
```

The change takes effect only after the production environment change is deployed and the new serverless functions are active, normally within the deployment window rather than immediately when the dashboard value is edited.

Canary variables do not bypass the pre-call gate. If the gate itself is breaking the cron, roll back to the last known-good deployment. Do not add a bypass flag: fail-closed behavior is intentional.

## 6. Work the placement review backlog

The reader accepts a generated placement only when all of these are true:

- database status is `LIVE`;
- lane is `serving`;
- `review_state` is null;
- deterministic lint is 3/0;
- judge score is 3;
- `judge_gate` is `human-review`;
- the source snapshot and placement facts match the current chart object.

Review the 17 existing base drafts and 1 existing topper draft first. The 19 legacy base rows will be regenerated in bounded batches and enter the same queue. The legacy topper is handled only when its contact is current; it is never reused as approved content.

Approve and publish rows individually through the governed admin path. A judge recommendation is advisory and does not substitute for the owner's decision. Never bulk-change `judge_gate`, status, or approval records to clear the backlog.

Record after each cycle:

- generated, cached, needs-review, skipped, and deactivated counts;
- remaining `LIVE/auto-publish` base/topper count;
- owner-approved `LIVE/human-review` count;
- every block reason and whether a provider call was prevented;
- deployment ID and active canary percentage.
