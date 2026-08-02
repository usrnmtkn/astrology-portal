# Owner article judge calibration — August 1, 2026

## Executive summary

The Marie Satori article mirror materially improved the long-form judge
research. It showed that the original four-article calibration was too narrow:
GPT-5.6 Sol could separate those four articles from two weak controls, but that
success did not generalize to the broader fast-planet corpus.

The live work produced a safer `v4` candidate, not a production promotion.
Production remains on the active GPT-4.1-mini release. No generated content,
ephemeris result, date, timezone behavior, or publication state changed.

The final one-call v4 diagnostic scored the canonical Venus-in-Virgo article
`3 / in-voice` with no failed checks or response-contract violation. This
validates the targeted rubric correction, but it is not blind promotion
evidence because the article was used throughout diagnosis.

The subsequent 15-call v4 smoke improved substantially over the first expanded
smoke but did not pass: four of eight expanded single-event owner articles
scored 3, four scored 2, and both weak controls remained at 1. The candidate is
therefore still blocked from promotion.

The central editorial finding is specific: Marie's long-form voice is not only
casual conversation. It can be lyrical, polished, incantatory, and
structurally dense while remaining direct and lived. A judge that equates
"spoken" with short or informal prose will reject canonical owner writing.

An offline structural audit then showed that the remaining four v4 failures
were also template assumptions: the articles contain the intended lived stakes,
house specificity, direction, and release, but do not put those elements into a
fixed generated-template order. Candidate `v5` records that correction. It has
not received a live evaluation and is not promotion evidence.

## What this work is—and is not

This is judge calibration: improving the owned prompt, rubric, controls, and
evaluation method used to assess generated writing. It does not fine-tune
model weights.

The owner articles remain evaluation and diagnostic material. They are not
automatically eligible for a future training dataset. Training on the same
articles later used to evaluate the model would invalidate the evaluation.

## Corpus preparation

The owner-provided SiteSucker mirror contained 47 astrology articles, totaling
approximately 211,000 authored words. The importer selects the authored
`div.rte` body and removes Shopify navigation, products, scripts, and page
chrome.

The original calibration subset contains 15 articles and approximately 66,000
words:

| Cohort | Count | Purpose |
| --- | ---: | --- |
| Calibration candidates | 4 | New Mercury, Venus, Mars, and Chiron coverage proposed for judge diagnosis |
| Same-surface diagnostics | 4 | Mercury and Venus single-event articles already exposed during smoke/probe work |
| Adjacent formats | 7 | Nodes, relationship-year, annual Mercury retrogrades, weekly, seasonal, yearly, and eclipse references kept out of the planet-article evaluation |

Every extracted body has a SHA-256 hash. The manifest also records the source
URL, raw body-HTML hash, word count, factual policy, and activation policy. See
the [owner corpus manifest](../../voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/manifest.json).

The importer now also preserves the other 28 full article bodies as
surface-specific references. Together with the four active fixtures, all 47
mirror articles are accounted for. The 28 additions remain excluded from the
planet-article evaluator and do not increase its paid-call plan.

Historical dates, degrees, and timezone labels inside these published articles
are evaluation text only. They do not become engine facts. Runtime astrology
continues to come from the configured ephemeris and the user's local timezone.

### Blind-holdout availability

The mirror contains 47 astrology articles. A full-body structural review now
accounts for all of them: four active calibration fixtures and 43 corpus
entries. The final 28 comprise 16 lunation/eclipse articles, 6 season/solstice
articles, 3 annual/monthly overviews, and 3 weekly editions. None is an unused
single-event planet ingress or station article applicable to this judge.
See the [article-by-article full-corpus audit](./OWNER-ARTICLE-FULL-CORPUS-SURFACE-AUDIT-2026-08-01.md).

Those formats cannot honestly be relabeled as a blind planet-article test. A
valid blind gate requires future, previously unused owner writing on the same
surface. The minimum useful target is four new articles, frozen by source slug
and body hash before the first result is seen. At five samples per article,
four blind articles plus the two existing weak controls require 30 calls. A
one-sample regression smoke over the current 14-text diagnostic profile costs
14 calls, producing a staged total of 44 calls if both phases are authorized.

## Why the “held-out” label was retired

