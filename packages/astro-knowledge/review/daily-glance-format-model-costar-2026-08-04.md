# Daily At-a-Glance format model (source: CS)

Date: 2026-08-04
Source: five Co-Star app screenshots supplied by the owner, 2026-08-04. Source tag: CS. Same governance as CC/AC/SD: structure and scale transfer; phrasing, register, and subject matter never. CS prose is never Marie voice evidence.
Owner format direction (chat, 2026-08-04): "this is the example of the format for the daily overview. Strong sentence and then supporting description." This sentence is the authoritative format statement for the surface contract's shape block.

## 1. Structure that transfers

- Headline: one complete declarative sentence, sentence case, terminal period. Observed range 4 to 16 words. It is a claim, not a summary or a label; the body exists to support it.
- Body: one short paragraph, 3 to 5 sentences, roughly 40 to 65 words. Observed movement: name the behavior, reframe or correct it, end on one concrete instruction. The body never repeats the headline's wording; it earns it.
- Headline/body relation: assertion then support. The headline can stand alone (it is the push-notification surface); the body deepens rather than explains.
- Do/Don't: two columns, exactly 3 items each, one to three words, no punctuation, never explained. Matches our shipped renderDoDont spec; no change needed.
- Page hierarchy: glance leads, areas-of-life cards read quieter below. Matches assembly spec section 1; no change needed.

## 2. What does NOT transfer (register warnings, for lint and the judge spec)

Observed in the same screenshots and already banned or bannable under our rules:

- "Stop + verb" correction move ("Stop confusing introspection with insight", "Stop treating sadness like a problem to fix", "Stop accepting the scraps", "Stop blaming yourself"). This is where Batch A's S1 formula came from. DG-R1 bans it.
- Em dashes ("aren't prophecies—they're just thoughts with good PR"). OV-010.
- Mind-reading assertions stated as fact about the reader ("You've confused silence with loyalty", "You've made yourself smaller to fit what was offered"). Our copy may name a recognizable behavior; it may not diagnose the reader's inner history.
- Therapy-causal claims ("Your anxiety may come from not having your needs met when you were very little"). VC-005 territory; hard fail.
- "The situation won't improve by itself": "the situation" is on our watch inventory; fatalist framing conflicts with DG-R4's conditions-not-outcomes rule.
- Polished aphorism texture ("thoughts with good PR", "You deserve a great love", "You are not your doubts"): the exact permission-formula and slogan register S2/S3 rejected.
- Cynical-oracle stance overall: CS's brand voice addresses the reader as a case to be read. Marie's warmth rules (OV-023, SM-003) point the opposite way: same structural confidence, delivered with warmth and without verdicts.

## 3. Contract deltas this produces (into `daily-glance.json` when drafted)

- shape.beats: [strong-sentence headline (claim), supporting body (behavior, reframe, one concrete instruction)] with the owner's format sentence quoted as basis.
- formatExemplarPolicy: source CS, structure-only, approvalScope "format and scale, never wording"; screenshots referenced by this file.
- headline length gate: cap near 16 words, and per DG-R2 each aspect group needs its own grammar within this shape; CS uses one voice for all days, we deliberately do not.
- body length gate: 40 to 65 words, 3 to 5 sentences, one instruction maximum.

## 4. Sign-off

- P4. Approve this file as the format-model record and the section 3 deltas for the surface contract. OWNER: APPROVED. (Owner, chat, 2026-08-04: "P4 - approve format.")
