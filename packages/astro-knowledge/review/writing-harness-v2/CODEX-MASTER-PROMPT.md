# CODEX MASTER PROMPT: BUILD THE TLDR ASTRO WRITING COMPILER
(Owner-authored, verbatim, 2026-08-09. This file is the implementation instruction.)

You are working inside the TLDR Astro repository.

TASK

Build the canonical TLDR Astro astrology-writing system used by:

1. Codex when it writes or edits astrology content.
2. OpenAI API calls inside the TLDR Astro application.
3. Automated editorial review.
4. Regression tests and evals.
5. CI checks before generated writing can be staged for owner review.

The purpose is to stop requiring the owner to repeatedly re-teach the same writing rules in individual prompts.

This is NOT simply a prompt-cleanup task.

Build a reusable writing pipeline with explicit stages, source governance, structured astrology reasoning, semantic review, deterministic linting, and regression examples derived from owner feedback.

The owner should eventually be able to request a new batch of astrology copy and receive material that has already been checked for the recurring failures documented below.

==================================================
I. PRIMARY PRINCIPLE
==================================================

Astrology first. Prose second.

The system must reason in this order:

ASTROLOGY
-> GOVERNED MEANING
-> ACTIVATED DOMAIN
-> POSSIBLE LIVED MANIFESTATIONS
-> DO NOT ASSUME
-> NARRATIVE ROLE
-> PROSE
-> EDITORIAL REVIEW
-> REVISION IF REQUIRED
-> MECHANICAL VALIDATION
-> OWNER REVIEW

Do not collapse these into one model call.

A fluent paragraph is not evidence of correct astrology.

A paragraph can sound excellent and still fail because:
- the sign became its associated house
- an unsupported life domain was introduced
- the example does not prove the astrology
- an internal motive was invented
- the sentence requires metaphorical decoding
- the language sounds generic rather than owner-authored
- a source narrative was cosmetically rewritten

Any one of those can be a blocking failure.

==================================================
II. SOURCE GOVERNANCE
==================================================

Create an explicit hierarchy of source authority.

HIGHEST AUTHORITY

1. Exact owner-approved / owner-locked wording.
2. Explicit owner corrections and before/after edits.
3. Owner-authored articles and writing corpus.
4. Owner-approved Knowledge Matrix copy.
5. Owner voice bank.
6. Governed neutral astrology mechanics.
7. External astrology sources used only to verify meaning.

Do not invert this hierarchy.

IMPORTANT:

External astrologers or external astrology articles may be used to check:
- astrological mechanics
- traditional associations
- interpretive possibilities
- historical/contextual meaning

They must NOT become narrative templates.

Do not:
external prose
-> paraphrase
-> add Marie cadence

That is derivative laundering.

Instead:

external prose
-> extract neutral astrology facts
-> discard source prose from drafting context
-> combine neutral facts with governed TLDR astrology rules
-> retrieve owner voice evidence
-> independently compose

The drafting model should ideally never see full external prose when neutral structured meaning has already been extracted from it.

Keep provenance attached to the extracted meaning.

==================================================
III. OWNER-APPROVAL GOVERNANCE
==================================================

Do not confuse:
- generated
- model-reviewed
- pipeline-passed
- owner-approved
- owner-locked

Use distinct statuses.

Recommended states:

generated
pipeline-review-passed
owner-review-pending
owner-approved
owner-locked

A model PASS is not owner approval.

A Codex edit is not owner approval.

A judge score is not owner approval.

Only an explicit owner ruling may set:
owner-approved
or
owner-locked

Never silently rewrite owner-locked copy.

==================================================
IV. REPOSITORY STRUCTURE
==================================================

Do not put the complete writing manual into AGENTS.md.

AGENTS.md should be a short routing document.

Create or normalize a structure similar to:

/AGENTS.md

/skills/tldr-astro-writer/
    SKILL.md

/docs/writing/
    ASTROLOGY_CONTRACT.md
    VOICE_CONTRACT.md
    CONCRETENESS_CONTRACT.md
    SOURCE_GOVERNANCE.md
    FAILURE_TAXONOMY.md
    REVIEW_RUBRIC.md
    BANNED_LANGUAGE.md
    OWNER_APPROVAL_GOVERNANCE.md

