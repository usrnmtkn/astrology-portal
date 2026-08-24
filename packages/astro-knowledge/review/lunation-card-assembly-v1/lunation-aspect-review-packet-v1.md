# Lunation aspect review packet V1

Status: **DRAFT FOR OWNER REVIEW. NOTHING IN THIS PACKET SERVES.**

For every item, select one decision. If you select REVISE, write the replacement directly below the item. Approval means exact wording. OMIT means the combination remains silent; the app may not substitute another row.

## Selection rule

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

Rule SHA-256: `86fdb78884974f3a2f46230c3fc035210b861a533c6693189b9fcce17d48aa0d`

```json
{
  "schema": "lunation-dynamic-selection-rule/v1",
  "status": "pending_owner_review",
  "maximumSkyAspectBlocks": 1,
  "maximumRulerBlocks": 1,
  "aspectScoreFormula": "aspectWeight * planetWeight * ((1 - orb / maxOrb) ^ 1.2) * relevance",
  "aspects": {
    "conjunction": {
      "weight": 1,
      "maxOrbDegrees": 3
    },
    "opposition": {
      "weight": 0.95,
      "maxOrbDegrees": 3
    },
    "square": {
      "weight": 0.9,
      "maxOrbDegrees": 3
    },
    "trine": {
      "weight": 0.8,
      "maxOrbDegrees": 2
    },
    "sextile": {
      "weight": 0.6,
      "maxOrbDegrees": 2
    }
  },
  "bodies": {
    "saturn": 1,
    "pluto": 0.95,
    "uranus": 0.95,
    "mars": 0.9,
    "jupiter": 0.85,
    "neptune": 0.8,
    "node_axis": 0.7,
    "venus": 0.55,
    "mercury": 0.5
  },
  "relevance": {
    "rulesLunation": 1.25,
    "rulesRisingSign": 1.2,
    "stationingWithinThreeDays": 1.3,
    "retrograde": 1.1,
    "angularForRisingSign": 1.15
  },
  "fullMoonLightRule": "Evaluate both lights. When the same body qualifies against both, retain only its higher-scoring contact.",
  "nodeRule": "Treat the North and South Nodes as one axis and never render two nodal blocks.",
  "rulerRule": "A ruler condition qualifies only for retrograde, a station within three days, or a last-degree ingress within three days. When the ruler wins the aspect selection, merge any qualifying ruler condition into that aspect block and never render a second paragraph. Otherwise render at most one separate ruler block.",
  "ingressRule": "Mention ingress only when the ingressing body rules the lunation sign, is at 29 degrees at the lunation, and changes signs within three days. A station outranks an ingress.",
  "silenceRule": "Missing, omitted, or unapproved copy causes the block to omit. Never substitute another body, house, or aspect row.",
  "excluded": [
    "Chiron",
    "minor aspects",
    "applying or separating language",
    "compound aspect patterns",
    "natal contacts",
    "sect",
    "dignity modifiers"
  ],
  "ruleSha256": "86fdb78884974f3a2f46230c3fc035210b861a533c6693189b9fcce17d48aa0d"
}
```

## Five aspect stems

### conjunction

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/stem/conjunction`

{{planet}} is conjunct this {{lunationKind}}, concentrating its concerns instead of letting them stay in the background.

Replacement:

> 

### opposition

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/stem/opposition`

{{planet}} opposes this {{lunationKind}}, making the tension visible through competing demands.

Replacement:

> 

### square

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/stem/square`

{{planet}} squares this {{lunationKind}}, creating pressure that requires a decision or adjustment.

Replacement:

> 

### trine

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/stem/trine`

{{planet}} trines this {{lunationKind}}, giving you a usable current of support if you act on it.

Replacement:

> 

### sextile

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/stem/sextile`

{{planet}} sextiles this {{lunationKind}}, opening an opportunity that still needs your participation.

Replacement:

> 

## Three ruler-condition stems

### retrograde

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-ruler-condition/retrograde`

{{ruler}} is retrograde, so the part of this cycle it governs develops through review, return, and correction before forward movement becomes clear.

Replacement:

> 

### stationing

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-ruler-condition/stationing`

{{ruler}} stations within three days of this {{lunationKind}}, turning the issue into a real pivot rather than background pressure.

Replacement:

> 

### last-degree-ingress

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-ruler-condition/last-degree-ingress`

{{ruler}} is in the last degree of {{rulerSign}} and changes signs within three days, so the current way of handling this is reaching its limit.

Replacement:

> 

## Twelve house bridges

### House 1: Self, a time to reclaim yourself, energy, and power

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-house-bridge/1`

Notice which response belongs to who you are now and which one belongs to an identity you have outgrown.

Source class: codex-draft-requires-owner-approval

Replacement:

> 

### House 2: disposable income and foundation

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-house-bridge/2`

Let your next financial choice reflect what you value, not only what makes the uncertainty stop.

Source class: codex-draft-requires-owner-approval

Replacement:

> 

### House 3: early education, how to process information, and communicate with your community, siblings, and neighbors

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-house-bridge/3`

Say the clearest true thing you can say, then leave enough space to hear what comes back.

Source class: codex-draft-requires-owner-approval

Replacement:

> 

### House 4: home, family, and generational karma

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-house-bridge/4`

Take time to check in and feel, you cannot think your way out of emotion.

Source class: owner-selected-language

Replacement:

> 

### House 5: fun, heart-centeredness, and children

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-house-bridge/5`

Make room for what feels alive without turning it into a performance you have to maintain.

Source class: codex-draft-requires-owner-approval

Replacement:

> 

### House 6: health and being of service

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-house-bridge/6`

Choose the routine your body can live with, not the one that looks most disciplined from the outside.

Source class: codex-draft-requires-owner-approval

Replacement:

> 

### House 7: relationships

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-house-bridge/7`

Let the relationship show you what is mutual, then make your decision from what is actually being exchanged.

Source class: codex-draft-requires-owner-approval

Replacement:

> 

### House 8: transformation, symbolism, and other people's money

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-house-bridge/8`

Don't fear what you might transform into.

Source class: owner-selected-language

Replacement:

> 

### House 9: the higher self, philosophy, and greater wisdom

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-house-bridge/9`

Let the question become larger than the answer you arrived with.

Source class: codex-draft-requires-owner-approval

Replacement:

> 

### House 10: career and public recognition

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-house-bridge/10`

Choose the work you are willing to be known for, including the way you do it.

Source class: codex-draft-requires-owner-approval

Replacement:

> 

### House 11: friendship

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-house-bridge/11`

Notice which connections make more of you possible and which require you to disappear to belong.

Source class: codex-draft-requires-owner-approval

Replacement:

> 

### House 12: karma, subconscious, and endings

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-house-bridge/12`

Give yourself enough privacy to hear what is surfacing, but do not confuse privacy with having to carry it alone.

Source class: owner-selected-language

Replacement:

> 

## 108 body-by-house meanings

## House 1: Self, a time to reclaim yourself, energy, and power

### Mercury in the 1st-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mercury/house-1`

**Meaning:**

Your self-talk, decisions, and way of naming what is happening are shaping how you see yourself. Choose language that leaves room for you to become more than your first reaction.

**Assembled example:**

Mercury squares this Full Moon, creating pressure that requires a decision or adjustment. Your self-talk, decisions, and way of naming what is happening are shaping how you see yourself. Choose language that leaves room for you to become more than your first reaction. This Full Moon is in your 1st house of Self, a time to reclaim yourself, energy, and power. Notice which response belongs to who you are now and which one belongs to an identity you have outgrown.

Replacement:

> 

### Venus in the 1st-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/venus/house-1`

**Meaning:**

Questions of worth, attraction, and presentation become personal. Notice whether you are choosing what feels true or arranging yourself to be easier for someone else to approve.

**Assembled example:**

Venus squares this Full Moon, creating pressure that requires a decision or adjustment. Questions of worth, attraction, and presentation become personal. Notice whether you are choosing what feels true or arranging yourself to be easier for someone else to approve. This Full Moon is in your 1st house of Self, a time to reclaim yourself, energy, and power. Notice which response belongs to who you are now and which one belongs to an identity you have outgrown.

Replacement:

> 

### Mars in the 1st-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mars/house-1`

**Meaning:**

Your instinct is to act, defend, or reclaim space. Direct the energy toward a clear choice instead of turning every discomfort into a fight about who you are.

**Assembled example:**

Mars squares this Full Moon, creating pressure that requires a decision or adjustment. Your instinct is to act, defend, or reclaim space. Direct the energy toward a clear choice instead of turning every discomfort into a fight about who you are. This Full Moon is in your 1st house of Self, a time to reclaim yourself, energy, and power. Notice which response belongs to who you are now and which one belongs to an identity you have outgrown.

