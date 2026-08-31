# Natal placement Layer 2: 10th-house evidence receipt

Date: 2026-08-31
Status: pre-authoring evidence only; no candidate in this file is reader copy
Branch: `agent/natal-placement-three-layer-audit`
Scope: first Layer 2 repair batch for `sun/10`, `venus/10`, and `saturn/10`

## 1. Rendered surface and register

Surface: You / Friend full natal placement detail.

Register: recurring natal pattern, not forecast. The Layer 2 unit must work across all twelve signs and must describe how the named planet operates through 10th-house life. It must remain valid for a student, stay-at-home parent, unemployed person, disabled person outside conventional employment, unpaid community or creative contributor, retiree, and person with a conventional career.

This is a planet-in-house baseline, not a Midheaven conjunction. The 10th house and Midheaven are related public-chart factors but are not interchangeable. The owner Midheaven doctrine is used here only as a guardrail against collapsing public life into employment.

## 2. Meaning sources

### Primary semantic source

Myrna Lofthus, *A Spiritual Approach to Astrology* (1983), planet-specific “in the Houses” sections.

Use the planet-specific mechanism and discard unsupported certainty. Lofthus is not a voice source.

- Sun in 10th: attainment, ambition, achievement, visible example, power used beyond the self; source family `book/201419935-a-spiritual-approach-to-astrology/sun-in-the-houses/10`.
- Venus in 10th: a socially visible Venus function through relating, aesthetics, diplomacy, voice, appreciation, social ease; source family `book/201419935-a-spiritual-approach-to-astrology/venus-in-the-houses/10`. Do not carry forward guaranteed money, universal likability, or “doors open” fortune claims.
- Saturn in 10th: responsibility, perseverance, accountability, self-reliance, authority, standards, integrity, consequence; source family `book/201419935-a-spiritual-approach-to-astrology/saturn-in-the-houses/10`. Do not carry forward the guaranteed success/failure story or the dominant/absent-father biography.

### Current serving rows under review

- `fallback-hook/placement-house-sentence/sun/10`
- `fallback-hook/placement-house-sentence/venus/10`
- `fallback-hook/placement-house-sentence/saturn/10`

These rows are currently approved and remain immutable during this audit. New wording must use a separate `needs_review` candidate path until the owner explicitly approves the complete exact replacement.

### Supporting house doctrine

The 10th-house baseline may include public role, visible contribution, responsibility, accountability, reputation, recognition, authority, and long-term direction. Employment can be one manifestation but cannot be required for the paragraph to make sense.

Midheaven doctrine remains stricter and separate:

> Midheaven = what you become known for, not your job.

Do not silently treat a 10th-house planet as a planet conjunct the Midheaven.

## 3. Exact owner-authored positive register passages

These passages supply prose behavior. They do not supply astrology facts for a different placement.

### Owner passage A: developed natal placement

Source path: `docs/writing/ARGUMENT_DEVELOPMENT_STANDARD.md`
Authority: owner-authored, exact-owner-approved REGISTER calibration; non-serving; non-phrase evidence.

> “The difficult part is that survival skills do not automatically retire when the situation changes. You can become so good at protecting yourself from instability that stability itself starts to feel suspicious. You may hesitate to use resources you worked hard to build, stay with the familiar because uncertainty feels more dangerous than dissatisfaction, or keep proving that you can manage without asking whether managing should still be the goal. Chiron in Taurus can make scarcity feel more trustworthy than abundance because scarcity is familiar. You know what to do when there is not enough. The deeper work begins when there is enough and you have to learn how to live differently.”

What to learn from it: one mechanism develops through recognizable behavior and consequence; specificity increases after the opening; the paragraph does not become a keyword inventory.

### Owner passage B: responsibility and consequence

Source path: `data/writing/owner-register-gold.json`
Authority: exact-owner-approved rendered Saturn-in-Capricorn register gold.

> “Saturn stands at the threshold where a choice becomes a consequence. The deadline arrives, the bill comes due, and a weak structure reveals itself in the person who has to absorb the extra hours, missing money, or unfinished work. Saturn governs time, limits, and responsibility. Under pressure, the true cost of keeping something going becomes visible, along with who has been expected to carry it.”

