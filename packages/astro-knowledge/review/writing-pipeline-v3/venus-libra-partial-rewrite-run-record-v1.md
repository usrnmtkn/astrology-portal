# Venus in Libra partial rewrite: run record, v1

## Authorization

> I authorize exactly one billed Sol-xhigh Venus in Libra partial-rewrite call, capped at 12,000 output tokens, with no Terra and no retries.

## Execution

- Request SHA-256: `f4f92ac9dbe5639e90699daf05d61636f4205c3e4325e57eaf618c4ed797c15f`
- Writer: OpenAI `gpt-5.6-sol`
- Reasoning effort: `xhigh`
- Maximum output tokens: 12,000
- Writer calls: 1
- Billed calls: 1
- Terra calls: 0
- Retries: 0
- Automatic revisions: 0
- Input tokens: 59,736
- Output tokens: 3,365
- Reasoning tokens: 3,106
- Total tokens: 63,101

The first local harness invocation stopped before contacting OpenAI because the temporary checkout had no `.env.local`. It consumed no call and no credits. The authorized call then used the configured credential from the main project checkout without copying or printing it.

## Result

- Pipeline status: `human-review-required`
- Review status: `needs_review`
- Owner approved: false
- Serving authorized: false
- Generated field: `development` only
- Protected opening: byte-exact
- Protected tension: byte-exact
- Protected close: byte-exact
- Deterministic result: `REVISE`
- Hard failure: `whether` appears twice in the generated field
- No correction or regeneration was performed.

Artifacts:

- `venus-libra-partial-rewrite-result-v1.json`
- `venus-libra-partial-rewrite-transmitted-packet-v1.json`
- `venus-libra-partial-rewrite-rendered-cold-read-v1.md`