/data/writing/
    owner-approved-examples.jsonl
    owner-corrections.jsonl
    negative-regression-fixtures.jsonl

/src/astro-writing/
    resolveAstrology.*
    buildMeaningPlan.*
    retrieveOwnerContext.*
    generateDraft.*
    reviewDraft.*
    reviseDraft.*
    validateCopy.*
    writeGenerationMetadata.*

/tests/astro-writing/
    deterministic-lint.*
    astrology-domain-regressions.*
    semantic-regressions.*
    owner-approved-gold.*
    known-bad-fixtures.*

Use the repository's existing conventions where appropriate rather than creating duplicate architecture.

==================================================
V. ASTROLOGY CONTRACT
==================================================

This contract is non-negotiable.

HOUSE OWNS THE LIFE DOMAIN.

PLANET / POINT SUPPLIES THE FUNCTION.

SIGN CHANGES HOW THE TOPIC BEHAVES.

EVENT TYPE CHANGES THE TEMPORAL OR DEVELOPMENTAL CONDITION.

Do not let a sign inherit the traditional domain of its associated house.

Examples:

Aries != automatically 1st-house identity
Taurus != automatically 2nd-house money
Gemini != automatically 3rd-house messages/siblings
Cancer != automatically 4th-house home/family
Leo != automatically 5th-house dating/children
Virgo != automatically 6th-house work/health
Libra != automatically 7th-house partnership
Scorpio != automatically 8th-house debt/shared resources
Sagittarius != automatically 9th-house travel/education/legal matters
Capricorn != automatically 10th-house career/title
Aquarius != automatically 11th-house friends/groups
Pisces != automatically 12th-house retreat/seclusion

A life-domain example can appear if it demonstrates the sign mechanism.

A life domain must not become the definition of the sign.

EXAMPLE:

Capricorn may produce:
- questioning a rule
- carrying responsibility
- standards changing depending on authority
- being treated as the capable one
- legitimacy
- hierarchy
- recognition
- endurance

A promotion can be ONE example.

If the entire passage becomes:
boss
career
promotion
title
public status
professional hierarchy

then Capricorn has become the 10th house.

That is a blocking failure.

==================================================
VI. SIGN MECHANICS
==================================================

Use these as behavioral mechanics, not as house domains.

ARIES
initiation, directness, speed, independence, anger, refusal, competition, acting before consensus

TAURUS
pace, comfort, value, maintenance, enoughness, embodiment, staying power, resistance to unwanted change

GEMINI
information, language, questions, options, conversation, contradiction, multiple versions, how information moves

CANCER
care, protection, belonging, familiarity, dependence, memory, defensiveness, who or what feels safe/familiar

LEO
visibility, pride, creative authorship, recognition, being seen, taking credit, self-expression

VIRGO
precision, improvement, usefulness, discernment, standards, correction, efficiency, noticing flaws

LIBRA
rapport, fairness, mirroring, compromise, social ease, agreement, disagreement, relational balance

SCORPIO
privacy, trust, intensity, leverage, control, exposure, secrecy, what is withheld, power inside an exchange

SAGITTARIUS
belief, conviction, truth claims, confidence, meaning, morality, freedom, exaggeration, certainty, risk, response to contradiction

CAPRICORN
responsibility, authority, standards, legitimacy, hierarchy, endurance, accountability, long-term structure, who carries what

AQUARIUS
systems, conventions, difference, outsider perspective, unwritten rules, new options, social norms, detachment, refusal to conform automatically

PISCES
imagination, ambiguity, faith, sensitivity, idealization, porousness, dissolving boundaries, escape, meaning that is felt before it is proven

==================================================
VII. PLANET / POINT JOBS
==================================================

Do not allow generic astrology adjectives to replace functional meaning.

JUPITER: expansion, opportunity, confidence, growth, excess, overextension, more
SATURN: limits, structure, responsibility, delay, durability, standards, consequence
URANUS: changed conditions, disruption, new options, instability, unexpected freedom, breaking an established pattern. Do NOT reduce Uranus to automatic rebellion.
NEPTUNE: imagination, meaning, idealization, uncertainty, projection, blurred distinctions, faith
PLUTO: leverage, pressure, control, consequence, power, compulsion, what becomes difficult to ignore

