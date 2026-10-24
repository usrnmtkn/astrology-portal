# Synastry bulk body writer

The owner rejected the latest eight candidates as failing her voice. They remain
rejected. This change prepares a separate, private bulk-writing path; it does
not make the existing sample acceptable or establish a new voice match.

## Changed task

The existing Studio generator asks for nine fields and consumes a generated
meaning plan before prose. The bulk library needs one complete directional
body. `api/_lib/synastry-body-writing.ts` gives that job its own strict
`{body: string}` output, using the canonical OpenAI transport and Ghostwriter
authority. It makes one writer call, with no planner, judge, retry or automatic
rewrite. The current complete directional knowledge and book references still
establish meaning. Removing generated planning language does not remove the
astrological source requirement.

The shared nine-field generator, its callers, Claude behavior, saved profiles,
model defaults, other writing surfaces and serving content remain unchanged.
There is no new HTTP route or Studio save. A caller must separately obtain the
bounded generation authorization before using the execution function.

## Evidence selection and freshness

The preparer takes an explicit selection of complete registered owner source
IDs and a recorded editorial reason. It uses the existing governed source
compiler. Complete designated approved passages remain supported separately.
There is no new corpus, automatic keyword selection, passage-length filter,
quota, or requirement to add a weaker example. Selection can differ with the
contact's supported emotional range and prose function. Cross-surface examples
remain voice-only evidence; their situations and astrology never transfer.

Each directional KB source must match the current registered file, exact file
hash, planet ownership and aspect member. Family entries require all their
named members. Complete book units, designated voice passages and the existing
draft retain their text hashes. Current scoped feedback must load successfully
and remain enabled. Rejections cannot become positive references.

The request keeps factual sources, preserved draft context and complete negative
feedback before complete prose benchmarks and a final reader brief. Bulk IDs
and duplicate neutral knowledge are retained in the private preparation receipt,
rather than becoming extra prose tasks. No generated plan is supplied.

Execution prepares the request again and compares it with the reviewed request,
instructions, source identity, model and current feedback receipt. Any difference
holds the entry before OpenAI. It does not silently refresh a changed payload
under an earlier approval. Provider errors and invalid output consume no second
call. Deterministic checks cover the output shape, internal chart labels,
licensed variables and explicit em-dash prohibition; they do not prove voice,
psychological accuracy or complete semantic compliance.

## Offline consumer and verification

`scripts/prepare-synastry-body-batch.mts` consumes a private manifest containing
case IDs, complete input-file paths, and evidence selections. It produces complete
private prepared requests and source/feedback receipts. It has no live mode,
save operation or publication action. Output must be outside the repository.

```sh
node --import tsx scripts/prepare-synastry-body-batch.mts \
  --manifest /private/manifest.json --out /private/new-directory
```

`scripts/test-synastry-body-writing.mts` intercepts the actual canonical provider
transport. It checks complete evidence and negative feedback delivery, the
body-only schema, Ghostwriter instructions, exact dispatched request, missing or
conflicting ownership, changed sources, changed feedback, malformed output,
licensed variables, failure without retry, and absence of storage writes.
The existing actual-handler regression continues to cover the full Studio
contract and both providers. Both are included in `test:content-studio-api`.

These are delivery and contract checks with synthetic responses. A separately
authorized small varied generation and the owner's review of the complete
wording are still required before continuing the held bulk run. Neither this
document nor a passing test approves content or changes the 448-entry hold.
