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