Replacement:

> 

### Jupiter in the 1st-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/jupiter/house-1`

**Meaning:**

Confidence and possibility are growing, and you may be ready to take up more room. Expansion helps when it strengthens your sense of self, not when it becomes a promise you cannot sustain.

**Assembled example:**

Jupiter squares this Full Moon, creating pressure that requires a decision or adjustment. Confidence and possibility are growing, and you may be ready to take up more room. Expansion helps when it strengthens your sense of self, not when it becomes a promise you cannot sustain. This Full Moon is in your 1st house of Self, a time to reclaim yourself, energy, and power. Notice which response belongs to who you are now and which one belongs to an identity you have outgrown.

Replacement:

> 

### Saturn in the 1st-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/saturn/house-1`

**Meaning:**

You are being asked to take yourself seriously through boundaries, responsibility, and follow-through. The identity that lasts is the one your choices can support over time.

**Assembled example:**

Saturn squares this Full Moon, creating pressure that requires a decision or adjustment. You are being asked to take yourself seriously through boundaries, responsibility, and follow-through. The identity that lasts is the one your choices can support over time. This Full Moon is in your 1st house of Self, a time to reclaim yourself, energy, and power. Notice which response belongs to who you are now and which one belongs to an identity you have outgrown.

Replacement:

> 

### Uranus in the 1st-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/uranus/house-1`

**Meaning:**

A familiar version of you may no longer fit. Give yourself permission to change without making disruption the only proof that you are free.

**Assembled example:**

Uranus squares this Full Moon, creating pressure that requires a decision or adjustment. A familiar version of you may no longer fit. Give yourself permission to change without making disruption the only proof that you are free. This Full Moon is in your 1st house of Self, a time to reclaim yourself, energy, and power. Notice which response belongs to who you are now and which one belongs to an identity you have outgrown.

Replacement:

> 

### Neptune in the 1st-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/neptune/house-1`

**Meaning:**

The line between who you are and what others imagine about you may feel less clear. Return to what your body, values, and lived choices tell you before accepting someone else's projection.

**Assembled example:**

Neptune squares this Full Moon, creating pressure that requires a decision or adjustment. The line between who you are and what others imagine about you may feel less clear. Return to what your body, values, and lived choices tell you before accepting someone else's projection. This Full Moon is in your 1st house of Self, a time to reclaim yourself, energy, and power. Notice which response belongs to who you are now and which one belongs to an identity you have outgrown.

Replacement:

> 

### Pluto in the 1st-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/pluto/house-1`

**Meaning:**

Control, visibility, and personal power move closer to the surface. You do not need to dominate the moment, but you may need to stop pretending that an old identity still has authority over you.

**Assembled example:**

Pluto squares this Full Moon, creating pressure that requires a decision or adjustment. Control, visibility, and personal power move closer to the surface. You do not need to dominate the moment, but you may need to stop pretending that an old identity still has authority over you. This Full Moon is in your 1st house of Self, a time to reclaim yourself, energy, and power. Notice which response belongs to who you are now and which one belongs to an identity you have outgrown.

Replacement:

> 

### The lunar node axis in the 1st-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/node_axis/house-1`

**Meaning:**

A familiar way of presenting yourself competes with a less practiced direction of growth. The next step may feel unfamiliar precisely because it is not built around the role you already know how to play.

**Assembled example:**

The lunar node axis squares this Full Moon, creating pressure that requires a decision or adjustment. A familiar way of presenting yourself competes with a less practiced direction of growth. The next step may feel unfamiliar precisely because it is not built around the role you already know how to play. This Full Moon is in your 1st house of Self, a time to reclaim yourself, energy, and power. Notice which response belongs to who you are now and which one belongs to an identity you have outgrown.

Replacement:

> 

## House 2: disposable income and foundation

### Mercury in the 2nd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mercury/house-2`

**Meaning:**

Money needs a clear conversation, number, or decision. Read the terms, name the tradeoff, and do not let anxiety turn an assumption into a fact.

**Assembled example:**

Mercury squares this Full Moon, creating pressure that requires a decision or adjustment. Money needs a clear conversation, number, or decision. Read the terms, name the tradeoff, and do not let anxiety turn an assumption into a fact. This Full Moon is in your 2nd house of disposable income and foundation. Let your next financial choice reflect what you value, not only what makes the uncertainty stop.

Replacement:

> 

### Venus in the 2nd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/venus/house-2`

**Meaning:**

Your values are visible in what you accept, purchase, charge, and protect. Pleasure and stability can belong in the same plan when neither is being used to prove your worth.

**Assembled example:**

Venus squares this Full Moon, creating pressure that requires a decision or adjustment. Your values are visible in what you accept, purchase, charge, and protect. Pleasure and stability can belong in the same plan when neither is being used to prove your worth. This Full Moon is in your 2nd house of disposable income and foundation. Let your next financial choice reflect what you value, not only what makes the uncertainty stop.

Replacement:

> 

### Mars in the 2nd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mars/house-2`

**Meaning:**

Financial pressure may provoke urgency, defensiveness, or a need to act quickly. Use the heat to address the problem directly without spending, earning, or arguing just to feel powerful again.

**Assembled example:**

Mars squares this Full Moon, creating pressure that requires a decision or adjustment. Financial pressure may provoke urgency, defensiveness, or a need to act quickly. Use the heat to address the problem directly without spending, earning, or arguing just to feel powerful again. This Full Moon is in your 2nd house of disposable income and foundation. Let your next financial choice reflect what you value, not only what makes the uncertainty stop.

Replacement:

> 

### Jupiter in the 2nd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/jupiter/house-2`

**Meaning:**

An opportunity to earn, invest, or build may become easier to see. Growth is useful here, but more is not automatically safer, especially when the numbers depend on optimism alone.

**Assembled example:**

Jupiter squares this Full Moon, creating pressure that requires a decision or adjustment. An opportunity to earn, invest, or build may become easier to see. Growth is useful here, but more is not automatically safer, especially when the numbers depend on optimism alone. This Full Moon is in your 2nd house of disposable income and foundation. Let your next financial choice reflect what you value, not only what makes the uncertainty stop.

Replacement:

> 

### Saturn in the 2nd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/saturn/house-2`

**Meaning:**

A budget, boundary, or long-term obligation asks for honesty. Security grows through repeatable choices, not through punishing yourself for what the past already cost.

**Assembled example:**

Saturn squares this Full Moon, creating pressure that requires a decision or adjustment. A budget, boundary, or long-term obligation asks for honesty. Security grows through repeatable choices, not through punishing yourself for what the past already cost. This Full Moon is in your 2nd house of disposable income and foundation. Let your next financial choice reflect what you value, not only what makes the uncertainty stop.

Replacement:

> 

### Uranus in the 2nd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/uranus/house-2`

**Meaning:**

Income, expenses, or your definition of stability may change unexpectedly. Flexibility is an asset, but freedom still needs a practical floor beneath it.

**Assembled example:**

Uranus squares this Full Moon, creating pressure that requires a decision or adjustment. Income, expenses, or your definition of stability may change unexpectedly. Flexibility is an asset, but freedom still needs a practical floor beneath it. This Full Moon is in your 2nd house of disposable income and foundation. Let your next financial choice reflect what you value, not only what makes the uncertainty stop.

Replacement:

> 

### Neptune in the 2nd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/neptune/house-2`

**Meaning:**

Financial facts and emotional value can become difficult to separate. Verify what is owed, promised, or affordable before generosity, fear, or fantasy makes the decision for you.

**Assembled example:**

Neptune squares this Full Moon, creating pressure that requires a decision or adjustment. Financial facts and emotional value can become difficult to separate. Verify what is owed, promised, or affordable before generosity, fear, or fantasy makes the decision for you. This Full Moon is in your 2nd house of disposable income and foundation. Let your next financial choice reflect what you value, not only what makes the uncertainty stop.

Replacement:

> 

### Pluto in the 2nd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/pluto/house-2`

**Meaning:**

Money may reveal a deeper question about control, dependence, or deservingness. Change the agreement that keeps power hidden instead of treating the visible expense as the entire problem.

**Assembled example:**

Pluto squares this Full Moon, creating pressure that requires a decision or adjustment. Money may reveal a deeper question about control, dependence, or deservingness. Change the agreement that keeps power hidden instead of treating the visible expense as the entire problem. This Full Moon is in your 2nd house of disposable income and foundation. Let your next financial choice reflect what you value, not only what makes the uncertainty stop.

Replacement:

> 

### The lunar node axis in the 2nd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/node_axis/house-2`

**Meaning:**

An old form of security competes with a value you are still learning to trust. Choose the resource pattern that can support your future, not simply the one that feels most familiar.

**Assembled example:**