The first expanded smoke evaluated all five articles originally labeled
held-out. Their scores were then used to diagnose prompt and rubric behavior.
They are therefore no longer blind evaluation data.

Four remain in `diagnosticSameSurface`. The annual 2025 Mercury retrograde
overview was also exposed, but the v4 smoke confirmed that it is an adjacent
year-overview format rather than a single-event planet article; it is excluded
from future planet-article runs. This prevents a future report from claiming
independent validation using examples that already influenced the rubric. A
genuinely blind promotion test will require fresh owner writing frozen before
the next tuning cycle.

## Experiment record

### Baseline candidate calibration

The original GPT-5.6 Sol candidate ran five samples each over four approved
owner fixtures and two weak controls: 30 calls total.

| Cohort | Result |
| --- | --- |
| Four original owner fixtures | All scored 3 |
| Two weak controls | Both scored 1 |
| Approved mean | 3.0 |
| Weak mean | 1.0 |
| Separation | 2.0 |

This passed the narrow evaluation but did not prove broader corpus coverage.
Report: [original 30-call calibration](../../../../out/editorial-calibration/gpt-5.6-sol-longform-v2.json).

### Expanded one-sample smoke

The expanded profile made 15 calls: four active owner fixtures, four new
calibration candidates, five same-surface articles, and two weak controls.

| Cohort | Scores |
| --- | --- |
| Original owner fixtures | 3, 3, 3, 3 |
| New calibration candidates | 1, 1, 1, 1 |
| Same-surface diagnostics | 2, 2, 1, 2, 1 |
| Weak controls | 1, 1 |

The smoke failed correctly. The audit showed that every new owner article
failed `recognizability`, while the older fixtures contained visible
"owner-published, verbatim" headers. The evaluation harness knew the new texts
were owner-authored but did not pass that provenance to the prompt, so the
rubric's explicit owner-verbatim CC/SD exemption was never applied.

Report: [expanded smoke](../../../../out/editorial-calibration/gpt-5.6-sol-owner-corpus-smoke-v1.json).

### Focused owner-verbatim probe

The first one-call Venus-in-Virgo probe added the missing provenance signal.
`Recognizability` cleared, but the model returned score 2 with no failed
checks. That response contradicted the rubric. This probe is diagnostic only:
the prompt had changed before its version identifier was bumped, so it is not
valid release evidence.

Report: [diagnostic provenance probe](../../../../out/editorial-calibration/gpt-5.6-sol-venus-virgo-owner-verbatim-probe-v1.json).

### Versioned verdict-contract probe

Candidate `v2` made the response contract explicit:

- score 3 requires no failed checks;
- score 2 requires one or two named material checks;
- score 1 requires at least one named check;
- score/verdict mismatches, unknown check IDs, and contradictory arrays become
  contract violations routed to human review.

The versioned Venus-in-Virgo probe returned a coherent score 2 with one failed
check: `spoken-not-written`. This confirmed that owner-verbatim handling was
fixed and isolated the remaining rubric disagreement.

Report: [versioned verdict-contract probe](../../../../out/editorial-calibration/gpt-5.6-sol-venus-virgo-owner-verbatim-probe-v2.json).

### V3 lyrical-register probe

Candidate `v3` explicitly licensed lyrical, polished, incantatory, and
structurally dense long-form prose when it returns to direct address, the body,
ordinary scenes, or material stakes. The one-call Venus-in-Virgo probe still
returned score 2 and still named `spoken-not-written` as its only failure.

The response was coherent, but the unchanged result showed that explanation
alone did not remove the model's anchoring on the check label. The phrase
`spoken-not-written` invites the model to ask whether polished prose sounds
transcribed, which is not the intended editorial distinction.

Report: [v3 lyrical-register probe](../../../../out/editorial-calibration/gpt-5.6-sol-venus-virgo-owner-verbatim-probe-v3.json).

### V4 direct-lived-register probe

Candidate `v4` renamed `spoken-not-written` to `direct-lived-register`. The
underlying standard remains strict, but the new name stops asking whether
polished prose sounds improvised or transcribed. It asks whether the writing
returns to direct address, the body, ordinary scenes, or material stakes rather
than remaining institutional or abstraction-only.

