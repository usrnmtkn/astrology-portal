# TLDR Astro writing pipeline v3

The shared five-role retrieval and verification contract is recorded in
`docs/writing/SHARED_EVIDENCE_STANDARD.md`. A draft is ineligible unless its packet contains
meaning, register, scene, and argument evidence; contains phrase evidence whenever its subject
matches an indexed owner theme; and passes every retrieval precondition there.

Status: owner-approved pipeline architecture, 2026-08-12.

## Permanent governance

Two blind calibration rounds proved model prose judgment unreliable. Nothing in this pipeline
uses a model prose gate. Prose judgment is an owner gate, permanently.

The preference fine-tune is outside this implementation. It requires separate owner
authorization and may not be started, priced into this work, or called from this pipeline.

## Experimental novel-collocation advisory

The proposed adjective-noun and verb-noun novelty signal is deterministic and advisory-only.
It may prioritize lines for owner reading, but it can never block, revise, approve, stage,
promote, or serve copy. The table is built from deduplicated owner-approved corpus passages,
owner corrections, knowledge-matrix rows, and serving rows. A pair is eligible to be called
novel only when both component words already occur independently in approved evidence; this
keeps the signal distinct from the rejected word-level vocabulary gate.

Activation is held until the owner reviews the leave-one-source-out false-positive report at
`packages/astro-knowledge/review/writing-pipeline-v3/novel-collocation-advisory-v1/`.

Owner ruling, 2026-08-13, recorded verbatim:

> "if the article does not go through both the writing-pipeline and the satori voice, fail the article and rewrite."

This is a hard writer precondition. An article-family writer request must retrieve at least
three exact owner-authored passages from the mapped same-family evidence pool and at least one
explicit register-gold page. This numerical floor is the active fail-closed implementation
proposed for owner review. An empty pool, a pool below either floor, or a family label with no
explicit evidence mapping returns `failed-retrieval` before credentials are loaded or a writer
is called. Such an output is diagnostic only: it is not voice evidence, an editable draft, or
a baseline, and the next attempt is a rewrite rather than a revision.

## Evidence-role separation

The owner corpus establishes Satori phrasing, movement, and thematic attention, but it does
not automatically establish the current concreteness standard. The 2026-08-13 corpus scan
found only five collective-register paragraphs with two or more concrete nouns, mostly in
personal-register passages or lists. Until the owner designates additional gold, the approved
Saturn in Capricorn rendered page is the primary register-gold model for scene specificity.
Article packets must say so explicitly. A lived paragraph must name things a reader can
picture: the actual decision, the actual cost, and the actual follow-up work.

The owner-passage-first rule supersedes count-only register retrieval. Three generic passages
from the broad surface no longer satisfy the voice precondition when published owner prose for
the exact planet-sign, same sign, or same planet is available. Actual relevant passages are the
primary prose model. Register gold remains a concreteness reference and must not impose its
argument or architecture on another placement.

The placement-breadth rule applies at the argument gate. The governed meaning plan must remain
broader than the page's chosen expression. Before approval, the packet distinguishes the broad
planet-sign mechanism from the chosen lens and lists at least three other valid expressions as
scope evidence only. Different scenes do not create breadth when they all prove the same narrow
social thesis. A too-narrow argument returns for owner review before drafting.

Scene evidence is a separate governed lane, not register evidence. For placement articles,
approved same-planet-sign house-horoscope cores are the primary scene bank when they exist.
Approved knowledge-matrix rows with at least two distinct recorded scene nouns and approved
serving rows with at least three may supplement them under governance-tier precedence. The
writer may learn observable objects, actions, costs, and follow-up work from those rows, but
may not import a house claim into a houseless article or treat scene evidence as an astrology
meaning authority. If approved same-planet-sign house-core scenes exist and none reach the
packet, retrieval fails before the writer runs.

Sky placement pages use direct address under the owner ruling of 2026-08-12. For the Venus in
Libra rewrite, `second_person` is a hard requirement rather than a preference inferred from
packet weighting. Third-person lived observations may be mixed in, but the page must address
the reader's life.

## Required order

1. Build the governed astrology meaning plan.
2. Build the ten-line argument core plus the eight required spine-quality intentions.
3. Stop at `owner-review-pending` until the owner approves the exact outline.
4. Require a recorded structural spine for the target content family.
5. Retrieve at least three exact owner-authored passages from the explicitly mapped content
   family, prioritizing exact planet-sign, then same-sign, then same-planet published prose;
   require the register-gold page, retrieve governed scene evidence in its separate
   lane, select five to ten owner-authored AVAILABLE LINES by theme, and select six to ten
   before/after correction pairs by content family and that family's historical failure
   categories.
