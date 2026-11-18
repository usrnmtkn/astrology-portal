# Daily complete-set editorial review

New Daily batch approvals use `daily-batch-editorial/v1`. Once all twelve
complete readings are saved, the durable batch runs one additional review of
the entire set. It compares interpretations, openings and endings, including
interchangeable meanings disguised by different houses or examples. Necessary
astrology terms and ordinary grammar are not repetition defects. Similar
topics can pass when their development and consequence meaningfully differ.

The review receives all twelve complete bodies and headlines, calculated
developments for each sign, the full saved Daily profile, complete selected
owner examples and applicable corrections. Identical source text is sent once
with every source and sign reference retained. No example, profile, calculation
or existing reading is rewritten. The current Daily calculated brief excludes
exact aspects; the reviewer must respect that coverage and cannot invent events
to create novelty on a quiet day.

The result must assess all twelve signs and return all three checks. A failed
check requires a reason and exact current body quotes from at least two signs.
Opening quotes must start at the beginning; ending quotes must include the
actual ending. Malformed, incomplete, refused, stale or unsupported results do
not pass. Exact provider responses, including invalid results, remain in private
history for diagnosis. Editor payloads expose findings and pending metadata,
without private requests, source collections or raw provider responses.

A fresh twelve-sign approval discloses a maximum of 25 paid requests: twelve
writers, twelve existing per-sign prose checks and one full-set review. There
is no new Daily shared planner. Pausing, reopening and the authenticated cron
worker use the saved authorization. A reservation is confirmed before dispatch;
progress checks retrieve its saved provider ID without sending another request.
Unknown sends remain held until an explicit acknowledged release after the
waiting period. Storage retries never authorize provider retries.

Findings stop the batch for owner editing. No rewrite or additional paid review
runs automatically. A complete saved manual edition can explicitly request a
one-call review. After edits, the owner can request one new review of the exact
saved set. A passing recheck resolves an automatic batch previously stopped by
findings. Exact prose, rules, facts, outline or writer-selection changes
invalidate the old result. Dirty editor text cannot be reviewed as saved text.

New enrolled Daily drafts need a current passing result before publication;
fact-parser overrides cannot bypass it. A pass is not wording approval. All
twelve remain drafts until the owner separately approves publication. Existing
in-flight single-sign requests retain their original stages and incur no new
batch charge through polling. Weekly, Monthly and Seasonal keep their existing
contracts. No database migration is required.

## Verification

Use an isolated checkout with its own dependencies and built knowledge package:

```sh
node tests/astro-writing/daily-batch-editorial.test.mjs
node --import tsx scripts/test-daily-batch-editorial.mts
node --import tsx scripts/test-weekly-batch-editorial.mts
node --import tsx scripts/test-horoscope-durable-batch.mts
npm run test:content-studio-api
npm run typecheck
npm run typecheck:server
npm run qa:css-audit
npx playwright test -c playwright.horoscope-reader.config.ts daily-batch-editorial.spec.ts weekly-batch-editorial.spec.ts
```

The contract and actual-handler tests use isolated storage and synthetic model
responses. They cover full evidence delivery, all three quoted findings, exact
source preservation, the 25-call boundary, pause/resume/cron, concurrent CAS,
unknown sends, failed reservations, invalid evidence, edit invalidation,
explicit rechecks, legacy isolation and separate owner publication through the
reader. Browser cases cover discovery, all three findings, loading, editing,
reload persistence and automatic generation at mobile and desktop widths in
light and dark themes. These checks establish implementation behavior; they do
not certify the literary quality of a future model response or run a paid sample.

Release evidence, the final tested revision and any remaining acceptance gaps
belong in the release PR. A source or fixture pass alone is not a live claim.
