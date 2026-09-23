# Transit report source completion

`GENERATED_REPORT_RELEASE_POLICY=report-source-completion-v1` separates report
availability from successful synthesis. The default remains `strict` until the
production setting is deliberately changed after release verification.

For Daily, Weekly and Friends, the worker first prepares a report from complete
reader passages already in the locked request. It selects explicit reader fields;
it never flattens technical metadata, substitutes a preview, excerpts a passage,
or edits owner prose. Missing full sources stop before any model request.

The generated path retains the existing strict judge and deterministic checks.
It permits one initial writer response and at most one correction, with at most
two judge calls. There is no provider fallback or extra cleanup. A deadline yield
resumes the same checkpoint program. A rejected draft, invalid review or provider
outage delivers the independently prepared source report. The rejected draft is
never marked approved.

Source delivery records `provider=source`, the source-completion version as the
model and prompt version, and `source_snapshot.reportDelivery`. The receipt binds
the normalized brief and visible copy to hashes, and records each whole source
unit's path, source keys, hash, word count and exact offsets in the saved fields.
This proves provenance to the request; it is not a new editorial approval or an
independent verification of the astrology. No passing judge audit is fabricated.

Saving must acknowledge both the complete visible copy and the delivery receipt.
Reusing a stored source report checks those against the same locked request,
independent of JSONB object ordering. A storage failure cannot reopen a model
budget: subsequent logical attempts use source delivery. An explicit re-request
of a held report can complete from its original job inputs with no model calls;
the old counters, diagnostic and checkpoints are preserved until completion.
Inactive entitlements, ownership and deletion rules still apply.

Legacy Friends jobs may contain only previews. An explicit retry can attach
missing complete reader sections only when their selected transit identity,
house/aspect, date, person and timing match. Existing complete passages are never
replaced. The original facts remain in both the job and saved source snapshot;
changed or missing source matches leave the held job untouched. This recovery
still uses no model calls.

## Verification

- `node scripts/test-transit-source-completion.mjs`: actual request, worker,
  checkpoints, generation, judge, save, retrieval and reader, with isolated
  storage/model transport. Covers all three report kinds, strict pass/correction,
  rejection, malformed review, outages, missing sources, save acknowledgement,
  JSONB ordering, worker yield/resume, held-report recovery and exhausted-budget
  persistence recovery. No real model calls.
- `tests/visual/report-source-completion.spec.ts`: rows produced by that pipeline
  open and reload with complete text in a freshly built app, desktop and mobile.
- Existing strict/scoped/materiality/evidence-delivery suites remain required.
- Run the full Content Studio API contract and exact-head CI before merging.

## Release

Merge the verified PR into `main`; allow its production Git deployment to finish.
Enable only the source-completion policy with combined review. Do not enable the
earlier judge experiments. Verify the deployed revision and setting before
claiming the completion path is live. Reopen existing held reports explicitly;
do not bulk-reset their jobs or erase failed checkpoints. Check saved delivery
receipts and exact reader text after reload.

The offline checks establish delivery behavior and source preservation. They do
not establish improved fresh model writing, semantic accuracy of arbitrary
sources, or deployment status. The previous paid verification program remains
closed; these checks do not consume or reopen its unused call allowance.