6. Draft once from the approved argument, recorded spine, governed meaning, selected positive
   evidence, and selected correction pairs.
7. Run deterministic validation.
8. Return the rendered prose to the owner. No model prose verdict may approve, block, revise,
   stage, promote, or serve it.

The approved argument outline and its hash remain attached to the generated page. Generated
copy remains unapproved until the owner explicitly approves its exact wording.

The correction pool combines `owner-corrections.jsonl` and
`owner-feedback-corpus.jsonl`, deduplicated by normalized bad text. The current pool contains
59 unique corrections. Selection ranks exact family first, then the same surface family,
explicitly requested failure modes, that family's historical category frequency, adjacent
families, and stable source order.

## Argument outline contract

The outline contains a ten-line argument core: thesis, cultural rule, transit job, failure
mechanism, three intended lived scenes described as behaviors rather than prose, strategy,
intended close, and scope guard. It also requires eight one-line quality intentions before
owner review: planet, condition, handoff, thesis, lived evidence, failure mechanism, strategy,
and close. Slow-mover outlines require four additional one-line intentions: era frame,
recurrence, conditional older analogs, and collective lesson. These fields state how the
proposed page intends to meet the element-quality gate; they are planning records and must
never become reader-copy scaffolding.

## Spine coverage

The canonical Sky Placement article spine is: planet, condition, handoff, thesis, lived
evidence, failure mechanism, strategy, close. Fast movers use this spine without additions.
Slow movers add, between strategy and close: era frame, recurrence, conditional older analogs,
and collective lesson.

Spine elements are semantic coverage checks, not sentence templates. The writer satisfies a
slot when its meaning is present in the prose. It must not announce the slot or translate an
outline label directly into reader copy. Constructions such as `the job of`, `this is a
period for`, and `the collective lesson is` are flagged for owner review rather than treated
as required wording. Repeating one of those constructions across a set is reported as
template machinery.

The condition appears when dignity applies and explains the consequence of rulership. The
handoff is one opening sentence that carries prior sign, dates, and the actual shift. The
transit's job remains part of the governed argument plan but is not a sentence-shaped spine
slot. Structural vocabulary never enters reader copy merely because it appears in the plan.

### Spine quality requirements

Presence is necessary and insufficient. Each recorded article spine carries the eight quality
requirements defined in `src/astro-writing/spineQuality.mjs` and recorded verbatim in
`docs/writing/ASTROLOGY_CONTRACT.md`:

- planet: show where the planet becomes visible in ordinary life;
- condition: explain dignity through consequence and make the sign symbol interpret the
  mechanism;
- handoff: name the shift, not only the dates;
- thesis: name the challenged cultural rule and its beneficiary;
- lived evidence: two or three distinct situations with nameable objects and a short
  standalone pull-quote line;
- failure mechanism: show the useful skill becoming the problem through performed behavior;
- strategy: at least two short imperatives in sequence;
- close: land the condition or consequence without hedging or a date-bound ending.

For slow movers, the era frame must work at collective scale and contain a carry line;
recurrence must provide prior dates and what the period revealed; older analogs appear only
when verified and sourced material advances the thesis; and the collective lesson must include
a group-scale test the reader can apply.

Every inherited element is rechecked against the current gates. Prior approval does not exempt
an inherited close. The deterministic layer reports failures as advisory findings with element
and reason and never rewrites them. Because every element is required, any failed element produces
`spine-quality-incomplete`; the draft is not marked pipeline-ready or presented as complete.

Drafting fails closed for a family without a recorded spine. Cards, lunations, aspects, and
house cores remain unrecorded as of this version.

## Deterministic expansion status

Register, protected-line integrity, and placeholder integrity are blocking mechanical checks.
The negation-pivot family is counted per page and per set. More than one pivot on a page or
more than three across a twelve-item set is blocking for new generated copy. The count covers
`X is not Y. It is Z.`, `the problem is not`, `X is not the problem`, and `not X but Y`.
Synonym redundancy, scene-noun concentration, opening/anchor repetition, and vocabulary outside
the owner corpus are initially advisory so the owner can inspect false positives before any
future gating decision. Vocabulary outside the corpus is always advisory; uncommon does not
mean wrong.