What to learn from it: Saturn is named through responsibility, limits, time, and consequence, then shown through observable proof. Authority is not a title word; it is connected to who decides and who carries the result.

### Owner passage C: Venus operating through a house

Source path: `packages/astro-knowledge/voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/adjacent-formats/relationship-year-libra-2025-to-venus-rx-2026.md`
Authority: owner corpus; adjacent transit/horoscope register. Use for prose movement and Venus/house concreteness, not natal fact transfer.

> “Your ruling planet Venus moves into your 6th house, where daily life happens. Where routine meets beauty. Where work meets worth. You're finally understanding that self-care isn't some luxury you earn after everyone else is taken care of. It's the foundation. When you set a boundary around your workload, you're teaching everyone around you what respect looks like. Start noticing patterns. Which habits drain you? Which coworkers / clients leave you exhausted?”

What to learn from it: Venus is not reduced to “harmony.” House placement changes what Venus has to negotiate in ordinary life; examples name behavior and consequences rather than decorate the paragraph.

## 4. Relevant owner corrections

Source path: `docs/writing/OWNER_CORRECTIONS.md`.

- Generic object/scene is not concreteness. Name the observable behavior, circumstance, decision, or consequence.
- Do not invent motive or childhood history when behavior is enough.
- Do not let a sign collapse into its traditionally associated house. The inverse applies here too: do not let a house turn every planet into the same house-keyword paragraph.
- Restore ordinary language when compression makes a sentence sound written rather than spoken.
- Generated connective prose cannot displace stronger owner-authored language merely to make an assembly feel complete.
- A polished career sentence can still fail if the astrology has been narrowed to employment.

## 5. Active do-not-use list for this batch

In addition to the global writing contract:

- no em dashes;
- no “This is about…”, “This placement becomes…”, “this part of the chart…”;
- no generic `Pushed too far...` or `At their best...` scaffolding;
- no “the trap is / the reward is” pair;
- no career-only premise;
- no guaranteed success, honors, money, promotion, popularity, admiration, or external approval;
- no guaranteed failure, downfall, public humiliation, or loss;
- no invented parent/father history;
- no claims that people automatically like, trust, admire, watch, hire, or follow the native;
- no abstract “warmth,” “comfort,” “steadiness,” “growth,” or “alignment” as the final meaning;
- no generic house definition preceding the planet-specific mechanism;
- no life-coach closer that could be pasted onto another planet;
- no sign-specific behavior inside Layer 2. The baseline must still work for every sign.

## 6. Voice and meaning targets for the first three rows

### Sun in the 10th house

Planet function: identity, conscious direction, vitality, ownership, recognition, what the person is willing to stand behind.

House operation: that function becomes especially consequential in visible roles, public contribution, responsibility, reputation, decisions other people can associate with the person, and long-term direction.

Required distinction: recognition matters because the Sun is involved, but the baseline cannot guarantee admiration or assume ambition is the person’s central personality trait.

### Venus in the 10th house

Planet function: affection, value, pleasure, taste, attraction, relating, reciprocity, social judgment.

House operation: values, taste, relating style, aesthetics, diplomacy, or the ability to make participation more appealing can become visible parts of what the person contributes and what others associate with them.

Required distinction: do not turn Venus into guaranteed charm, likability, financial ease, or professional advantage. The complication must come from Venus operating publicly, not from a generic people-pleasing trope.

### Saturn in the 10th house

Planet function: responsibility, limits, time, standards, consequence, endurance, authority.

House operation: responsibility and standards become visible; the person may be evaluated by what they can carry, enforce, complete, answer for, or sustain over time. Authority must remain tied to accountability.

Required distinction: do not assume a conventional career, late success, a difficult father, or inevitable setbacks. The baseline should still make sense if the person’s visible responsibility is school, caregiving leadership, volunteer work, advocacy, community authority, creative work, mentoring, or a role built after retirement.

## 7. Authoring gate

No reader candidate should be promoted from this receipt alone. The next stage is a placement-specific meaning plan / argument core, then the canonical TLDR writer pipeline when executable. Any resulting reader prose remains `needs_review`, `ownerApproved: false`, `promotionAuthorized: false`, and `canonical: false` until exact owner approval.
