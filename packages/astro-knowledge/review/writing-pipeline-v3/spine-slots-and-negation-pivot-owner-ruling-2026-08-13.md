# Spine slots and negation-pivot cap

Status: owner ruling recorded; pipeline implementation only; no content approval.

## Owner rulings, verbatim

> SPINE SLOTS ARE CHECKS, NOT TEMPLATES (owner ruling, 2026-08-13): a spine
> element is satisfied when its content is present in the prose, not when a
> sentence announces it. Structural vocabulary from the spine or outline
> ("the job of," "this is a period for," "the collective lesson is") must not
> appear in reader copy unless it earns its place as a line. A construction
> approved once does not license its reuse; repeating it across a set turns a
> strong line into machinery.

> NEGATION-PIVOT CAP (owner ruling, same date): the "X is not Y. It is Z."
> family, including "the problem is not," "X is not the problem," and "not X but
> Y," is owner voice and stays available, but it currently appears 84 times
> across approved copy and has become the default pivot for every argument.
> Cap: at most one negation pivot per page, and no more than three across a
> twelve-item set. When the cap is reached, the turn must find another way in:
> state the consequence directly, ask the question, or name what happens next.
> Deterministic check reports the count per page and per set.

## Implementation

- Both article spines declare `semantic_presence_not_reader_facing_template` as their
  satisfaction mode.
- Every writer request says that spine and outline labels are internal checks, not prose.
- `spine_scaffold_grammar` reports each named construction for owner review. Because the
  ruling allows an earned line, this finding does not pretend that software can make the
  prose judgment.
- `spine_scaffold_repetition` reports a named construction used in more than one item in a
  set.
- `negation_pivot_cap` blocks new page copy above one pivot.
- `negation_pivot_page_cap` and `negation_pivot_set_cap` block a set above one per page or
  three total.
- Every page result carries `counts.negationPivots`; every batch result carries the total
  and the per-page counts.

## Venus in Libra effect

The held partial-rewrite request cuts the reader-facing job sentence without replacement.
The protected first paragraph already satisfies that semantic spine check. The next writer,
if separately authorized, receives a one-field schema and may generate only the replacement
`development` lived section; the harness assembles it with the three owner-authored anchors.
The protected tension opening reserves the page's one pivot, so generated text has a zero-pivot
budget. No billed call was made for this implementation.
