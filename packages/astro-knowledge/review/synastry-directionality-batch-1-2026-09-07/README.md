# Synastry Directionality Batch 1

Date: 2026-09-07
Status: review packet only
Base: `6a7621fb4163e3fcaf689634dd22e07bc2f882ef`

## Purpose

Test the missing semantic reverse for Friends synastry without changing any serving copy.

The existing `body_you` / `body_they` pair is not automatically a second astrological interpretation. In directional rows, those fields can be two grammatical renderings of the same planetary arrow. This packet preserves the current approved or reviewed rows and adds only candidate copy for the missing `{{Name}} -> You` meaning.

This batch is deliberately small. It uses four owner-positive calibration candidates and one reciprocal control case before any corpus-wide authoring begins.

## Non-negotiable rules

- Do not alter current serving synastry rows in this batch.
- Do not create reversed canonical keys such as `mars/sun` to complement `sun/mars`.
- Do not infer semantic direction from `body_you` versus `body_they`; read the actual mechanism.
- The new Friends copy must answer: **What does {{Name}} bring out in me?**
- Start with a recognizable relationship moment, then show what changes in the reader, then name the deeper pattern.
- Do not open with planet keywords, abstract energy language, or a textbook explanation of the aspect.
- Do not force a second direction when the relationship meaning is genuinely shared or reciprocal.
- Preserve all exact-owner-approved wording byte-for-byte until a separate owner-authorized rewrite explicitly replaces it.

## Batch 1

### 1. Sun / Mars / hard

Content key: `fallback-hook/synastry-pair/sun/mars/hard`

Existing semantic arrow: **Mars -> Sun**

Existing status: **exact owner approved / locked**

Existing approved copy remains unchanged.

Missing semantic arrow: **Sun -> Mars**

Friends use case: **Your Mars hard-aspect {{Name}}'s Sun**

Candidate `{{Name}} -> You` copy:

> {{Name}} can make a decision sound settled before you feel included in it. That is when you are more likely to push back, move ahead on your own, or take control of the part that is still yours because waiting starts to feel like giving up your say. The argument gets bigger when you stop talking about the decision and start fighting over who gets to make it.

Direction check: PASS. {{Name}}'s Sun supplies certainty/direction; the reader's Mars pushes back, acts independently, or takes control.

Voice check: calibration candidate approved positively in chat on 2026-09-07. Not yet serving authorization.

### 2. Sun / Mercury / hard

Content key: `fallback-hook/synastry-pair/sun/mercury/hard`

Existing semantic arrow: **Mercury -> Sun**

Existing status: **exact owner approved / locked**

Existing approved copy remains unchanged.

Missing semantic arrow: **Sun -> Mercury**

Friends use case: **Your Mercury hard-aspect {{Name}}'s Sun**

Candidate `{{Name}} -> You` copy:

> {{Name}} can sound so certain that you immediately start looking for what they missed. You ask another question, point out the assumption, or keep explaining after they consider the matter settled because their confidence makes you less willing to let a weak argument pass. The conversation gets harder when they hear your questions as disrespect and you hear their certainty as proof that they are not listening.

Direction check: PASS. {{Name}}'s Sun supplies certainty/direction; the reader's Mercury questions, analyzes, and keeps explaining.

Voice check: calibration candidate approved positively in chat on 2026-09-07. Not yet serving authorization.

### 3. Venus / Ascendant / soft

Content key: `fallback-hook/synastry-pair/venus/ascendant/soft`

Existing semantic arrow: **Venus -> Ascendant**

Existing status: **exact owner approved / locked**

Existing approved copy remains unchanged.

Missing semantic arrow: **Ascendant -> Venus**

Friends use case: **Your Venus soft-aspect {{Name}}'s Ascendant**

Candidate `{{Name}} -> You` copy:

> Something about the way {{Name}} naturally shows up makes liking them easy. Compliments may come faster, affection can feel less self-conscious, and you may simply enjoy being around them without needing a complicated reason for it. You do not have to talk yourself into seeing what you like about them.

Direction check: PASS. {{Name}}'s Ascendant supplies the way they naturally present; the reader's Venus responds with liking, affection, and appreciation.

Voice check: calibration candidate approved positively in chat on 2026-09-07. Not yet serving authorization.

### 4. Neptune / Midheaven / soft

Content key: `fallback-hook/synastry-pair/neptune/midheaven/soft`

Existing semantic arrow: **Neptune -> Midheaven**

Existing status: **legacy reviewed after owner-approved stock-closer removal**

Existing reviewed copy remains unchanged in this batch.

Missing semantic arrow: **Midheaven -> Neptune**

Friends use case: **Your Neptune soft-aspect {{Name}}'s Midheaven**

Candidate `{{Name}} -> You` copy:

> The way {{Name}} takes their direction seriously can make one of your own ideas feel less abstract. Seeing them commit to work, build something over time, or let themselves be known for what they care about may help you picture what one of your own hopes would require in practice. You do not need their exact path; sometimes seeing someone else choose theirs is enough to make yours easier to imagine.

Direction check: PASS. {{Name}}'s Midheaven supplies visible direction/commitment; the reader's Neptune experiences an imagined possibility as easier to picture in practice.

Voice check: calibration candidate approved positively in chat on 2026-09-07. Not yet serving authorization.

### 5. Moon / South Node / soft

Content key: `fallback-hook/synastry-pair/moon/south-node/soft`

Existing classification: **shared / reciprocal candidate**

Existing status: **legacy reviewed after owner-approved stock-closer removal**

Action: **RECIPROCAL_REVIEW. DO NOT AUTHOR A REVERSE YET.**

Reason: the existing row has historically been written as a shared familiarity/comfort pattern rather than a clearly separate one-way effect. This control case prevents the new schema from manufacturing directional distinctions merely because two slots exist.

Questions for the next review pass:

1. Does Moon -> South Node produce a materially distinct lived experience?
2. Does South Node -> Moon produce a materially distinct lived experience?
3. Would separate passages tell the reader something genuinely new?
4. If not, should the record remain a shared relationship-dynamic row instead of receiving a forced reverse?

## Editorial acceptance test

A new reverse candidate passes only when all of the following are true:

1. The first meaningful sentence describes something recognizable about being with `{{Name}}`, not a planet definition.
2. `{{Name}}` is the source of the effect and the reader is the person experiencing the consequence.
3. The behavior is specific enough to distinguish the two bodies in the pair.
4. The copy does not merely invert pronouns from the existing paragraph.
5. The ending names a relationship consequence or useful distinction rather than generic uplift.
6. The copy does not overclaim a breakup, job loss, move, illness, or other consequential event unsupported by the aspect.
7. A reciprocal row is allowed to remain reciprocal.

## Next step after owner review

If this packet is approved as the directionality model, build a read-only 483-row inventory with these classifications:

- `AUTHOR_REVERSE`
- `RECIPROCAL_NO_REVERSE`
- `NEEDS_DIRECTION_REVIEW`

The inventory must preserve the current content key, current approval status, existing semantic arrow, and existing copy hashes. It must not modify serving content. Large-scale reverse authoring begins only after that inventory is reviewed.
