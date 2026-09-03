#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sourcePath = path.join(root, "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
const outPath = path.join(root, "packages/astro-knowledge/review/transit-aspect-friends-completion-v1.json");

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const sourceRows = Array.isArray(source.authoredCards) ? source.authoredCards : [];
const keys = sourceRows
  .map((row) => String(row.contentKey ?? ""))
  .filter((key) => key.startsWith("authored/transit-aspect/") && !key.startsWith("authored/transit-aspect/sun/"))
  .sort();

if (keys.length !== 351) {
  throw new Error(`Expected 351 non-Sun personal-transit keys, found ${keys.length}.`);
}

const aliasTarget = {
  a: "ascendant",
  c: "chiron",
  j: "jupiter",
  m: "mercury",
  s: "sun"
};

const label = {
  ascendant: "Ascendant",
  chiron: "Chiron",
  descendant: "Descendant",
  jupiter: "Jupiter",
  lilith: "Lilith",
  mars: "Mars",
  mercury: "Mercury",
  midheaven: "Midheaven",
  moon: "Moon",
  neptune: "Neptune",
  "nodal-axis": "nodal axis",
  "north-node": "North Node",
  pluto: "Pluto",
  saturn: "Saturn",
  "south-node": "South Node",
  sun: "Sun",
  uranus: "Uranus",
  venus: "Venus"
};

const planetLabel = {
  any: "This transit",
  chiron: "Chiron",
  jupiter: "Jupiter",
  mars: "Mars",
  mercury: "Mercury",
  moon: "Moon",
  neptune: "Neptune",
  "north-node": "the North Node",
  pluto: "Pluto",
  saturn: "Saturn",
  uranus: "Uranus",
  venus: "Venus"
};

const planetEffect = {
  any: "the immediate pressure of the transit",
  chiron: "an old sensitivity becoming easier to recognize",
  jupiter: "optimism, appetite, and the urge to make the situation larger",
  mars: "urgency, anger, effort, and the need to act",
  mercury: "messages, decisions, plans, and new information",
  moon: "mood, instinct, and immediate emotional needs",
  neptune: "sensitivity, uncertainty, imagination, and lower energy",
  "north-node": "an unfamiliar direction asking for a first attempt",
  pluto: "pressure, leverage, and the need to get underneath the stated issue",
  saturn: "limits, deadlines, responsibility, and consequence",
  uranus: "disruption, independence, and the need to change a stale pattern",
  venus: "money, pleasure, attraction, cooperation, and social response"
};