LILITH
the preference, anger, refusal, desire, or part of the person that no longer agrees to stay hidden or acceptable for other people's comfort

Owner definition family:
Lilith concerns the part that does not bend to fit in:
the preference stopped mentioning,
the opinion learned to soften,
the role kept because changing it felt too costly.

Do not reduce Lilith to: dark femininity, sexual rebellion, being dangerous, generic empowerment, generic trauma

==================================================
VIII. MEANING PLAN MUST PRECEDE PROSE
==================================================

Do not send astrology inputs directly to the prose generator.

First construct a strict structured meaning plan. Use Structured Outputs / JSON schema.

Required conceptual fields:

{
  "content_type": "", "object": "", "sign": "", "house": null, "event_type": "",
  "object_function": [], "sign_mechanics": [], "actual_house_domain": null,
  "core_tension": "", "what_changes": "", "constructive_expression": "",
  "overcorrection": "", "observable_behaviors": [], "possible_consequences": [],
  "allowed_life_domain_examples": [], "do_not_assume": [], "house_bleed_risks": [],
  "stock_trope_risks": [], "unearned_motives": []
}

Do not allow freeform prose in this planning stage beyond concise explanatory fields.
The plan itself must pass an astrology/domain check before prose generation.

==================================================
IX. DO NOT ASSUME
==================================================

Specificity means naming the TYPE of event or behavior. It does not mean inventing biography.

Never casually assume: marriage, dating, breakup, conventional employment, a boss,
children, parents, home ownership, debt, wealth, poverty, disability, illness, therapy,
trauma, gender, sexuality, family structure, education status - unless the input actually
earns it.

WORK EXAMPLES: Do not assume conventional employment. Possible manifestations can include:
job search, offer, client, contract, pay, pricing, title, credit, scope, hours, revenue,
expenses, freelance work, unpaid work, recognition, responsibility. More responsibility is
not automatically a better opportunity. A well-paying client can still cost too much time.

RELATIONSHIP EXAMPLES: Start from relationship condition, not status. Being pursued !=
wanting someone. Great sex does not solve: schedules, money, distance, caregiving,
availability, trust. Reduced availability != reduced interest. Keep relationship copy
neutral enough to work for: friends, family, collaborators, dates, partners, exes - unless
the input establishes otherwise.

HEALTH: Use health only when the astrology earns it. Prefer lived manifestations: sleep,
meals, appointments, movement, workload, recovery, capacity, caregiving. Do not jump
immediately to diagnosis or illness.

==================================================
X-XVI. CONCRETENESS, PARAPHRASE, TAGLINE, LIVED EXAMPLE, CAUSE/CONSEQUENCE, MOTIVE, NOUN-LEVEL TESTS
==================================================

CONCRETE DOES NOT MEAN CUTE. Concrete means naming the observable behavior, circumstance,
decision, problem, consequence, responsibility, exchange, or change produced by the
astrology. Do not use stock domestic props as shorthand (dishes, socks on the floor,
toothpaste caps, toilet seats, forgotten anniversaries, generic chores, generic texting
tropes, generic coffee examples) unless the specific object is genuinely central.

BAD: "Someone's temper is shorter than usual, and it is not really about the dishes."
BETTER: "Someone finally says no to the demand they have agreed to a hundred times before,
and the anger comes out with all hundred refusals behind it."

PARAPHRASE TEST: Could an ordinary reader explain literally what happened after reading
this sentence once? If NO: rewrite. REJECTED: "The anger lands on the wrong decade." /
"The old fury picks the fight." / "The ladder gets inspected." / "The bargain ends."
APPROVED: "Anger is information about where a line got crossed." The test is
comprehensibility, not the presence of imagery.

