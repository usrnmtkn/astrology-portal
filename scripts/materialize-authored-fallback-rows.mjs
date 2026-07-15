#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const defaultOutDir = path.join(repoRoot, "scripts", "generated", "authored-fallbacks");
const importBatchId = "authored-fallbacks-v1-dry-run";

const aspects = ["conjunction", "sextile", "square", "trine", "opposition"];
const surfaceTiers = ["tooltip", "notification", "card", "feed", "expanded"];
const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

const existingRuntimeHooks = {
  current_sky_aspect: "fallback-hook/sky.aspect-detail",
  transit_to_natal_aspect: "fallback-hook/you.transit-to-natal",
  transit_through_natal_house: "fallback-hook/you.transit-through-house",
  transit_to_natal_angle: "fallback-hook/you.transit-to-angle",
  planetary_ingress: "fallback-hook/sky.ingress",
  personalized_ingress: "fallback-hook/you.daily-timing",
  retrograde_phase: "fallback-hook/sky.retrograde",
  planetary_station: "fallback-hook/sky.station",
  planet_specific_retrograde: "fallback-hook/sky.retrograde",
  multiple_retrogrades: "fallback-hook/sky.retrograde-section",
  natal_planet_in_sign: "fallback-hook/you.natal-placement",
  natal_planet_in_house: "fallback-hook/you.natal-house-placement",
  natal_angle_placement: "fallback-hook/you.natal-angle-placement",
  natal_aspect: "fallback-hook/you.natal-aspect",
  synastry: "fallback-hook/friends.synastry-contact",
  synastry_same_planet: "fallback-hook/friends.same-planet",
  synastry_relationship_context: "fallback-hook/friends.synastry-contact",
  synastry_house_overlay: "fallback-hook/friends.house-overlay",
  short_factual_emergency: "fallback-hook/settings.life-area-focus"
};