const planetOpeners = {
  any: [
    "Something becomes difficult for {{Name}} to keep postponing, and it lands directly on %DOMAIN%.",
    "A situation that had stayed in the background moves close enough for {{Name}} to deal with, especially around %DOMAIN%.",
    "The issue becomes specific enough for {{Name}} to respond to now, with %DOMAIN% carrying most of the consequence.",
    "What was easy to leave vague gets harder to ignore for {{Name}}, particularly where %DOMAIN% is concerned."
  ],
  chiron: [
    "A current moment may touch an older sensitivity for {{Name}}, especially around %DOMAIN%.",
    "Something ordinary can carry more history than expected for {{Name}} when it reaches %DOMAIN%.",
    "{{Name}} may recognize an old sore point inside a present-day situation involving %DOMAIN%.",
    "A comment, delay, or small change can make {{Name}} more aware of an older sensitivity tied to %DOMAIN%."
  ],
  jupiter: [
    "The larger option is easier for {{Name}} to imagine right now, especially around %DOMAIN%.",
    "An opening can make the whole situation look more promising to {{Name}}, with %DOMAIN% becoming the place where expansion is most tempting.",
    "{{Name}} may feel more willing to ask for more, spend more, or take a bigger chance where %DOMAIN% is concerned.",
    "Good news or a new possibility can widen {{Name}}'s expectations quickly, particularly around %DOMAIN%."
  ],
  mars: [
    "The part of the situation that requires action becomes harder for {{Name}} to ignore, especially around %DOMAIN%.",
    "{{Name}} may have less patience for delay once %DOMAIN% becomes the place where something has to move.",
    "Urgency rises around {{Name}} when %DOMAIN% stops being theoretical and starts requiring a response.",
    "A conflict, task, or physical demand can put {{Name}} in motion quickly, with %DOMAIN% carrying the immediate pressure."
  ],
  mercury: [
    "Messages and decisions move faster around {{Name}} under this transit, with %DOMAIN% becoming the part that needs an answer.",
    "Information arrives close to the decision point for {{Name}}, especially where %DOMAIN% is involved.",
    "A conversation can make something specific that had stayed vague for {{Name}}, and %DOMAIN% is where the consequences land.",
    "A call, email, correction, or blunt comment can change what {{Name}} needs to do next around %DOMAIN%."
  ],
  moon: [
    "A change in mood can make one part of the day feel much larger to {{Name}}, especially around %DOMAIN%.",
    "{{Name}} may react before they have explained the reaction to themselves, with %DOMAIN% carrying the emotional charge.",
    "Something small can reach {{Name}} quickly today because it touches an immediate need connected to %DOMAIN%.",
    "The emotional meaning of an ordinary event can rise fast for {{Name}}, particularly where %DOMAIN% is concerned."
  ],
  neptune: [
    "{{Name}} may have less certainty and less energy at the same time, which makes %DOMAIN% harder to read cleanly.",
    "A vague plan, strong feeling, or missing detail can matter more than expected for {{Name}} around %DOMAIN%.",
    "Sensitivity is turned up for {{Name}}, and %DOMAIN% may feel less definite than it usually does.",
    "The line between intuition, hope, and assumption gets thinner for {{Name}} where %DOMAIN% is concerned."
  ],
  "north-node": [
    "An unfamiliar option may ask more of {{Name}} than the familiar one, especially around %DOMAIN%.",
    "{{Name}} may be offered a next step that feels slightly ahead of their experience where %DOMAIN% is concerned.",
    "The new direction becomes concrete enough for {{Name}} to try, with %DOMAIN% carrying the stretch.",
    "A choice can put {{Name}} closer to an unfamiliar role or habit, particularly around %DOMAIN%."
  ],
  pluto: [
    "A situation around {{Name}} may reveal more leverage than anyone has been naming, especially around %DOMAIN%.",
    "The stated issue may not be the whole issue for {{Name}} once %DOMAIN% starts exposing the underlying pressure.",
    "Something that had been managed indirectly becomes harder for {{Name}} to keep managing that way, with %DOMAIN% showing where the power sits.",
    "Pressure can make the actual stakes clearer for {{Name}}, particularly where %DOMAIN% has been carrying an unresolved imbalance."
  ],
  saturn: [
    "A limit becomes concrete for {{Name}}, and %DOMAIN% is where the consequence is hardest to avoid.",
    "The unfinished or under-supported part of the situation becomes visible to {{Name}} through %DOMAIN%.",
    "Responsibility gets specific for {{Name}} now, especially where %DOMAIN% has depended on extra time, patience, or work.",
    "A deadline, refusal, or practical constraint can make {{Name}} deal with %DOMAIN% more directly than they planned."
  ],
  uranus: [
    "The original plan may stop fitting {{Name}} as neatly as it did, especially around %DOMAIN%.",
    "A disruption can show {{Name}} where %DOMAIN% has become too rigid or too dependent on one routine.",
    "{{Name}} may want more freedom from a pattern that has become stale, with %DOMAIN% making the need for change obvious.",
    "Something unexpected can force {{Name}} to improvise around %DOMAIN% instead of repeating the usual solution."
  ],
  venus: [
    "What feels good and what works in practice come closer together for {{Name}} around %DOMAIN%.",
    "Money, affection, or social ease can change the tone of the situation for {{Name}}, especially where %DOMAIN% is concerned.",
    "{{Name}} may notice what they actually value through an ordinary choice involving %DOMAIN%.",
    "An invitation, purchase, apology, or offer can make %DOMAIN% easier for {{Name}} to evaluate in concrete terms."
  ]
};