TAGLINE CONTRACT: A tagline must make sense without body copy. REJECTED: "Worth stops
negotiating." / "The bargain ends." APPROVED DIRECTION: "Being treated like less stops
being acceptable." Current approved forms include: "Anger stops going somewhere else." /
"What was never said finally gets said." / "The caretaker stops carrying everyone." /
"Being overlooked gets harder to tolerate." / "Being useful stops being the price of
belonging." / "Keeping the peace stops being worth the cost." / "What stayed hidden starts
coming out." / "Certainty is not evidence." / "Working harder stops proving anything." /
"Belonging stops requiring an audition." / "Sacrifice stops being the default." Do not
rewrite approved taglines for variety.

LIVED EXAMPLE CONTRACT: The example must LOGICALLY PROVE the astrology. BAD: "A
collaboration may come together more easily." BETTER: "Someone may mention your name when
an opportunity comes up." Do not add a scene just to create texture.

CAUSE AND CONSEQUENCE: PATTERN -> WHAT SOMEONE DOES -> WHAT HAPPENS BECAUSE OF IT. Do not
stop at "there can be tension" / "communication may be difficult" / "emotions intensify".

INVENTED-MOTIVE TEST: Do not invent someone's internal motive when observable behavior is
enough. WEAKER: "because they were afraid of looking full of themselves." BETTER: "because
being openly proud of it felt risky." Do not write "because they secretly..." / "because
deep down..." / "because they are afraid..." unless clearly earned.

NOUN-LEVEL HOUSE-BLEED TEST: House bleed often survives because the prose sounds natural.
Inspect the nouns. One example from an associated house domain may be legitimate. A cluster
is the warning sign. (Sagittarius: belief/conviction/meaning, not teacher/university/
publication/legal/travel. Scorpio: privacy/trust/leverage/exposure, not debt/inheritance/
shared accounts/taxes. Capricorn: authority/responsibility/standards/legitimacy, not
career/boss/title/promotion. Virgo: precision/improvement/usefulness/correction, not
job/health/daily routine. Aquarius: difference/systems/conventions/social norms, not
automatically friendships and community groups.)

==================================================
XVII-XXIV. REGISTER, DRIFT, SHARP LINES, VOICE PATTERNS, WORDING, REPETITION, ADVICE
==================================================

LANGUAGE REGISTER: Marie Satori with some CHANI warmth: direct, lived, observant,
emotionally precise, conversational, useful, specific, astrology-first, written prose.
Warmth may follow the truth. Warmth must not replace the truth. Do not write like: a
therapist, a nonprofit, an advocacy campaign, a generic life coach, a textbook astrologer,
a corporate consultant, a transcript, an Instagram affirmation account. Do not imitate
CHANI narrative structure or distinctive phrasing; borrow only broad qualities (ease,
warmth, permission after honesty, lived contradiction). Owner writing remains the voice
authority.

THERAPY/CLINICAL DRIFT: Reject clinical shorthand when ordinary behavior would be clearer.
Prefer "the person who always gives ground" over "the codependent person"; "old
experiences of being excluded" over "the outsider wound"; "being useful became the price
of being kept around" over "the perfection wound". Avoid defaulting to: trauma, healing,
wound, trigger, codependency, attachment, nervous system, inner child, martyr complex -
unless the context specifically earns the term.

ADVOCACY-REGISTER DRIFT: Do not default to: silenced voices, marginalized voices, systems
of oppression, collective liberation, holding space, community care - unless the actual
content calls for it. Instead of "Lilith in Gemini gives silenced voices their turn."
prefer "What was never said finally gets said."

SHARP LINES: Do not explain a sharp sentence after it has already landed. Strong
owner/current-standard examples: "Anger is information about where a line got crossed." /
"Wanting to be seen is not vanity." / "Rest does not have to be earned through
exhaustion." / "Libra seeks harmony, but Lilith in Libra does not settle for false
balance." / "Shame doesn't come out in the wash. It comes out in the telling." /
"Certainty is not evidence." / "Stakeholders love a win they never had to work for." /
"Some families only love the version of a person that never holds them accountable." /
"Anyone who prices themselves like a bargain draws bargain hunters."

OWNER VOICE, RECURRING STRONG PATTERNS: starts with a recognizable behavior; names the
actual tension; shows the cost; allows contradiction; ends on a sharper observation rather
than a generic solution. (Reference examples preserved in the voice bank and gold
fixtures.) Use these to understand cadence, logic, specificity, human contradiction. Do
not mechanically copy their syntax.

