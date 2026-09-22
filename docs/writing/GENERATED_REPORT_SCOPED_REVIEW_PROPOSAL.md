# Generated-report scoped review proposal

Status: proposed; not implemented, activated, or proven. Source: owner task
`thread:01a0c440-92d0-7822-bda6-af3338840786`, September 22, 2026. The owner asked
whether there should be two judges after the frozen v1.7 calibration began.
The [calibration record](../qa/report-validation-recovery-2026-09-22.md)
documents the results. This proposal creates no new writing rule or approval.

## Problem to solve

One reviewer currently mixes factual support and editorial scoring. The v1.7
reviewer recognized a plausible source-support defect but rejected the
owner-preferred weekly report for prose and preferred the weaker alternative
in both comparison orders. Improved reference coverage and repeatable verdicts
did not establish agreement with the owner. Two copies of the same reviewer
would not address this evidence; different responsibilities need separate
evaluation, and the editorial standard still needs calibration.

## Proposed responsibilities

| Responsibility | Facts review | Writing review |
| --- | --- | --- |
| Inputs | Exact reader-visible draft; complete locked factual brief; applicable source-support rules | Exact same draft; target register/horizon; approved reader meaning; relevant complete owner passages and explicitly approved corrections |
| Scores owned | Astrology/chronology, factual traceability | Lived experience, interpretive movement, owner voice, natural language, syntax variety, emotional temperature, density |
| Additional findings owned | Unsupported interpretation, unsupported timing, over-specification | Narrative repetition and applicable explicit owner-language violations |
| Excluded authority | Voice, cadence, preferred ending, richer prose, replacement text | New factual claims, changing dates/placements, treating reference examples as the reader's life, replacement text |
| Evidence requirement | Exact claim plus specific missing/contradictory support; inspect all relevant supplied support | Full-context defect and reader consequence; applicable same-function comparison or explicit owner rule; consider contextual exceptions |

Both reviews would receive the same immutable draft hash. Run them independently;
neither receives the other's answer. Separate schema enums must reject
out-of-role scoring. Keep the governed pre-call evidence/authentication checks;
the factual provider packet should not include voice exemplars as apparent
factual authority. References and feedback remain protected server data.

An aggregation function would assemble the existing nine scores from their
respective owners. Preserve threshold 0.85, all hard gates, and the existing
voice/natural-language floors. This is not a vote or an average of two opinions
about the same category. Missing or invalid review output is an evaluation
failure, not a writing failure or an automatic pass. Neither role may override
the other's category or promote its own suggestion into approved owner policy.

## Editorial calibration before release

Calibrate what counts as a material defect against complete owner-reviewed
examples, including reasons and context. Preserve the distinction between
owner-authored passages and generated reports the owner reviewed. Existing
Draft Review feedback remains candidate unless the owner explicitly approves
its governed wording and scope; this proposal does not activate it.

The current four controls have been used for development and cannot now be
presented as unseen evidence. Keep their original drafts, source briefs, labels,
and all failed runs intact. In particular, the weaker weekly draft was called
acceptable in isolation but rejected relative to the preferred one: relative
preference must not be converted into a fabricated absolute defect.

Test a separately frozen set of complete reports with owner labels withheld
from provider prompts. Cover daily, weekly, and Friends; include acceptable,
editorially weak, and factually unsupported examples. Use repeated judgments
and order-reversed relative comparisons, with separate reporting of:

- factual detection and false factual objections;
- accepted-writing rejection and missed editorial defects;
- relative preference agreement;
- repeated-decision and diagnostic consistency;
- actual calls, cost, and completion latency.

Evaluate whether the split improves these results against the combined
reviewer. Keep model choice fixed for the first comparison so a model switch
does not obscure the effect of role separation. Different models are an
additional experiment, not assumed independence. A small development pass is
insufficient to establish broad reliability.

## Correction, cost, and persistence constraints

The current short-report contract permits two judgments per logical attempt:
one initial review and one after the bounded correction. Two specialized calls
in each of those rounds would require up to four judge calls per attempt.
That is a concrete call-limit change, not an implementation detail. It needs
an explicitly reviewed budget and release-contract amendment before activation;
no extra calls are authorized by this proposal or the exhausted calibration.

Any correction changes the draft hash and invalidates both previous review
receipts. Re-review both roles against the new draft; do not reuse a prior fact
pass after prose edits. Each role and round needs its own checkpoint, immutable
request hash, provider response/usage record, and bounded reservation. An
uncertain provider outcome must not silently be retried. Keep the existing
single correction and job-attempt bounds unless a separately reviewed change
is authorized.

Save and serve only a complete report that passes deterministic checks and
both scoped reviews under the final approved contract. Verify persistence and
opening/ending retrieval through the actual daily, weekly, and Friends app
flows. Do not reclassify existing failures as complete, alter completed reports,
or treat a calibrated reviewer as proof that new writing is good.

## Order of work

1. Agree and record the split's category ownership and call-limit implications;
   prepare scoped contracts and synthetic boundary/checkpoint tests.
2. Establish the editorial calibration examples through the existing owner
   feedback process; freeze separate evaluation cases and exact paid inputs.
3. Run a bounded comparison against the combined reviewer, inspect every
   disagreement, and decide whether to retain the split.
4. Only after that evidence, integrate the scoped reviews into the existing
   writer/correction path and verify real app generation and retrieval.

Do not promise a release date before step 3. Role separation addresses
diagnostic scope; whether it repairs editorial judgment is still unproven.