const target = {
  ascendant: {
    domain: "how they present themselves, enter situations, and respond first",
    scenes: [
      "A first meeting, photo, introduction, or quick exchange can make them unusually aware of how they are being received.",
      "Someone may react to their tone, pace, appearance, or confidence before there is time for a fuller explanation.",
      "A new setting can make the difference between their first instinct and their preferred response easier to notice.",
      "They may catch themselves changing how they speak or carry themselves because one person's reaction suddenly feels important."
    ],
    actions: [
      "does better when they let the first reaction settle before changing how they present themselves to everyone else",
      "gets more from showing up clearly than from trying to manage every impression in advance",
      "can treat the interaction as information without turning it into a verdict on how they should look, speak, or act",
      "benefits from answering the situation in front of them instead of rehearsing how they might be judged later"
    ]
  },
  chiron: {
    domain: "an old sensitivity, the memory attached to it, and the way they respond when it gets touched again",
    scenes: [
      "A joke, correction, delay, or careless comment can resemble something that used to hurt even when the current situation is smaller.",
      "They may notice the urge to protect the sore spot before deciding if the person in front of them is actually repeating the old pattern.",
      "An ordinary interaction can bring back a familiar reaction that makes more sense once they remember where they learned it.",
      "The useful clue is the part that feels older than the event itself, especially if the same reaction has shown up in very different situations."
    ],
    actions: [
      "benefits from separating the current event from the older history before deciding what response the present actually requires",
      "can acknowledge the sensitivity without giving it sole authority over the decision",
      "gets further by naming what was touched instead of demanding that the current moment explain every older hurt attached to it",
      "does better when they protect the sore spot without assuming that protection has to become withdrawal or retaliation"
    ]
  },
  descendant: {
    domain: "partnership, cooperation, and the terms they accept from other people",
    scenes: [
      "A partner, collaborator, client, or close friend may make an offer that changes what the relationship can do next.",
      "The important development may come through someone else's willingness to cooperate, introduce them, or share responsibility.",
      "A conversation about who does what can matter more than the chemistry or enthusiasm surrounding it.",
      "Another person's response can clarify which relationships actually make more possible and which ones only add another obligation."
    ],
    actions: [
      "gets more from agreements that make responsibility clearer instead of simply making the connection feel promising",
      "benefits from saying yes to cooperation that has usable terms and enough follow-through behind it",
      "does better when they judge the relationship by what both people can actually carry after the enthusiasm settles",
      "can let another person help without turning the arrangement into a vague promise that nobody knows how to maintain"
    ]
  },
  jupiter: {
    domain: "confidence, opportunity, risk, generosity, and the size of the promise they are willing to make",
    scenes: [
      "A bigger purchase, broader plan, generous offer, or ambitious promise can look easier to support than it will feel later.",
      "Good news may make one option look like proof that every related option should also be expanded.",
      "They may want to say yes before checking the budget, schedule, evidence, or number of people who will depend on that yes.",
      "An opportunity can be genuine and still come with more work, money, travel, or responsibility than the first conversation mentions."
    ],
    actions: [
      "benefits from checking the number, time, and obligation attached to the larger option before committing to it",
      "does better when they separate genuine opportunity from the part that only feels persuasive because it is bigger",
      "gets more from one supported expansion than from three promises competing for the same money and schedule",
      "can be generous without turning optimism into an obligation they will have to renegotiate later"
    ]
  },
  lilith: {
    domain: "the preference, anger, or non-negotiable they usually make easier for other people to ignore",
    scenes: [
      "A familiar compromise may start producing resentment faster than it used to, especially if they have been expected to stay agreeable about it.",
      "They may hear themselves say yes and immediately realize the yes was meant to prevent someone else's reaction rather than reflect what they want.",
      "A preference they stopped mentioning can become harder to dismiss once the same old expectation appears again.",
      "The strongest reaction may point to the place where they have been making themselves easier to accommodate instead of making the terms more honest."
    ],
    actions: [
      "benefits from naming the non-negotiable before resentment has to do all of the speaking for them",
      "does better when they distinguish a boundary from the urge to punish someone for crossing an old one",
      "can stop volunteering for the compromise that reliably leaves them angry afterward",
      "gets more from a clear refusal or preference than from another round of being agreeable and privately furious"
    ]
  },
  mars: {
    domain: "anger, initiative, desire, physical effort, and the way they handle conflict",
    scenes: [
      "A delay, demand, competition, or sharp tone can put them in action before they have decided which fight is worth having.",
      "The body may register the problem first through restlessness, tension, impatience, or the urge to do something immediately.",
      "A task can become easier once they start it, while an argument can become harder once they start it at full force.",
      "They may have enough energy to push through a difficult job and not enough patience to tolerate an unnecessary obstacle at the same time."
    ],
    actions: [
      "does better when they give the physical energy a job and keep the conflict focused on the actual objection",
      "benefits from acting on the part that is theirs without turning every delay into proof that someone is blocking them",
      "gets more from direct action than from collecting three unrelated grievances around the first irritation",
      "can use the extra force on the task itself and wait until the peak of the anger passes before making the larger decision"
    ]
  },
  mercury: {
    domain: "thinking, messages, conversations, paperwork, and decisions that depend on accurate information",
    scenes: [
      "An email gets reread, a conversation changes direction halfway through, or a decision becomes harder once another person adds new information.",
      "A small wording problem can create more work than the actual disagreement if everyone starts answering what they assumed was meant.",
      "The fact that changes the plan may arrive in a message, document, meeting, or correction that cannot be ignored once it is seen.",
      "They may know what they mean and still need to slow down enough to notice that the other person heard something different."
    ],
    actions: [
      "gets further by separating the fact that changed from the argument around it and replying to the part that actually needs an answer",
      "benefits from saying the important part clearly and leaving enough space for the other person to respond to that exact point",
      "does better when they check the document, date, number, or wording before building a larger conclusion on top of it",
      "can save time by correcting the misunderstanding early instead of winning an argument about a version nobody intended"
    ]
  },
  midheaven: {
    domain: "career, public responsibility, recognition, authority, and the work other people can actually see",
    scenes: [
      "A manager, client, audience, or decision-maker may respond to the result before they know how much work happened behind it.",
      "A title, assignment, review, deadline, or question of credit can make the public stakes of the work more obvious.",
      "They may be asked to take responsibility for something that brings visibility as well as more work.",
      "A professional disagreement can become easier to handle once they separate the quality of the work from the politics around who gets recognized for it."
    ],
    actions: [
      "benefits from making the work legible enough that the right person can evaluate what they actually did",
      "does better when added responsibility comes with clear authority, time, pay, or ownership instead of only a more impressive title",
      "gets more from a concrete result than from spending the same energy trying to manage everyone's opinion of the result",
      "can treat professional scrutiny as information about the work without turning it into a verdict on their worth"
    ]
  },
  moon: {
    domain: "emotional needs, home life, family demands, body rhythms, and the mood they bring into the next situation",
    scenes: [
      "A family need may arrive after a long workday, or one frustrating message can follow them into a part of the day that did not cause it.",
      "Sleep, food, privacy, noise, or another person's mood can matter more than expected because the body is already keeping score.",
      "They may understand the practical situation and still need time before their feelings catch up with what has changed.",
      "A small disappointment can feel like evidence about the whole week until a meal, walk, conversation, or night of sleep changes the scale again."
    ],
    actions: [
      "benefits from taking the mood seriously without treating it as the only evidence available",
      "does better when they name the need underneath the reaction before asking the nearest person to carry all of it",
      "gets more from protecting sleep, food, privacy, and recovery than from demanding a clean emotional answer on the hardest part of the day",
      "can let the feeling change the plan that needs changing without letting it rewrite progress that was still there before the mood shifted"
    ]
  },
  neptune: {
    domain: "idealization, uncertainty, sensitivity, imagination, fatigue, and the facts that are easiest to blur when they want an answer",
    scenes: [
      "A vague promise can sound complete because they want it to be complete, while one missing detail keeps the practical situation unresolved.",
      "Exhaustion may make any decisive answer feel more attractive than admitting they do not know yet.",
      "A strong feeling can contain useful information without proving every story attached to it.",
      "They may be more affected by music, sleep loss, alcohol, atmosphere, or another person's emotion than they realize in the moment."
    ],
    actions: [
      "benefits from postponing what can wait and checking the fact that matters most on what cannot",
      "does better when they reduce noise, substances, and unnecessary pressure before making the decision that will be hard to reverse",
      "gets more from giving uncertainty a little time than from forcing a clean answer because ambiguity feels uncomfortable",
      "can trust sensitivity as information while still checking the date, number, agreement, or evidence before acting on the larger story"
    ]
  },
  "nodal-axis": {
    domain: "the pull between a familiar pattern and a less familiar direction that requires conscious choice",
    scenes: [
      "The familiar role may be easier to perform because everyone already knows what to expect from them, while the newer option asks for skills they are still building.",
      "A choice can feel strangely weighted because one path offers immediate competence and the other offers development without the same reassurance.",
      "They may be praised for repeating something they already know how to do at the exact moment they are trying to move beyond it.",
      "The difficult part may be giving up some certainty before the unfamiliar direction has had enough time to become familiar."
    ],
    actions: [
      "benefits from keeping the useful skill from the familiar path without automatically giving that path the final decision",
      "does better when they choose the next experiment by what it can teach them rather than by which option makes them look most competent today",
      "gets more from one concrete step toward the unfamiliar direction than from another round of debating if they are ready for the whole future attached to it",
      "can respect what they already know without letting competence become the reason they never try the part they still need to learn"
    ]
  },
  "north-node": {
    domain: "an unfamiliar direction, role, or habit that asks them to develop something they cannot already do automatically",
    scenes: [
      "A new responsibility may feel like evidence that they are underqualified simply because they have not practiced this version of themselves yet.",
      "An introduction, assignment, class, or invitation can put them close to people who already seem comfortable doing what they are just beginning.",
      "They may want proof that the new direction will work before taking the first step that could produce the proof.",
      "The opportunity can be useful even if it does not feel natural yet, especially when the unfamiliarity is the main source of discomfort."
    ],
    actions: [
      "benefits from taking the first assignment seriously without demanding proof that they can already carry every later one",
      "does better when they judge the opportunity by what it lets them practice rather than by how comfortable they look on the first attempt",
      "gets more from one concrete step into the unfamiliar role than from waiting until the role stops feeling unfamiliar on its own",
      "can let experience build the confidence instead of making confidence a prerequisite for beginning"
    ]
  },
  pluto: {
    domain: "power, control, leverage, obsession, and the part of the situation that keeps producing consequences from underneath the stated issue",
    scenes: [
      "An ultimatum, hidden expense, private resentment, or question of access can reveal that the official explanation was only part of the problem.",
      "They may notice how much effort has been going into checking, managing, or controlling something that still does not feel safer.",
      "A disagreement can become more useful once everyone names what each person can actually withhold, approve, expose, or change.",
      "The pressure may show where an arrangement depends on one person having more information, money, authority, or emotional leverage than the others."
    ],
    actions: [
      "benefits from naming the actual leverage and the actual grievance instead of escalating the threat around both",
      "does better when they change the structure that keeps producing the problem rather than checking the same outcome for reassurance again",
      "gets more from putting the hidden term on the table than from trying to win a surface argument that leaves the power arrangement untouched",
      "can use influence to resolve the underlying problem without turning the solution into proof that they were the most powerful person involved"
    ]
  },
  saturn: {
    domain: "responsibility, deadlines, limits, authority, unfinished work, and the consequence that arrives when something cannot keep being covered",
    scenes: [
      "A deadline may expose three smaller tasks that were supposed to be finished first, or one person's cancellation can reveal how little backup the plan had.",
      "A refusal from an authority figure can be frustrating and still clarify the exact rule, requirement, or weakness that has to be dealt with.",
      "They may feel restricted because several ordinary obligations are open at once rather than because the larger goal is actually impossible.",
      "The tedious task can become the thing blocking the interesting task until someone finally finishes it."
    ],
    actions: [
      "benefits from completing the necessary part before deciding the entire plan is blocked",
      "does better when they distinguish a meaningful limit from the pile of unfinished tasks making everything feel more restricted than it is",
      "gets more relief from finishing one concrete responsibility than from trying to rest while five open obligations remain in the background",
      "can use the pressure to identify what needs a stronger system, clearer ownership, more time, or a smaller promise"
    ]
  },
  "south-node": {
    domain: "a familiar role, habit, or competence that comes easily because they have repeated it many times before",
    scenes: [
      "Other people may quickly hand them the job they always know how to do, especially if that competence has made them the default helper before.",
      "Recognition can come through an old role that still fits well enough to feel rewarding even if it no longer points in the direction they want to grow.",
      "They may slip into a familiar response before noticing that the current situation does not require the old amount of effort or self-sacrifice.",
      "The old skill is still useful, but its usefulness can make it easy to miss how much of their identity has become organized around being good at it."
    ],
    actions: [
      "benefits from using the familiar skill without automatically accepting the entire old role that usually comes with it",
      "does better when competence remains a resource instead of becoming the reason they keep repeating a path they have already outgrown",
      "gets more from deciding consciously where the old habit still serves them and where it simply saves other people from adjusting",
      "can keep what they know without giving familiarity more authority than the direction they are trying to move now"
    ]
  },
  sun: {
    domain: "identity, visibility, pride, direction, and the choices that need to feel like their own",
    scenes: [
      "A plan can receive praise and still leave them unsure if it represents what they actually want to keep building.",
      "Pushback may feel personal when the work, decision, or role carries more of their identity than they realized.",
      "A moment of recognition can clarify which work makes them want to participate more fully and which success mainly looks good from the outside.",
      "They may need to defend a decision without turning every question about the decision into a question about who they are."
    ],
    actions: [
      "benefits from protecting the part of the decision that actually represents them while remaining willing to fix the weak point around it",
      "does better when they let the work and choice become more specific instead of demanding that other people validate the entire identity attached to it",
      "gets more from strengthening what they genuinely want to build than from defending a version that mainly exists to keep approval coming",
      "can treat attention as feedback without making attention the measure of how much the work matters"
    ]
  },
  uranus: {
    domain: "independence, change, disruption, restlessness, and the pattern that has become too narrow to keep repeating automatically",
    scenes: [
      "A schedule flips, a device fails, another person changes direction, or a routine becomes intolerable at exactly the wrong moment.",
      "They may want to scrap the whole arrangement because one part of it has become stale or restrictive.",
      "An unexpected option can show that the old method was being repeated more from habit than from evidence that it still worked.",
      "The need for freedom may be legitimate even if the first solution that appears is more disruptive than necessary."
    ],
    actions: [
      "benefits from testing one deliberate change before reorganizing everything around the frustration",
      "does better when they preserve what still works and change the part that is actually causing the restriction",
      "gets more information from a small experiment than from an impulsive break made at the peak of irritation",
      "can use the disruption to update the routine without assuming that every old part of the routine deserves to be destroyed"
    ]
  },
  venus: {
    domain: "relationships, money, pleasure, values, cooperation, and the terms that make something pleasant sustainable",
    scenes: [
      "An invitation, purchase, apology, gift, or proposal can look easy until the cost, expectation, or follow-through becomes specific.",
      "They may know how to keep the interaction pleasant and still need to say the number, preference, boundary, or request that gives the pleasant tone something solid to rest on.",
      "A relationship tension can surface at the exact moment everyone would rather preserve the mood and move on.",
      "The attractive option may be worth choosing, but the useful question is what it costs in money, time, compromise, or future obligation."
    ],
    actions: [
      "benefits from attaching the warmth to something concrete, such as the invitation actually sent, the number actually named, or the apology actually made",
      "does better when keeping the peace does not require ignoring the preference or cost that will still be there tomorrow",
      "gets more from an agreement that remains pleasant after the practical terms are clear than from charm that disappears once the terms arrive",
      "can enjoy what is available without using pleasure or approval as a reason to skip the conversation the situation still needs"
    ]
  }
};

