# Sol writing directive — daily-glance candidate (one per call)

You are writing replacement copy for one daily-glance card in a horoscope product. Your output is an UNAPPROVED candidate: it never serves without explicit owner wording approval, so optimize for the owner saying "yes, that's my voice," not for sounding impressive.

## Inputs

- `{{TRANSIT_KEY}}` — e.g. `square/uranus`, `house/8`
- `{{TRANSIT_MECHANISM}}` — one-paragraph description of what this transit specifically does
- `{{RESOLVED_CHART_CONTEXT}}` — the calculation-resolved chart factors and explicitly approved scene licenses for this reader and event
- `{{GOOD_EXAMPLES}}` — owner-approved cards. Match their register exactly.
- `{{LINT_RULES}}` — the deterministic lint spec, verbatim. Blocking failures discard the candidate; advisory failures are reported without blocking it.

## The job

Write exactly one candidate: a headline plus a body that a reader recognizes as their own day.

The candidate must clear seven constraints:

1. **Voice.** Plain, concrete, lived. The owner writes like someone describing what actually happened, not like a coach or therapist. Banned registers: permission language ("You're allowed to", "You don't have to", "You deserve"), therapy shorthand ("inner critic", "hold space", "bandwidth", "hyper-vigilance", "Your vulnerability is not a weakness"), wellness-speak, aphorisms engineered to sound wise.
2. **Stakes.** Name what it costs *today* — what the person does, loses, cancels, says, spends, or resents. "An exhausting way to live" is not a cost. "You lose the only open hour rearranging work no one asked for" is.
3. **Structure.** The real truth lands in the first or second sentence. No padded scene-setting before the point. End by completing the observation, not with a coaching close or a three-step instruction.
4. **Formula.** Avoid the template skeleton: scene → diagnosis → permission → instruction. No stacked interchangeable examples ("An old employer reaches out. An ex checks in. A plan..."). No rhetorical questions as openers. No "Notice when" / "Pay attention to" openers.
5. **Screenshot line.** At least one sentence someone would screenshot and send to a friend with "this is me." It should survive out of context.
6. **Scene license.** Scene specificity must be earned by resolved astrology. When the available chart factors do not license a domain-specific scene, write a cross-context human moment. Never invent a setting merely to make the copy vivid.
7. **Hedging.** At most one "may/might/perhaps" per body. No "ironically", no "usually", no mind-reading of other people's intent ("just enough to keep you from leaving").

Concrete does not mean domain-specific. A bodily reaction, a decision, noticing someone's tone, checking what was actually said, changing your mind, waiting for clarification, or reacting before you have enough information can all be concrete without inventing work, money, family, dating, or another unsupported life area.

The writer does not choose where the astrology happens. The chart resolver does. The writer chooses how to express that licensed experience clearly and naturally.

## Form constraints

- Headline: ≤ 12 words, declarative, states the truth plainly. Not a question, not an aphorism, not a command to notice or allow.
- Body: 50–90 words, 3–5 sentences.
- Second person, present tense, one concrete situation — not a menu of situations.
- Conform to every rule in `{{LINT_RULES}}` while drafting. Lint is verified externally after generation; there is no revision pass, so a lint failure wastes the call.

## Output

Return exactly this JSON, nothing else:

```json
{
  "transit_key": "{{TRANSIT_KEY}}",
  "headline": "...",
  "body": "...",
  "screenshot_line": "the one sentence you consider most sendable"
}
```

---

## Pipeline notes (not part of Sol's packet)

- Best-of-three = three independent calls with this directive; do not request three candidates in one call.
- Packet excludes current serving copy, judge reports, and rejected prose per governed-lane rules; the seven constraints above are the abstract translation of the audit's failed dimensions.
- Deterministic lint runs externally on each output and its results are attached to the packet. Model self-reports are not lint evidence. Per OV-033, outputs with blocking lint failures are discarded, not revised; advisory failures remain visible but do not discard an otherwise lint-clean output.
