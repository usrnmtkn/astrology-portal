# TLDR Astro Writing Harness: owner architecture spec (verbatim, 2026-08-09)

Owner-authored specification for the canonical writing and review harness. The TASK block
below is her text verbatim and goes to Codex as the implementation instruction. Companion
seed data: TLDR-Owner-Corrections-Seed.jsonl (12 correction pairs from these sessions, each
with failure category and rule) seeds /data/writing/OWNER_CORRECTIONS.jsonl. Sources for
/docs/writing/: TLDR-Horoscope-Template-Canonical.md (all owner rules through the FINAL V5
LOCK RULES), TLDR-Owner-Writing-Doctrine.md, the repo phrasebank's MARIE-VOICE-BANK.md and
WRITING-STANDARD.md, the v8 knowledge matrix package, and owner-approved serving rows as
OWNER_APPROVED_EXAMPLES. Owner ruling on fine-tuning: phase two, not the current fix.

Owner-stated done condition: "I can request a new set of astrology placements without
pasting a style-review prompt, and the system automatically performs the same review before
showing me the copy."

---

TASK: Build the canonical TLDR Astro writing and review harness for every OpenAI API-generated astrology passage.

GOAL

Stop relying on per-task prompting or human review to re-teach the Marie Satori writing rules.

The repository must contain one canonical, versioned writing system used by:
1. Codex when drafting or editing astrology copy.
2. Every application OpenAI API call that generates astrology copy.
3. Every automated review/eval pass.
4. CI validation before generated copy can be staged as approval-ready.

ARCHITECTURE

Do not put the full writing manual in AGENTS.md.

AGENTS.md should be a short routing document that requires astrology-writing tasks to load the canonical TLDR Astro writing skill and supporting source-of-truth documents.

Create or normalize this structure:

/AGENTS.md

/skills/tldr-astro-writer/
    SKILL.md

/docs/writing/
    ASTROLOGY_CONTRACT.md
    VOICE_CONTRACT.md
    LITERAL_LANGUAGE_RULES.md
    BANNED_PATTERNS.md
    REVIEW_RUBRIC.md
    OWNER_CORRECTIONS.md

/data/writing/
    OWNER_APPROVED_EXAMPLES.jsonl
    OWNER_CORRECTIONS.jsonl

/src/astro-writing/
    buildMeaningPlan.*
    retrieveOwnerContext.*
    generateDraft.*
    reviewDraft.*
    reviseDraft.*
    validateCopy.*

/tests/astro-writing/
    deterministic lint tests
    sign-domain tests
    regression fixtures
    owner-approved examples
    known bad examples

SOURCE GOVERNANCE

The owner-approved v8 Knowledge Matrix is authoritative.

Owner-approved copy may be used as voice evidence.

Owner correction pairs are higher-value evidence because they show both the failure and the required correction.

Do not treat old generated prose, external astrologer prose, or rejected drafts as owner voice.

External sources may validate astrology meaning only. They are not drafting templates.

Do not paraphrase an external source into owner cadence.

WRITING PIPELINE

Every generated placement must run these stages in order.

STAGE 1: ASTROLOGY MEANING PLAN

Before prose generation, construct structured data containing at minimum:

- object / point
- sign
- event type if applicable
- house if actually supplied
- object function
- sign mechanics
- actual house domain if present
- allowed lived domains
- prohibited domain assumptions
- core tension
- likely observable behaviors
- likely consequences
- risks / shadow expression
- DO_NOT_ASSUME

The house owns the life domain.
The planet/object supplies the function.
The sign changes how the topic behaves.

Never substitute a sign's traditionally associated house.

Examples:
Taurus != money by default.
Cancer != home/family by default.
Virgo != work/health by default.
Libra != relationship status by default.
Scorpio != debt/shared resources by default.
Sagittarius != travel/education/legal by default.
Capricorn != career/title by default.
Aquarius != friendships/groups by default.
Pisces != retreat/12th-house material by default.

STAGE 2: RETRIEVE OWNER CONTEXT

Retrieve only a small relevant set of:
- owner-approved examples for the same content family
- owner-approved examples demonstrating relevant sign mechanics
- owner corrections relevant to likely failure modes

Do not dump the complete corpus into the generation prompt.

STAGE 3: DRAFT

Write from the structured astrology meaning plan.

The retrieved owner material establishes voice and judgment. It must not supply a narrative that gets cosmetically paraphrased.

STAGE 4: MARIE REVIEW

Run a separate review pass.

The reviewer must evaluate each passage against a structured rubric and return machine-readable results.

Required review fields:

cold_rendered_prose
astrology_integrity
sign_house_separation
literal_first_read_clarity
observable_behavior
example_proves_astrology
invented_motive
stock_trope
metaphor_requires_translation
generic_self_help
clinical_shorthand
advocacy_register_drift
tagline_stands_alone
voice_match
register_consistency
redundancy
banned_language
decision
violations
required_revisions

decision may only be PASS or REVISE.

A failure on cold_rendered_prose, astrology_integrity, sign_house_separation,
literal_first_read_clarity, example_proves_astrology,
invented_motive, stock_trope, or metaphor_requires_translation
must produce REVISE.

STAGE 5: REVISION

If reviewer returns REVISE, revise only the failed material.

Do not rewrite already successful lines for variety.

Run the reviewer again.