The lunar node axis squares this Full Moon, creating pressure that requires a decision or adjustment. An old form of security competes with a value you are still learning to trust. Choose the resource pattern that can support your future, not simply the one that feels most familiar. This Full Moon is in your 2nd house of disposable income and foundation. Let your next financial choice reflect what you value, not only what makes the uncertainty stop.

Replacement:

> 

## House 3: early education, how to process information, and communicate with your community, siblings, and neighbors

### Mercury in the 3rd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mercury/house-3`

**Meaning:**

A message, decision, or conversation carries more weight than usual. Slow down enough to distinguish what was actually said from the story your mind built around it.

**Assembled example:**

Mercury squares this Full Moon, creating pressure that requires a decision or adjustment. A message, decision, or conversation carries more weight than usual. Slow down enough to distinguish what was actually said from the story your mind built around it. This Full Moon is in your 3rd house of early education, how to process information, and communicate with your community, siblings, and neighbors. Say the clearest true thing you can say, then leave enough space to hear what comes back.

Replacement:

> 

### Venus in the 3rd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/venus/house-3`

**Meaning:**

The way you speak can create connection without requiring you to soften the truth beyond recognition. Look for the wording that preserves both honesty and relationship.

**Assembled example:**

Venus squares this Full Moon, creating pressure that requires a decision or adjustment. The way you speak can create connection without requiring you to soften the truth beyond recognition. Look for the wording that preserves both honesty and relationship. This Full Moon is in your 3rd house of early education, how to process information, and communicate with your community, siblings, and neighbors. Say the clearest true thing you can say, then leave enough space to hear what comes back.

Replacement:

> 

### Mars in the 3rd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mars/house-3`

**Meaning:**

Words may come quickly, especially when you feel dismissed or delayed. Use directness to move the conversation forward, not to win a moment you will have to repair later.

**Assembled example:**

Mars squares this Full Moon, creating pressure that requires a decision or adjustment. Words may come quickly, especially when you feel dismissed or delayed. Use directness to move the conversation forward, not to win a moment you will have to repair later. This Full Moon is in your 3rd house of early education, how to process information, and communicate with your community, siblings, and neighbors. Say the clearest true thing you can say, then leave enough space to hear what comes back.

Replacement:

> 

### Jupiter in the 3rd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/jupiter/house-3`

**Meaning:**

A larger idea, invitation, or field of study opens the conversation. Share what you know, but leave room for information that complicates the conclusion you wanted to reach.

**Assembled example:**

Jupiter squares this Full Moon, creating pressure that requires a decision or adjustment. A larger idea, invitation, or field of study opens the conversation. Share what you know, but leave room for information that complicates the conclusion you wanted to reach. This Full Moon is in your 3rd house of early education, how to process information, and communicate with your community, siblings, and neighbors. Say the clearest true thing you can say, then leave enough space to hear what comes back.

Replacement:

> 

### Saturn in the 3rd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/saturn/house-3`

**Meaning:**

A promise, deadline, or difficult conversation requires precision. Say what you can do, what you cannot do, and what needs to be decided before silence becomes its own answer.

**Assembled example:**

Saturn squares this Full Moon, creating pressure that requires a decision or adjustment. A promise, deadline, or difficult conversation requires precision. Say what you can do, what you cannot do, and what needs to be decided before silence becomes its own answer. This Full Moon is in your 3rd house of early education, how to process information, and communicate with your community, siblings, and neighbors. Say the clearest true thing you can say, then leave enough space to hear what comes back.

Replacement:

> 

### Uranus in the 3rd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/uranus/house-3`

**Meaning:**

News or a sudden realization may change how you understand the situation. You are allowed to revise your thinking without turning every new idea into an immediate announcement.

**Assembled example:**

Uranus squares this Full Moon, creating pressure that requires a decision or adjustment. News or a sudden realization may change how you understand the situation. You are allowed to revise your thinking without turning every new idea into an immediate announcement. This Full Moon is in your 3rd house of early education, how to process information, and communicate with your community, siblings, and neighbors. Say the clearest true thing you can say, then leave enough space to hear what comes back.

Replacement:

> 

### Neptune in the 3rd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/neptune/house-3`

**Meaning:**

Meaning can blur when suggestion, tone, and assumption replace direct language. Ask the clarifying question before treating uncertainty as intuition.

**Assembled example:**

Neptune squares this Full Moon, creating pressure that requires a decision or adjustment. Meaning can blur when suggestion, tone, and assumption replace direct language. Ask the clarifying question before treating uncertainty as intuition. This Full Moon is in your 3rd house of early education, how to process information, and communicate with your community, siblings, and neighbors. Say the clearest true thing you can say, then leave enough space to hear what comes back.

Replacement:

> 

### Pluto in the 3rd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/pluto/house-3`

**Meaning:**

The real issue may be living underneath the stated conversation. Name the power dynamic or repeated thought without interrogating every word for proof of betrayal.

**Assembled example:**

Pluto squares this Full Moon, creating pressure that requires a decision or adjustment. The real issue may be living underneath the stated conversation. Name the power dynamic or repeated thought without interrogating every word for proof of betrayal. This Full Moon is in your 3rd house of early education, how to process information, and communicate with your community, siblings, and neighbors. Say the clearest true thing you can say, then leave enough space to hear what comes back.

Replacement:

> 

### The lunar node axis in the 3rd-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/node_axis/house-3`

**Meaning:**

A familiar script competes with a conversation you have not learned how to have yet. Growth may begin with asking a different question instead of delivering a better version of the same answer.

**Assembled example:**

The lunar node axis squares this Full Moon, creating pressure that requires a decision or adjustment. A familiar script competes with a conversation you have not learned how to have yet. Growth may begin with asking a different question instead of delivering a better version of the same answer. This Full Moon is in your 3rd house of early education, how to process information, and communicate with your community, siblings, and neighbors. Say the clearest true thing you can say, then leave enough space to hear what comes back.

Replacement:

> 

## House 4: home, family, and generational karma

### Mercury in the 4th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mercury/house-4`

**Meaning:**

A family conversation, memory, or decision about home needs language. Speak to the present situation without forcing every old chapter to testify in the same argument.

**Assembled example:**

Mercury squares this Full Moon, creating pressure that requires a decision or adjustment. A family conversation, memory, or decision about home needs language. Speak to the present situation without forcing every old chapter to testify in the same argument. This Full Moon is in your 4th house of home, family, and generational karma. Take time to check in and feel, you cannot think your way out of emotion.

Replacement:

> 

### Venus in the 4th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/venus/house-4`

**Meaning:**

Peace at home matters, but harmony that depends on your silence is not peace. Let care include your comfort, taste, and emotional needs too.

**Assembled example:**

Venus squares this Full Moon, creating pressure that requires a decision or adjustment. Peace at home matters, but harmony that depends on your silence is not peace. Let care include your comfort, taste, and emotional needs too. This Full Moon is in your 4th house of home, family, and generational karma. Take time to check in and feel, you cannot think your way out of emotion.

Replacement:

> 

### Mars in the 4th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mars/house-4`

**Meaning:**

Tension at home may make you protective, angry, or ready to move. Establish the boundary the household needs without treating vulnerability as a threat you have to defeat.

**Assembled example:**

Mars squares this Full Moon, creating pressure that requires a decision or adjustment. Tension at home may make you protective, angry, or ready to move. Establish the boundary the household needs without treating vulnerability as a threat you have to defeat. This Full Moon is in your 4th house of home, family, and generational karma. Take time to check in and feel, you cannot think your way out of emotion.

Replacement:

> 

### Jupiter in the 4th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/jupiter/house-4`

**Meaning:**

Home, family, or your sense of belonging may be ready to expand. Make room for growth while noticing where more space, more caretaking, or more optimism could become another obligation.

**Assembled example:**

Jupiter squares this Full Moon, creating pressure that requires a decision or adjustment. Home, family, or your sense of belonging may be ready to expand. Make room for growth while noticing where more space, more caretaking, or more optimism could become another obligation. This Full Moon is in your 4th house of home, family, and generational karma. Take time to check in and feel, you cannot think your way out of emotion.

Replacement:

> 

### Saturn in the 4th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/saturn/house-4`

**Meaning:**

Family responsibility and emotional history ask for mature limits. You cannot rewrite your family history, but you can decide what you will continue carrying forward.

**Assembled example:**

Saturn squares this Full Moon, creating pressure that requires a decision or adjustment. Family responsibility and emotional history ask for mature limits. You cannot rewrite your family history, but you can decide what you will continue carrying forward. This Full Moon is in your 4th house of home, family, and generational karma. Take time to check in and feel, you cannot think your way out of emotion.

Replacement:

> 

### Uranus in the 4th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/uranus/house-4`

