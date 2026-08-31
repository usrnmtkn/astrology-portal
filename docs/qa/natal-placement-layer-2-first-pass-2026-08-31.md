# Natal planet-house baseline: first-pass triage

Date: 2026-08-31
Status: review-only triage; no reader-serving wording is changed or approved by this document
Branch: `agent/natal-placement-three-layer-audit`
Parent doctrine: `docs/qa/natal-placement-three-layer-audit-2026-08-31.md`

## Scope

This pass begins the Layer 2 review for natal placements:

`Planet in the house = how this specific planetary function operates in this natal life area, across all twelve signs.`

It is not a Sky Placement review. It does not authorize edits to any row whose current `review_status` is `approved`, `approved_reuse`, or otherwise protected.

Semantic reference: Myrna Lofthus, *A Spiritual Approach to Astrology* (1983), especially the planet-specific “in the Houses” sections already extracted into the V3 source bank. Lofthus is meaning evidence only. Current TLDR Astro owner contracts control reader language and reject deterministic outcomes, invented biography, medical certainty, fixed family/gender assumptions, karmic certainty, and outdated career-only framing.

## Structural finding before row-by-row rewriting

The current fallback house path still composes:

`house-meaning/{house}` + `placement-house-sentence/{planet}/{house}`

That means a genuinely planet-specific house passage can still be preceded by a generic house definition. Under the three-layer architecture, the Layer 2 unit must eventually be complete enough to stand without the generic `house-meaning` paragraph.

Do not remove the generic house introduction from serving output yet. First establish complete Layer 2 coverage and owner approval for the replacement floor, then change resolver selection with package/runtime regressions.

## Triage meanings

- **REWRITE PRIORITY**: the current house-only baseline makes claims that are too narrow, deterministic, biographical, generic, or incompatible with sign synthesis. Preserve the source meaning, not the current sentence architecture.
- **SURGICAL REVIEW**: the central planet-house mechanism is usable, but one or more claims, comparisons, metaphors, or advice constructions need correction.
- **CANDIDATE BASIS**: a newer non-serving `placement-house-lived` unit may contain useful mechanism or scene evidence. It remains `needs_review` and cannot replace approved copy without owner approval.

## Immediate rewrite priorities