WORDING CONSTRAINTS (hard): NO em dash. Do not use the word "whether". Avoid: things,
alignment, reckoning, on paper, shared trust, keep shrinking. Avoid "performance" unless
literal or specifically Leo-related and earned. Avoid "security" when stability /
reliability / what can be relied on works better. Avoid generic steady/steadier when it
flattens the sentence. Avoid the verb "asks" as astrology-personification shorthand: do
not write "This placement asks you to..." / "This transit asks...". Avoid: "this placement
becomes", "the planet carries the thread", "through X but Y", "sets the tone", "comes into
focus", "easier to notice", "can involve", "get a boost", "take up the whole room", "as
this settles", "especially as", "might have you" - unless there is a clear owner-approved
exception. No generic "You don't have to X" repetition. No repeated "Stop + verb"
structure. No repeated scene-opening rut ("You open...", "You ask..."). Do not optimize
repetition mechanically if it makes normal language worse.

REPETITION: Repetition counts are diagnostics, not the writing goal. Do NOT replace a
clear phrase with an unnatural metaphor merely because the clear phrase appeared
elsewhere. Natural repetition is preferable to unnatural variation.

ADVICE: Advice is optional. A paragraph may end on: an observation, a consequence, a
question, an action, an unresolved tension. For comparison/synastry copy, do not
automatically end with repair instructions.

==================================================
XXV-XXVII. REVIEWER, REVISION, LINT
==================================================

REVIEWER ARCHITECTURE: The reviewer must be a separate model pass from the writer. Its job
is adversarial: ASSUME THERE IS A DEFECT UNTIL EACH REQUIRED TEST PASSES. The first review
pass diagnoses only; it does NOT freely rewrite. Use strict structured output with
per-field {status: PASS|FAIL, reason} for: astrology_integrity,
planet_or_point_function, sign_house_separation, literal_first_read_clarity,
observable_behavior, example_proves_astrology, invented_motive, stock_trope,
metaphor_requires_translation, tagline_stands_alone, clinical_shorthand,
advocacy_register_drift, generic_self_help, voice_match, register_consistency, redundancy;
plus violations[] with {category, severity: blocking|nonblocking, location, text, reason,
revision_instruction}. Blocking failures: astrology_integrity, planet_or_point_function,
sign_house_separation, literal_first_read_clarity, example_proves_astrology,
invented_motive, stock_trope, metaphor_requires_translation, tagline_stands_alone. ANY
BLOCKING FAILURE = REVISE. Do not average scores. A perfect voice score cannot compensate
for incorrect astrology.

REVISION PASS: Pass original draft + meaning plan + exact violations + revision
instructions + protected owner-approved lines to a revision call. The reviser modifies
ONLY the failed material. Re-run review. Bounded retry limit; if still failing, return
human-review-required. Do not silently force a PASS.

DETERMINISTIC LINT (after semantic PASS): zero em dashes; zero forbidden "whether"; banned
vocabulary; banned phrases; placeholder integrity; wrong sign names; wrong house numbers;
wrong event type; unexpanded {{variables}}; required field presence; register requirements;
protected owner lines unchanged; owner-locked copy unchanged. Do not spend model reasoning
on checks ordinary code can guarantee.

==================================================
XXVIII-XXX. CORRECTIONS, GOLD, NEGATIVE TESTS
==================================================

OWNER CORRECTIONS AS REGRESSION DATA: schema {fixture_id, content_family,
astrology_context, bad_text, approved_or_directed_text, failure_categories, owner_reason,
rule_extracted, status: "owner-correction"}. Seed data supplied in
data/writing/owner-corrections.jsonl (20 fixtures from the 2026-08-08/09 owner sessions).

GOLD REGRESSION SET: Use exact owner-locked content as PASS fixtures. Start with the
owner-locked 12-sign Lilith V5 set (data/writing/owner-approved-examples.jsonl). Do not
require future output to text-match gold; gold demonstrates acceptance criteria. Preserve
exact owner wording. Gold can only change after a new owner ruling.