**Meaning:**

A change in home or family roles interrupts the old arrangement. Build flexibility into the foundation instead of demanding that stability look exactly as it did before.

**Assembled example:**

Uranus squares this Full Moon, creating pressure that requires a decision or adjustment. A change in home or family roles interrupts the old arrangement. Build flexibility into the foundation instead of demanding that stability look exactly as it did before. This Full Moon is in your 4th house of home, family, and generational karma. Take time to check in and feel, you cannot think your way out of emotion.

Replacement:

> 

### Neptune in the 4th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/neptune/house-4`

**Meaning:**

Family feeling can become difficult to separate from guilt, hope, or rescue. You cannot unburden your loved ones of their pain and the weight they carry, nor heal their trauma alone.

**Assembled example:**

Neptune squares this Full Moon, creating pressure that requires a decision or adjustment. Family feeling can become difficult to separate from guilt, hope, or rescue. You cannot unburden your loved ones of their pain and the weight they carry, nor heal their trauma alone. This Full Moon is in your 4th house of home, family, and generational karma. Take time to check in and feel, you cannot think your way out of emotion.

Replacement:

> 

### Pluto in the 4th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/pluto/house-4`

**Meaning:**

An inherited pattern around control, secrecy, or survival may become harder to ignore. The cycle changes when you stop protecting the pattern simply because it came from people you love.

**Assembled example:**

Pluto squares this Full Moon, creating pressure that requires a decision or adjustment. An inherited pattern around control, secrecy, or survival may become harder to ignore. The cycle changes when you stop protecting the pattern simply because it came from people you love. This Full Moon is in your 4th house of home, family, and generational karma. Take time to check in and feel, you cannot think your way out of emotion.

Replacement:

> 

### The lunar node axis in the 4th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/node_axis/house-4`

**Meaning:**

A familiar family role competes with the emotional foundation you are trying to build. Belonging does not require repeating every rule that once kept the household together.

**Assembled example:**

The lunar node axis squares this Full Moon, creating pressure that requires a decision or adjustment. A familiar family role competes with the emotional foundation you are trying to build. Belonging does not require repeating every rule that once kept the household together. This Full Moon is in your 4th house of home, family, and generational karma. Take time to check in and feel, you cannot think your way out of emotion.

Replacement:

> 

## House 5: fun, heart-centeredness, and children

### Mercury in the 5th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mercury/house-5`

**Meaning:**

A creative idea, romantic conversation, or question about children wants expression. Follow the thought far enough to make something from it instead of discussing it until the spark goes cold.

**Assembled example:**

Mercury squares this Full Moon, creating pressure that requires a decision or adjustment. A creative idea, romantic conversation, or question about children wants expression. Follow the thought far enough to make something from it instead of discussing it until the spark goes cold. This Full Moon is in your 5th house of fun, heart-centeredness, and children. Make room for what feels alive without turning it into a performance you have to maintain.

Replacement:

> 

### Venus in the 5th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/venus/house-5`

**Meaning:**

Pleasure, affection, and creative confidence are easier to recognize. Receive what feels good without using attention as the only measure of whether your joy is real.

**Assembled example:**

Venus squares this Full Moon, creating pressure that requires a decision or adjustment. Pleasure, affection, and creative confidence are easier to recognize. Receive what feels good without using attention as the only measure of whether your joy is real. This Full Moon is in your 5th house of fun, heart-centeredness, and children. Make room for what feels alive without turning it into a performance you have to maintain.

Replacement:

> 

### Mars in the 5th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mars/house-5`

**Meaning:**

Desire and creative risk are asking for action. Pursue what excites you, but do not confuse intensity, competition, or pursuit with proof that something matters.

**Assembled example:**

Mars squares this Full Moon, creating pressure that requires a decision or adjustment. Desire and creative risk are asking for action. Pursue what excites you, but do not confuse intensity, competition, or pursuit with proof that something matters. This Full Moon is in your 5th house of fun, heart-centeredness, and children. Make room for what feels alive without turning it into a performance you have to maintain.

Replacement:

> 

### Jupiter in the 5th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/jupiter/house-5`

**Meaning:**

Joy, visibility, romance, or creative possibility can grow quickly. Say yes to the opening while keeping the promise proportionate to the life you actually have.

**Assembled example:**

Jupiter squares this Full Moon, creating pressure that requires a decision or adjustment. Joy, visibility, romance, or creative possibility can grow quickly. Say yes to the opening while keeping the promise proportionate to the life you actually have. This Full Moon is in your 5th house of fun, heart-centeredness, and children. Make room for what feels alive without turning it into a performance you have to maintain.

Replacement:

> 

### Saturn in the 5th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/saturn/house-5`

**Meaning:**

A creative practice, romantic responsibility, or matter involving children needs steadiness. Discipline should protect what you love, not make pleasure feel like another performance review.

**Assembled example:**

Saturn squares this Full Moon, creating pressure that requires a decision or adjustment. A creative practice, romantic responsibility, or matter involving children needs steadiness. Discipline should protect what you love, not make pleasure feel like another performance review. This Full Moon is in your 5th house of fun, heart-centeredness, and children. Make room for what feels alive without turning it into a performance you have to maintain.

Replacement:

> 

### Uranus in the 5th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/uranus/house-5`

**Meaning:**

A surprise attraction or experiment may interrupt the familiar script. Let yourself try a different form without discarding what matters simply because novelty feels electric.

**Assembled example:**

Uranus squares this Full Moon, creating pressure that requires a decision or adjustment. A surprise attraction or experiment may interrupt the familiar script. Let yourself try a different form without discarding what matters simply because novelty feels electric. This Full Moon is in your 5th house of fun, heart-centeredness, and children. Make room for what feels alive without turning it into a performance you have to maintain.

Replacement:

> 

### Neptune in the 5th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/neptune/house-5`

**Meaning:**

Inspiration and romance can feel vivid while practical details disappear. Enjoy the beauty, then check whether the person, project, or promise can exist outside the imagined version.

**Assembled example:**

Neptune squares this Full Moon, creating pressure that requires a decision or adjustment. Inspiration and romance can feel vivid while practical details disappear. Enjoy the beauty, then check whether the person, project, or promise can exist outside the imagined version. This Full Moon is in your 5th house of fun, heart-centeredness, and children. Make room for what feels alive without turning it into a performance you have to maintain.

Replacement:

> 

### Pluto in the 5th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/pluto/house-5`

**Meaning:**

Desire, visibility, and creative power become more intense. Make the work or tell the truth without using withholding, obsession, or control to keep the feeling alive.

**Assembled example:**

Pluto squares this Full Moon, creating pressure that requires a decision or adjustment. Desire, visibility, and creative power become more intense. Make the work or tell the truth without using withholding, obsession, or control to keep the feeling alive. This Full Moon is in your 5th house of fun, heart-centeredness, and children. Make room for what feels alive without turning it into a performance you have to maintain.

Replacement:

> 

### The lunar node axis in the 5th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/node_axis/house-5`

**Meaning:**

A familiar source of applause competes with a form of expression that asks more courage from you. Create toward the life you want, not only toward the response you already know how to earn.

**Assembled example:**

The lunar node axis squares this Full Moon, creating pressure that requires a decision or adjustment. A familiar source of applause competes with a form of expression that asks more courage from you. Create toward the life you want, not only toward the response you already know how to earn. This Full Moon is in your 5th house of fun, heart-centeredness, and children. Make room for what feels alive without turning it into a performance you have to maintain.

Replacement:

> 

## House 6: health and being of service

### Mercury in the 6th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mercury/house-6`

**Meaning:**

A workflow, appointment, or daily decision needs clearer organization. Your nervous system is part of the schedule, so leave enough room to finish one thought before adding another demand.

**Assembled example:**

Mercury squares this Full Moon, creating pressure that requires a decision or adjustment. A workflow, appointment, or daily decision needs clearer organization. Your nervous system is part of the schedule, so leave enough room to finish one thought before adding another demand. This Full Moon is in your 6th house of health and being of service. Choose the routine your body can live with, not the one that looks most disciplined from the outside.

Replacement:

> 

### Venus in the 6th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/venus/house-6`

**Meaning:**

Ease and support belong in the way you work and care for yourself. A pleasant routine is not frivolous when it helps you return consistently.

**Assembled example:**

Venus squares this Full Moon, creating pressure that requires a decision or adjustment. Ease and support belong in the way you work and care for yourself. A pleasant routine is not frivolous when it helps you return consistently. This Full Moon is in your 6th house of health and being of service. Choose the routine your body can live with, not the one that looks most disciplined from the outside.

Replacement:

> 

### Mars in the 6th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mars/house-6`

**Meaning:**

