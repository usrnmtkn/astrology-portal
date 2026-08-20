# Writing engine production release manifest

Date: 2026-08-15
Status: release preparation only; no deploy or production flag change authorized by this artifact

## Frozen source state

- Accumulated source worktree: `codex/friends-transit-wave-1-review`
- Source HEAD before reconstruction: `b768c5ec0fa6c50761fea13de9cc07d02d6fcd57`
- Current deployment base: `origin/main` at `480ec2cc8b8834fad2dfa7bd6330834e9bccf963`
- The source branch is 112 commits behind `origin/main` and has no committed work of its own.
- The source worktree contains 202 tracked/untracked paths and must never be deployed or staged wholesale.
- Clean release branch: `codex/writing-engine-release`, reconstructed from current `origin/main`.

## Frozen governance and evidence state

| Artifact | Frozen value |
|---|---:|
| Canonical objects | 13,224 |
| Source records indexed | 24,112 |
| Objects in multiple stores | 2,047 |
| Unresolved records | 0 |
| Catalog collisions | 0 |
| Knowledge index SHA-256 | `62ab87248f5fa6791e8b5186aa546f926e5ec3fef75b15268297f6cb0849dae5` |
| Phrase index SHA-256 | `457fddc54734df2e9ae633b0425cd647d0371a421dfbc2776a69878e2b8c5173` |
| Billed ledger SHA-256 | `2e70b709b8b85596cccd227a90d91ace7e22f5a1c1ae87f539992a08ae98ccef` |
| Billed ledger records / successful | 99 / 97 |
| Preserved Friends drafts / hash mismatches | 33 / 0 |
| South Node sign sources usable by the Sky placement generator | 1 direct source / 11 fail-closed gaps |
| Governed rollout variables | unset |

The clean branch regenerated both indexes from current `main`. Relative to the
older source worktree, the knowledge index adds exactly three canonical objects
and five records already present on the deployment base: the Sky placement
recurrence library plus the Saturn education and Saturn-in-Capricorn serving
fallbacks (two serving records each). No prior canonical object was removed.
The phrase index is byte-identical to the frozen source input.

## Release dependency graph

```text
production Sky and report call paths
  -> production pre-call gate
    -> canonical identifier adapter
      -> governed knowledge resolver
        -> generated knowledge and phrase indexes
          -> hash-pinned source records
    -> surface strategy and validation profile
      -> shared grammar and register checks
  -> provider call only after every gate passes

serverless deployment
  -> Vercel includeFiles contract
    -> indexes, resolver, phrase evidence, and every indexed runtime source
```

## Included release scope

The clean release candidate may include only dependency-complete changes in
these groups. They should be separate commits in one reviewable PR so CI
evaluates the complete candidate rather than partial intermediate states.

1. **Governed catalog and kernel**
   - deterministic knowledge and phrase index builders/resolvers;
   - canonical identifier mapping, authority/temporality and surface rules;
   - surface strategies, validation profiles, shared grammar gates, and drift
     freeze;
   - checked-in indexes regenerated from the clean branch.
2. **Governed source assets**
   - grammar-only corpus corrections and their generator fix;
   - authored-placement schema separation and quote-extract boundary;
   - four-body source assets required by the catalog;
   - the direct South Node source boundary, with eleven missing signs remaining
     explicit fail-closed gaps.
3. **Production integration**
   - Sky aspect and placement writer/judge gates;
   - report writer/reviewer/reviser gates before billing;
   - human-review-only placement write/read contract;
   - runtime evidence inspector, hashed telemetry, canary selection, and
     serverless runtime asset packaging.
4. **Release contracts and operations**
   - build, typecheck, identifier coverage, surface isolation, grammar, index
     freshness, runtime-asset and deployment-smoke tests;
   - Canary 0 runbook, rollback semantics, and corrected ship plan.

## Explicitly excluded

- Friends batch drafts, provider responses, requests, billed ledgers, review
  workbooks, and comparison outputs;
- Friends house-license v1/v2/v3 proposal review directories and other
  non-executable review packets unless a runtime test proves a direct
  dependency;
- LL V13 owner-review workbooks;
- `.tmp-parity/`, `_to_delete/`, local logs, and inspection outputs;
- any serving-row mutation, approval mutation, bulk status edit, deployment,
  environment-variable change, or live provider call;
- Gemini production support.

## Canary and reader-impact baseline

- Canary percentage zero must produce an empty governed prompt and preserve
  legacy prompt bytes. The gate still validates identity, index freshness,
  evidence hashes, permissions, and validation rules before billing.
- Deployment changes the placement reader/writer contract independently of the
  prompt canary: legacy `auto-publish` rows no longer render or remain cached.
  Replacements are `DRAFT` / `reference` / `human-review` only.
- The previously reported placement blackout was 19 bases and 1 topper. This
  must be re-counted against production immediately before deployment; it is an
  expectation, not a hard-coded release assertion.
- South Node in Leo has a direct source. The other eleven signs must skip before
  billing until owner-approved direct sources exist.

## Clean-checkout merge gates

- lockfile-only install and complete production build;
- TypeScript typecheck;
- writing-kernel, Sky placement, report, grammar, register, surface-isolation,
  identifier, runtime-asset, deployment-smoke, index-store and catalog
  reachability contracts;
- knowledge and phrase indexes current after deterministic regeneration;
- zero catalog collisions, zero unresolved sources, zero silent identifier
  misparses, and zero new or stale quarantine exceptions;
- the excluded source-worktree baseline remains 33 preserved Friends drafts
  with zero hash mismatches and the billed ledger SHA-256 remains
  `2e70b709b8b85596cccd227a90d91ace7e22f5a1c1ae87f539992a08ae98ccef`;
  neither artifact is copied into or modified by this release branch;
- rollout variables absent from the repository and environment;
- `git diff --check` clean and no excluded path present in the PR.

## Deployment authorization boundary

Passing this manifest authorizes preparation of a draft PR only. Merging,
deploying, changing Vercel variables, starting a cron/canary cycle, and making
billed calls remain separate operational actions. Canary 10 requires an
explicit bounded authorization and retained governed/control artifacts.