The one-call Venus-in-Virgo probe returned:

| Field | Result |
| --- | --- |
| Score | 3 |
| Verdict | `in-voice` |
| Failed checks | none |
| Contract violation | false |
| Disagreement | false |
| Advisory recommendation | approve; human review still required |

This is the first coherent pass on the expanded fast-planet owner corpus. It
validates the direction of the v4 correction without establishing promotion
readiness.

Report: [v4 direct-lived-register probe](../../../../out/editorial-calibration/gpt-5.6-sol-venus-virgo-owner-verbatim-probe-v4.json).

### V4 expanded diagnostic smoke

The one-sample v4 smoke made 15 calls using the then-current corpus split. It
kept the candidate frozen and made no production or promotion change.

| Cohort/article | Score | Failed checks |
| --- | ---: | --- |
| Four original owner fixtures | 3, 3, 3, 3 | none |
| Mercury in Taurus | 3 | none |
| Venus in Cancer | 3 | none |
| Mars Direct in Cancer | 2 | `command-runs`, `block-shape` |
| Chiron Retrograde in Aries | 2 | `block-shape` |
| Mercury Enters Virgo | 3 | none |
| Mercury Retrograde in Leo | 2 | `empathy-first`, `benediction-close` |
| 2025 Mercury Retrogrades and Horoscopes | 1 | `empathy-first`, `direct-lived-register`, `maybe-lists`, `block-shape` |
| Venus in Virgo | 3 | none |
| Venus Retrograde in Aries and Pisces | 2 | `block-shape` |
| Two weak controls | 1, 1 | multiple expected failures |

The expanded owner mean was 2.75, the weak mean was 1.0, and separation was
1.75. There were no response-contract violations or sample disagreements. The
run failed because every canonical same-surface owner article must score 3.

The annual Mercury retrograde overview is now classified as an adjacent format
and will not be used to tune the single-event planet-article judge. The four
remaining score-2 results concentrate the next editorial question around
`block-shape`, with separate questions about Mars command runs and the licensed
opening/close range for Mercury retrograde editions.

Report: [v4 expanded diagnostic smoke](../../../../out/editorial-calibration/gpt-5.6-sol-owner-corpus-diagnostic-smoke-v4.json).

### Offline audit of the four score-2 disagreements

The owner corpus is the authority for what the house voice permits. The audit
reviewed the article openings, structural headings, rising-sign blocks, and
final editorial paragraphs; it did not ask another model to resolve the
editorial question.

| Article | V4 disagreement | Corpus evidence |
| --- | --- | --- |
| Mars Direct in Cancer | `command-runs`, `block-shape` | The article opens in a bodily scene, develops ordinary-life battle and exhaustion imagery, and gives every sign a house-specific pattern plus a decision or forward movement. Its force comes through questions, contrasts, short declarations, and direct choices rather than a mandatory two-command sequence. |
| Chiron Retrograde in Aries | `block-shape` | The twelve concise blocks name a lived wound or survival pattern and land in concrete permission or integration. Their brevity is a canonical block form, not missing structure. |
| Mercury Retrograde in Leo | `empathy-first`, `benediction-close` | The date-led opening promptly moves to communication problems, creative confusion, returning people, and the pressure of being seen. The final Pisces block closes on the concrete boundary “Your energy is not endless,” which is a forward-facing release rather than a summary. |
| Venus Retrograde in Aries and Pisces | `block-shape` | The long narrative blocks consistently locate the relevant houses, show relationship, money, work, identity, or family stakes, and end in a question, choice, boundary, or promised clarity. They vary their sequence instead of repeating one slot template. |

Three rubric assumptions caused the false negatives:

- `block-shape` was read as a required sequence inside every block, although
  the owner corpus varies sequence, length, and landing across signs;
- `command-runs` described a signature option as expected in Mars territory,
  inviting the judge to fail an article for omitting an optional device;
- the opening and close rules licensed alternate forms in principle but did
  not name date-led stakes and final-sign boundaries explicitly enough.

Candidate `v5` corrects those assumptions without loosening the substantive
floor. Rising-sign sections are now judged holistically for life-area
specificity, a lived pattern, and usable movement in any order. Command runs
remain licensed but can fail only when present and scolding, generic, or
unsupported. Date-led openings and final-block boundaries are explicit
canonical forms. The fast-mover furniture now distinguishes generated slot
editions from owner narrative and retrograde editions.