| Content key | Triage | Why it fails the current Layer 2 contract |
|---|---|---|
| `fallback-hook/placement-house-sentence/sun/7` | REWRITE PRIORITY | “We rather than me” and “natural peacemaker” are not reliable Sun-in-7th claims and can contradict the sign baseline, especially an initiating or strongly self-directed sign. The usable core is that identity becomes clearer through consequential one-to-one encounters and shared decisions. |
| `fallback-hook/placement-house-sentence/sun/10` | REWRITE PRIORITY | Collapses the house toward ambition, success, power, and being watched. Needs a broader Sun-specific public-life mechanism around visible contribution, responsibility, recognition, direction, and what the person is willing to put their name behind. |
| `fallback-hook/placement-house-sentence/mercury/2` | REWRITE PRIORITY | Treats earning through speech/writing as a likely outcome and compares the reader favorably with others. The baseline should describe how thinking, information, decisions, pricing, possessions, and usable skills interact in 2nd-house life without guaranteeing income. |
| `fallback-hook/placement-house-sentence/mercury/10` | REWRITE PRIORITY | “Communicating is how you climb,” several jobs, and work travel reduce the placement to employment outcomes. Mercury needs to describe the role of words, judgment, information, explanation, naming, and decisions in public contribution and reputation. |
| `fallback-hook/placement-house-sentence/venus/8` | REWRITE PRIORITY | Claims shared life tends to work in the reader’s favor and builds a moralized coasting story around what a partner provides. Preserve Venus themes of value, affection, reciprocity, pleasure, agreements, and shared resources without promising benefit or assigning laziness. |
| `fallback-hook/placement-house-sentence/venus/10` | REWRITE PRIORITY | “Opening doors in your career,” pleasing others, and professional charm overstate external reward and narrow the house to employment. Venus here needs a broader account of values, relationships, aesthetics, diplomacy, attraction, and what becomes publicly associated with the person. |
| `fallback-hook/placement-house-sentence/mars/1` | REWRITE PRIORITY | Turns speed and assertion into a likely injury outcome. The usable mechanism is immediate action, self-assertion, initiative, and difficulty pacing force. Injury can be a possibility only when proportionately and non-deterministically supported. |
| `fallback-hook/placement-house-sentence/mars/10` | REWRITE PRIORITY | Centers success, enterprise, work variety, and “room to lead.” Mars in the 10th needs to remain valid outside employment and show how action, assertion, conflict, initiative, and pursuit become visible through public responsibility and direction. |
| `fallback-hook/placement-house-sentence/jupiter/1` | REWRITE PRIORITY | Claims optimism is what others notice, that doors open personally, and that the person inspires faith. Too much guaranteed external reaction and benefic-outcome language. |
| `fallback-hook/placement-house-sentence/jupiter/2` | REWRITE PRIORITY | “Money tends to find you,” instincts are “usually right,” and big ideas attract backers are fortune claims rather than a natal mechanism. |
| `fallback-hook/placement-house-sentence/jupiter/10` | REWRITE PRIORITY | Current language leans on opportunities, visibility, honors, and reward. The useful core is expansion of reach, responsibility, confidence, contribution, and the scale of what the person is publicly entrusted with. |
| `fallback-hook/placement-house-sentence/saturn/7` | REWRITE PRIORITY | “Take forever to commit,” “playing for keeps,” and wishing for the perfect partner are too absolute. Saturn’s useful 7th-house mechanism is seriousness about terms, commitment, limits, responsibility, reciprocity, and the consequences of one-to-one agreements. |
| `fallback-hook/placement-house-sentence/saturn/10` | REWRITE PRIORITY | Opens “Career is where life tests you hardest and pays you best,” then invents a demanding/absent parent history. Both are outside the current baseline contract. Saturn here needs responsibility, standards, consequence, authority, endurance, accountability, and public trust without assuming employment or biography. |
| `fallback-hook/placement-house-sentence/uranus/4` | REWRITE PRIORITY | Claims home has rarely been settled, describes a nonstandard family story, and predicts a later-life turn. The baseline should describe how independence, disruption, experimentation, and nonconformity operate through home, roots, privacy, and the private base without inventing what already happened. |
| `fallback-hook/placement-house-sentence/uranus/7` | REWRITE PRIORITY | Claims the person is “fairly conventional,” attracts unconventional partners, and carries an “old wound” of misunderstanding. Those claims exceed a house-only Uranus baseline. |
| `fallback-hook/placement-house-sentence/uranus/10` | REWRITE PRIORITY | Reduces the house to career changes and occupational independence, with comparative claims about foresight. Broaden to visible innovation, independence from inherited public roles, changing public direction, and the tension between autonomy and responsibility. |
| `fallback-hook/placement-house-sentence/neptune/8` | REWRITE PRIORITY | Treats precognitive dreams and psychic sensitivity as fact and gives “murky” shared finances a quasi-karmic consequence. Keep sensitivity to ambiguity, trust, merging, disclosure, and shared resources without supernatural certainty or moralized prediction. |
| `fallback-hook/placement-house-sentence/neptune/10` | REWRITE PRIORITY | Narrows the placement to inspirational careers and invents a parent-linked wound behind public judgment. Neptune here needs public image, ideals, projection, uncertainty, imagination, porous boundaries around recognition, and the need for clear responsibilities without invented biography. |
| `fallback-hook/placement-house-sentence/pluto/4` | REWRITE PRIORITY | Asserts that the childhood household left a deep mark, that tension erupts at close people, and that many with the placement must leave home. The house alone does not establish that biography. |
| `fallback-hook/placement-house-sentence/pluto/10` | REWRITE PRIORITY | Predicts career redirections, collapse when influence is chased, and authority arriving when the person is useful. Preserve Pluto’s public themes of power, pressure, consequence, control, exposure, transformation, and responsibility without a success/collapse prophecy. |

## Surgical-review queue