const hardMechanism = [
  "The friction matters because %EFFECT% can move faster than the part of the situation that needs judgment, so the first reaction may create more work than the original problem.",
  "The difficult part is the mismatch between %EFFECT% and what the situation can realistically support right now.",
  "Pressure rises when %EFFECT% pushes against a need that cannot simply be rushed, enlarged, softened, or controlled into compliance.",
  "What feels urgent is not always the same thing as what deserves the strongest response, especially while %EFFECT% is already amplifying the stakes.",
  "The tension is useful when it reveals the weak point. It becomes expensive when %EFFECT% turns that weak point into a fight about everything else.",
  "A sharp reaction can contain useful information and still be badly timed if %EFFECT% is making the situation feel more absolute than it is.",
  "The conflict gets clearer once {{Name}} separates what actually changed from the extra pressure created by %EFFECT%.",
  "This transit can make the problem feel like it needs a total answer when %EFFECT% may only be exposing one part that needs correction."
];

const softMechanism = [
  "The easier flow is useful because %EFFECT% can support the next step without requiring a crisis first.",
  "There is less resistance between %EFFECT% and what the situation needs, which gives {{Name}} a better chance to use the opening deliberately.",
  "The advantage is practical: %EFFECT% is easier to direct toward something useful instead of spending the day managing friction around it.",
  "What usually takes more effort may move with less resistance while %EFFECT% is working with the situation instead of against it.",
  "The opening still needs action. %EFFECT% makes cooperation or timing easier, but it does not complete the task on {{Name}}'s behalf.",
  "The day gives {{Name}} more room to use %EFFECT% well, especially if they attach the good feeling or useful timing to a specific next step.",
  "Support is available in a form {{Name}} can actually use, and %EFFECT% is less likely to become the part they have to manage around.",
  "This is easier energy, not automatic results. %EFFECT% helps most when {{Name}} gives it a concrete job."
];