Workload, irritation, or physical energy needs a direct outlet. Address the task or boundary before unexpressed frustration becomes the rhythm of the entire day.

**Assembled example:**

Mars squares this Full Moon, creating pressure that requires a decision or adjustment. Workload, irritation, or physical energy needs a direct outlet. Address the task or boundary before unexpressed frustration becomes the rhythm of the entire day. This Full Moon is in your 6th house of health and being of service. Choose the routine your body can live with, not the one that looks most disciplined from the outside.

Replacement:

> 

### Jupiter in the 6th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/jupiter/house-6`

**Meaning:**

A better tool, role, or health-supporting habit may expand what is possible. Improvement stops helping when every opening becomes another responsibility you agree to carry.

**Assembled example:**

Jupiter squares this Full Moon, creating pressure that requires a decision or adjustment. A better tool, role, or health-supporting habit may expand what is possible. Improvement stops helping when every opening becomes another responsibility you agree to carry. This Full Moon is in your 6th house of health and being of service. Choose the routine your body can live with, not the one that looks most disciplined from the outside.

Replacement:

> 

### Saturn in the 6th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/saturn/house-6`

**Meaning:**

Your habits and obligations are showing you what is sustainable. Build the limit into the routine before exhaustion has to enforce it for you.

**Assembled example:**

Saturn squares this Full Moon, creating pressure that requires a decision or adjustment. Your habits and obligations are showing you what is sustainable. Build the limit into the routine before exhaustion has to enforce it for you. This Full Moon is in your 6th house of health and being of service. Choose the routine your body can live with, not the one that looks most disciplined from the outside.

Replacement:

> 

### Uranus in the 6th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/uranus/house-6`

**Meaning:**

A schedule, work method, or care routine may need to change abruptly. Experiment with a more flexible system, then keep the parts your body can actually repeat.

**Assembled example:**

Uranus squares this Full Moon, creating pressure that requires a decision or adjustment. A schedule, work method, or care routine may need to change abruptly. Experiment with a more flexible system, then keep the parts your body can actually repeat. This Full Moon is in your 6th house of health and being of service. Choose the routine your body can live with, not the one that looks most disciplined from the outside.

Replacement:

> 

### Neptune in the 6th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/neptune/house-6`

**Meaning:**

Work expectations or wellness plans may feel unclear. Simplify the next step and verify practical information instead of treating confusion as a personal failure.

**Assembled example:**

Neptune squares this Full Moon, creating pressure that requires a decision or adjustment. Work expectations or wellness plans may feel unclear. Simplify the next step and verify practical information instead of treating confusion as a personal failure. This Full Moon is in your 6th house of health and being of service. Choose the routine your body can live with, not the one that looks most disciplined from the outside.

Replacement:

> 

### Pluto in the 6th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/pluto/house-6`

**Meaning:**

A compulsion around productivity, control, or being useful may become visible. Change the system that depends on your depletion instead of trying to become more efficient at enduring it.

**Assembled example:**

Pluto squares this Full Moon, creating pressure that requires a decision or adjustment. A compulsion around productivity, control, or being useful may become visible. Change the system that depends on your depletion instead of trying to become more efficient at enduring it. This Full Moon is in your 6th house of health and being of service. Choose the routine your body can live with, not the one that looks most disciplined from the outside.

Replacement:

> 

### The lunar node axis in the 6th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/node_axis/house-6`

**Meaning:**

A familiar way of proving your usefulness competes with a healthier form of service. Growth may require doing less of what earns immediate approval and more of what you can sustain.

**Assembled example:**

The lunar node axis squares this Full Moon, creating pressure that requires a decision or adjustment. A familiar way of proving your usefulness competes with a healthier form of service. Growth may require doing less of what earns immediate approval and more of what you can sustain. This Full Moon is in your 6th house of health and being of service. Choose the routine your body can live with, not the one that looks most disciplined from the outside.

Replacement:

> 

## House 7: relationships

### Mercury in the 7th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mercury/house-7`

**Meaning:**

A relationship needs clearer terms, questions, or conversation. Listen for the answer that was given rather than continuing until you receive the answer you hoped for.

**Assembled example:**

Mercury squares this Full Moon, creating pressure that requires a decision or adjustment. A relationship needs clearer terms, questions, or conversation. Listen for the answer that was given rather than continuing until you receive the answer you hoped for. This Full Moon is in your 7th house of relationships. Let the relationship show you what is mutual, then make your decision from what is actually being exchanged.

Replacement:

> 

### Venus in the 7th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/venus/house-7`

**Meaning:**

Affection, reciprocity, and shared values move to the center. Notice whether the bond allows both people to have needs without turning care into a debt.

**Assembled example:**

Venus squares this Full Moon, creating pressure that requires a decision or adjustment. Affection, reciprocity, and shared values move to the center. Notice whether the bond allows both people to have needs without turning care into a debt. This Full Moon is in your 7th house of relationships. Let the relationship show you what is mutual, then make your decision from what is actually being exchanged.

Replacement:

> 

### Mars in the 7th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mars/house-7`

**Meaning:**

Conflict, chemistry, or competition becomes harder to avoid. Address the disagreement directly without making pursuit or resistance the only way the relationship can feel alive.

**Assembled example:**

Mars squares this Full Moon, creating pressure that requires a decision or adjustment. Conflict, chemistry, or competition becomes harder to avoid. Address the disagreement directly without making pursuit or resistance the only way the relationship can feel alive. This Full Moon is in your 7th house of relationships. Let the relationship show you what is mutual, then make your decision from what is actually being exchanged.

Replacement:

> 

### Jupiter in the 7th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/jupiter/house-7`

**Meaning:**

A relationship may offer growth, support, or a larger shared plan. Expansion works when both people can name what they are promising and what remains their own responsibility.

**Assembled example:**

Jupiter squares this Full Moon, creating pressure that requires a decision or adjustment. A relationship may offer growth, support, or a larger shared plan. Expansion works when both people can name what they are promising and what remains their own responsibility. This Full Moon is in your 7th house of relationships. Let the relationship show you what is mutual, then make your decision from what is actually being exchanged.

Replacement:

> 

### Saturn in the 7th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/saturn/house-7`

**Meaning:**

Commitment, distance, or follow-through asks to be measured by behavior. Good intentions matter, but the repeated pattern tells you what the relationship can currently hold.

**Assembled example:**

Saturn squares this Full Moon, creating pressure that requires a decision or adjustment. Commitment, distance, or follow-through asks to be measured by behavior. Good intentions matter, but the repeated pattern tells you what the relationship can currently hold. This Full Moon is in your 7th house of relationships. Let the relationship show you what is mutual, then make your decision from what is actually being exchanged.

Replacement:

> 

### Uranus in the 7th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/uranus/house-7`

**Meaning:**

A relationship may need more freedom, new terms, or an honest interruption of routine. Change the agreement before forcing one person to break it in order to breathe.

**Assembled example:**

Uranus squares this Full Moon, creating pressure that requires a decision or adjustment. A relationship may need more freedom, new terms, or an honest interruption of routine. Change the agreement before forcing one person to break it in order to breathe. This Full Moon is in your 7th house of relationships. Let the relationship show you what is mutual, then make your decision from what is actually being exchanged.

Replacement:

> 

### Neptune in the 7th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/neptune/house-7`

**Meaning:**

Hope, projection, and compassion can blur what is actually mutual. Love does not require you to ignore the information that makes the relationship less ideal but more real.

**Assembled example:**

Neptune squares this Full Moon, creating pressure that requires a decision or adjustment. Hope, projection, and compassion can blur what is actually mutual. Love does not require you to ignore the information that makes the relationship less ideal but more real. This Full Moon is in your 7th house of relationships. Let the relationship show you what is mutual, then make your decision from what is actually being exchanged.

Replacement:

> 

### Pluto in the 7th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/pluto/house-7`

**Meaning:**

Power, trust, or fear of loss may shape the exchange more than either person admits. Intimacy deepens through truth, not through testing whether the other person can survive your silence.

**Assembled example:**

Pluto squares this Full Moon, creating pressure that requires a decision or adjustment. Power, trust, or fear of loss may shape the exchange more than either person admits. Intimacy deepens through truth, not through testing whether the other person can survive your silence. This Full Moon is in your 7th house of relationships. Let the relationship show you what is mutual, then make your decision from what is actually being exchanged.

Replacement:

> 

### The lunar node axis in the 7th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/node_axis/house-7`

**Meaning:**

A familiar relationship pattern competes with a less practiced way of meeting another person. The next step may ask you to stop performing the role that once guaranteed connection.

**Assembled example:**

The lunar node axis squares this Full Moon, creating pressure that requires a decision or adjustment. A familiar relationship pattern competes with a less practiced way of meeting another person. The next step may ask you to stop performing the role that once guaranteed connection. This Full Moon is in your 7th house of relationships. Let the relationship show you what is mutual, then make your decision from what is actually being exchanged.