| Content key | Triage | Preserve / correct |
|---|---|---|
| `fallback-hook/placement-house-sentence/mars/3` | SURGICAL REVIEW | Preserve quick mental/communicative response and conflict through words. Remove inevitability, house-keyword inventory, and clever advice that makes the sentence sound written around a punchline. |
| `fallback-hook/placement-house-sentence/mars/6` | SURGICAL REVIEW | Preserve direct effort, efficiency, pace, and irritation when work slows. Remove “outlasts almost everyone” and other comparisons; broaden beyond coworkers when employment is absent. |
| `fallback-hook/placement-house-sentence/mercury/6` | SURGICAL REVIEW | Stronger non-serving long-form candidate already exists around troubleshooting, technical material, missing details, and mental checking. Re-review it as Layer 2 evidence rather than defaulting to the older short row. |
| `fallback-hook/placement-house-sentence/saturn/8` | SURGICAL REVIEW | Preserve restraint, responsibility, limits, control, and difficulty sharing resources or vulnerability. Remove generic growth-language and abstractions that obscure the actual decision or consequence. |
| `fallback-hook/placement-house-sentence/saturn/9` | SURGICAL REVIEW | Preserve testing beliefs and intellectual standards. Remove invented developmental history such as early beliefs automatically following the crowd. |
| `fallback-hook/placement-house-sentence/uranus/3` | SURGICAL REVIEW | Preserve inventive/restless thinking and unconventional communication. Remove invented estrangement from relatives and the “perfect somewhere else” story. |
| `fallback-hook/placement-house-sentence/uranus/11` | SURGICAL REVIEW | Preserve unconventional networks, shifting goals, and group-level experimentation. Remove broad friendship-count claims and “electric energy” summary language. |
| `fallback-hook/placement-house-sentence/neptune/9` | SURGICAL REVIEW | Preserve imagination/idealism entering belief, philosophy, study, and worldview. Replace “this placement clouds judgment” certainty and avoid presenting wandering as a guaranteed life story. |
| `fallback-hook/placement-house-sentence/pluto/5` | SURGICAL REVIEW | Preserve intensity around creating, pleasure, romance, risk, and what the person makes. Replace “pressure valve” and unsupported claims about intensity turning inward and hurting. |
| `fallback-hook/placement-house-sentence/pluto/6` | SURGICAL REVIEW | Preserve willingness to engage difficult problems and strong concentration in daily responsibilities. Remove guaranteed external reactions such as people automatically disclosing their deepest problems. |

## The 10th-house special review

Every conventional planet-in-10th baseline should be re-reviewed as one family before any of them are reapproved. The current rows repeatedly use career, jobs, professional success, climbing, work, or occupational change as the default expression.

The 10th house and the Midheaven are related but are not interchangeable in this audit. Do not mechanically turn every 10th-house placement into an MC conjunction. The wider editorial correction is still useful: 10th-house copy must work beyond conventional employment and may include public role, visible responsibility, accountability, reputation, contribution, leadership, recognition, authority, and long-term direction when the planet supports those meanings.

The stricter owner MC doctrine remains separate: Midheaven itself is what the person becomes known for, not their job, and MC opposition is authored from the IC.

## Existing non-serving Layer 2 candidates

The 2026-08-17 natal placement mechanism/rewrite work already contains `needs_review` long-form candidates such as `placement-house-lived/mercury/6`, `placement-house-lived/moon/10`, `placement-house-lived/uranus/10`, and other planet-specific units. These are useful evidence because they demonstrate that the repository has already begun moving from generic house copy toward planet-specific house writing.

They are not automatically the replacement. Re-review them against:

1. the Lofthus semantic source;
2. the current natal writing contract and owner corrections;
3. the three-layer rule;
4. the current public-life / MC distinction where applicable; and
5. cold rendered You and Friend prose.

## Next authoring boundary

Before any replacement reader prose is written or staged, build the repository-required evidence receipt for the natal placement register: exact semantic sources, at least three exact owner-authored positive passages, relevant owner correction pairs, and the active do-not-use list.

Any replacement rows produced from that process remain `needs_review`. Existing approved bodies remain byte-identical until the owner approves the exact proposed replacement wording.
