# Ask TLDR question taxonomy V1

**Status:** `needs_review`  
**Version:** `ask-tldr-question-taxonomy-v1`  
**Owner approved:** `false`  
**Promotion authorized:** `false`  
**Runtime enabled:** `false`

## Product contract

Ask TLDR uses nine user-facing life pillars:

1. Self
2. Love
3. Career
4. Money
5. Education
6. Home & Family
7. Daily Life & Health
8. Social
9. Spirituality

Each pillar contains six evergreen questions, for 54 total.

The evergreen questions are product prompts. Their answers are never canned. The answer engine must use the reader's deterministic TLDR astrology facts at the time the question is asked.

User-written questions and evergreen questions share the same intent layer. A free-text question is classified to a pillar, one primary intent, and zero or more secondary intents, then sent through the same astrology retrieval and ranking system as the evergreen question library.

## Required sequence

`question -> pillar + intent -> deterministic astrology retrieval -> evidence ranking -> governed TLDR meanings -> generated answer`

The LLM must not calculate or invent placements, aspects, houses, dates, transit passes, return dates, profections, rulers, or eclipse contacts.

## Pillars are not houses

Pillars are reader-facing navigation. They do not map one-to-one to astrology houses.

Examples:

- Career may use the 10th house, Midheaven, 10th ruler, Sun, Saturn, and relevant 6th/2nd-house links.
- Education may use both 3rd- and 9th-house material.
- Home & Family may use the 4th house plus 6th-house material when caregiving or household workload is the actual issue.
- Daily Life & Health may use the 6th house plus 10th, 12th, or 4th-house factors when those areas create the daily load.
- Social may use the 11th house plus 7th or 10th-house evidence only when collaboration or professional networks are relevant.

The retrieval layer must follow the question's intent rather than mechanically dumping every factor associated with the pillar.

## Evidence inheritance

Each pillar defines `defaultEvidencePriority`.

Each question defines `evidenceFocus`.

Effective retrieval priority is:

1. the question's `evidenceFocus`;
2. the pillar's `defaultEvidencePriority`;
3. exact current and upcoming chart facts that satisfy those evidence families;
4. annual context only when it materially changes the answer.

The engine should normally rank the smallest set of factors that actually answer the question. One strong factor may be enough. Multiple factors are allowed when they genuinely form one answer.

## Question types

Allowed question types:

- `current_state`: what is happening now;
- `pattern`: what repeats or underlies the situation;
- `guidance`: what to do with the current astrology;
- `direction`: what the astrology is developing toward;
- `decision`: how to evaluate a choice without pretending astrology makes the choice;
- `timing`: when conditions are more or less supportive.

A question can have more than one type.

## Default time windows

- `1_month`: immediate conditions and near-term triggers;
- `4_months`: developing situation, decision, or medium-term opportunity;
- `12_months`: long arc, recurring pattern, or direction requiring annual context.

The default window is a retrieval starting point, not a promise that every answer needs the entire period. The engine may narrow to the exact active factor when that is sufficient.

## Free-text routing

A user-written question should preserve the user's exact wording for the answer screen.

Classification returns:

- `pillar`;
- `primaryIntent`;
- `secondaryIntents`;
- `questionTypes`;
- `timeWindow`;
- optional nearest evergreen question ID.

Example:

`Why am I doing all the work and nobody notices?`

may route to:

- pillar: `career`;
- primary intent: `recognition`;
- secondary intents: `credit`, `workload`, `authority`;
- nearest evergreen: `career.recognition` or `career.credit`.

The nearest evergreen record supplies retrieval hints only. The system must answer the user's actual question.

## Health boundary

`Daily Life & Health` is about workload, routines, appointments, sleep, meals, recovery, physical limits, and what the week can realistically support.

The question system must not use astrology to diagnose illness, infer symptoms, predict a medical crisis, or replace medical care.

## Answer contract

The generated answer should usually follow:

1. answer the question directly;
2. name the strongest astrology that explains why;
3. translate it into recognizable lived possibilities;
4. give the useful consequence, choice, or timing distinction.

Do not begin with an astrology lesson when a direct answer is possible.

Do not force one transit to carry an answer when two or three factors are necessary. Do not add extra factors just to make the answer sound comprehensive.

## Governance

This V1 taxonomy is product-authoring data only.

Until the owner explicitly approves it:

- it remains `needs_review`;
- it is not reader-runtime data;
- it must not be promoted into Content Studio/live generated content;
- it must not be used as proof that any individual answer is owner-approved.