Do not return approval-ready copy until the reviewer returns PASS.

STAGE 6: DETERMINISTIC VALIDATION

Run mechanical lint rules after model review.

At minimum test:
- no em dash
- no forbidden "whether"
- banned vocabulary
- banned phrases
- placeholder integrity
- register requirements
- required fields
- exact protected owner lines where applicable

NEW CONCRETENESS CONTRACT

Concrete does not mean adding a random object, household prop,
cute example, or familiar relationship trope.

Concrete means naming the observable behavior, circumstance,
decision, problem, consequence, responsibility, or exchange
created by the astrology.

BAD:
"Someone's temper is shorter and it isn't really about the dishes."

GOOD:
"Someone finally says no to the demand they have agreed to a
hundred times before, and the anger comes out with all hundred
refusals behind it."

The second example proves accumulated anger and delayed refusal.
The dishes merely symbolize generic conflict.

PARAPHRASE TEST

For every sentence ask:
Can a normal reader explain literally what happened after one read?

If no, rewrite.

Do not approve compressed metaphors such as:
- anger landing on the wrong decade
- the old fury picking the fight
- the ladder getting inspected
- the bargain ending

Do not reject a sharp sentence merely because it is psychologically
observant.

"Anger is information about where a line got crossed."
is approved because its literal meaning is immediately clear.

TAGLINE TEST

A tagline must identify the actual tension without relying on body
copy for explanation.

Do not shorten headlines until they become cryptic.

EXAMPLE TEST

A scene is not automatically a good lived example.

The scene must demonstrate the exact astrology mechanism.

Do not add props merely to make abstract language seem concrete.

MOTIVE TEST

Do not invent internal motives when observable behavior is enough.

Describe what someone does and what happens because of it.

VOICE

Marie Satori:
direct, lived, observant, conversational, emotionally precise,
astrology-first, concrete.

Warmth may follow the truth.
Warmth must not replace the truth.

Do not write transcript chatter.
Do not write therapy Instagram copy.
Do not write nonprofit/advocacy copy.
Do not write generic self-help slogans.
Do not write textbook astrology.

OWNER CORRECTIONS AS REGRESSION TESTS

Turn every meaningful owner correction into a regression fixture.

Each fixture should contain:
- original bad text
- owner-approved or owner-directed correction
- failure category
- explanation
- content family
- relevant astrology rule

The system should be evaluated against these fixtures so a corrected
failure does not quietly reappear in later batches.

API INTEGRATION

Locate every OpenAI API call that generates astrology prose.

Make all such calls load the same canonical writing instructions.

Do not assume instructions from a previous Responses API request will
persist into later requests.

Use the same source-of-truth documents and review pipeline everywhere.

Do not maintain separate drifting prompt copies in different features.

EVALS

Create a representative evaluation suite from owner-approved copy and
owner-correction pairs.

Combine deterministic tests for objective rules with model grading for
subjective rules such as:
- sign-to-house leakage
- metaphor requiring translation
- generic trope
- invented motive
- lived example failing to prove astrology
- Marie voice mismatch

Add an eval command that Codex and CI can run.

REPORTING

For each generated batch report:
- number drafted
- number passing first review
- number automatically revised
- failure categories encountered
- final lint status
- final eval status

Do not label generated copy owner-approved.
Only explicit owner approval can set that status.

COLD RENDERED PROSE RULE (owner verbatim, 2026-08-11, BLOCKING for all reader-facing copy)

Read the copy cold, rendered, and line by line as prose. Judge the final text exactly as a
reader would encounter it in the product. Do not use the prompt, source notes, astrology
logic, intended meaning, or drafting context to help the writing make sense.

Every sentence must: make sense on the first read; flow naturally from the sentence before
it; lead naturally into the sentence after it; use normal, everyday language; sound like
something a human writer would actually say; state the intended meaning directly enough
that the reader does not have to decode it.

Prefer the ordinary word when it is more natural. Use work instead of labor unless labor is
literally the subject. Do not choose a more formal, abstract, clever, or literary word just
because it sounds elevated.

A sentence fails if the judge has to stop and ask what it means, mentally translate it into
simpler English, infer a missing connection, or rely on knowledge of the astrology to
understand the prose.

Also judge the paragraph as a whole. Flag: abrupt jumps between ideas; sentences that
technically make sense alone but do not connect; vague referents such as it, this, that,
the change when the reader may not know what they refer to; report-heavy transitions;
clever compression; abstract summaries where the actual behavior could be named; repeated
setup or explanation; sentences that sound assembled rather than written; unnecessarily
formal vocabulary; a strong sentence followed by another sentence that explains the same
point again.

Cold-read test: after drafting, ignore what the writer intended and read only the rendered
copy. If any line produces "Wait, what does that mean?", "Why are we suddenly talking about
this?", or "A normal person would say this more simply," the line is not approved.

Final judge instruction: Do not reward a sentence for being astrologically correct if it is
awkward prose. Correct astrology expressed in unnatural language still fails the writing
judge.

DONE WHEN

I can request a new set of astrology placements without pasting a
style-review prompt, and the system automatically performs the same
review before showing me the copy.

Before completing, run the regression suite and show me:
1. files created/modified
2. API generation path
3. reviewer path
4. exact instructions loaded into API calls
5. eval results
6. remaining known gaps