Replacement:

> 

## House 8: transformation, symbolism, and other people's money

### Mercury in the 8th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mercury/house-8`

**Meaning:**

A difficult conversation about trust, debt, intimacy, or disclosure needs exact language. Name what is shared, what is private, and what can no longer remain implied.

**Assembled example:**

Mercury squares this Full Moon, creating pressure that requires a decision or adjustment. A difficult conversation about trust, debt, intimacy, or disclosure needs exact language. Name what is shared, what is private, and what can no longer remain implied. This Full Moon is in your 8th house of transformation, symbolism, and other people's money. Don't fear what you might transform into.

Replacement:

> 

### Venus in the 8th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/venus/house-8`

**Meaning:**

Shared resources and emotional exchange reveal what each person values. Intimacy cannot stay generous when worth, money, or affection is being used to keep score in secret.

**Assembled example:**

Venus squares this Full Moon, creating pressure that requires a decision or adjustment. Shared resources and emotional exchange reveal what each person values. Intimacy cannot stay generous when worth, money, or affection is being used to keep score in secret. This Full Moon is in your 8th house of transformation, symbolism, and other people's money. Don't fear what you might transform into.

Replacement:

> 

### Mars in the 8th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mars/house-8`

**Meaning:**

A conflict around control, desire, or shared obligations wants direct action. Confront the issue without turning vulnerability into a contest over who needs whom less.

**Assembled example:**

Mars squares this Full Moon, creating pressure that requires a decision or adjustment. A conflict around control, desire, or shared obligations wants direct action. Confront the issue without turning vulnerability into a contest over who needs whom less. This Full Moon is in your 8th house of transformation, symbolism, and other people's money. Don't fear what you might transform into.

Replacement:

> 

### Jupiter in the 8th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/jupiter/house-8`

**Meaning:**

Support, intimacy, or shared resources may expand, but so can exposure and obligation. Accept help or opportunity with a clear understanding of what belongs to you afterward.

**Assembled example:**

Jupiter squares this Full Moon, creating pressure that requires a decision or adjustment. Support, intimacy, or shared resources may expand, but so can exposure and obligation. Accept help or opportunity with a clear understanding of what belongs to you afterward. This Full Moon is in your 8th house of transformation, symbolism, and other people's money. Don't fear what you might transform into.

Replacement:

> 

### Saturn in the 8th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/saturn/house-8`

**Meaning:**

Debt, trust, grief, or a binding agreement asks for structure and accountability. A firm boundary can make deeper exchange possible because everyone knows what they are responsible for carrying.

**Assembled example:**

Saturn squares this Full Moon, creating pressure that requires a decision or adjustment. Debt, trust, grief, or a binding agreement asks for structure and accountability. A firm boundary can make deeper exchange possible because everyone knows what they are responsible for carrying. This Full Moon is in your 8th house of transformation, symbolism, and other people's money. Don't fear what you might transform into.

Replacement:

> 

### Uranus in the 8th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/uranus/house-8`

**Meaning:**

A sudden truth may change how you understand trust, intimacy, or shared money. Let the revelation update the agreement instead of rebuilding the same arrangement around new information.

**Assembled example:**

Uranus squares this Full Moon, creating pressure that requires a decision or adjustment. A sudden truth may change how you understand trust, intimacy, or shared money. Let the revelation update the agreement instead of rebuilding the same arrangement around new information. This Full Moon is in your 8th house of transformation, symbolism, and other people's money. Don't fear what you might transform into.

Replacement:

> 

### Neptune in the 8th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/neptune/house-8`

**Meaning:**

Emotional and financial boundaries may be difficult to locate. Clarify what was promised and what was imagined before sacrifice becomes the price of staying connected.

**Assembled example:**

Neptune squares this Full Moon, creating pressure that requires a decision or adjustment. Emotional and financial boundaries may be difficult to locate. Clarify what was promised and what was imagined before sacrifice becomes the price of staying connected. This Full Moon is in your 8th house of transformation, symbolism, and other people's money. Don't fear what you might transform into.

Replacement:

> 

### Pluto in the 8th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/pluto/house-8`

**Meaning:**

Fear, control, and transformation are close to the surface. The more tightly you protect an expired source of power, the more forcefully life shows you that it can no longer hold.

**Assembled example:**

Pluto squares this Full Moon, creating pressure that requires a decision or adjustment. Fear, control, and transformation are close to the surface. The more tightly you protect an expired source of power, the more forcefully life shows you that it can no longer hold. This Full Moon is in your 8th house of transformation, symbolism, and other people's money. Don't fear what you might transform into.

Replacement:

> 

### The lunar node axis in the 8th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/node_axis/house-8`

**Meaning:**

A familiar form of dependence competes with a more honest way of sharing power. Growth does not require complete self-sufficiency, but it does require knowing what you are consenting to exchange.

**Assembled example:**

The lunar node axis squares this Full Moon, creating pressure that requires a decision or adjustment. A familiar form of dependence competes with a more honest way of sharing power. Growth does not require complete self-sufficiency, but it does require knowing what you are consenting to exchange. This Full Moon is in your 8th house of transformation, symbolism, and other people's money. Don't fear what you might transform into.

Replacement:

> 

## House 9: the higher self, philosophy, and greater wisdom

### Mercury in the 9th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mercury/house-9`

**Meaning:**

A belief, course of study, publication, or distant plan needs a sharper question. Learning begins when information is allowed to change your position, not merely decorate it.

**Assembled example:**

Mercury squares this Full Moon, creating pressure that requires a decision or adjustment. A belief, course of study, publication, or distant plan needs a sharper question. Learning begins when information is allowed to change your position, not merely decorate it. This Full Moon is in your 9th house of the higher self, philosophy, and greater wisdom. Let the question become larger than the answer you arrived with.

Replacement:

> 

### Venus in the 9th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/venus/house-9`

**Meaning:**

A value, relationship, or experience may broaden your worldview. Seek what is beautiful and meaningful without treating agreement as the price of connection.

**Assembled example:**

Venus squares this Full Moon, creating pressure that requires a decision or adjustment. A value, relationship, or experience may broaden your worldview. Seek what is beautiful and meaningful without treating agreement as the price of connection. This Full Moon is in your 9th house of the higher self, philosophy, and greater wisdom. Let the question become larger than the answer you arrived with.

Replacement:

> 

### Mars in the 9th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mars/house-9`

**Meaning:**

Conviction can become action, debate, or a need to defend what you believe. Fight for the principle that matters without making certainty more important than truth.

**Assembled example:**

Mars squares this Full Moon, creating pressure that requires a decision or adjustment. Conviction can become action, debate, or a need to defend what you believe. Fight for the principle that matters without making certainty more important than truth. This Full Moon is in your 9th house of the higher self, philosophy, and greater wisdom. Let the question become larger than the answer you arrived with.

Replacement:

> 

### Jupiter in the 9th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/jupiter/house-9`

**Meaning:**

Study, travel, faith, or a larger opportunity may open quickly. Follow the expansion, but check whether confidence has outrun preparation or evidence.

**Assembled example:**

Jupiter squares this Full Moon, creating pressure that requires a decision or adjustment. Study, travel, faith, or a larger opportunity may open quickly. Follow the expansion, but check whether confidence has outrun preparation or evidence. This Full Moon is in your 9th house of the higher self, philosophy, and greater wisdom. Let the question become larger than the answer you arrived with.

Replacement:

> 

### Saturn in the 9th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/saturn/house-9`

**Meaning:**

A belief or long-range plan is being tested for structure. The lesson becomes useful when you can practice it, teach it responsibly, or let reality revise it.

**Assembled example:**

Saturn squares this Full Moon, creating pressure that requires a decision or adjustment. A belief or long-range plan is being tested for structure. The lesson becomes useful when you can practice it, teach it responsibly, or let reality revise it. This Full Moon is in your 9th house of the higher self, philosophy, and greater wisdom. Let the question become larger than the answer you arrived with.

Replacement:

> 

### Uranus in the 9th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/uranus/house-9`

**Meaning:**

A new idea or experience may disrupt the worldview that used to organize your life. Freedom comes from thinking differently, not from rejecting every tradition on contact.

**Assembled example:**

Uranus squares this Full Moon, creating pressure that requires a decision or adjustment. A new idea or experience may disrupt the worldview that used to organize your life. Freedom comes from thinking differently, not from rejecting every tradition on contact. This Full Moon is in your 9th house of the higher self, philosophy, and greater wisdom. Let the question become larger than the answer you arrived with.

Replacement:

> 

### Neptune in the 9th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/neptune/house-9`

**Meaning:**

