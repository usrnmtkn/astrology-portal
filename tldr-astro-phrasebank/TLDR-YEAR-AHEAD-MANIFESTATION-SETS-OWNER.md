# Year Ahead manifestation-set architecture (owner ruling, canonical)

**Status: owner ruling, 2026-08-09. Canonical for Year Ahead generation; the architecture generalizes to all report surfaces. Supersedes topic-level "structural manifestation" output. Owner example wordings below are directional evidence, not exact-wording approvals for any specific report.**

## The pipeline change

Generators must not go `astrology → prose`. For every major annual factor, the required path is:

```
astrology → domain → possible manifestations → constraints → prose
```

The manifestation set is computed/authored as data before any prose is written. The prose claim is then drawn from the set, in possibility language.

## The specificity ceiling

**Very specific about the kind of event. Less certain about which exact event.** That is the right ceiling.

- "This transit can show up through a move" is useful astrology.
- "You are moving" is invented certainty.
- Both desirable and undesirable versions are allowed in the same menu ("an application may turn into an offer or rejection"): the period becomes consequential without guaranteeing the desirable version.

## Domain, not life status

Reason from the domain, never from a presumed life status. "Your role at work" excludes the unemployed reader. Prefer one line that naturally covers employed, looking, self-employed, and neither:

- "A job, application, client, title, or public-facing project may make you reconsider what kind of work you want your name attached to."
- Instead of "work stress increases": "A deadline, interview process, client request, application, or new responsibility may require more time than you expected."

Do not mechanically write "if employed / if unemployed / if self-employed" in every unit; write the covering line.

## Earned topics

Health, moving, money, relationships enter the report only when the chart activates them (the relevant house, its ruler, or a relevant natal planet). Never add health because annual reports "ought to mention health." Example of earned permission in the Marie chart: natal Moon in Scorpio in the 6th + Jupiter square Moon in August permits capacity/workload/sleep/routine language ("give the astrology a body and a schedule"), and still never diagnoses illness.

## Reader-facing executive overview order

Lived year first, architecture second. Open with what the year may actually feel like; then explain why the astrology repeats that pattern. Owner exemplar:

> A lot of this year happens before anyone else can see the result. You may finish a project privately, reduce a responsibility that has been taking too much time, rethink the work you want your name attached to, or build something for months before you are ready to share it. By summer, writing, speaking, applications, publishing, or another form of communication begins moving faster. The final weeks of the year put career and public direction much more clearly on the table.

Then the mechanics (profection, SR Ascendant, Venus bridge, fifth-house emphasis) as the explanation.

## Season directives register

Each season's guidance gets a real-world job, in report register, not astrology-heading register. Owner exemplars:

- February through spring: "Give unfinished work more privacy than publicity. Finish the draft, organize the schedule, handle the home responsibility, and let an old commitment actually end."
- Summer: "Put your words somewhere they can travel. Send the application. Publish the piece. Make the announcement. Start the class."
- Autumn: "Build around the week you really have. A plan that only works when nothing goes wrong is not finished yet."
- February 2027: "Pay attention to the offer, title, application, credit, introduction, or opportunity that changes how other people understand what you do."

## Manifestation-set record format

```text
FACTOR
Lunar eclipse conjunct natal Saturn in Virgo, natal 4th

DOMAIN
home · family · property · parents · private responsibilities · long-standing duty

POSSIBLE LIVED MANIFESTATIONS
move or living-arrangement decision · repair / maintenance · family caregiving change ·
division of household responsibility · ending a domestic obligation · property paperwork ·
boundary with parent/family member

DO NOT ASSUME
a move · death · illness · family conflict

COPY CLAIM
A long-standing home or family responsibility may reach a point
where a practical decision can no longer be postponed.
```

```text
FACTOR
Solar eclipse conjunct natal Midheaven

DOMAIN
career · public role · title · professional direction · recognition · access

POSSIBLE LIVED MANIFESTATIONS
job application · interview · offer / rejection · promotion · title change · client opportunity ·
launch · publication · credit dispute · leaving a role · career pivot · professional introduction

DO NOT ASSUME
currently employed · promotion · fame · success · job loss

COPY CLAIM
By early February, career questions become harder to leave open. An application may turn into
an offer or rejection. A title may change. A project may finally carry your name.
```

The DO NOT ASSUME block is as important as the manifestations: it is the machine-readable form of the specificity ceiling.

## Owner exemplar copy claims (directional register evidence)

- **12th-house profection, lived:** "You may spend more of this year finishing work privately, reducing commitments, closing out an old responsibility, or preparing something that is not ready to be announced yet. A project may need another draft. A role may end before the replacement is clear."
- **6th-house-earned capacity (Jupiter square 6th-house Moon):** "By late August, one more invitation, favor, trip, or work commitment may be enough to show you that the schedule is already full... less sleep, missed meals, a neglected appointment, a routine that stops working, or resentment about how much of the day belongs to everyone else."
- **Uranus square Sun, lived:** "Someone may expect the same answer, schedule, role, or version of you they have been getting for years, and this time you may not be willing to give it."
- **Jupiter return, lived:** "You may begin writing something you will spend years developing, start teaching or speaking more publicly, return to school, learn a skill that changes your work, publish more consistently, or finally give an idea a name and a place to live."
- **4th-house eclipse, lived:** "A repair gets scheduled. Someone's living arrangement changes. A family member needs a clearer division of care. You may finish paying for, maintaining, storing, or managing something that has quietly belonged to you for too long."

## Amendments from the v10 → v11 review cycle (owner, 2026-08-09)

1. **Possibility language is enforceable, not stylistic.** A manifestation written declaratively ("A repair gets scheduled.") is a specificity-ceiling violation even inside an otherwise correct menu. Every manifestation takes "may/could/might." The post-generation validator checks this mechanically.
2. **Density ceiling reached.** One full menu per factor, placed at its anchor; elsewhere compress to the domain phrase. Menu cap: 3–5 items in a sentence or up to 4 short sentences, never both. Synthesis sections reference, never re-list. Second passes of a transit refer back instead of repeating the menu. Lexical budget: a signature noun ("application") at most ~3 uses per report. The correct move after reaching this density is surgical refinement, not more expansion.
3. **Canonical status-neutral 10th-house example:** "An application may turn into an offer or rejection. A title may change. A project may finally carry your name."
4. **No self-narration:** the report never says "The astrology repeats this pattern several ways"; it goes straight into the mechanism.
5. **Abstract-register watchlist:** phrases like "update your public identity" are the old abstract register creeping back into a concrete menu; prefer the concrete neighbors.
6. **Health naming:** where chart-earned and immediately translated into manifestations, "health" may be named plainly ("the sixth house of work, health, and daily routines").

## Implementation notes (for the plan and task breakdown)

1. New authored dataset in `packages/astro-knowledge/data/`: `manifestation-sets`, keyed by factor type (transit/eclipse/return/profection) × house/planet domain, each record carrying DOMAIN, MANIFESTATIONS, DO NOT ASSUME, and one owner-reviewed COPY CLAIM. Sits beside the Y3 category table; owner reviews like any doctrine table.
2. Y4 generators compute the facts bundle, resolve each factor to its manifestation set, and pass the set (not just the aspect) into the prompt; the post-generation validator gains a DO-NOT-ASSUME check (reject prose asserting an item from the excluded list as fact).
3. The same architecture applies to Saturn Return sections and R3 relationship sections when they reach generation.