const conjunctionMechanism = [
  "The two concerns sit close together now, so %EFFECT% immediately changes how {{Name}} experiences the situation instead of arriving as a separate issue.",
  "The transit is close enough to the natal point that %EFFECT% becomes difficult to separate from the choice in front of {{Name}}.",
  "This is a direct contact, so %EFFECT% is not happening in the background. It becomes part of the way {{Name}} handles the situation itself.",
  "The contact concentrates %EFFECT% around one part of life, which can make a familiar pattern easier to recognize because it is harder to avoid.",
  "The immediate quality of the transit makes %EFFECT% feel personal even when the useful response is still practical and specific.",
  "Because the contact is direct, %EFFECT% can make the issue more obvious before {{Name}} has decided what they want to do about it."
];

const anyMechanism = [
  "The effect is immediate enough that %EFFECT% quickly changes the practical meaning of the situation for {{Name}}.",
  "There is not much distance between the trigger and the response, so %EFFECT% becomes part of the decision before {{Name}} has fully named it.",
  "What matters is the live consequence: %EFFECT% changes what {{Name}} notices, needs, or chooses in the moment.",
  "The transit works through the situation directly, with %EFFECT% changing the next step rather than staying abstract."
];

const bridgeOpeners = [
  "With %PLANET% {{aspectWord}} their %TARGET% until {{untilDate}}, {{Name}} %ACTION%.",
  "While %PLANET% {{aspectWord}} their %TARGET% until {{untilDate}}, {{Name}} %ACTION%.",
  "%PLANET% {{aspectWord}} their %TARGET% until {{untilDate}} makes one response especially useful: {{Name}} %ACTION%.",
  "Until {{untilDate}}, %PLANET% {{aspectWord}} their %TARGET% puts the emphasis on a practical choice. {{Name}} %ACTION%.",
  "The useful part of %PLANET% {{aspectWord}} their %TARGET% until {{untilDate}} is concrete. {{Name}} %ACTION%.",
  "As %PLANET% {{aspectWord}} their %TARGET% through {{untilDate}}, {{Name}} %ACTION%."
];