Faith, imagination, and longing may make a path feel meaningful before it becomes clear. Let inspiration guide the inquiry while facts and boundaries keep the journey from becoming escape.

**Assembled example:**

Neptune squares this Full Moon, creating pressure that requires a decision or adjustment. Faith, imagination, and longing may make a path feel meaningful before it becomes clear. Let inspiration guide the inquiry while facts and boundaries keep the journey from becoming escape. This Full Moon is in your 9th house of the higher self, philosophy, and greater wisdom. Let the question become larger than the answer you arrived with.

Replacement:

> 

### Pluto in the 9th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/pluto/house-9`

**Meaning:**

A belief may reveal the power structure beneath it. Ask who benefits from the truth you were taught and whether your conviction still expands your life.

**Assembled example:**

Pluto squares this Full Moon, creating pressure that requires a decision or adjustment. A belief may reveal the power structure beneath it. Ask who benefits from the truth you were taught and whether your conviction still expands your life. This Full Moon is in your 9th house of the higher self, philosophy, and greater wisdom. Let the question become larger than the answer you arrived with.

Replacement:

> 

### The lunar node axis in the 9th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/node_axis/house-9`

**Meaning:**

A familiar answer competes with a direction of learning that has no finished map. Growth may require becoming a student again where you once depended on certainty.

**Assembled example:**

The lunar node axis squares this Full Moon, creating pressure that requires a decision or adjustment. A familiar answer competes with a direction of learning that has no finished map. Growth may require becoming a student again where you once depended on certainty. This Full Moon is in your 9th house of the higher self, philosophy, and greater wisdom. Let the question become larger than the answer you arrived with.

Replacement:

> 

## House 10: career and public recognition

### Mercury in the 10th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mercury/house-10`

**Meaning:**

A professional message, decision, or public conversation needs precision. State the goal and the terms clearly because ambiguity will be interpreted as part of your position.

**Assembled example:**

Mercury squares this Full Moon, creating pressure that requires a decision or adjustment. A professional message, decision, or public conversation needs precision. State the goal and the terms clearly because ambiguity will be interpreted as part of your position. This Full Moon is in your 10th house of career and public recognition. Choose the work you are willing to be known for, including the way you do it.

Replacement:

> 

### Venus in the 10th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/venus/house-10`

**Meaning:**

Reputation, alliances, and the value of your work become easier to assess. Grace can open the door, but it should not require lowering the price of your labor or judgment.

**Assembled example:**

Venus squares this Full Moon, creating pressure that requires a decision or adjustment. Reputation, alliances, and the value of your work become easier to assess. Grace can open the door, but it should not require lowering the price of your labor or judgment. This Full Moon is in your 10th house of career and public recognition. Choose the work you are willing to be known for, including the way you do it.

Replacement:

> 

### Mars in the 10th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mars/house-10`

**Meaning:**

Ambition, conflict, or a demand for action becomes visible. Use authority directly without making urgency or dominance the measure of leadership.

**Assembled example:**

Mars squares this Full Moon, creating pressure that requires a decision or adjustment. Ambition, conflict, or a demand for action becomes visible. Use authority directly without making urgency or dominance the measure of leadership. This Full Moon is in your 10th house of career and public recognition. Choose the work you are willing to be known for, including the way you do it.

Replacement:

> 

### Jupiter in the 10th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/jupiter/house-10`

**Meaning:**

Recognition, responsibility, or professional opportunity may grow. Take the larger stage when the role supports your direction, not simply because visibility feels like proof of success.

**Assembled example:**

Jupiter squares this Full Moon, creating pressure that requires a decision or adjustment. Recognition, responsibility, or professional opportunity may grow. Take the larger stage when the role supports your direction, not simply because visibility feels like proof of success. This Full Moon is in your 10th house of career and public recognition. Choose the work you are willing to be known for, including the way you do it.

Replacement:

> 

### Saturn in the 10th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/saturn/house-10`

**Meaning:**

A professional obligation or consequence asks for mature follow-through. Reputation is being built through what you repeat when praise, pressure, and supervision are absent.

**Assembled example:**

Saturn squares this Full Moon, creating pressure that requires a decision or adjustment. A professional obligation or consequence asks for mature follow-through. Reputation is being built through what you repeat when praise, pressure, and supervision are absent. This Full Moon is in your 10th house of career and public recognition. Choose the work you are willing to be known for, including the way you do it.

Replacement:

> 

### Uranus in the 10th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/uranus/house-10`

**Meaning:**

A career direction or public role may need a significant change. Innovation helps when it creates a truer structure, not when disruption becomes an exit from every difficult middle.

**Assembled example:**

Uranus squares this Full Moon, creating pressure that requires a decision or adjustment. A career direction or public role may need a significant change. Innovation helps when it creates a truer structure, not when disruption becomes an exit from every difficult middle. This Full Moon is in your 10th house of career and public recognition. Choose the work you are willing to be known for, including the way you do it.

Replacement:

> 

### Neptune in the 10th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/neptune/house-10`

**Meaning:**

A calling can feel compelling while expectations remain vague. Define the work, audience, and boundary before inspiration becomes an agreement no one can measure.

**Assembled example:**

Neptune squares this Full Moon, creating pressure that requires a decision or adjustment. A calling can feel compelling while expectations remain vague. Define the work, audience, and boundary before inspiration becomes an agreement no one can measure. This Full Moon is in your 10th house of career and public recognition. Choose the work you are willing to be known for, including the way you do it.

Replacement:

> 

### Pluto in the 10th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/pluto/house-10`

**Meaning:**

Authority, ambition, and public power become more explicit. Decide what influence is for before the need to control the outcome begins controlling you.

**Assembled example:**

Pluto squares this Full Moon, creating pressure that requires a decision or adjustment. Authority, ambition, and public power become more explicit. Decide what influence is for before the need to control the outcome begins controlling you. This Full Moon is in your 10th house of career and public recognition. Choose the work you are willing to be known for, including the way you do it.

Replacement:

> 

### The lunar node axis in the 10th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/node_axis/house-10`

**Meaning:**

A familiar definition of achievement competes with work that asks for a different kind of courage. The next direction may matter more than the title you already know how to earn.

**Assembled example:**

The lunar node axis squares this Full Moon, creating pressure that requires a decision or adjustment. A familiar definition of achievement competes with work that asks for a different kind of courage. The next direction may matter more than the title you already know how to earn. This Full Moon is in your 10th house of career and public recognition. Choose the work you are willing to be known for, including the way you do it.

Replacement:

> 

## House 11: friendship

### Mercury in the 11th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mercury/house-11`

**Meaning:**

A group plan, friendship conversation, or shared idea needs coordination. Name what everyone believes was decided before the project or relationship is asked to carry conflicting assumptions.

**Assembled example:**

Mercury squares this Full Moon, creating pressure that requires a decision or adjustment. A group plan, friendship conversation, or shared idea needs coordination. Name what everyone believes was decided before the project or relationship is asked to carry conflicting assumptions. This Full Moon is in your 11th house of friendship. Notice which connections make more of you possible and which require you to disappear to belong.

Replacement:

> 

### Venus in the 11th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/venus/house-11`

**Meaning:**

Friendship, belonging, and shared values come into focus. Invest in the connections where affection and effort can move in both directions.

**Assembled example:**

Venus squares this Full Moon, creating pressure that requires a decision or adjustment. Friendship, belonging, and shared values come into focus. Invest in the connections where affection and effort can move in both directions. This Full Moon is in your 11th house of friendship. Notice which connections make more of you possible and which require you to disappear to belong.

Replacement:

> 

### Mars in the 11th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mars/house-11`

**Meaning:**

A group conflict, cause, or friendship may require direct action. Defend the purpose without making every difference of approach into evidence of disloyalty.

**Assembled example:**

Mars squares this Full Moon, creating pressure that requires a decision or adjustment. A group conflict, cause, or friendship may require direct action. Defend the purpose without making every difference of approach into evidence of disloyalty. This Full Moon is in your 11th house of friendship. Notice which connections make more of you possible and which require you to disappear to belong.

Replacement:

> 

### Jupiter in the 11th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/jupiter/house-11`

**Meaning:**

Your network, audience, or sense of possibility may expand through other people. Welcome the opening while remembering that access to more people is not the same as intimacy with them.

**Assembled example:**

Jupiter squares this Full Moon, creating pressure that requires a decision or adjustment. Your network, audience, or sense of possibility may expand through other people. Welcome the opening while remembering that access to more people is not the same as intimacy with them. This Full Moon is in your 11th house of friendship. Notice which connections make more of you possible and which require you to disappear to belong.

Replacement:

> 

### Saturn in the 11th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/saturn/house-11`

**Meaning:**

