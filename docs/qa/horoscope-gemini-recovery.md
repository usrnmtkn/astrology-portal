# Gemini horoscope recovery

The Gemini Interactions API accepted background requests but returned HTTP 400
`invalid_request` on retrieval with a single authentication credential. The
application converted that response into a retryable 503. Repeated polling
therefore never completed the saved request, and the batch returned to Resume.
Google's developer forum has matching reports and a staff investigation:
https://discuss.ai.google.dev/t/interactions-api-retrieval-fails-with-multiple-authentication-credentials-received/187237

New Gemini requests use the original streamed POST response. The server stores
its completed result against the reserved operation and request hash. Polling
reads that checkpoint without calling Google's retrieval endpoint or repeating
the writer. Transport versioning preserves the identity of older requests.
A result checkpoint also advances the edition version. The active browser batch
now refreshes that version only when the checkpoint is the sole change. Newer
prose, instructions, publication state or operation identity still stop the batch.

Prompts, selected model, token allowance, reasoning setting, approval gates and
independent review are unchanged.

The stream parser requires a terminal event, preserves text across UTF-8 and
SSE chunk boundaries, excludes thought steps, and records provider usage and
identity. Interrupted or missing checkpoints terminate with an explicit error;
they never automatically trigger another paid request. Storage retries preserve
newer owner edits and cannot resurrect an ended request.

For older background requests affected by the exact Google retrieval error,
the handler holds the uncertain request and returns control to the batch. Other
signs can continue. The blocked sign needs an explicit retry acknowledgment;
its potentially billed request remains in the history. The aged-request Release
action also accepts this known retrieval failure after explicit acknowledgment,
archives the outcome as unknown, and starts no replacement request. This does not recover
text that Google cannot return.

Validation uses isolated storage and native provider-shaped fixtures, with no
new paid model calls:

- Actual handler across all four horoscope periods: complete instructions,
  selected model persistence, pinned requests and separate review.
- Native Gemini SSE: final-only text, split UTF-8/CRLF, terminal errors,
  interrupted streams and changed response identity.
- Legacy HTTP 400: exactly one retrieval, held sign preserved, next sign saved,
  no automatic replay, and late result cannot resurrect the held operation.
- Rendered Studio: model selection, reload/resume, saved prose preservation,
  provider availability, automatic continuation past the held sign, and explicit
  release when the legacy Gemini cancellation endpoint cannot confirm an outcome.
- Full Content Studio API contract, typecheck, CSS audit, bundle budget and
  privacy scans. The checkpoint comparison loads only during conflict recovery.

Release evidence and exact tested revisions belong in the PR. Rendered browser
checks use the actual handlers with synthetic storage and model responses;
they are not evidence of a fresh live Gemini generation or editorial quality.