function hashInt(value) {
  return Number.parseInt(crypto.createHash("sha256").update(value).digest("hex").slice(0, 12), 16);
}

function pick(items, seed, offset = 0) {
  return items[(seed + offset * 131) % items.length];
}

function sentence(template, replacements) {
  return Object.entries(replacements).reduce((value, [key, replacement]) => value.replaceAll(`%${key}%`, replacement), template);
}

function modeFor(aspect) {
  if (["hard", "square", "opposition"].includes(aspect)) return "hard";
  if (["soft", "trine", "sextile"].includes(aspect)) return "soft";
  if (aspect === "conjunction") return "conjunction";
  return "any";
}

function buildBody(contentKey) {
  const parts = contentKey.split("/");
  const transiting = parts[2];
  const rawTarget = parts[3];
  const aspect = parts[4];
  const canonicalTarget = aliasTarget[rawTarget] ?? rawTarget;
  const targetData = target[canonicalTarget];
  if (!targetData) throw new Error(`${contentKey}: unsupported target ${canonicalTarget}.`);
  const seed = hashInt(contentKey);
  const mode = modeFor(aspect);
  const effect = planetEffect[transiting];
  const pLabel = planetLabel[transiting];
  if (!effect || !pLabel) throw new Error(`${contentKey}: unsupported transiting body ${transiting}.`);

  const opener = sentence(pick(planetOpeners[transiting], seed, 1), { DOMAIN: targetData.domain });
  const scene = pick(targetData.scenes, seed, 2);
  const mechanismPool = mode === "hard"
    ? hardMechanism
    : mode === "soft"
      ? softMechanism
      : mode === "conjunction"
        ? conjunctionMechanism
        : anyMechanism;
  const mechanism = sentence(pick(mechanismPool, seed, 3), { EFFECT: effect });
  const action = pick(targetData.actions, seed, 4);
  const bridge = sentence(pick(bridgeOpeners, seed, 5), {
    PLANET: pLabel,
    TARGET: label[canonicalTarget],
    ACTION: action
  });

  return `${opener} ${scene} ${mechanism}\n\n${bridge}`;
}

