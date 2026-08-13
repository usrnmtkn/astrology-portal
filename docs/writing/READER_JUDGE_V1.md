# THE READER: advisory first-pass judge (spec v1, closed)

## Final status

Reader Judge v1 is closed as a failed calibration experiment. It is not active in any writing,
review, reading-order, approval, blocking, revision, staging, promotion, serving, publishing, or
deployment workflow. The specification below is retained as historical documentation.

Owner verdict, verbatim (2026-08-13):

> two blind rounds show Reader Judge v1 cannot distinguish owner-approved prose from near-miss prose (4.3 vs 3.25 flags per page, inverted), cannot detect owner corrections (before greater than after in 2 of 15 pairs), and returns 39 useful flags per 100. Round 1's perfect score measured recognition of its own study material, not judgment. Prose judgment remains an owner gate, permanently. No further calibration spend is authorized.

## What it is

A model pass that reads finished copy the way the owner reads it and produces a FLAG LIST,
not a verdict. It never approves, blocks, revises, stages, or serves. Its only output is:
here are the lines she would probably stop on, and why.

## Why a flag list instead of a verdict

The previous attempt (cold_rendered_prose, 2026-08-11) asked for PASS or REVISE and was
permanently demoted after it flagged the owner's own approved Venus in Libra article. A
verdict forces a threshold the model cannot hold. A flag list does not: it degrades
gracefully. A page with zero flags gets read last. A page with twelve gets read first. The
owner still reads everything; the reader only changes the order and points at lines.

## Input

The rendered page only. No meaning plan, no source notes, no drafting context, no astrology
reasoning. If the copy needs its own context to make sense, that is a finding.

## Knowledge it is given

data/writing/owner-feedback-corpus.jsonl: 44 mined critiques, each with the bad text, the
owner's correction, the failure category, and the owner's stated reason. This is the
reader's model of her judgment. The reasons matter more than the labels.

Register gold: her published Saturn in Aries article, her Sun in Leo article, her Lilith V5
set, her Saturn in Capricorn article. These define what "she would not flag" looks like.

## Output schema (strict JSON)

{
  "flags": [
    {"quote": "<the exact sentence or phrase>",
     "category": "<one of the mined categories>",
     "why": "<one sentence in her terms, not the model's>",
     "confidence": "high | medium | low"}
  ],
  "flag_count": <int>,
  "read_priority": "read first | read soon | read last",
  "note": "<optional single observation about the page as a whole>"
}

No verdict field. No approve, pass, reject, or status field. Attempting to emit one is a
malformed response.

## What it looks for (the mined categories)

Natural language failures, constructed sentences, analytical register, abstraction where a
consequence belongs, ambiguous referents, invented motives, unearned assumptions, metaphors
that need translating, mixed metaphors, unsourced doctrine, stock tropes, batch furniture,
clinical shorthand, advocacy drift, sign-house bleed, textbook scaffolding, generic
astrology copy, personification, boilerplate openers, banned framing, vague words, vague
history, empty intensifiers, batch seams, repeated explanation, synonym redundancy,
vocabulary outside the corpus, register lurches, elevated words in concrete scenes,
explanatory-instead-of-lived openers.

## What it must NOT flag

Sharp, immediately understandable lines. Deliberate anaphora. Owner-locked text. Direct
address ("you") on sky pages. "People" used sparingly. Repetition that the sentence earns.
Astrological correctness it does not understand. When unsure, low confidence, not silence
and not a flag.

## Calibration target

Measured on flag density, not accuracy of a verdict:
- Owner-approved pages: few flags, and any flag must be low confidence.
- Known-bad pages (the reverted V7 Mercury masters): many flags, correct categories.
- The specific test that retired the last judge: the owner's Venus in Libra article must
  not be flagged as a page needing revision. A stray low-confidence flag is acceptable; a
  high-confidence pile is a failure.

If it cannot reach that, it stays unused. It never gains authority regardless of score.

## Standing governance

The reader is advisory forever. Prose judgment is an owner gate by design (recorded
2026-08-11). The reader sorts her reading; it does not replace it.