### V5 14-call diagnostic smoke

After the full-corpus surface audit and human-readable rubric synchronization,
v5 ran one sample over twelve owner planet articles and two weak controls. The
release provenance matched the registry, and there were no response-contract
violations.

| Cohort/article | Score | Failed checks |
| --- | ---: | --- |
| Saturn enters Aries | 3 | none |
| Jupiter in Cancer | 3 | none |
| Uranus direct in Taurus | 3 | none |
| Uranus Rx in Gemini | 2 | `command-runs`, `block-shape` |
| Mercury in Taurus | 3 | none |
| Venus in Cancer | 2 | `direct-lived-register`, `block-shape` |
| Mars Direct in Cancer | 2 | `direct-lived-register`, `block-shape` |
| Chiron Retrograde in Aries | 3 | none |
| Mercury Enters Virgo | 3 | none |
| Mercury Retrograde in Leo | 3 | none |
| Venus in Virgo | 3 | none |
| Venus Retrograde in Aries and Pisces | 2 | `block-shape` |
| Two weak controls | 1, 1 | multiple expected failures |

Eight of twelve owner articles scored 3. V5 corrected the prior Chiron and
Mercury-retrograde false negatives, but Uranus Rx and Venus in Cancer regressed
from 3 to 2; Mars Direct and Venus Retrograde remained at 2. Both weak controls
remained cleanly separated at 1.

The Uranus `command-runs` failure is suspicious because v5 permits that check
to fail only for an actual scolding, generic, or unsupported command sequence,
never for absence. The report retained the check ID but not the judge's
sentence-level evidence, so it cannot show which condition the judge believed
it found. The four `block-shape` findings and two `direct-lived-register`
findings have the same evidence gap. They cannot be responsibly accepted or
dismissed from the score alone. This exposes a verdict-evidence weakness rather
than justifying another voice-rule rewrite.

The run failed as it should: owner mean 2.67, weak mean 1.0, and no promotion
eligibility. Production remained unchanged. Report:
[v5 14-call diagnostic smoke](../../../../out/editorial-calibration/gpt-5.6-sol-owner-corpus-diagnostic-smoke-v5.json).

### V6 evidence-backed verdict contract

V6 changes the verdict contract, not the house-voice standard. Every failed
check must now include exactly one evidence object containing:

- the matching check ID;
- an exact sentence copied from the submitted article;
- a check-specific explanation;
- a concrete rewrite.

The parser verifies that evidence IDs exactly equal the failed-check IDs and
that every quoted sentence exists in the submitted article. Missing, extra,
duplicated, mismatched, or invented evidence is a contract violation routed to
human review. Score 3 requires empty failed-check and evidence arrays.

The prompt adds stricter applications for the three v5 problem checks:
`command-runs` requires an actual bad command sequence and can never fail for
absence; `block-shape` must identify the specific life-area, lived-pattern, or
usable-movement failure inside a representative horoscope block; and
`direct-lived-register` must quote institutional or abstraction-only prose
rather than treating polish or lyricism as evidence.

Portable evaluation reports retain check IDs and SHA-256 hashes of the quoted
sentence, reason, and rewrite, but not the owner copy itself. The v6 parser,
routing, corpus evaluation, privacy, and no-copy report tests pass offline. No
v6 API calls have been made.

## Call accounting

| Phase | Calls |
| --- | ---: |
| Original five-sample calibration | 30 |
| Expanded smoke | 15 |
| First focused probe | 1 |
| Versioned focused probe | 1 |
| V3 lyrical-register probe | 1 |
| V4 direct-lived-register probe | 1 |
| V4 expanded diagnostic smoke | 15 |
| V5 diagnostic smoke | 14 |
| Total across this GPT-5.6 Sol judge investigation | 78 |

One attempted smoke start made zero calls because candidate provenance did not
match the local `OPENAI_MODEL=gpt-4.1-mini` override. The run stopped before
judging. Subsequent candidate runs explicitly neutralized that generic local
override, allowing the registry to supply GPT-5.6 Sol with `low` reasoning.