const records = keys.map((contentKey) => {
  const body = buildBody(contentKey);
  return {
    contentKey,
    review_status: "owner_signoff_untraced",
    authorship: "independent_friend_authoring_from_mechanism",
    body_they: body,
    body_they_sha256: crypto.createHash("sha256").update(body).digest("hex"),
    owner_directed: true,
    directedAt: "2026-09-03",
    approvalLevel: "owner_signoff_untraced"
  };
});

const packet = {
  schema: "tldrastro-transit-aspect-friends-independent-completion-v1",
  status: "owner_directed_completion",
  createdAt: "2026-09-03",
  surface: "personal-transits-friends",
  count: records.length,
  excludesTransitingBody: "sun",
  method: "Independent Friends authoring from governed transiting-body mechanism, natal target function, aspect behavior, and lived-scene libraries. Existing You passages and legacy You-to-Friends conversion are not drafting inputs.",
  servingEnabled: false,
  approvalLevel: "owner_signoff_untraced",
  approvalEvidence: "Owner directed completion of the entire Friends corpus in ChatGPT on 2026-09-03. Exact Sun batch remains separately hash-bound exact_owner_approved.",
  records
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`);
console.log(`wrote ${records.length} independently authored Friends transit rows -> ${path.relative(root, outPath)}`);