INTENTIONAL NEGATIVE TESTS: data/writing/negative-regression-fixtures.jsonl contains the
eight synthetic bad cases with expected failure categories (Aries dishes, Capricorn
career, Sagittarius 9th-house, Pisces well metaphor, Taurus cryptic tagline, Aquarius
self-help, Gemini advocacy register, Virgo clinical shorthand). The eval system must
reject all of them with the correct categories.

==================================================
XXXI-XXXV. RETRIEVAL, API WRAPPER, VERSIONING, MODEL CHANGES, NO FINE-TUNING FIRST
==================================================

RETRIEVAL: Retrieve a small relevant sample: 2-4 exact owner-approved examples in the same
content family; 1-3 owner correction fixtures relevant to likely failure modes; relevant
astrology contract section; relevant sign/planet mechanics. Prefer metadata filters
(source_class, content_family, object, sign, house, event_type, failure_category,
voice_feature, approval_status, version, date) over raw semantic similarity.

API WRAPPER: Find every OpenAI API call that generates or revises astrology prose. Route
through one canonical wrapper. Each model call explicitly receives its canonical
instruction set; do not rely on previous conversation/request state to preserve writing
instructions. Required model roles: MEANING_PLANNER, WRITER, REVIEWER, REVISER, each with
its own instructions. The WRITER must not act as its own sole reviewer.

VERSIONING: Version all components (astrology_contract, writing_contract, review_rubric,
owner_corpus date, fixture_set, writer_prompt, reviewer_prompt) and attach
generation_metadata with those versions to every generated output.

MODEL CHANGES: Keep CURRENT_PRODUCTION_WRITER and CANDIDATE_WRITER. Promote only after the
regression suite passes with no blocking regression classes. A model that sounds warmer
but reintroduces sign-house bleed is not an improvement.

DO NOT START WITH FINE-TUNING: Current failures include reasoning, astrology governance,
source provenance, domain separation, editorial judgment; these require pipeline
architecture. Preserve owner corrections in a format that could later support preference
training, but do not make fine-tuning a dependency.

==================================================
XXXVI-XL. VERTICAL SLICE, SUCCESS CRITERIA, REPORTING, IMPROVEMENT BEHAVIOR, STANDARD
==================================================

INITIAL VERTICAL SLICE: Start with LILITH SIGN PLACEMENTS (12 locked gold examples,
documented rejected lines, explicit owner reasons). Implement the full pipeline for it,
then run: (A) all 12 locked V5 gold fixtures - expected PASS; (B) all known-bad Lilith
fixtures - expected REVISE/FAIL; (C) deliberately corrupted synthetic fixtures - expected
correct failure category. Only then generalize.

SUCCESS CRITERIA: The work is NOT complete because documentation files exist. It is
complete when the actual generation path uses them - all fifteen conditions in the owner's
list, ending with: the owner no longer has to paste the review rules into every new task.

REQUIRED REPORT BACK TO OWNER: the seventeen items (exact files created/modified, existing
generation paths discovered, which API calls were routed through the harness, meaning-plan
schema, writer/reviewer instruction sources, revision path, lint rules, fixture counts,
per-fixture results, false positives/negatives, remaining gaps, next content family). Do
not say "done" merely because the prompt architecture exists. Run it. Show the test
results.

IMPORTANT IMPLEMENTATION BEHAVIOR: When encountering a future owner correction, ask: is
this (A) an isolated wording preference or (B) evidence of a reusable failure class? If B:
fix the current passage, add/update the rule, add a regression fixture, add or update the
semantic grader test if necessary, verify prior gold still passes.

FINAL EDITORIAL STANDARD: The goal is not "sound more like Marie." The goal is: correct
astrology expressed through recognizable human behavior in Marie Satori's actual writing
logic. The reader should understand what is happening, why, what someone does, and what
happens because of it, without decoding astrology jargon, therapy jargon, symbolic
metaphors, generic props, generic empowerment language, or a hidden house substitution.
The best sentence is not the cleverest sentence. It is the sentence that makes the
astrology feel obvious once the reader sees the behavior.
