# Production evidence shadow and Sky judge-gate retirement

Date: 2026-08-14
Status: deterministic wiring only; no generated copy is promoted or served by this change

> Integration update: the shadow-only state described below was superseded
> later the same day by
> `docs/decisions/2026-08-14-production-writing-kernel-integration.md`.
> This file remains the audit record for the initial shadow and Sky judge-gate
> work.

## Sky Aspect judge authority

`auto-publish` is no longer a valid generated Sky Aspect judge gate. A clean
score-3 result is written as `human-review`, remains `PENDING OWNER`, and needs
an explicit owner promotion to `LIVE` before the generated row can serve.

The read-only production audit on 2026-08-14 found:

- 7 `LIVE` Sky Aspect rows with `judge_gate = auto-publish`, score 3, and a
  clean lint result.
- All 7 depended on auto-publish alone under the prior generated-content
  boundary.

The new boundary excludes those generated rows. Existing approved lower-tier
copy or the deterministic fallback continues to resolve; no row was deleted,
approved, or edited by the audit.

## Deterministic production identifier map

The production adapter maps the identifiers emitted by the two active
model-producing paths without fuzzy matching:

| Production identifier | Governed targets | Basis |
| --- | --- | --- |
| `sky-{body}-{aspect}-{body}` | ordered `body/*`, `aspect/*`, `body/*` | current-Sky mechanism components |
| `transit-natal-{transiting}-{aspect}-{natal}` | exact `transit-aspect/*` when present | exact transit-to-natal record |
| same transit ID with no exact object | ordered `body/*`, `aspect/*`, `body/*` | fail-closed compositional mechanism packet |
| return-framework aliases | hash-verified `doc/*` target | enumerated static table |

The total-coverage test exercises 1,092 possible current-Sky identifiers and
1,120 possible personalized transit identifiers from the runtime's declared
point and aspect sets. Unknown identifiers fail before any provider call.
Report generation and arbitrary admin shapes are not silently mapped. If their
surface is enabled for shadowing before an explicit adapter exists, the
adapter fails closed.

## Shadow contract

Set `WRITING_KERNEL_SHADOW_SURFACES` to a comma-separated allowlist such as
`sky,you`. `all` is accepted for diagnostics but currently causes unmapped
surfaces, including `year_ahead`, to fail closed.

For an enabled surface, the provider boundary:

1. maps every emitted legacy evidence identifier;
2. builds and hash-verifies the governed single- or ordered-multi-target packet;
3. logs identifier mappings, counts, index hash, packet hash, old-evidence hash,
   and old-prompt hash;
4. sends the existing production prompt only.

The log never contains API keys, raw owner prose, the prompt, facts, or source
text. It records hashes and identifiers only. Every shadow record states
`governedPromptUsed: false` and `servingChanged: false`.

Keep shadow mode on one surface at a time for at least seven days of ordinary
traffic. Review identifier failures, evidence-count deltas, and packet hashes
with the owner before promoting that surface. Promotion is a separate change
and requires explicit owner approval.

## Remaining production authority

The report judge in `api/_lib/report-fulfillment.ts` remains a blocking
production judge and is unchanged. The governed writing-pipeline Reader Judge
is advisory-only; that statement does not apply to report fulfillment.