function titleCase(value) {
  return String(value)
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function sentenceForTier(tier, copy) {
  if (tier === "tooltip") return copy.tooltip;
  if (tier === "notification") return copy.notification;
  if (tier === "card") return copy.card;
  if (tier === "feed") return copy.feed;
  return copy.expanded;
}

function modeForTier(tier) {
  if (tier === "expanded") return "in_depth";
  return "feed";
}

function surfaceForFamily(family) {
  if (family.startsWith("synastry")) return "synastry";
  if (family === "transit_to_natal_aspect" || family === "personalized_ingress") return "you";
  if (family === "short_factual_emergency") return "relationship";
  return "sky";
}

function row({
  canonicalKey,
  family,
  surfaceTier,
  scope = {},
  text,
  mappingAction = "NEW_CANONICAL_KEY",
  incomingSource = "authored-fallback-system-v1",
  lane = "serving",
  reviewState = "editorial-review-required",
  provenance = "Authored fallback logic supplied by Marie Satori and materialized by Codex.",
  planet = "",
  aspect = "",
  retrogradePhase = "",
  relationshipContext = ""
}) {
  return {
    incoming_source: incomingSource,
    canonical_key: canonicalKey,
    existing_canonical_match: existingRuntimeHooks[family] ?? "",
    content_family: family,
    surface_tier: surfaceTier,
    scope: JSON.stringify(scope),
    status: "DRAFT",
    lane,
    review_state: reviewState,
    provenance,
    text,
    mapping_action: mappingAction,
    planet,
    aspect,
    retrograde_phase: retrogradePhase,
    relationship_context: relationshipContext
  };
}

const aspectCopy = {
  conjunction: {
    tooltip: "Two sky factors are meeting in one place. Notice where one choice immediately changes the next one.",
    notification: "A conjunction concentrates attention. Choose the response you can actually maintain.",
    card: "A conjunction puts two sky factors in the same room. Watch where a single decision changes the tone of the day, then choose the response you can keep.",
    feed: "A conjunction concentrates the sky in one place. In ordinary life, this can show up as a conversation, decision, mood, or deadline that asks for a clear response. Use the focus without crowding the moment.",
    expanded: "A conjunction describes two sky factors occupying the same field of attention. The lived signal may be a decision that affects several next steps, a conversation that gathers speed, or a mood that keeps returning until it is named. The useful move is concentration: choose one response, make it real enough to test, and avoid treating intensity as proof that everything must be handled at once."
  },
  sextile: {
    tooltip: "There is an opening here. Take one small action while the door is easy to reach.",
    notification: "A sextile offers access. Send the message, test the idea, or name the next step.",
    card: "A sextile is an opening that still needs participation. Send the message, test the idea, make the call, or take one clean next step.",
    feed: "A sextile points to workable access. Something may be easier to coordinate than usual, but it still asks for action. Use the window for a practical move instead of waiting for motivation to arrive first.",
    expanded: "A sextile describes an available opening between two sky factors. The day may offer a useful conversation, an easier repair, a timely introduction, or enough momentum to start. The gift is access, not automatic completion. Take the small move that proves the opening is real: ask, schedule, draft, clarify, or test."
  },
  square: {
    tooltip: "Pressure shows where the current method is snagging. Fix the part that keeps creating the same problem.",
    notification: "A square brings pressure. Simplify the choice before the pattern repeats.",
    card: "A square shows where the current method keeps snagging. Use the pressure to simplify the choice, set the boundary, or repair the part of the plan that keeps failing.",
    feed: "A square can feel like repeated friction around the same choice. The point is not to force a win; it is to notice the snag, reduce the moving parts, and handle the part that has become impossible to ignore.",
    expanded: "A square describes pressure between two active concerns. In lived terms, the same problem may keep appearing through timing, tone, resistance, or a task that refuses to stay simple. Work with the pressure by reducing the field: name the real decision, set one boundary, remove one false obligation, or repair the part of the plan that keeps producing the same result."
  },
  trine: {
    tooltip: "Two sky factors are cooperating. Use the available ease for practice, repair, or momentum.",
    notification: "A trine gives coordination. Put the smoother path to use.",
    card: "A trine makes coordination easier. Use the available ease for practice, repair, or momentum instead of assuming the moment will handle itself.",
    feed: "A trine can make a response easier to find. The useful part is not passivity; it is the chance to practice, repair, or build momentum while less resistance is in the way.",
    expanded: "A trine describes cooperation between two sky factors. The lived signal may be smoother timing, a helpful answer, a body-level yes, or a conversation that can move without needing as much defense. Use the available ease with intention. Practice the skill, repair the connection, or move the task forward while the path is less crowded."
  },
  opposition: {
    tooltip: "Two concerns are facing each other. Name what needs response and what needs restraint.",
    notification: "An opposition asks for balance through an honest choice, not avoidance.",
    card: "An opposition places two concerns across from each other. Give each side a real job: name what needs response, name what needs restraint, then choose the compromise you can stand behind.",
    feed: "An opposition can make a decision feel split between two real concerns. Avoid flattening one side into the enemy. Name what each side protects, then choose the response that keeps the situation honest.",
    expanded: "An opposition describes two sky factors asking for recognition from different positions. In ordinary life, this can look like a choice between speed and care, closeness and space, honesty and diplomacy, or personal desire and shared agreement. The useful move is not to erase either side. Name what each side protects, then choose the compromise that keeps the decision honest."
  }
};

const transitRows = {
  applying: "The transit is moving toward a natal point, so the topic may start arriving through ordinary signals: a conversation, deadline, body cue, or repeated mood. Treat it as early information, not a final verdict.",
  exact: "The transit is close enough to describe the active pressure. Work with the concrete place it is showing up today; if the birth time is reliable, the natal house can show where the pressure is landing.",
  separating: "The exact contact has passed, but the response is still being integrated. Notice what changed, what stayed unresolved, and what practical choice now needs follow-through.",
  "repeated-hit-first-pass": "The first pass introduces the pattern. It may arrive as a question, interruption, opportunity, or discomfort that shows where attention is needed.",
  "repeated-hit-retrograde-pass": "The retrograde pass returns to the same pattern with more evidence. Review what was missed the first time, but do not treat repetition as failure.",
  "repeated-hit-final-pass": "The final pass asks for a clearer response. Use what the earlier passes taught you and choose the action that can carry forward.",
  "reliable-birth-time": "When birth time is reliable, the natal house can be used. Describe where the transit lands in daily life, such as work, home, partnership, money, visibility, or private repair.",
  "unknown-birth-time": "When birth time is unknown, use the planet-to-planet contact only. Do not assign a house, angle, or timed life area unless the chart data supports it."
};

const ingressCopy = {
  "general-ingress": "A planet entering a new sign changes the tone of the next set of choices. Watch for a shift in pace, attention, and what people respond to first.",
  "fast-planet-ingress": "A fast planet changing signs can alter the daily weather quickly. Notice the new tone in messages, plans, mood, attraction, or momentum.",
  "mercury-ingress": "Mercury changing signs changes how information moves: the questions people ask, the details they notice, and the conversations that need cleaner language.",
  "venus-ingress": "Venus changing signs changes how people seek ease, pleasure, repair, money, and connection. Notice what starts feeling worth your attention.",
  "mars-ingress": "Mars changing signs changes how action starts. Watch for the new rhythm in effort, irritation, desire, courage, and how quickly people move.",
  "jupiter-ingress": "Jupiter changing signs changes which choices people begin saying yes to more easily. Notice where appetite, belief, growth, and excess start gathering.",
  "saturn-ingress": "Saturn changing signs changes where structure and method have to become practical. Watch where vague pressure starts asking for commitments, limits, and a better method.",
  "outer-planet-ingress": "An outer planet changing signs marks a long shift in collective behavior. Notice changes in language, technology, culture, pressure, and what people can no longer organize around.",
  "personalized-ingress-with-house": "When birth time is reliable, the house shows where the ingress starts changing daily life. Describe the concrete area affected and keep the prediction modest.",
  "personalized-ingress-without-house": "When birth time is unknown, describe the planet and sign shift without naming a house or angle. Keep the copy useful without pretending to know the exact life area."
};

const retrogradePhaseCopy = {
  "pre-shadow": "The pre-shadow is where the issue first enters the frame. Notice the message, delay, question, or repeat pattern that may need a second look later.",
  "station-retrograde": "At the station retrograde, the usual method may stop working automatically. Slow down enough to see which assumption, habit, or plan needs review.",
  "retrograde-passage": "During the retrograde passage, the work is revision. Return to what is unfinished, repair what can be repaired, and avoid making confusion into a catastrophe.",
  "cazimi-midpoint": "The cazimi midpoint can clarify the center of the review. Look for the sentence, fact, conversation, or decision that organizes the rest of the retrograde.",
  "station-direct": "At the station direct, movement resumes slowly. Use the new information, but give the decision enough time to become steady before rushing the outcome.",
  "post-shadow": "The post-shadow is the integration period. Apply what changed, clean up the loose ends, and notice whether the old pattern still asks for your attention."
};

const retrogradePlanetCopy = {
  mercury: "Mercury retrograde reviews messages, schedules, decisions, and language. The work is to clarify the signal before reacting to the noise.",
  venus: "Venus retrograde reviews desire, value, pleasure, money, and how connection is maintained. Notice which relationship or money pattern no longer feels honest enough to keep repeating.",
  mars: "Mars retrograde reviews effort, anger, pursuit, courage, and timing. The question is where force has replaced strategy.",
  jupiter: "Jupiter retrograde reviews belief, appetite, opportunity, and what has been promised. Growth becomes stronger when the next choice is checked against lived truth.",
  saturn: "Saturn retrograde reviews commitments, limits, authority, and the structure that carries responsibility. Repair the method before adding more weight.",
  uranus: "Uranus retrograde reviews freedom, disruption, and the need to change a pattern that has become too rigid. The signal may arrive through restlessness or refusal.",
  neptune: "Neptune retrograde reviews ideals, avoidance, longing, and the story people have been using to soften reality. Let care stay connected to evidence.",
  pluto: "Pluto retrograde reviews control, fear, attachment, and the power dynamics underneath a pattern. Work with what has become too costly to keep hidden."
};

const multiRetrogradeCopy = {
  "fast-plus-slow": "When a fast retrograde overlaps slow retrogrades, daily confusion may sit on top of a longer restructuring. Handle the immediate task without losing sight of the larger pattern.",
  "multiple-slow-planets": "Multiple slow retrogrades do not mean life stops. They describe long patterns under review: culture, duty, belief, power, technology, and what people can no longer organize around.",
  "general-count": "A high retrograde count asks for more review than acceleration. Choose fewer commitments, clearer language, and a pace that leaves room to correct course."
};

const relationshipContexts = {
  friendship: "In a friendship, this contact matters most in how you show up repeatedly: who checks in, who makes room, and how each person handles difference without making it a loyalty test.",
  "close-friendship": "In a close friendship, the contact can become part of the bond's daily rhythm. Name the pattern kindly before it turns into an unspoken rule.",
  "creative-collaboration": "In a creative collaboration, the contact shows how ideas become action. Protect the work by naming roles, pace, and the kind of feedback each person can actually use.",
  "work-collaboration": "In a work context, the contact shows how responsibility, timing, and decisions move between people. Keep agreements specific so the dynamic can stay useful.",
  "family-member": "In family, the contact can carry older habits. Notice what belongs to the present conversation and what belongs to a role everyone learned long ago.",
  sibling: "With siblings, the contact can show familiar reflexes around comparison, loyalty, humor, or defense. Leave room for each person to be different now.",
  parent: "With a parent, the contact can highlight protection, authority, care, or old expectations. Work with the present relationship instead of only the inherited script.",
  child: "With a child, the contact asks for care without projection. Support the pattern you can see while leaving room for their own timing.",
  "romantic-partner": "In a romantic relationship, this contact shows how closeness, desire, care, and difference are handled. Let affection stay specific instead of turning chemistry into a role.",
  "romantic-situationship": "In an undefined romantic context, the contact can intensify what has not been named. The kind move is clarity: say what is real, what is available, and what is not.",
  "romantic-ex": "With an ex, the contact may describe why the pattern still has emotional charge. Do not confuse recognition with a requirement to return.",
  "client-practitioner": "In a client or practitioner relationship, the contact needs clean boundaries. Keep the care, insight, and timing connected to the actual agreement."
};

const supportedSamePlanetRelationshipContexts = {
  friend: "In a friendship, use this same-planet contact to describe a pattern both people may recognize and reinforce. Keep the copy mutual, practical, and specific to ordinary care, timing, trust, and repair.",
  acquaintance: "With an acquaintance, keep the same-planet contact light. Name the shared pattern without implying intimacy, fate, or a bond that has not been lived.",
  "romantic-partner": "In an explicit romantic partnership, same-planet copy may describe closeness, attraction, care, and difference, but it still has to name behavior rather than assume chemistry explains everything.",
  "romantic-partner-ex": "With an ex, same-planet copy may describe why a pattern still feels recognizable. Do not suggest returning, destiny, or unfinished obligation.",
  "romantic-situationship": "In an undefined romantic context, same-planet copy may name ambiguity and timing, but it must not promise commitment or treat uncertainty as proof of depth.",
  family: "In family, same-planet copy should separate present behavior from inherited roles. Name the shared pattern without making old loyalty rules the whole story.",
  "family-sibling": "With siblings, same-planet copy can name comparison, humor, loyalty, timing, or defense. Keep the focus on what can be handled differently now.",
  "teacher-mentor": "In a teacher or mentor context, same-planet copy should protect role clarity. Name recognition and learning without turning guidance into emotional obligation.",
  "employer-manager": "In an employer or manager context, same-planet copy should stay grounded in role, feedback, expectations, timing, and responsibility.",
  coworker: "With a coworker, same-planet copy should describe how work style, pressure, decisions, or communication repeat between people. Keep agreements specific.",
  "neighbor-roommate": "With a neighbor or roommate, same-planet copy should translate the pattern into space, boundaries, routines, maintenance, and practical consideration.",
  business: "In a business context, same-planet copy should describe trust, execution, risk, standards, and decision-making without implying personal intimacy."
};

const samePlanetMeaning = {
  sun: "recognition, confidence, leadership, and the need to take up room",
  moon: "care, mood, comfort, and emotional timing",
  mercury: "thinking, language, curiosity, and the way decisions get named",
  venus: "preference, pleasure, value, ease, and what makes time together worthwhile",
  mars: "pace, action, conflict, courage, and how effort moves",
  jupiter: "confidence, opportunity, belief, risk, and the wider plan",
  saturn: "pressure, duty, timing, standards, and earned trust",
  uranus: "change, difference, freedom, disruption, and the rules that no longer fit",
  neptune: "longing, imagination, uncertainty, ideals, and what needs clearer edges",
  pluto: "pressure, power, control, survival, and what cannot be ignored"
};

function samePlanetAspectFamily(aspect) {
  if (aspect === "square" || aspect === "opposition") return "challenging";
  if (aspect === "trine" || aspect === "sextile") return "supportive";
  return aspect;
}

function samePlanetAspectInstruction(aspectOrFamily) {
  if (aspectOrFamily === "conjunction") {
    return "The conjunction concentrates the same planet pattern, so the copy should describe recognition, support, the difficult side they may reinforce, and one practical way to work with it.";
  }

  if (aspectOrFamily === "supportive" || aspectOrFamily === "trine" || aspectOrFamily === "sextile") {
    return "The supportive contact can make the same planet pattern easier to use, but the copy should still name how the relationship turns recognition into a real action.";
  }

  if (aspectOrFamily === "challenging" || aspectOrFamily === "square" || aspectOrFamily === "opposition") {
    return "The challenging contact can make the same planet pattern more obvious through tension, so the copy should describe the repeated pressure and a specific repair.";
  }

  return "Describe the mutual same-planet pattern, how it supports the relationship, what difficulty it can reinforce, and one concrete way to work with it.";
}

function samePlanetGenerationalNote(planet) {
  void planet;
  return "";
}

const prioritizedSamePlanetContexts = ["friend", "romantic-partner", "romantic-partner-ex", "family-sibling", "coworker", "business"];
const prioritizedSamePlanetPlanets = ["sun", "moon", "mercury", "venus", "mars", "saturn"];
const prioritizedSamePlanetFamilies = ["conjunction", "supportive", "challenging"];

function samePlanetContextLine(context) {
  const lines = {
    friend: "In a friendship, this is about a pattern both people can notice without making it a loyalty test.",
    "romantic-partner": "In a romantic relationship, affection needs room for difference instead of becoming proof that both people should want the same thing.",
    "romantic-partner-ex": "With an ex, recognition can be real without becoming a reason to repeat the old pattern.",
    "family-sibling": "With siblings, the old role can get loud quickly, so the present conversation needs to stay separate from comparison.",
    coworker: "At work, the pattern needs plain expectations and enough room for both people to act without turning the task into a contest.",
    business: "In business, shared instinct has to become a decision both people can check and carry."
  };

  return lines[context] ?? "The relationship context should shape how both people recognize and handle the pattern.";
}

function samePlanetAspectBehavior(family) {
  if (family === "conjunction") {
    return "The conjunction concentrates the pattern, so both people may recognize themselves in the other and then accidentally make the same reflex louder.";
  }

  if (family === "supportive") {
    return "The supportive contact makes cooperation easier, but both people still have to turn the ease into a clear choice.";
  }

  return "The challenging contact shows the pattern through tension: both people may care about the same issue while trying to solve it in different ways.";
}

function samePlanetSubjectSentence(planet) {
  const sentences = {
    sun: "The shared Sun topic is visibility, confidence, leadership, and who gets to take up room.",
    moon: "The shared Moon topic is care, mood, comfort, and how quickly feelings shape the room.",
    mercury: "The shared Mercury topic is conversation, decisions, interruptions, and the route to the point.",
    venus: "The shared Venus topic is affection, taste, money, pleasure, and how care becomes recognizable.",
    mars: "The shared Mars topic is action, speed, conflict, courage, and who sets the pace.",
    saturn: "The shared Saturn topic is standards, promises, hesitation, pressure, and what has to be carried."
  };

  return sentences[planet] ?? `The shared ${titleCase(planet)} topic should become behavior both people can recognize.`;
}

function samePlanetContextAspectCopy(context, planet, family) {
  const exact = {
    "friend/saturn/conjunction": "Both people may take promises seriously, even when the promise is small. That can make the friendship steady: each person understands why follow-through matters. The edge is that a simple plan can become heavier than it needs to be, or both people hesitate over the same risk until nobody moves. Let structure help the friendship breathe; keep the agreement clear, then let it be enough.",
    "romantic-partner/venus/challenging": "Both people may care about each other and still recognize care through different actions. One may want more shared time, softness, or reassurance while the other needs more space, directness, or practical proof. The tension is not a lack of affection; it is affection asking to be translated. Say what makes each person feel chosen before resentment turns the mismatch into a scorecard.",
    "romantic-partner-ex/venus/challenging": "Both people may still remember what felt sweet, and also why sweetness was not enough. The mismatch may have lived in timing, money, attention, or the way each person tried to repair discomfort. The tension keeps the old preference visible without making it a reason to return. Let recognition tell the truth about the pattern, not rewrite the ending.",
    "family-sibling/mercury/challenging": "Both people may want to be understood, but the conversation can quickly turn into correction. One explains, the other counters, and the old sibling role starts speaking louder than the actual point. The tension asks for a pause before tone becomes the whole argument. Repeat what was heard before defending what was meant.",
    "coworker/mars/challenging": "Both people may want the work to move, but not from the same starting line. One begins before the plan is settled while the other pushes back until the method is clear. The tension can turn the task into a contest over who gets to set the pace. Name the next move and the reason for it before effort becomes resistance.",
    "business/jupiter/supportive": "Both people may find it easy to believe a plan can grow. That helps the business relationship when optimism is tied to a real offer, a clear audience, and numbers both people can check. The supportive contact opens the door, but it still needs a decision about scope. Let the bigger vision earn trust through the next practical step."
  };
  const exactCopy = exact[`${context}/${planet}/${family}`];

  if (exactCopy) {
    return exactCopy;
  }

  return [
    samePlanetSubjectSentence(planet),
    samePlanetAspectBehavior(family),
    samePlanetContextLine(context),
    "The copy should name what both people may do in an ordinary moment, what helps, and what pattern needs care."
  ].join(" ");
}

const samePlanetExactAspectRows = [
  {
    context: "romantic-partner",
    planet: "venus",
    aspect: "square",
    text: "Both people may care about each other and still recognize care through different actions. One may want more shared time, softness, or reassurance while the other needs more space, directness, or practical proof. The square is not a lack of affection; it is the moment affection asks to be translated. Say what makes each person feel chosen before resentment turns the mismatch into a scorecard."
  },
  {
    context: "romantic-partner-ex",
    planet: "venus",
    aspect: "square",
    text: "Both people may still remember what felt sweet, and also why sweetness was not enough. The mismatch may have lived in timing, money, attention, or the way each person tried to repair discomfort. The square keeps the old preference visible without making it a reason to return. Let recognition tell the truth about the pattern, not rewrite the ending."
  },
  {
    context: "family-sibling",
    planet: "mercury",
    aspect: "square",
    text: "Both people may want to be understood, but the conversation can quickly turn into correction. One explains, the other counters, and the old sibling role starts speaking louder than the actual point. The square asks for a pause before tone becomes the whole argument. Repeat what was heard before defending what was meant."
  },
  {
    context: "coworker",
    planet: "mars",
    aspect: "opposition",
    text: "Both people may want the work to move, but not from the same starting line. One begins before the plan is settled while the other pushes back until the method is clear. The opposition can turn the task into a contest over who gets to set the pace. Name the next move and the reason for it before effort becomes resistance."
  },
  {
    context: "business",
    planet: "jupiter",
    aspect: "trine",
    text: "Both people may find it easy to believe a plan can grow. That helps the business relationship when optimism is tied to a real offer, a clear audience, and numbers both people can check. The trine opens the door, but it still needs a decision about scope. Let the bigger vision earn trust through the next practical step."
  },
  {
    context: "friend",
    planet: "neptune",
    aspect: "conjunction",
    text: "Both people may share a soft spot for what could be better, kinder, or more meaningful. In friendship, that can make space for compassion without needing every feeling explained right away. The conjunction can also blur what was promised, assumed, or left unsaid. Keep the tenderness, and put the plan in clear words when the friendship needs something concrete."
  }
];

function createCurrentSkyAspectRows() {
  return aspects.flatMap((aspect) =>
    surfaceTiers.map((tier) =>
      row({
        canonicalKey: `fallback-hook/sky.aspect-detail/${tier}/${aspect}`,
        family: "current_sky_aspect",
        surfaceTier: tier,
        scope: { aspect, surface: "sky", direction: "current-sky" },
        text: sentenceForTier(tier, aspectCopy[aspect]),
        aspect
      })
    )
  );
}

function createTransitRows() {
  return Object.entries(transitRows).map(([phase, text]) =>
    row({
      canonicalKey: `fallback-hook/you.transit-to-natal/${phase}`,
      family: "transit_to_natal_aspect",
      surfaceTier: phase.includes("birth-time") ? "expanded" : "feed",
      scope: { timing: phase, requiresReliableBirthTimeForHouse: phase === "reliable-birth-time" },
      text,
      aspect: "transit"
    })
  );
}

function createIngressRows() {
  return Object.entries(ingressCopy).flatMap(([familyKey, text]) => {
    const baseFamily = familyKey.startsWith("personalized") ? "personalized_ingress" : "planetary_ingress";
    return surfaceTiers.map((tier) =>
      row({
        canonicalKey: `fallback-hook/${baseFamily === "personalized_ingress" ? "you.daily-timing" : "sky.planetary-placement"}/${tier}/${familyKey}`,
        family: baseFamily,
        surfaceTier: tier,
        scope: { ingressFamily: familyKey, personalized: baseFamily === "personalized_ingress" },
        text: tier === "tooltip" ? text.split(".")[0] + "." : text,
        planet: familyKey.replace("-ingress", "").replace("personalized-", "")
      })
    );
  });
}

function createRetrogradeRows() {
  const phaseRows = Object.entries(retrogradePhaseCopy).map(([phase, text]) =>
    row({
      canonicalKey: `fallback-hook/sky.retrograde/phase/${phase}`,
      family: "retrograde_phase",
      surfaceTier: "feed",
      scope: { retrogradePhase: phase },
      text,
      retrogradePhase: phase
    })
  );

  const planetRows = Object.entries(retrogradePlanetCopy).map(([planet, text]) =>
    row({
      canonicalKey: `fallback-hook/sky.retrograde/planet/${planet}`,
      family: "planet_specific_retrograde",
      surfaceTier: "feed",
      scope: { planet },
      text,
      planet
    })
  );

  const multipleRows = Object.entries(multiRetrogradeCopy).map(([kind, text]) =>
    row({
      canonicalKey: `fallback-hook/sky.retrograde-section/${kind}`,
      family: "multiple_retrogrades",
      surfaceTier: "feed",
      scope: { retrogradeCluster: kind },
      text,
      retrogradePhase: kind
    })
  );

  return [...phaseRows, ...planetRows, ...multipleRows];
}

function createSynastryRows() {
  const aspectRows = aspects.flatMap((aspect) => {
    const directionalA = row({
      canonicalKey: `fallback-hook/friends.synastry-contact/directional/their-planet-your-planet/${aspect}`,
      family: "synastry",
      surfaceTier: "feed",
      scope: { aspect, direction: "their-planet-to-your-planet" },
      text: `Their planet ${aspect} your planet describes how their expression meets your response. Describe what they tend to stir in you, what the contact can support, and where the pattern needs care.`,
      aspect
    });
    const directionalB = row({
      canonicalKey: `fallback-hook/friends.synastry-contact/directional/your-planet-their-planet/${aspect}`,
      family: "synastry",
      surfaceTier: "feed",
      scope: { aspect, direction: "your-planet-to-their-planet" },
      text: `Your planet ${aspect} their planet describes how your expression meets their response. Preserve the direction so the copy does not pretend both people are doing the same job.`,
      aspect
    });
    return [directionalA, directionalB];
  });

  const samePlanetPlanetRows = planets.map((planet) =>
    row({
      canonicalKey: `fallback-hook/friends.same-planet/${planet}`,
      family: "synastry_same_planet",
      surfaceTier: "feed",
      scope: { planet, mutual: true, samePlanet: true },
      text: `When both charts meet through ${titleCase(planet)}, describe the shared pattern around ${samePlanetMeaning[planet]}. Show what both people may recognize, how it can support the relationship, how they may reinforce the difficult side, and one practical way to work with it.${samePlanetGenerationalNote(planet)}`,
      planet
    })
  );

  const samePlanetAspectRows = planets.flatMap((planet) => {
    const directAspectRows = aspects.map((aspect) =>
      row({
        canonicalKey: `fallback-hook/friends.same-planet/${planet}/${aspect}`,
        family: "synastry_same_planet",
        surfaceTier: "feed",
        scope: { aspect, aspectFamily: samePlanetAspectFamily(aspect), planet, mutual: true, samePlanet: true },
        text: `For ${titleCase(planet)} ${aspect} ${titleCase(planet)}, keep the interpretation symmetric and name what both people recognize. ${samePlanetAspectInstruction(aspect)} Use lived behavior around ${samePlanetMeaning[planet]} instead of a keyword mirror.${samePlanetGenerationalNote(planet)}`,
        planet,
        aspect
      })
    );
    const familyRows = Array.from(new Set(aspects.map(samePlanetAspectFamily))).filter((family) => family !== "conjunction").map((family) =>
      row({
        canonicalKey: `fallback-hook/friends.same-planet/${planet}/${family}`,
        family: "synastry_same_planet",
        surfaceTier: "feed",
        scope: { aspectFamily: family, planet, mutual: true, samePlanet: true },
        text: `For the ${titleCase(planet)} ${family} same-planet family, write mutual copy that names what both people recognize. ${samePlanetAspectInstruction(family)} Translate ${samePlanetMeaning[planet]} into relationship behavior, support, risk, and repair.${samePlanetGenerationalNote(planet)}`,
        planet,
        aspect: family
      })
    );

    return [...directAspectRows, ...familyRows];
  });

  const samePlanetContextRows = Object.entries(supportedSamePlanetRelationshipContexts).flatMap(([context, contextInstruction]) =>
    planets.map((planet) =>
      row({
        canonicalKey: `fallback-hook/friends.same-planet/context/${context}/${planet}`,
        family: "synastry_same_planet",
        surfaceTier: "feed",
        scope: { relationshipContext: context, planet, mutual: true, samePlanet: true, aspectNeutral: true },
        text: `${contextInstruction} For ${titleCase(planet)}, translate ${samePlanetMeaning[planet]} into what both people may recognize, support, reinforce, and repair.${samePlanetGenerationalNote(planet)}`,
        planet,
        relationshipContext: context
      })
    )
  );

  const samePlanetContextAspectFamilyRows = prioritizedSamePlanetContexts.flatMap((context) =>
    prioritizedSamePlanetPlanets.flatMap((planet) =>
      prioritizedSamePlanetFamilies.map((family) =>
        row({
          canonicalKey: `fallback-hook/friends.same-planet/context/${context}/${planet}/${family}`,
          family: "synastry_same_planet",
          surfaceTier: "feed",
          scope: { relationshipContext: context, planet, aspectFamily: family, mutual: true, samePlanet: true, aspectPreserved: true },
          text: samePlanetContextAspectCopy(context, planet, family),
          planet,
          aspect: family,
          relationshipContext: context
        })
      )
    )
  );

  const samePlanetContextExactAspectRows = samePlanetExactAspectRows.map((item) =>
    row({
      canonicalKey: `fallback-hook/friends.same-planet/context/${item.context}/${item.planet}/${item.aspect}`,
      family: "synastry_same_planet",
      surfaceTier: "feed",
      scope: {
        relationshipContext: item.context,
        planet: item.planet,
        aspect: item.aspect,
        aspectFamily: samePlanetAspectFamily(item.aspect),
        mutual: true,
        samePlanet: true,
        aspectPreserved: true
      },
      text: item.text,
      planet: item.planet,
      aspect: item.aspect,
      relationshipContext: item.context
    })
  );

  const contextRows = Object.entries(relationshipContexts).map(([context, text]) =>
    row({
      canonicalKey: `fallback-hook/friends.synastry-contact/context/${context}`,
      family: "synastry_relationship_context",
      surfaceTier: "feed",
      scope: { relationshipContext: context },
      text,
      relationshipContext: context
    })
  );

  const houseRows = [
    {
      key: "their-planet-in-your-house/reliable-receiver-time",
      scope: { direction: "their-planet-in-your-house", requiresReliableBirthTimeOf: "you" },
      text: "Their planet in your house describes where you receive the contact. Use the house only when your birth time is reliable; then describe the concrete area of life where their presence lands."
    },
    {
      key: "your-planet-in-their-house/reliable-receiver-time",
      scope: { direction: "your-planet-in-their-house", requiresReliableBirthTimeOf: "them" },
      text: "Your planet in their house describes where they receive the contact. Use the house only when their birth time is reliable; then describe the concrete area of life where your presence lands."
    },
    {
      key: "unknown-receiver-time",
      scope: { direction: "house-overlay", requiresReliableBirthTimeOf: "receiver", birthTimeUnknownFallback: true },
      text: "If the receiving chart does not have reliable birth time, do not guess the house overlay. Use the planet-to-planet or sign-level contact instead and state the limit cleanly."
    }
  ].map((item) =>
    row({
      canonicalKey: `fallback-hook/friends.house-overlay/${item.key}`,
      family: "synastry_house_overlay",
      surfaceTier: "feed",
      scope: item.scope,
      text: item.text
    })
  );

  return [
    ...aspectRows,
    ...samePlanetPlanetRows,
    ...samePlanetAspectRows,
    ...samePlanetContextRows,
    ...samePlanetContextAspectFamilyRows,
    ...samePlanetContextExactAspectRows,
    ...contextRows,
    ...houseRows
  ];
}

function createShortFactualRows() {
  const rows = {
    current_sky_aspect: "Current-sky aspect data is available, but no approved interpretation row is ready. Show the planets, aspect, orb, and timing without adding meaning.",
    transit_to_natal_aspect: "Transit data is available, but no approved interpretation row is ready. Show the transiting planet, natal point, aspect, orb, and timing only.",
    planetary_ingress: "Ingress data is available, but no approved interpretation row is ready. Show the planet, sign, date, and duration only.",
    personalized_ingress: "Personalized ingress data is available, but no approved interpretation row is ready. Show the planet, sign, and reliable house only when birth time supports it.",
    retrograde_phase: "Retrograde phase data is available, but no approved interpretation row is ready. Show the planet, phase, dates, and status only.",
    planet_specific_retrograde: "Planet retrograde data is available, but no approved interpretation row is ready. Show the planet, sign, phase, dates, and status only.",
    multiple_retrogrades: "Multiple retrogrades are active, but no approved interpretation row is ready. Show the count and planet list only.",
    synastry: "Synastry contact data is available, but no approved interpretation row is ready. Show the two chart factors, aspect, and orb only.",
    synastry_same_planet: "Same-planet synastry data is available, but no approved interpretation row is ready. Show the shared planet, aspect, orb, and relationship context only.",
    synastry_relationship_context: "Relationship context is available, but no approved interpretation row is ready. Show the selected relationship type as a fact only.",
    synastry_house_overlay: "House overlay data is available, but no approved interpretation row is ready. Show the overlay only when the receiving chart has reliable birth time.",
    short_factual_emergency: "No approved fallback copy is ready. Show verified facts only and leave interpretation blank."
  };

  return Object.entries(rows).map(([family, text]) =>
    row({
      canonicalKey: `fallback-hook/emergency/${family}`,
      family: "short_factual_emergency",
      surfaceTier: "card",
      scope: { emergencyFallbackFor: family, factsOnly: true },
      text,
      mappingAction: "NEW_CANONICAL_KEY"
    })
  );
}

function createReferenceRows() {
  return [
    row({
      canonicalKey: "reference/authored-fallback/aspect-behavior-rule",
      family: "short_factual_emergency",
      surfaceTier: "generation",
      scope: { referenceOnly: true },
      text: "Aspect fallback generation must translate the contact into behavior, consequence, useful action, and timing when available. It must not publish doctrine as reader copy.",
      lane: "reference",
      reviewState: "reference-only-never-serve",
      mappingAction: "REFERENCE_ONLY"
    }),
    row({
      canonicalKey: "reference/authored-fallback/retrograde-safety-rule",
      family: "short_factual_emergency",
      surfaceTier: "generation",
      scope: { referenceOnly: true },
      text: "Retrograde fallback generation must describe review, return, correction, station, and integration without predicting disasters or banning ordinary choices.",
      lane: "reference",
      reviewState: "reference-only-never-serve",
      mappingAction: "REFERENCE_ONLY"
    }),
    row({
      canonicalKey: "reference/authored-fallback/house-overlay-time-rule",
      family: "synastry_house_overlay",
      surfaceTier: "generation",
      scope: { referenceOnly: true, requiresReliableBirthTimeOf: "receiver" },
      text: "House overlay generation requires reliable birth time for the receiving chart. If the receiver time is unknown, the fallback must use non-house synastry facts.",
      lane: "reference",
      reviewState: "reference-only-never-serve",
      mappingAction: "REFERENCE_ONLY"
    })
  ];
}

export function createFallbackRows() {
  const rows = [
    ...createCurrentSkyAspectRows(),
    ...createTransitRows(),
    ...createIngressRows(),
    ...createRetrogradeRows(),
    ...createSynastryRows(),
    ...createShortFactualRows(),
    ...createReferenceRows()
  ];

  const seen = new Set();
  for (const item of rows) {
    if (seen.has(item.canonical_key)) {
      throw new Error(`Duplicate fallback key: ${item.canonical_key}`);
    }
    seen.add(item.canonical_key);
  }

  return rows;
}

function escapeCsv(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(",")];
  for (const item of rows) {
    lines.push(columns.map((column) => escapeCsv(item[column])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function sqlString(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function sqlTextArray(values) {
  if (!values?.length) return "array[]::text[]";
  return `array[${values.map(sqlString).join(", ")}]::text[]`;
}

function generatedRowFor(rowData) {
  const surface = surfaceForFamily(rowData.content_family);
  return {
    content_key: rowData.canonical_key,
    surface,
    mode: modeForTier(rowData.surface_tier),
    status: rowData.status,
    lane: rowData.lane,
    review_state: rowData.review_state,
    event_type: rowData.content_family,
    target_date: null,
    facts: {
      authoredFallback: {
        importBatchId,
        incomingSource: rowData.incoming_source,
        contentFamily: rowData.content_family,
        surfaceTier: rowData.surface_tier,
        scope: JSON.parse(rowData.scope),
        mappingAction: rowData.mapping_action,
        existingCanonicalMatch: rowData.existing_canonical_match,
        servingRule: "Reader-facing rows require LIVE + lane=serving + review_state IS NULL. These dry-run rows stay DRAFT with editorial review required."
      }
    },
    knowledge_ids: [rowData.existing_canonical_match || rowData.canonical_key].filter(Boolean),
    source_snapshot: {
      source: rowData.incoming_source,
      provenance: rowData.provenance,
      canonicalKey: rowData.canonical_key,
      importBatchId
    },
    prompt_version: "authored-fallback-v1-dry-run",
    provider: "manual",
    model: "codex-materialized-authored-fallbacks",
    headline: titleCase(rowData.content_family),
    summary: `${rowData.content_family} / ${rowData.surface_tier}`,
    body: rowData.text,
    sections: [],
    block_type: null,
    reviewer_notes: `Dry-run authored fallback row. Mapping: ${rowData.mapping_action}. Existing runtime hook: ${rowData.existing_canonical_match || "none"}. Editorial review is required before publication.`,
    flags: ["EDITORIAL_REVIEW_REQUIRED"]
  };
}

function insertValue(row) {
  return `  (
    ${sqlString(row.content_key)},
    ${sqlString(row.surface)},
    ${sqlString(row.mode)},
    ${sqlString(row.status)},
    ${sqlString(row.lane)},
    ${sqlString(row.review_state)},
    ${sqlString(row.event_type)},
    null,
    ${sqlJson(row.facts)},
    ${sqlTextArray(row.knowledge_ids)},
    ${sqlJson(row.source_snapshot)},
    ${sqlString(row.prompt_version)},
    ${sqlString(row.provider)},
    ${sqlString(row.model)},
    ${sqlString(row.headline)},
    ${sqlString(row.summary)},
    ${sqlString(row.body)},
    ${sqlJson(row.sections)},
    ${sqlString(row.block_type)},
    ${sqlString(row.reviewer_notes)},
    ${sqlTextArray(row.flags)}
  )`;
}

function writeDryRunSql(rows, outDir) {
  const servingRows = rows.filter((item) => item.lane === "serving").map(generatedRowFor);
  const columns = [
    "content_key",
    "surface",
    "mode",
    "status",
    "lane",
    "review_state",
    "event_type",
    "target_date",
    "facts",
    "knowledge_ids",
    "source_snapshot",
    "prompt_version",
    "provider",
    "model",
    "headline",
    "summary",
    "body",
    "sections",
    "block_type",
    "reviewer_notes",
    "flags"
  ];

  const chunks = [];
  for (let index = 0; index < servingRows.length; index += 100) {
    const batch = servingRows.slice(index, index + 100);
    chunks.push(`insert into public.generated_interpretations (${columns.join(", ")})\nvalues\n${batch.map(insertValue).join(",\n")}\non conflict (content_key, target_date, mode) do nothing;`);
  }

  const sql = [
    "-- TLDR Astro Authored Fallback Rows Dry-Run SQL.",
    "-- Generated by scripts/materialize-authored-fallback-rows.mjs.",
    "-- Mode: DRY RUN. Codex did not execute this SQL.",
    "-- No row is promoted to LIVE.",
    "-- Existing rows are protected by ON CONFLICT DO NOTHING.",
    "-- Reference-lane rows are intentionally excluded from generated_interpretations inserts.",
    `-- Import batch: ${importBatchId}`,
    "",
    "begin;",
    "",
    chunks.join("\n\n"),
    "",
    "rollback;",
    "",
    "-- To apply after editorial review, run this SQL manually with approved changes only."
  ].join("\n");

  fs.writeFileSync(path.join(outDir, "tldr-astro-fallback-dry-run.sql"), `${sql}\n`);
}

function countBy(rows, keyFn) {
  return rows.reduce((acc, item) => {
    const key = keyFn(item) || "(blank)";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function formatCounts(counts) {
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join("\n");
}

function writeReport(rows, outDir, conflicts, unmapped) {
  const familyCounts = countBy(rows, (item) => item.content_family);
  const tierCounts = countBy(rows, (item) => item.surface_tier);
  const planetCounts = countBy(rows.filter((item) => item.planet), (item) => item.planet);
  const aspectCounts = countBy(rows.filter((item) => item.aspect), (item) => item.aspect);
  const retroCounts = countBy(rows.filter((item) => item.retrograde_phase), (item) => item.retrograde_phase);
  const contextCounts = countBy(rows.filter((item) => item.relationship_context), (item) => item.relationship_context);
  const statusCounts = countBy(rows, (item) => item.status);
  const laneCounts = countBy(rows, (item) => item.lane);
  const actionCounts = countBy(rows, (item) => item.mapping_action);

  const report = [
    "# TLDR Astro Authored Fallback Import Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Import batch: ${importBatchId}`,
    "",
    "## Safety Summary",
    "",
    "- Dry run only. No SQL was executed.",
    "- No row is set to LIVE.",
    "- Reader-facing rows are DRAFT with `lane=serving` and `review_state=editorial-review-required`.",
    "- Reference rows remain `lane=reference` and are excluded from generated_interpretations SQL.",
    "- Existing rows are protected by `on conflict (content_key, target_date, mode) do nothing`.",
    "- No blanket `store/` prefix is used.",
    "",
    "## Totals",
    "",
    `- Rows: ${rows.length}`,
    `- Serving dry-run inserts: ${rows.filter((item) => item.lane === "serving").length}`,
    `- Reference-only rows: ${rows.filter((item) => item.lane === "reference").length}`,
    `- Conflicts: ${conflicts.length}`,
    `- Unmapped: ${unmapped.length}`,
    "",
    "## Counts By Family",
    "",
    "| Family | Rows |",
    "| --- | ---: |",
    formatCounts(familyCounts),
    "",
    "## Counts By Surface Tier",
    "",
    "| Surface tier | Rows |",
    "| --- | ---: |",
    formatCounts(tierCounts),
    "",
    "## Counts By Planet",
    "",
    "| Planet | Rows |",
    "| --- | ---: |",
    formatCounts(planetCounts),
    "",
    "## Counts By Aspect",
    "",
    "| Aspect | Rows |",
    "| --- | ---: |",
    formatCounts(aspectCounts),
    "",
    "## Counts By Retrograde Phase",
    "",
    "| Phase | Rows |",
    "| --- | ---: |",
    formatCounts(retroCounts),
    "",
    "## Counts By Relationship Context",
    "",
    "| Context | Rows |",
    "| --- | ---: |",
    formatCounts(contextCounts),
    "",
    "## Counts By Status",
    "",
    "| Status | Rows |",
    "| --- | ---: |",
    formatCounts(statusCounts),
    "",
    "## Counts By Lane",
    "",
    "| Lane | Rows |",
    "| --- | ---: |",
    formatCounts(laneCounts),
    "",
    "## Counts By Mapping Action",
    "",
    "| Action | Rows |",
    "| --- | ---: |",
    formatCounts(actionCounts),
    "",
    "## Verification Notes",
    "",
    "- Aspect rows describe recognizable behavior instead of aspect doctrine.",
    "- Ingress rows describe changes in pace, attention, choices, or ordinary response.",
    "- Retrograde rows describe review, correction, station, and integration without disaster predictions.",
    "- Romantic language is isolated to romantic relationship contexts.",
    "- Synastry directional rows preserve whose planet contacts whose chart.",
    "- Same-planet synastry rows are marked mutual.",
    "- House-overlay rows require reliable birth time for the receiving chart.",
    "- Emergency rows are facts-only fallbacks.",
    ""
  ].join("\n");

  fs.writeFileSync(path.join(outDir, "tldr-astro-fallback-import-report.md"), report);
}

export function writeArtifacts(outDir = defaultOutDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const rows = createFallbackRows();
  const conflicts = [];
  const unmapped = [];
  const columns = [
    "incoming_source",
    "canonical_key",
    "existing_canonical_match",
    "content_family",
    "surface_tier",
    "scope",
    "status",
    "lane",
    "review_state",
    "provenance",
    "text",
    "mapping_action",
    "planet",
    "aspect",
    "retrograde_phase",
    "relationship_context"
  ];

  fs.writeFileSync(path.join(outDir, "tldr-astro-fallback-rows.json"), `${JSON.stringify(rows, null, 2)}\n`);
  writeCsv(path.join(outDir, "tldr-astro-fallback-rows.csv"), rows, columns);
  writeCsv(path.join(outDir, "tldr-astro-fallback-key-map.csv"), rows, [
    "incoming_source",
    "canonical_key",
    "existing_canonical_match",
    "content_family",
    "surface_tier",
    "mapping_action"
  ]);
  writeCsv(path.join(outDir, "tldr-astro-fallback-conflicts.csv"), conflicts, [
    "canonical_key",
    "existing_canonical_match",
    "content_family",
    "reason"
  ]);
  writeCsv(path.join(outDir, "tldr-astro-fallback-unmapped.csv"), unmapped, [
    "incoming_source",
    "canonical_key",
    "content_family",
    "reason"
  ]);
  writeDryRunSql(rows, outDir);
  writeReport(rows, outDir, conflicts, unmapped);

  return { outDir, rows, conflicts, unmapped };
}

function parseArgs(argv) {
  const found = argv.find((arg) => arg.startsWith("--out-dir="));
  return { outDir: found ? found.slice("--out-dir=".length) : defaultOutDir };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { outDir } = parseArgs(process.argv.slice(2));
  const result = writeArtifacts(outDir);
  console.log(`Wrote ${result.rows.length} authored fallback rows to ${result.outDir}`);
}