A friendship or group role is being measured through reliability and reciprocity. Decide what you can keep contributing without turning responsibility into resentment.

**Assembled example:**

Saturn squares this Full Moon, creating pressure that requires a decision or adjustment. A friendship or group role is being measured through reliability and reciprocity. Decide what you can keep contributing without turning responsibility into resentment. This Full Moon is in your 11th house of friendship. Notice which connections make more of you possible and which require you to disappear to belong.

Replacement:

> 

### Uranus in the 11th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/uranus/house-11`

**Meaning:**

Your circle, future plan, or relationship to community may change suddenly. Let belonging evolve without treating distance from the old group as proof that the connection never mattered.

**Assembled example:**

Uranus squares this Full Moon, creating pressure that requires a decision or adjustment. Your circle, future plan, or relationship to community may change suddenly. Let belonging evolve without treating distance from the old group as proof that the connection never mattered. This Full Moon is in your 11th house of friendship. Notice which connections make more of you possible and which require you to disappear to belong.

Replacement:

> 

### Neptune in the 11th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/neptune/house-11`

**Meaning:**

A community or collective ideal may look more unified than it is. Keep compassion in the room while asking who is responsible, who is included, and what the shared promise requires.

**Assembled example:**

Neptune squares this Full Moon, creating pressure that requires a decision or adjustment. A community or collective ideal may look more unified than it is. Keep compassion in the room while asking who is responsible, who is included, and what the shared promise requires. This Full Moon is in your 11th house of friendship. Notice which connections make more of you possible and which require you to disappear to belong.

Replacement:

> 

### Pluto in the 11th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/pluto/house-11`

**Meaning:**

Influence and control inside a group become easier to see. Challenge the hidden hierarchy without reproducing it through secrecy, loyalty tests, or social punishment.

**Assembled example:**

Pluto squares this Full Moon, creating pressure that requires a decision or adjustment. Influence and control inside a group become easier to see. Challenge the hidden hierarchy without reproducing it through secrecy, loyalty tests, or social punishment. This Full Moon is in your 11th house of friendship. Notice which connections make more of you possible and which require you to disappear to belong.

Replacement:

> 

### The lunar node axis in the 11th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/node_axis/house-11`

**Meaning:**

A familiar group role competes with a future that asks for different allies. Growth may mean leaving a known position before the new community feels fully established.

**Assembled example:**

The lunar node axis squares this Full Moon, creating pressure that requires a decision or adjustment. A familiar group role competes with a future that asks for different allies. Growth may mean leaving a known position before the new community feels fully established. This Full Moon is in your 11th house of friendship. Notice which connections make more of you possible and which require you to disappear to belong.

Replacement:

> 

## House 12: karma, subconscious, and endings

### Mercury in the 12th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mercury/house-12`

**Meaning:**

A private thought, memory, or mental loop wants your attention. Write it down or name it to someone trustworthy so reflection does not become an argument you conduct alone.

**Assembled example:**

Mercury squares this Full Moon, creating pressure that requires a decision or adjustment. A private thought, memory, or mental loop wants your attention. Write it down or name it to someone trustworthy so reflection does not become an argument you conduct alone. This Full Moon is in your 12th house of karma, subconscious, and endings. Give yourself enough privacy to hear what is surfacing, but do not confuse privacy with having to carry it alone.

Replacement:

> 

### Venus in the 12th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/venus/house-12`

**Meaning:**

Private grief, longing, or a question of worth may be easier to feel than explain. Offer yourself care without using comfort to avoid the truth that the feeling is trying to reveal.

**Assembled example:**

Venus squares this Full Moon, creating pressure that requires a decision or adjustment. Private grief, longing, or a question of worth may be easier to feel than explain. Offer yourself care without using comfort to avoid the truth that the feeling is trying to reveal. This Full Moon is in your 12th house of karma, subconscious, and endings. Give yourself enough privacy to hear what is surfacing, but do not confuse privacy with having to carry it alone.

Replacement:

> 

### Mars in the 12th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/mars/house-12`

**Meaning:**

Anger or urgency may be operating beneath withdrawal and exhaustion. Give the energy a safe, direct outlet before silence turns it against you.

**Assembled example:**

Mars squares this Full Moon, creating pressure that requires a decision or adjustment. Anger or urgency may be operating beneath withdrawal and exhaustion. Give the energy a safe, direct outlet before silence turns it against you. This Full Moon is in your 12th house of karma, subconscious, and endings. Give yourself enough privacy to hear what is surfacing, but do not confuse privacy with having to carry it alone.

Replacement:

> 

### Jupiter in the 12th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/jupiter/house-12`

**Meaning:**

Your inner life may feel larger, more meaningful, or more absorbing. Solitude can restore perspective, but escape becomes expensive when it keeps you from returning to the life that needs you.

**Assembled example:**

Jupiter squares this Full Moon, creating pressure that requires a decision or adjustment. Your inner life may feel larger, more meaningful, or more absorbing. Solitude can restore perspective, but escape becomes expensive when it keeps you from returning to the life that needs you. This Full Moon is in your 12th house of karma, subconscious, and endings. Give yourself enough privacy to hear what is surfacing, but do not confuse privacy with having to carry it alone.

Replacement:

> 

### Saturn in the 12th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/saturn/house-12`

**Meaning:**

What has been avoided now asks for time, structure, and an honest limit. Solitude can help you listen, but isolation will not do the work for you.

**Assembled example:**

Saturn squares this Full Moon, creating pressure that requires a decision or adjustment. What has been avoided now asks for time, structure, and an honest limit. Solitude can help you listen, but isolation will not do the work for you. This Full Moon is in your 12th house of karma, subconscious, and endings. Give yourself enough privacy to hear what is surfacing, but do not confuse privacy with having to carry it alone.

Replacement:

> 

### Uranus in the 12th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/uranus/house-12`

**Meaning:**

A hidden pattern may break its usual rhythm and become impossible to ignore. Let the interruption show you what needs freedom without demanding an immediate explanation for everything you feel.

**Assembled example:**

Uranus squares this Full Moon, creating pressure that requires a decision or adjustment. A hidden pattern may break its usual rhythm and become impossible to ignore. Let the interruption show you what needs freedom without demanding an immediate explanation for everything you feel. This Full Moon is in your 12th house of karma, subconscious, and endings. Give yourself enough privacy to hear what is surfacing, but do not confuse privacy with having to carry it alone.

Replacement:

> 

### Neptune in the 12th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/neptune/house-12`

**Meaning:**

Sensitivity, fatigue, and uncertainty may make your usual boundaries feel less reliable. Reduce unnecessary noise and ask for support before treating overwhelm as a message you must decode alone.

**Assembled example:**

Neptune squares this Full Moon, creating pressure that requires a decision or adjustment. Sensitivity, fatigue, and uncertainty may make your usual boundaries feel less reliable. Reduce unnecessary noise and ask for support before treating overwhelm as a message you must decode alone. This Full Moon is in your 12th house of karma, subconscious, and endings. Give yourself enough privacy to hear what is surfacing, but do not confuse privacy with having to carry it alone.

Replacement:

> 

### Pluto in the 12th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/pluto/house-12`

**Meaning:**

An old story about survival, secrecy, or control may return with more force. Release begins when you stop organizing your present life around keeping the buried material from moving.

**Assembled example:**

Pluto squares this Full Moon, creating pressure that requires a decision or adjustment. An old story about survival, secrecy, or control may return with more force. Release begins when you stop organizing your present life around keeping the buried material from moving. This Full Moon is in your 12th house of karma, subconscious, and endings. Give yourself enough privacy to hear what is surfacing, but do not confuse privacy with having to carry it alone.

Replacement:

> 

### The lunar node axis in the 12th-house lunation layer

- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT

ID: `draft/lunation-aspect/body-house/node_axis/house-12`

**Meaning:**

A familiar form of avoidance competes with the quieter work of release. The next step may be private, but it should move you toward participation in your life rather than farther away from it.

**Assembled example:**

The lunar node axis squares this Full Moon, creating pressure that requires a decision or adjustment. A familiar form of avoidance competes with the quieter work of release. The next step may be private, but it should move you toward participation in your life rather than farther away from it. This Full Moon is in your 12th house of karma, subconscious, and endings. Give yourself enough privacy to hear what is surfacing, but do not confuse privacy with having to carry it alone.

Replacement:

> 

## Activation checklist

- [ ] All five aspect stems decided
- [ ] All 108 body-by-house rows decided
- [ ] All twelve house bridges decided
- [ ] All three ruler-condition stems decided
- [ ] Selection rule approved by exact hash
- [ ] One-year, twelve-rising-sign coverage report reviewed
- [ ] Node/browser/dist parity tests pass
- [ ] Missing or omitted rows fail closed