## The v4 rubric change

The v4 change retains v3's narrow permissions and renames
`spoken-not-written` to `direct-lived-register`. It does not make all poetic
prose pass. It teaches the judge that long-form direct register may include:

- lyrical or incantatory passages;
- polished prose and careful metaphors;
- long paragraphs and extended horoscope blocks;
- section headings and dated transit explanations.

Those forms pass only when the writing returns to direct address, the body,
ordinary scenes, or material stakes. Sustained institutional, academic,
consultative, think-tank, or generic abstraction still fails.

This distinction reflects the owner corpus while preserving the purpose of the
weak controls. See the [current machine rubric](../../voice/tldr-astro/sky-article-longform.json)
and [article judge](../../scripts/judge-article-voice.js).

## The offline v5 correction

V5 does not change the direct-lived-register correction validated by the live
v4 probe. It narrows the remaining structural checks so they assess editorial
function rather than generated-template order:

- rising-sign blocks need specificity, a lived pattern, and usable movement
  across the set, not every ingredient in every block;
- questions, contrasts, declarations, and choices may supply the momentum that
  a command run sometimes supplies;
- a date-led opening may establish lived stakes in its first thematic
  paragraphs;
- the final sign may close on a concrete boundary, choice, permission, or
  forward-facing declaration without an added blessing.

This was an evidence-backed specification correction, not promotion evidence.
The later v5 smoke showed that GPT-5.6 Sol still does not apply it reliably.

## CC/SD boundary

CHANI and Spirit Daughter material is used only as an anti-imitation boundary.
It is not a source of dates, doctrine, or generated copy. Owner-verbatim text
is exempt from literal CC/SD construction matching because the purpose of that
check is to detect generator drift, not retroactively reject Marie's published
writing.

The exemption is narrow: it does not grant an automatic score and does not
disable empathy, grounding, structure, teaching, or close-quality checks.

## Current state

- Active production judge: unchanged GPT-4.1-mini release.
- Staged candidate: GPT-5.6 Sol `v6`, low reasoning; evidence contract only,
  unevaluated.
- Prompt: `sky-article-longform-v6:prompt-v1`.
- Rubric: `sky-article-longform-v6`.
- Evaluation profile: `sky-article-longform-owner-corpus-diagnostic-v1`.
- Promotion eligibility: none. The diagnostic corpus is not a blind set.
- Live v4 results: the focused probe passed; the expanded smoke failed with
  four score-2 owner articles after the annual overview was reclassified.
- V5 status: evaluated in a 14-call smoke; failed with four owner false
  negatives and no promotion eligibility.
- V6 status: offline contract tests pass; no live results and no promotion
  eligibility.
- Production model and release: unchanged.

## Recommended next sequence

1. Review the documented v5 structural ruling against the four named articles.
2. Keep v5 as a failed diagnostic release; do not promote it.
3. Review v6's evidence contract; it is the staged candidate but remains
   unevaluated.
4. When four new same-surface owner articles exist, freeze their slugs and body
   hashes before judging. Do not tune the prompt after examining those scores.
5. If explicitly authorized, run a four-call targeted v6 probe over the four
   v5 false negatives before proposing another full diagnostic smoke.
6. If a later smoke is sound, run the separate 30-call blind gate and consider
   promotion. A passing judge remains advisory; it cannot publish content.

## Final conclusion for this phase

The article corpus did what a useful calibration corpus should do: it disproved
a narrow pass, exposed a missing owner-verbatim exemption, caught an internally
contradictory verdict, revealed a misleading rubric label, and verified the
targeted correction on the same diagnostic article.

The live v4 candidate is materially better but not ready for promotion. The expanded
smoke preserved weak-control rejection and corrected Mercury/Venus false
negatives, while four canonical single-event articles still scored 2. Direct
inspection showed those results came from a generated-template bias, and v5
recorded the resulting editorial correction. The v5 smoke then fixed two known
false negatives but produced two regressions and repeated two structural
failures, while continuing to reject both weak controls. It is not promotable.
The next improvement belongs in verdict evidence and contract enforcement, not
another unsupported voice-rule rewrite. Fresh blind owner writing remains
necessary to show that any later correction generalizes.
