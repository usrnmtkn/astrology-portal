# Synastry summary template v2 — owner-authored specification

Date: 2026-08-05
Authority: owner-authored, supplied verbatim in chat. This document is the governing specification
for personalized synastry summary generation. Implemented in `api/_lib/content-generation.ts`
(`synastry_aspect` prompt block and `synastryBannedPhrases`).

---

The current template is still describing traits and then adding a generic positive side, negative
side, and communication lesson. The revised template describes what happens between two people,
why it matters, and where the pressure shows up.

## What needs to change

The template should stop producing lines like:

- There's something about her that makes you feel dedicated to her.
- She could be an important and grounding presence.
- Ideally, you two are able to communicate about any issues.

These are vague because they do not tell the reader what the person actually does, what changes
because of their influence, or what the conflict looks like.

The template should produce writing closer to:

> You take Nikki seriously, and her opinion carries weight. She may be the person who gets you to
> follow through, think ahead, or stop treating an important decision casually. You probably do
> not want to disappoint her.

That names the relationship effect, the behavior, and the emotional consequence.

## 1. Headline

Write a short headline that describes the lived relationship dynamic.

Use: "Their approval carries weight" / "You feel more capable around them" / "They pull you into
unfamiliar territory" / "Their care can become pressure" / "You make each other more ambitious" /
"This connection moves fast"

Avoid: Motivating / Intriguing / Powerful and positive / Grounding presence / Deep connection /
Karmic bond / Challenging but rewarding

A headline should tell the reader what happens, not grade the aspect.

## 2. Opening

Start with the clearest chart-supported effect between the two people.

- "{{holder1}} takes {{holder2}} seriously, and {{holder2}}'s opinion carries weight."
- "{{holder2}} makes {{holder1}} feel more confident about pursuing work they might otherwise
  hesitate to claim."
- "{{holder1}} gets {{holder2}}'s attention quickly. The connection may feel exciting because
  {{holder1}} does not respond to {{holder2}} in the familiar way."

Do not open with: "There is something about..." / "This can be a powerful connection..." /
"You may have an interesting dynamic..." / "{{holder1}} might possibly feel..."

The aspect already establishes the dynamic. State it directly. Use `may`, `can`, or `might` only
when the outcome genuinely depends on how the people respond.

## 3. Lived expression

Show how the aspect appears in ordinary life. Use actions, decisions, conversations, work, time,
affection, money, reliability, attention, or conflict.

- "{{holder2}} may be the person who checks the plan, notices what is missing, or expects
  {{holder1}} to follow through after the first burst of enthusiasm is gone."
- "{{holder1}} may start asking for the opportunity, sharing the work publicly, or taking a goal
  more seriously because {{holder2}} treats it as achievable."
- "When {{holder2}} offers help, {{holder1}} may appreciate the care but resist the assumption
  that help is automatically needed."

Do not translate the aspect into personality labels ("{{holder1}} is free-spirited." /
"{{holder2}} is nurturing." / "{{holder1}} is endlessly curious." / "{{holder2}} is a natural
caretaker."). Those claims are too broad unless the full natal charts support them. The card is
about what these two factors bring out between these two people.

## 4. Cost or tension

Name the actual cost without inventing a crisis.

- "The same influence can become pressure. {{holder1}} may hear criticism when {{holder2}}
  believes they are being practical, and loyalty can start feeling like obligation."
- "{{holder2}} may feel unnecessary when {{holder1}} does not receive care in the expected way.
  {{holder1}} may feel managed when an offer of support arrives with an unspoken idea of how they
  should respond."
- "The connection may be exciting until unpredictability starts replacing agreement."

Avoid vague pivots: "At the same time, there may be challenges." / "Alternatively, if they are
struggling..." / "This could create issues." / "There might be moments of tension."

Name the tension itself.

## 5. Closing

End on the lived contrast or unresolved pressure. Do not add a coaching lesson simply because the
template needs an ending.

Good:

- "Nikki may believe she is helping you be realistic, while you feel watched or corrected. The
  closer the relationship becomes, the harder it may be to tell loyalty from obligation."
- "Jose may want his care to matter, while you need to decide for yourself when support is useful.
  What feels generous to him can feel intrusive to you."

Avoid: "Ideally, you can communicate about these issues." / "Open communication can ease the
conflict." / "Remember to appreciate each other's differences." / "If you work together, this can
become a strength."

Those sentences step outside the relationship and turn the card into generic advice.

## Canonical body structure

Use one paragraph when the dynamic is simple. Use two only when the contrast is real.

{{direct relational effect}}. {{Why this person's influence matters to the other person}}.
{{One or two recognizable ways this appears in daily life}}.

{{Specific tension or cost}}. {{How each person experiences the same moment differently}}.
{{Close on the unresolved contrast, not advice}}.

Target length: 70-130 words for a standard summary; 110-170 words when the aspect genuinely needs
two layers. Do not lengthen a card by repeating the same claim with more hedging.

## Directionality rule

The template must preserve who affects whom. "{{holder1}}'s Sun conjunct {{holder2}}'s Midheaven"
is not interchangeable with "{{holder2}}'s Sun conjunct {{holder1}}'s Midheaven."

Write: "{{sun_holder}} treats {{mc_holder}}'s goals as important and may strengthen their
confidence about being seen, promoted, credited, or taken seriously."

Do not write: "You two motivate each other professionally." That erases the direction the chart
actually provides.

## Evidence rule

Every sentence must be supported by: planet or point 1 + planet or point 2 + aspect group +
direction + available house or relationship context.

Do not invent: a caretaker identity, a history of rejection, a parent role, financial dependency,
a particular job, a romantic relationship, trauma, a breakup, jealousy, or long-term commitment
unless the supplied chart or content layer supports it.

## Reference examples (owner-authored)

Sun square Saturn — "Their approval carries weight": You take Nikki seriously, and her opinion
probably matters more than you admit. She may be the person who gets you to follow through,
prepare properly, or stop treating an important decision casually. You probably do not want to
disappoint her. The same influence can become pressure. Nikki may believe she is helping you be
realistic, while you hear criticism or feel watched. You may keep showing up because loyalty
matters to you, even after the relationship starts feeling like another responsibility you are
expected to carry.

Sun conjunct Midheaven — "They take your goals seriously": Jose treats your work and ambitions as
something worth pursuing. His attention may make you more confident about sharing what you can
do, asking for the opportunity, or putting your name on work you might otherwise keep private. He
does not have to open the door himself to affect your career. Being around someone who expects
you to use your ability can change what you believe is possible.

Care versus independence — "Their care can become pressure": Jose may show care by helping,
checking in, or trying to make himself useful. You may appreciate the intention but resist the
assumption that you need someone to step in. When you handle the problem yourself, he can feel
unnecessary. When he keeps offering, you can feel managed. What feels like support to Jose may
feel like interference to you. What feels like independence to you may look like rejection to him.

## Final generation instruction

Write the synastry summary in the owner's direct, lived, emotionally precise voice, with some
warmth but no therapy language. Describe what happens between the two people rather than assigning
broad personality traits. Start with the clearest relationship effect. Show how it appears through
recognizable behavior, choices, conversations, work, affection, time, money, support, or conflict.
Name the consequence. Preserve directionality. Use soft certainty selectively. Do not invent
biography, family history, trauma, relationship type, motives, or specific events. Do not use
generic labels such as powerful, positive, grounding, intriguing, deep, supportive, challenging,
or karmic unless the following sentence explains the exact behavior. Do not end with advice,
communication coaching, repair instructions, or a balanced conclusion. End on the lived tension,
contrast, or recognition between the two people.
