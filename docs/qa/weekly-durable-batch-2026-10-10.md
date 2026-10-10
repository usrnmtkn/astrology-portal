# Weekly generation and recovery repair

The reported Weekly run stopped between signs, and the editor could not reliably
recover its remaining readings. Generation used a browser loop, unrelated held
requests blocked rejection, and a manual edit sent the entire private generation
history back through the public function request.

## Behavior

- One approved Weekly plan creates a persisted batch with its exact plan hash,
  eligible sign list, writing model and actor. The server advances that batch.
- An immediate `waitUntil` worker and an authenticated minute cron use the same
  versioned lease. A terminated worker can be replaced after its lease expires.
- Each sign is marked attempted in the same storage checkpoint that reserves its
  writer. Existing stage reservations fence paid dispatch; polling retrieves the
  same provider ID. A batch cannot automatically redraft an attempted sign.
- Pause/resume retains the batch approval. A changed plan pauses explicitly.
  A provider request still pending after 20 minutes is preserved for attention
  while the other approved signs proceed. This does not claim cancellation.
- A held sign does not prevent rejecting another draft or rejecting saved drafts
  as a group. Its potentially billed request remains held until explicit release.
- Weekly editor transport omits internal generation history. Full owner evidence
  is fetched on demand; full drafts and rejected passages remain available.
  Editing merges with server-owned history and uses a compact CAS checkpoint.
- A review's initial reservation is recoverable before its dispatch fence. Losing
  that first save acknowledgement cannot be treated as a paid review attempt.

No owner prose, writing instructions or editorial admission rules are relaxed.
Daily, Monthly and Seasonal keep their existing generation workflows. No new
schema or external queue service is introduced.

## Acceptance and evidence

`test-horoscope-durable-batch.mts` exercises the actual writing core, storage CAS
fixture and native Gemini-shaped transport. It covers all twelve writers and
reviews without browser advancement, lease contention/expiry, pause/resume,
changed approval, bounded pending requests, a lost pre-dispatch acknowledgement,
cron authentication/discovery, a multi-megabyte private history and stale edits.
`test-horoscope-generation.mts` verifies that rejecting drafts preserves uncertain
requests. These run in the unfiltered Content Studio API suite.

`horoscope-model-choice.spec.ts` exercises the built Studio with actual handlers
and synthetic providers: generate all twelve, navigate away, reopen from a fresh
load, retrieve full saved evidence, pause/resume, preserve held candidates, model
availability and stale model selection, across desktop/mobile and both themes.
The old browser-loop interception tests are replaced because provider progression
now occurs on the server; dispatch/storage failure assertions live in API tests.

These fixtures verify control flow and storage, not Gemini's live latency or
editorial quality. Paid production verification requires separately approved
calls. Existing interrupted requests and owner content are not reset by deployment.
Record exact tested revision, complete-suite, browser and deployment results in
the release PR before claiming production readiness.
