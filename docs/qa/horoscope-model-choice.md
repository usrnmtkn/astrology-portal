# Horoscope prose model selection

Scope: Daily, Weekly, Monthly and Seasonal prose in Content Studio. Existing
saved profiles, owner evidence, planner models, review models and publication
approval remain under their existing contracts. New editions default to the
current OpenAI writer. The choice is saved per edition, and original model
metadata stays attached to each generated reading.

The Generate step offers Current writer, Gemini 3.1 Pro (preview), and Claude
Sonnet 5.5. A selection requires a newly reviewed plan. An active request pins
its provider and settings; opening, refreshing and polling cannot start another
writer or silently fall back to a different provider. Missing server connections
disable that choice. All providers still need the existing OpenAI connection
for planning and independent review.

## Recovery contract

- OpenAI continues using stored Responses requests.
- Gemini uses stored background Interactions and retrieves the same ID.
- Claude Messages streams in the existing Vercel function lifetime. Its result
  is checkpointed to the exact reserved private operation before acceptance.
  The stream has a 240-second deadline, leaving time to save. Conditional
  updates preserve newer edits and cannot resurrect a rejected or ended run.
- If a Claude process or checkpoint is lost, polling ends the wait after its
  deadline with an explicit possibly-billed failure. It never replays the call.
  This is not equivalent to provider-hosted durable retrieval.
- Seasonal outputs remain in the existing private editorial run store and pass
  its existing bounded reviews. Choosing a writer does not admit or publish prose.

## Verification

`scripts/test-horoscope-model-choice.mts` exercises the actual API handler with
isolated storage and native provider-shaped transport fixtures across all four
periods. It checks prompt/evidence byte preservation, saved choice, stale plan
rejection, immutable active model, no duplicate dispatch, existing planner and
review models, exact draft persistence, unavailable providers, explicit errors,
truncated streams, output limits and late-result rejection. It is included in
the unfiltered Content Studio API contract suite.

`tests/visual/horoscope-model-choice.spec.ts` uses a freshly built UI and the
actual handler with isolated storage. It covers desktop/light and mobile/dark,
saved selection after reload, approval reset, reload during a request, recovery
without a second writer call, preserved existing readings, model receipts and
unavailable choices. Run the existing horoscope recovery browser suite too.

Release gates include the complete Content Studio API suite on the exact PR
head, typecheck, CSS audit, reader-copy boundary, staged/public-asset privacy
scans and the same isolated browser flow against deployed main. These checks
verify transport and workflow; they do not certify literary quality. No paid
generation is part of acceptance testing.

Provider contracts checked against official documentation on 2026-10-07:

- [Gemini background execution](https://ai.google.dev/gemini-api/docs/background-execution)
- [Gemini Interactions schema](https://ai.google.dev/api/interactions-api)
- [Claude models](https://platform.claude.com/docs/en/models/overview)
- [Claude structured output](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Claude streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)

Gemini requires server-only `GEMINI_API_KEY`; Claude requires server-only
`ANTHROPIC_API_KEY`. Configure both Preview and Production before the release.
The catalog names explicit API models and does not claim equivalent output,
speed or price between providers. There is no automatic provider fallback.

## Browser payload

The browser imports only the display catalog, never the server provider configuration
module. Independent matched builds against main `d23f3ce1f` measure the deferred
horoscope editor at 13,083 and 13,706 gzip bytes (+623), with aggregate JavaScript
at 3,545,650 and 3,546,243 bytes (+593). The old editor cap was already 283 bytes
below main. Its reconciled 13,800-byte cap covers the existing overage and the
requested selector; startup, aggregate, CSS and other chunk caps stay unchanged.

## Existing unrelated browser failures

On 2026-10-07, an independently installed, unchanged checkout of main
`d23f3ce1f` reproduces both failures seen in the feature CI:

- `client-facing-user-flows.spec.ts`, “signed-in user can edit current location
  from settings”: the test expects one `.settings-row`, but the current settings
  surface renders four.
- `content-dashboard-admin-user-flows.spec.ts`, “Personal Transit preview
  explains missing timing”: its route fixture calls `transitPreviewResponse`
  outside that helper's scope, causing a `ReferenceError` before the response.

These are recorded baseline failures, not passing acceptance checks. The model
selector does not change either surface or fixture. Its three actual-handler
browser scenarios and the existing horoscope recovery scenarios pass separately.
