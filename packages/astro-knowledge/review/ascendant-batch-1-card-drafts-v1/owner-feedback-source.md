# Owner feedback source: Ascendant batch 1 revisions

Source: owner instruction in Codex chat, 2026-08-04.

Classification: exact deletion instructions, exact owner-authored Mercury hard replacement wording, and approval-as-drafted decisions. This instruction authorizes preparation of hashed owner-revision candidates only. It does not constitute hash-bound exact approval, approval-record creation, promotion, serving changes, or a shipping pull request.

## Approved as drafted

- sun/conjunction
- moon/conjunction
- moon/hard
- moon/soft
- mercury/conjunction
- mercury/soft
- venus/hard
- saturn/conjunction
- saturn/hard

## Deletion-only revisions

- sun/hard: delete the final sentence from both variants.
- sun/soft: delete the sentence beginning "Because this happens with so little effort" and the final sentence from both variants. Set `warmthSource` to `null` and remove the `owner-corpus-derived` label.
- venus/conjunction: delete the final sentence from both variants.
- venus/soft: delete the clause "and less likely to monitor how they are presenting themselves" / "and less likely to monitor how you are presenting yourself".
- saturn/soft: delete the middle sentence from both variants.

## Mercury hard owner-authored replacement

Replace the final sentence with these two sentences:

`body_you`:

> The more {{holder2}} explains, the more you have to question or respond to. After a while, {{holder2}} starts thinking too hard about what to say before the conversation even begins.

`body_they`:

> The more you explain, the more {{holder1}} has to question or respond to. After a while, you start thinking too hard about what to say before the conversation even begins.

## Global payload instruction

Normalize curly apostrophes and quotation marks to straight ASCII in all fifteen final payloads.

## Foundation-line feedback

The "manufacturing confidence" foundation line is owner-rejected for soft-aspect contexts. It is already used in the shipped Jupiter-Ascendant hard card. Future harvest runs must flag reuse of a foundation line across shipped cards for editorial review.

## Required stop point

Preserve original Sol outputs untouched. Write owner-revision candidates, rerun deterministic checks without billed calls, and produce `OWNER-REVISION-SUMMARY.md` with exact final payloads and SHA-256 hashes. Stop before exact-approval records or shipping work.
