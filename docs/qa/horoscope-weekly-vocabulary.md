# Weekly required vocabulary

Owner direction: `thread:01a0ce6e-69e0-7100-bdba-ad413d5c7804`, 2026-10-04.
The owner reiterated the prohibition on “whether” in new horoscope wording and
rejected two specific generated Weekly constructions. The private saved run
showed the lexical finding as advisory, with `lint.passed: true`.

## Scope and behavior

This change enforces that explicit prohibition for Weekly headline and body.
It does not change Daily, Monthly or Seasonal instructions or turn heuristic
voice scores into publication gates. Historical source passages stay intact.
The final Weekly writer request carries the prohibition even when an edition
was opened with an older saved profile.

A completed response containing the prohibited word remains saved and editable.
Its receipt records a blocking finding, but generation can continue to the next
sign. No automatic correction, retry or paid review is introduced. Review
checks the current text rather than continuing to display a stale receipt after
an edit. Publication checks current text independently of generation receipts,
including manual and legacy editions.

The separate protected Weekly profile correction retains the complete owner
examples and exact sentence selections. Specific rejected constructions are
negative evidence, not positive examples or a ban on all related subject matter.
The correction overrides earlier favorable feedback for those sentences only.
The profile update and deterministic word check do not prove improved authorship.

## Acceptance

Base revision: `cfea016d5e6850cd0f8a85c5f324ac3ebc3750e4`.
The PR records the exact tested head and deployment revision.

| Criterion | Evidence |
| --- | --- |
| Required wording reaches the Weekly request | Actual-handler queued and immediate writer fixtures inspect the assembled request |
| Prohibited text is retained without retry | Exact headline/body persistence, one provider start per sign, no active request or generation error |
| Remaining signs can finish | Next-sign generation succeeds after a blocked wording finding |
| Manual and legacy editions cannot bypass publication | Actual admin PATCH rejects prohibited text without modifying the row |
| Correction needs no regeneration | Draft PATCH and publication succeed after a manual synthetic correction; provider call count unchanged |
| Other periods retain behavior | Helper returns no findings for Daily, Monthly and Seasonal; assembled Daily request has no Weekly rule |
| Recovery is usable in the editor | Fresh production build, mobile/dark and desktop/light: complete generation, edit, save, reload, and publication eligibility |
| Existing text is preserved | Browser fixture asserts all eleven prior readings and the corrected reading's complete opening and ending |

Commands:

```sh
npm run test:content-studio-api
npx playwright test --config=playwright.horoscope-reader.config.ts --grep 'Weekly prohibited wording'
npm run qa:css-audit
```

The API suite includes `scripts/test-horoscope-weekly-vocabulary.mts` and the
reader-copy boundary checks. Browser write tests use actual handlers with
isolated storage and an injected synthetic provider. Production bundle checks
use the same isolation; they do not write owner content or call the provider.
No paid writing run was used as a diagnostic.
