#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewDir = path.join(repoRoot, "packages/astro-knowledge/review/lunation-card-assembly-v1");
const madlibPath = path.join(reviewDir, "source/horoscope-madlib-v1.json");
const jsonPath = path.join(reviewDir, "lunation-aspect-review-packet-v1.json");
const markdownPath = path.join(reviewDir, "lunation-aspect-review-packet-v1.md");
const madlib = JSON.parse(fs.readFileSync(madlibPath, "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");

const selectionRule = {
  schema: "lunation-dynamic-selection-rule/v1",
  status: "pending_owner_review",
  maximumSkyAspectBlocks: 1,
  maximumRulerBlocks: 1,
  aspectScoreFormula: "aspectWeight * planetWeight * ((1 - orb / maxOrb) ^ 1.2) * relevance",
  aspects: {
    conjunction: { weight: 1, maxOrbDegrees: 3 },
    opposition: { weight: 0.95, maxOrbDegrees: 3 },
    square: { weight: 0.9, maxOrbDegrees: 3 },
    trine: { weight: 0.8, maxOrbDegrees: 2 },
    sextile: { weight: 0.6, maxOrbDegrees: 2 },
  },
  bodies: {
    saturn: 1,
    pluto: 0.95,
    uranus: 0.95,
    mars: 0.9,
    jupiter: 0.85,
    neptune: 0.8,
    node_axis: 0.7,
    venus: 0.55,
    mercury: 0.5,
  },
  relevance: {
    rulesLunation: 1.25,
    rulesRisingSign: 1.2,
    stationingWithinThreeDays: 1.3,
    retrograde: 1.1,
    angularForRisingSign: 1.15,
  },
  fullMoonLightRule: "Evaluate both lights. When the same body qualifies against both, retain only its higher-scoring contact.",
  nodeRule: "Treat the North and South Nodes as one axis and never render two nodal blocks.",
  rulerRule: "A ruler condition qualifies only for retrograde, a station within three days, or a last-degree ingress within three days. When the ruler wins the aspect selection, merge any qualifying ruler condition into that aspect block and never render a second paragraph. Otherwise render at most one separate ruler block.",
  ingressRule: "Mention ingress only when the ingressing body rules the lunation sign, is at 29 degrees at the lunation, and changes signs within three days. A station outranks an ingress.",
  silenceRule: "Missing, omitted, or unapproved copy causes the block to omit. Never substitute another body, house, or aspect row.",
  excluded: ["Chiron", "minor aspects", "applying or separating language", "compound aspect patterns", "natal contacts", "sect", "dignity modifiers"],
};
selectionRule.ruleSha256 = sha256(JSON.stringify(selectionRule));

const aspectStems = [
  {
    id: "conjunction",
    copy: "{{planet}} is conjunct this {{lunationKind}}, concentrating its concerns instead of letting them stay in the background.",
  },
  {
    id: "opposition",
    copy: "{{planet}} opposes this {{lunationKind}}, making the tension visible through competing demands.",
  },
  {
    id: "square",
    copy: "{{planet}} squares this {{lunationKind}}, creating pressure that requires a decision or adjustment.",
  },
  {
    id: "trine",
    copy: "{{planet}} trines this {{lunationKind}}, giving you a usable current of support if you act on it.",
  },
  {
    id: "sextile",
    copy: "{{planet}} sextiles this {{lunationKind}}, opening an opportunity that still needs your participation.",
  },
];

const rulerConditionStems = [
  {
    id: "retrograde",
    copy: "{{ruler}} is retrograde, so the part of this cycle it governs develops through review, return, and correction before forward movement becomes clear.",
  },
  {
    id: "stationing",
    copy: "{{ruler}} stations within three days of this {{lunationKind}}, turning the issue into a real pivot rather than background pressure.",
  },
  {
    id: "last-degree-ingress",
    copy: "{{ruler}} is in the last degree of {{rulerSign}} and changes signs within three days, so the current way of handling this is reaching its limit.",
  },
];

const bodyLabels = {
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
  node_axis: "The lunar node axis",
};

const houses = {
  1: {
    bridge: "Notice which response belongs to who you are now and which one belongs to an identity you have outgrown.",
    meanings: {
      mercury: "Your self-talk, decisions, and way of naming what is happening are shaping how you see yourself. Choose language that leaves room for you to become more than your first reaction.",
      venus: "Questions of worth, attraction, and presentation become personal. Notice whether you are choosing what feels true or arranging yourself to be easier for someone else to approve.",
      mars: "Your instinct is to act, defend, or reclaim space. Direct the energy toward a clear choice instead of turning every discomfort into a fight about who you are.",
      jupiter: "Confidence and possibility are growing, and you may be ready to take up more room. Expansion helps when it strengthens your sense of self, not when it becomes a promise you cannot sustain.",
      saturn: "You are being asked to take yourself seriously through boundaries, responsibility, and follow-through. The identity that lasts is the one your choices can support over time.",
      uranus: "A familiar version of you may no longer fit. Give yourself permission to change without making disruption the only proof that you are free.",
      neptune: "The line between who you are and what others imagine about you may feel less clear. Return to what your body, values, and lived choices tell you before accepting someone else's projection.",
      pluto: "Control, visibility, and personal power move closer to the surface. You do not need to dominate the moment, but you may need to stop pretending that an old identity still has authority over you.",
      node_axis: "A familiar way of presenting yourself competes with a less practiced direction of growth. The next step may feel unfamiliar precisely because it is not built around the role you already know how to play.",
    },
  },
  2: {
    bridge: "Let your next financial choice reflect what you value, not only what makes the uncertainty stop.",
    meanings: {
      mercury: "Money needs a clear conversation, number, or decision. Read the terms, name the tradeoff, and do not let anxiety turn an assumption into a fact.",
      venus: "Your values are visible in what you accept, purchase, charge, and protect. Pleasure and stability can belong in the same plan when neither is being used to prove your worth.",
      mars: "Financial pressure may provoke urgency, defensiveness, or a need to act quickly. Use the heat to address the problem directly without spending, earning, or arguing just to feel powerful again.",
      jupiter: "An opportunity to earn, invest, or build may become easier to see. Growth is useful here, but more is not automatically safer, especially when the numbers depend on optimism alone.",
      saturn: "A budget, boundary, or long-term obligation asks for honesty. Security grows through repeatable choices, not through punishing yourself for what the past already cost.",
      uranus: "Income, expenses, or your definition of stability may change unexpectedly. Flexibility is an asset, but freedom still needs a practical floor beneath it.",
      neptune: "Financial facts and emotional value can become difficult to separate. Verify what is owed, promised, or affordable before generosity, fear, or fantasy makes the decision for you.",
      pluto: "Money may reveal a deeper question about control, dependence, or deservingness. Change the agreement that keeps power hidden instead of treating the visible expense as the entire problem.",
      node_axis: "An old form of security competes with a value you are still learning to trust. Choose the resource pattern that can support your future, not simply the one that feels most familiar.",
    },
  },
  3: {
    bridge: "Say the clearest true thing you can say, then leave enough space to hear what comes back.",
    meanings: {
      mercury: "A message, decision, or conversation carries more weight than usual. Slow down enough to distinguish what was actually said from the story your mind built around it.",
      venus: "The way you speak can create connection without requiring you to soften the truth beyond recognition. Look for the wording that preserves both honesty and relationship.",
      mars: "Words may come quickly, especially when you feel dismissed or delayed. Use directness to move the conversation forward, not to win a moment you will have to repair later.",
      jupiter: "A larger idea, invitation, or field of study opens the conversation. Share what you know, but leave room for information that complicates the conclusion you wanted to reach.",
      saturn: "A promise, deadline, or difficult conversation requires precision. Say what you can do, what you cannot do, and what needs to be decided before silence becomes its own answer.",
      uranus: "News or a sudden realization may change how you understand the situation. You are allowed to revise your thinking without turning every new idea into an immediate announcement.",
      neptune: "Meaning can blur when suggestion, tone, and assumption replace direct language. Ask the clarifying question before treating uncertainty as intuition.",
      pluto: "The real issue may be living underneath the stated conversation. Name the power dynamic or repeated thought without interrogating every word for proof of betrayal.",
      node_axis: "A familiar script competes with a conversation you have not learned how to have yet. Growth may begin with asking a different question instead of delivering a better version of the same answer.",
    },
  },
  4: {
    bridge: "Take time to check in and feel, you cannot think your way out of emotion.",
    meanings: {
      mercury: "A family conversation, memory, or decision about home needs language. Speak to the present situation without forcing every old chapter to testify in the same argument.",
      venus: "Peace at home matters, but harmony that depends on your silence is not peace. Let care include your comfort, taste, and emotional needs too.",
      mars: "Tension at home may make you protective, angry, or ready to move. Establish the boundary the household needs without treating vulnerability as a threat you have to defeat.",
      jupiter: "Home, family, or your sense of belonging may be ready to expand. Make room for growth while noticing where more space, more caretaking, or more optimism could become another obligation.",
      saturn: "Family responsibility and emotional history ask for mature limits. You cannot rewrite your family history, but you can decide what you will continue carrying forward.",
      uranus: "A change in home or family roles interrupts the old arrangement. Build flexibility into the foundation instead of demanding that stability look exactly as it did before.",
      neptune: "Family feeling can become difficult to separate from guilt, hope, or rescue. You cannot unburden your loved ones of their pain and the weight they carry, nor heal their trauma alone.",
      pluto: "An inherited pattern around control, secrecy, or survival may become harder to ignore. The cycle changes when you stop protecting the pattern simply because it came from people you love.",
      node_axis: "A familiar family role competes with the emotional foundation you are trying to build. Belonging does not require repeating every rule that once kept the household together.",
    },
  },
  5: {
    bridge: "Make room for what feels alive without turning it into a performance you have to maintain.",
    meanings: {
      mercury: "A creative idea, romantic conversation, or question about children wants expression. Follow the thought far enough to make something from it instead of discussing it until the spark goes cold.",
      venus: "Pleasure, affection, and creative confidence are easier to recognize. Receive what feels good without using attention as the only measure of whether your joy is real.",
      mars: "Desire and creative risk are asking for action. Pursue what excites you, but do not confuse intensity, competition, or pursuit with proof that something matters.",
      jupiter: "Joy, visibility, romance, or creative possibility can grow quickly. Say yes to the opening while keeping the promise proportionate to the life you actually have.",
      saturn: "A creative practice, romantic responsibility, or matter involving children needs steadiness. Discipline should protect what you love, not make pleasure feel like another performance review.",
      uranus: "A surprise attraction or experiment may interrupt the familiar script. Let yourself try a different form without discarding what matters simply because novelty feels electric.",
      neptune: "Inspiration and romance can feel vivid while practical details disappear. Enjoy the beauty, then check whether the person, project, or promise can exist outside the imagined version.",
      pluto: "Desire, visibility, and creative power become more intense. Make the work or tell the truth without using withholding, obsession, or control to keep the feeling alive.",
      node_axis: "A familiar source of applause competes with a form of expression that asks more courage from you. Create toward the life you want, not only toward the response you already know how to earn.",
    },
  },
  6: {
    bridge: "Choose the routine your body can live with, not the one that looks most disciplined from the outside.",
    meanings: {
      mercury: "A workflow, appointment, or daily decision needs clearer organization. Your nervous system is part of the schedule, so leave enough room to finish one thought before adding another demand.",
      venus: "Ease and support belong in the way you work and care for yourself. A pleasant routine is not frivolous when it helps you return consistently.",
      mars: "Workload, irritation, or physical energy needs a direct outlet. Address the task or boundary before unexpressed frustration becomes the rhythm of the entire day.",
      jupiter: "A better tool, role, or health-supporting habit may expand what is possible. Improvement stops helping when every opening becomes another responsibility you agree to carry.",
      saturn: "Your habits and obligations are showing you what is sustainable. Build the limit into the routine before exhaustion has to enforce it for you.",
      uranus: "A schedule, work method, or care routine may need to change abruptly. Experiment with a more flexible system, then keep the parts your body can actually repeat.",
      neptune: "Work expectations or wellness plans may feel unclear. Simplify the next step and verify practical information instead of treating confusion as a personal failure.",
      pluto: "A compulsion around productivity, control, or being useful may become visible. Change the system that depends on your depletion instead of trying to become more efficient at enduring it.",
      node_axis: "A familiar way of proving your usefulness competes with a healthier form of service. Growth may require doing less of what earns immediate approval and more of what you can sustain.",
    },
  },
  7: {
    bridge: "Let the relationship show you what is mutual, then make your decision from what is actually being exchanged.",
    meanings: {
      mercury: "A relationship needs clearer terms, questions, or conversation. Listen for the answer that was given rather than continuing until you receive the answer you hoped for.",
      venus: "Affection, reciprocity, and shared values move to the center. Notice whether the bond allows both people to have needs without turning care into a debt.",
      mars: "Conflict, chemistry, or competition becomes harder to avoid. Address the disagreement directly without making pursuit or resistance the only way the relationship can feel alive.",
      jupiter: "A relationship may offer growth, support, or a larger shared plan. Expansion works when both people can name what they are promising and what remains their own responsibility.",
      saturn: "Commitment, distance, or follow-through asks to be measured by behavior. Good intentions matter, but the repeated pattern tells you what the relationship can currently hold.",
      uranus: "A relationship may need more freedom, new terms, or an honest interruption of routine. Change the agreement before forcing one person to break it in order to breathe.",
      neptune: "Hope, projection, and compassion can blur what is actually mutual. Love does not require you to ignore the information that makes the relationship less ideal but more real.",
      pluto: "Power, trust, or fear of loss may shape the exchange more than either person admits. Intimacy deepens through truth, not through testing whether the other person can survive your silence.",
      node_axis: "A familiar relationship pattern competes with a less practiced way of meeting another person. The next step may ask you to stop performing the role that once guaranteed connection.",
    },
  },
  8: {
    bridge: "Don't fear what you might transform into.",
    meanings: {
      mercury: "A difficult conversation about trust, debt, intimacy, or disclosure needs exact language. Name what is shared, what is private, and what can no longer remain implied.",
      venus: "Shared resources and emotional exchange reveal what each person values. Intimacy cannot stay generous when worth, money, or affection is being used to keep score in secret.",
      mars: "A conflict around control, desire, or shared obligations wants direct action. Confront the issue without turning vulnerability into a contest over who needs whom less.",
      jupiter: "Support, intimacy, or shared resources may expand, but so can exposure and obligation. Accept help or opportunity with a clear understanding of what belongs to you afterward.",
      saturn: "Debt, trust, grief, or a binding agreement asks for structure and accountability. A firm boundary can make deeper exchange possible because everyone knows what they are responsible for carrying.",
      uranus: "A sudden truth may change how you understand trust, intimacy, or shared money. Let the revelation update the agreement instead of rebuilding the same arrangement around new information.",
      neptune: "Emotional and financial boundaries may be difficult to locate. Clarify what was promised and what was imagined before sacrifice becomes the price of staying connected.",
      pluto: "Fear, control, and transformation are close to the surface. The more tightly you protect an expired source of power, the more forcefully life shows you that it can no longer hold.",
      node_axis: "A familiar form of dependence competes with a more honest way of sharing power. Growth does not require complete self-sufficiency, but it does require knowing what you are consenting to exchange.",
    },
  },
  9: {
    bridge: "Let the question become larger than the answer you arrived with.",
    meanings: {
      mercury: "A belief, course of study, publication, or distant plan needs a sharper question. Learning begins when information is allowed to change your position, not merely decorate it.",
      venus: "A value, relationship, or experience may broaden your worldview. Seek what is beautiful and meaningful without treating agreement as the price of connection.",
      mars: "Conviction can become action, debate, or a need to defend what you believe. Fight for the principle that matters without making certainty more important than truth.",
      jupiter: "Study, travel, faith, or a larger opportunity may open quickly. Follow the expansion, but check whether confidence has outrun preparation or evidence.",
      saturn: "A belief or long-range plan is being tested for structure. The lesson becomes useful when you can practice it, teach it responsibly, or let reality revise it.",
      uranus: "A new idea or experience may disrupt the worldview that used to organize your life. Freedom comes from thinking differently, not from rejecting every tradition on contact.",
      neptune: "Faith, imagination, and longing may make a path feel meaningful before it becomes clear. Let inspiration guide the inquiry while facts and boundaries keep the journey from becoming escape.",
      pluto: "A belief may reveal the power structure beneath it. Ask who benefits from the truth you were taught and whether your conviction still expands your life.",
      node_axis: "A familiar answer competes with a direction of learning that has no finished map. Growth may require becoming a student again where you once depended on certainty.",
    },
  },
  10: {
    bridge: "Choose the work you are willing to be known for, including the way you do it.",
    meanings: {
      mercury: "A professional message, decision, or public conversation needs precision. State the goal and the terms clearly because ambiguity will be interpreted as part of your position.",
      venus: "Reputation, alliances, and the value of your work become easier to assess. Grace can open the door, but it should not require lowering the price of your labor or judgment.",
      mars: "Ambition, conflict, or a demand for action becomes visible. Use authority directly without making urgency or dominance the measure of leadership.",
      jupiter: "Recognition, responsibility, or professional opportunity may grow. Take the larger stage when the role supports your direction, not simply because visibility feels like proof of success.",
      saturn: "A professional obligation or consequence asks for mature follow-through. Reputation is being built through what you repeat when praise, pressure, and supervision are absent.",
      uranus: "A career direction or public role may need a significant change. Innovation helps when it creates a truer structure, not when disruption becomes an exit from every difficult middle.",
      neptune: "A calling can feel compelling while expectations remain vague. Define the work, audience, and boundary before inspiration becomes an agreement no one can measure.",
      pluto: "Authority, ambition, and public power become more explicit. Decide what influence is for before the need to control the outcome begins controlling you.",
      node_axis: "A familiar definition of achievement competes with work that asks for a different kind of courage. The next direction may matter more than the title you already know how to earn.",
    },
  },
  11: {
    bridge: "Notice which connections make more of you possible and which require you to disappear to belong.",
    meanings: {
      mercury: "A group plan, friendship conversation, or shared idea needs coordination. Name what everyone believes was decided before the project or relationship is asked to carry conflicting assumptions.",
      venus: "Friendship, belonging, and shared values come into focus. Invest in the connections where affection and effort can move in both directions.",
      mars: "A group conflict, cause, or friendship may require direct action. Defend the purpose without making every difference of approach into evidence of disloyalty.",
      jupiter: "Your network, audience, or sense of possibility may expand through other people. Welcome the opening while remembering that access to more people is not the same as intimacy with them.",
      saturn: "A friendship or group role is being measured through reliability and reciprocity. Decide what you can keep contributing without turning responsibility into resentment.",
      uranus: "Your circle, future plan, or relationship to community may change suddenly. Let belonging evolve without treating distance from the old group as proof that the connection never mattered.",
      neptune: "A community or collective ideal may look more unified than it is. Keep compassion in the room while asking who is responsible, who is included, and what the shared promise requires.",
      pluto: "Influence and control inside a group become easier to see. Challenge the hidden hierarchy without reproducing it through secrecy, loyalty tests, or social punishment.",
      node_axis: "A familiar group role competes with a future that asks for different allies. Growth may mean leaving a known position before the new community feels fully established.",
    },
  },
  12: {
    bridge: "Give yourself enough privacy to hear what is surfacing, but do not confuse privacy with having to carry it alone.",
    meanings: {
      mercury: "A private thought, memory, or mental loop wants your attention. Write it down or name it to someone trustworthy so reflection does not become an argument you conduct alone.",
      venus: "Private grief, longing, or a question of worth may be easier to feel than explain. Offer yourself care without using comfort to avoid the truth that the feeling is trying to reveal.",
      mars: "Anger or urgency may be operating beneath withdrawal and exhaustion. Give the energy a safe, direct outlet before silence turns it against you.",
      jupiter: "Your inner life may feel larger, more meaningful, or more absorbing. Solitude can restore perspective, but escape becomes expensive when it keeps you from returning to the life that needs you.",
      saturn: "What has been avoided now asks for time, structure, and an honest limit. Solitude can help you listen, but isolation will not do the work for you.",
      uranus: "A hidden pattern may break its usual rhythm and become impossible to ignore. Let the interruption show you what needs freedom without demanding an immediate explanation for everything you feel.",
      neptune: "Sensitivity, fatigue, and uncertainty may make your usual boundaries feel less reliable. Reduce unnecessary noise and ask for support before treating overwhelm as a message you must decode alone.",
      pluto: "An old story about survival, secrecy, or control may return with more force. Release begins when you stop organizing your present life around keeping the buried material from moving.",
      node_axis: "A familiar form of avoidance competes with the quieter work of release. The next step may be private, but it should move you toward participation in your life rather than farther away from it.",
    },
  },
};

const decisionFields = () => ({ decision: null, replacementCopy: null, ownerNote: null });
const reviewedAspectStems = aspectStems.map((row) => ({
  contentKey: `draft/lunation-aspect/stem/${row.id}`,
  aspect: row.id,
  copy: row.copy,
  ...decisionFields(),
}));
const reviewedRulerStems = rulerConditionStems.map((row) => ({
  contentKey: `draft/lunation-ruler-condition/${row.id}`,
  condition: row.id,
  copy: row.copy,
  ...decisionFields(),
}));
const houseBridges = madlib.houses.map((house) => ({
  contentKey: `draft/lunation-house-bridge/${house.house}`,
  house: house.house,
  ordinal: house.ordinal,
  domain: house.domain,
  copy: houses[house.house].bridge,
  sourceClass: [4, 8, 12].includes(house.house)
    ? "owner-selected-language"
    : "codex-draft-requires-owner-approval",
  ...decisionFields(),
}));
const bodyHouseRows = madlib.houses.flatMap((house) => Object.entries(houses[house.house].meanings).map(([body, copy]) => ({
  contentKey: `draft/lunation-aspect/body-house/${body}/house-${house.house}`,
  body,
  bodyLabel: bodyLabels[body],
  house: house.house,
  ordinal: house.ordinal,
  domain: house.domain,
  copy,
  sourceClass: "codex-draft-requires-owner-approval",
  exampleAssembly: `${reviewedAspectStems.find((stem) => stem.aspect === "square").copy
    .replace("{{planet}}", bodyLabels[body])
    .replace("{{lunationKind}}", "Full Moon")} ${copy} This Full Moon is in your ${house.ordinal} house of ${house.domain}. ${houses[house.house].bridge}`,
  ...decisionFields(),
})));

const packet = {
  schema: "lunation-aspect-review-packet/v1",
  status: "pending-owner-review",
  generatedAt: "2026-08-24",
  approvalInstructions: {
    allowedDecisions: ["APPROVE", "REVISE", "OMIT"],
    approve: "Serve the exact copy after the whole packet and coverage report pass.",
    revise: "Replace copy with replacementCopy, then return the revised row for owner approval.",
    omit: "Keep this combination silent. Never substitute another row.",
    activation: "No row in this packet is reader-eligible until its decision is APPROVE and the selection rule is separately approved.",
  },
  sourceAuthority: {
    bookHouseDomains: "packages/astro-knowledge/review/lunation-card-assembly-v1/source/horoscope-madlib-v1.json",
    assemblySpec: "packages/astro-knowledge/review/lunation-card-assembly-v1/spec.md",
    proseStatus: "draft for owner review; no runtime serving authority",
  },
  selectionRule: { ...selectionRule, ...decisionFields() },
  counts: {
    aspectStems: reviewedAspectStems.length,
    bodyHouseMeanings: bodyHouseRows.length,
    houseBridges: houseBridges.length,
    rulerConditionStems: reviewedRulerStems.length,
  },
  aspectStems: reviewedAspectStems,
  bodyHouseMeanings: bodyHouseRows,
  houseBridges,
  rulerConditionStems: reviewedRulerStems,
};

const choice = "- [ ] APPROVE  - [ ] REVISE  - [ ] OMIT";
const md = [];
md.push("# Lunation aspect review packet V1", "");
md.push("Status: **DRAFT FOR OWNER REVIEW. NOTHING IN THIS PACKET SERVES.**", "");
md.push("For every item, select one decision. If you select REVISE, write the replacement directly below the item. Approval means exact wording. OMIT means the combination remains silent; the app may not substitute another row.", "");
md.push("## Selection rule", "", choice, "", `Rule SHA-256: \`${selectionRule.ruleSha256}\``, "", "```json", JSON.stringify(selectionRule, null, 2), "```", "");
md.push("## Five aspect stems", "");
for (const stem of reviewedAspectStems) {
  md.push(`### ${stem.aspect}`, "", choice, "", `ID: \`${stem.contentKey}\``, "", stem.copy, "", "Replacement:", "", "> ", "");
}
md.push("## Three ruler-condition stems", "");
for (const stem of reviewedRulerStems) {
  md.push(`### ${stem.condition}`, "", choice, "", `ID: \`${stem.contentKey}\``, "", stem.copy, "", "Replacement:", "", "> ", "");
}
md.push("## Twelve house bridges", "");
for (const bridge of houseBridges) {
  md.push(`### House ${bridge.house}: ${bridge.domain}`, "", choice, "", `ID: \`${bridge.contentKey}\``, "", bridge.copy, "", `Source class: ${bridge.sourceClass}`, "", "Replacement:", "", "> ", "");
}
md.push("## 108 body-by-house meanings", "");
for (const house of madlib.houses) {
  md.push(`## House ${house.house}: ${house.domain}`, "");
  for (const row of bodyHouseRows.filter((candidate) => candidate.house === house.house)) {
    md.push(`### ${row.bodyLabel} in the ${row.ordinal}-house lunation layer`, "", choice, "", `ID: \`${row.contentKey}\``, "", "**Meaning:**", "", row.copy, "", "**Assembled example:**", "", row.exampleAssembly, "", "Replacement:", "", "> ", "");
  }
}
md.push("## Activation checklist", "", "- [ ] All five aspect stems decided", "- [ ] All 108 body-by-house rows decided", "- [ ] All twelve house bridges decided", "- [ ] All three ruler-condition stems decided", "- [ ] Selection rule approved by exact hash", "- [ ] One-year, twelve-rising-sign coverage report reviewed", "- [ ] Node/browser/dist parity tests pass", "- [ ] Missing or omitted rows fail closed", "");

fs.writeFileSync(jsonPath, `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(markdownPath, `${md.join("\n")}\n`);
console.log(JSON.stringify({
  json: path.relative(repoRoot, jsonPath),
  markdown: path.relative(repoRoot, markdownPath),
  counts: packet.counts,
  selectionRuleSha256: selectionRule.ruleSha256,
}, null, 2));
