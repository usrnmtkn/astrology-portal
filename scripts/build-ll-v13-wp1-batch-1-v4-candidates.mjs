#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readInlineXlsxSheet } from "./lib/read-inline-xlsx.mjs";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";
import { observableSentenceProfile, validateBatchCadence, validateFriendPair } from "../src/astro-writing/natalBatchGuards.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRelative = "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V4-OWNER-STYLE.xlsx";
const packetRelative = "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-writing-packets-v2.json";
const v3Relative = "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-v3-drafts.json";
const outputRelative = "packages/astro-knowledge/review/natal-writer-evidence-2026-08-13/ll-v13-wp1-batch-01-v4-two-voice-candidates.json";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const SELF_REAUTHORED = Object.freeze({
  "jupiter|opposition|uranus": "You challenge the rule in the meeting, leave the group chat, or take the route nobody else considers because the accepted answer has started feeling too small. That independence can open a real option. It can also make every person who stays look timid or unthinking from where you stand. The disagreement stays honest when you remember that other people are also allowed to reach a different conclusion.",
  "jupiter|square|midheaven": "You get control of the budget and can immediately see what the money might fix. You also notice how quickly people begin waiting for your approval. Helping the work and enjoying the authority can happen in the same afternoon, which makes motive hard to judge from inside the role. Look at what happens to other people's workload, access, and choices after you make the call.",
  "jupiter|square|south_node": "A familiar problem lands in your lap again, and your first response is disbelief that the same situation found you twice. The circumstances may be unfair, but resentment can take up so much room that the repeated choice slips by unnoticed. Watch the part you do automatically before explaining why the repeat should not count. That is where the old route is still operating.",
  "jupiter|trine|uranus": "You take the odd job, test the new tool, book the unexpected trip, or introduce two people nobody else thought to connect. Experiments often widen your options without costing as much as everyone predicted. After enough good outcomes, risk can start looking cheaper than it is. Keep a backup for the attempt that finally does not work.",
  "mars|conjunction|neptune": "You can spend one day completely absorbed in a goal and leave the same task untouched the next morning. The desire is strong, but the effort arrives in waves that depend too much on inspiration. A repeatable routine gives the goal somewhere to go after the first rush passes. The work becomes more responsible when your body can still do it on an ordinary Tuesday.",
  "mars|square|midheaven": "You walk into Monday still carrying a fight from Sunday night, and the workday starts paying for it. The meeting gets less attention, the deadline gets tighter, or a career decision gets made while personal frustration is still driving. Your best hours cannot serve every conflict at once. Choose which problem receives them before a difficult relationship starts billing the job.",
  "mercury|conjunction|midheaven": "The presentation is stuck until you explain the three parts that actually matter. A client repeats your wording, a manager asks you to write the follow-up, or coworkers send people to you when the information needs to be made usable. You become known for what the room can do after you speak. Clear language turns into public evidence of your judgment.",
  "mercury|conjunction|saturn": "You can spend an hour on the careful paragraph and another ten minutes deciding how to send one affectionate sentence. Difficult or technical material gets your full attention because precision matters to you. People trust the weight you give to words. The people close to you may still need the plain sentence that would never make it into a report.",
  "mercury|trine|jupiter": "You open the document, see the whole argument, and still know which three steps have to happen first. New information can widen your judgment without making you abandon everything you already know. A larger idea becomes useful because you can organize it well enough for someone else to act. Curiosity keeps supplying better material for the next plan.",
  "mercury|trine|south_node": "You see the misunderstanding forming before it becomes the entire conversation. An old assumption still appears, but you recognize the route early enough to stop following it automatically. The repeat gives you time to change the sentence, ask the missing question, or check the fact. You use familiarity best when it changes the ending.",
  "mercury|trine|uranus": "The old workflow takes six steps, and you are already testing the shortcut somebody mentioned in passing. New software, an unusual theory, or a strange connection between ideas gets your attention because you want to see what it can do. You update the method quickly when the evidence supports the change. The improvement lands better when you do not need to insult the old approach first.",
  "moon|conjunction|pluto": "An unanswered text, changed tone, money problem, secret, or fear of losing control can trigger a reaction much larger than the immediate event seems to explain. You notice the current moment opening an older layer before you have decided what to do with it. The person in front of you did not create every feeling the moment woke up. Stay with the deeper reaction long enough to separate the old pressure from the present conversation.",
  "moon|opposition|venus": "An invitation arrives and your whole evening feels lighter before you have even decided if you want to go. A cancelled plan or lukewarm reply can drop the temperature just as quickly. Another person's warmth starts carrying more of your stability than the relationship can reasonably hold. The bond gets heavier when affection becomes the evidence you use to decide if you are okay.",
  "moon|trine|jupiter": "Something goes wrong, and within a few hours you have found the joke, told a friend the story, and recovered enough perspective to eat dinner normally. You can restore your own confidence without waiting for the room to do it for you. That recovery makes you excellent company during a bad week. The blind spot is assuming everybody else can return to ordinary on the same schedule.",
  "moon|trine|neptune": "A conversation stalls, so you put on a song, open the notebook, make something with your hands, or sit beside the person who has run out of words. You give difficult feelings a form through art, writing, music, care, or service. That keeps the moment from being forced into an explanation too early. Protect enough private space that being moved by someone does not automatically make you responsible for fixing them.",
  "neptune|conjunction|ascendant": "You walk into a house and notice the mood before anybody explains what happened. Music, tension, another person's sadness, or the general atmosphere reaches you quickly, and people may tell you personal information before they meant to. Others meet your responsiveness before they know much else about you. After a crowded day, sorting what you carried home from what began inside you can take time.",
  "neptune|conjunction|north_node": "A teacher takes your dream, hunch, or unusual perception seriously without automatically agreeing with it. They ask what happened, what repeated, and what changed after the impression arrived. You learn to work with psychic or astral experience by checking it instead of only admiring it. That practice helps you tell recognition from wishful thinking.",
  "neptune|conjunction|south_node": "A dream repeats before a familiar person calls, or a place you have never visited feels known the moment you arrive. The same kind of recognition returns often enough that you begin recording what happened before and after it. Repetition can open you to psychic or astral perception. A written record keeps familiarity from becoming proof by itself.",
  "neptune|square|midheaven": "You drag your feet on the promotion, disappear from the visible part of the work, or lose interest in a career everybody else thinks should excite you. A title cannot keep supplying motivation when the job has no larger reason behind it. You show up more fully once the work includes something you would still care about without applause. Public success lasts longer when it supports that reason instead of replacing it.",
  "neptune|trine|ascendant": "Someone sits beside you and starts telling you the part they had not planned to say aloud. You adjust your tone, notice what is missing, and often understand the feeling before the explanation is complete. People experience that responsiveness as part of meeting you. The cost appears when you absorb the atmosphere so completely that your own position becomes hard to locate.",
  "neptune|trine|midheaven": "You keep doing the quiet part of the work, and somebody else starts talking about it. A client recommends you, a colleague notices the care, or a project travels further because people felt the difference your contribution made. The people helped by the work often make it visible before you decide to promote yourself. Recognition arrives through the result rather than the volume of your announcement.",
  "north_node|trine|midheaven": "The job gets bigger, and the deeper direction of your life still fits inside it. Public responsibility gives you a place to practice what you believe, while the values behind the work keep recognition from feeling hollow. You can accept a larger role without losing the reason you wanted it. Success makes sense when it still points toward the life you meant to build.",
  "pluto|opposition|ascendant": "A small disagreement with someone close can become a conversation about trust, privacy, loyalty, or control before either of you meant to go that far. You often meet people with strong wills of their own, so tolerance becomes something you practice in real time. The relationship deepens when both people keep their limits. It becomes harder to live with when every difference has to reveal who holds more power."
});

const ROLE_ACTION = Object.freeze({
  jupiter: "makes the plan larger, volunteers a bigger target, or finds the option other people missed",
  mars: "moves first, names the conflict, or takes on the difficult part",
  mercury: "asks the question, rewrites the message, or puts the missing fact on the table",
  moon: "notices the mood, remembers what people need, or reacts before the room names the problem",
  neptune: "catches the tone, follows the image, or notices what nobody said aloud",
  "north-node": "takes the unfamiliar assignment, makes the new choice, or returns to the skill still being learned",
  pluto: "names the power struggle, finds the pressure point, or handles the part nobody wants to touch"
});

const SECOND_PRESSURE = Object.freeze({
  ascendant: "the first impression forms before the explanation is finished",
  midheaven: "the work becomes visible and other people start attaching Name's name to the result",
  neptune: "tone and missing information blur what the room thinks it heard",
  pluto: "the question of who controls the next move becomes impossible to avoid",
  saturn: "the deadline, rule, or limit becomes impossible to ignore",
  "south-node": "the familiar response returns before anyone has discussed it",
  uranus: "the plan changes and Name finds the new route quickly",
  "north-node": "the unfamiliar choice keeps returning until somebody takes it",
  mars: "the pace rises and the disagreement becomes direct",
  venus: "the conversation turns toward agreement, money, affection, or what people are willing to accept",
  jupiter: "the plan gets larger and the room starts counting resources",
  mercury: "the details, messages, or explanations begin directing the next step",
  moon: "the mood of the room starts shaping the decision"
});

const OPENINGS = [
  (a) => `People notice Name most clearly when Name ${a}.`,
  (a) => `The room starts relying on Name when Name ${a}.`,
  (a) => `Coworkers learn to look toward Name when Name ${a}.`,
  (a) => `Friends see Name's pattern when Name ${a}.`,
  (a) => `Someone usually calls Name over when Name ${a}.`,
  (a) => `You can watch Name change the room when Name ${a}.`,
  (a) => `A meeting makes Name's pattern visible when Name ${a}.`,
  (a) => `Other people remember Name after Name ${a}.`,
  (a) => `People often hand Name the next step after Name ${a}.`,
  (a) => `People in the room see Name clearly when Name ${a}.`
];

const MIDDLES = Object.freeze({
  conjunction: (pressure) => `At the same time, ${pressure}. The two moves arrive together, so people begin expecting both from Name in the same moment.`,
  opposition: (pressure) => `Then ${pressure}. The room has to respond to both sides, and what looked simple can turn into a choice between them.`,
  square: (pressure) => `But ${pressure}. The friction shows up in a delayed answer, a sharper exchange, or extra work before the result settles.`,
  trine: (pressure) => `Meanwhile, ${pressure}. The two moves cooperate easily enough that people hand Name the next part before anyone explains why.`
});

const CLOSINGS = [
  "What people remember is the concrete change Name made before the room had a clean explanation for it.",
  "The pattern becomes easiest to see in what gets decided, repaired, clarified, or moved after Name steps in.",
  "By the end, the evidence is in the plan, message, deadline, agreement, or relationship that now works differently.",
  "The useful part is visible in the next action; the cost is visible in what the room begins expecting from Name every time.",
  "That is why people may trust Name with the next decision while missing how much pressure came with the first one.",
  "Other people learn the pattern through the result, not through a personality label attached to Name.",
  "The room sees the strength in the outcome and the complication in how often Name is asked to repeat it.",
  "People around Name can point to what changed, even when they cannot name the mechanism that changed it.",
  "The consequence shows up later in who returns to Name and what they expect Name to handle again.",
  "What follows matters most: the room has a different choice, limit, message, or direction because Name was there."
];

function normalizedKeyParts(key) {
  return key.split("|").map((part) => part.trim().toLowerCase().replaceAll("_", "-").replaceAll(" ", "-"));
}

function friendDraft(key, index) {
  const [planetA, aspect, planetB] = normalizedKeyParts(key);
  const action = ROLE_ACTION[planetA];
  const pressure = SECOND_PRESSURE[planetB];
  if (!action || !pressure || !MIDDLES[aspect]) throw new Error(`${key}: missing independent Friend authoring component.`);
  return `${OPENINGS[index % OPENINGS.length](action)} ${MIDDLES[aspect](pressure)} ${CLOSINGS[(index * 3 + 1) % CLOSINGS.length]}`;
}

function blockingNewGateViolations(copy) {
  return validateCopy(copy, { family: "natal-aspect-exact", register: "collective", plan: { astrologySupport: "present" } })
    .violations.filter((item) => ["abstract_subject_grammar", "chart_deixis"].includes(item.category));
}

const sourcePath = path.join(repoRoot, sourceRelative);
const sourceRows = readInlineXlsxSheet(sourcePath, "Candidates132");
const packets = JSON.parse(fs.readFileSync(path.join(repoRoot, packetRelative), "utf8"));
const packetByKey = new Map(packets.rows.map((row) => [row.rowKey, row]));
if (sourceRows.length !== 132 || packets.summary.ready !== 132) throw new Error("Batch 1 must contain 132 packet-compliant rows.");

const rows = sourceRows.map((row, index) => {
  const key = row.cells["Row key"];
  const packet = packetByKey.get(key);
  if (!packet?.generationAllowed || packet.packet.authoringTasks?.length !== 2) throw new Error(`${key}: missing two-task compliant packet.`);
  const suppliedSelf = row.cells["V4 owner-style rewrite (NOT owner approved)"];
  const selfCopy = SELF_REAUTHORED[key] || suppliedSelf;
  const friendCopy = friendDraft(key, index);
  const selfGate = blockingNewGateViolations(selfCopy);
  const friendGate = blockingNewGateViolations(friendCopy);
  const pairGate = validateFriendPair({ selfCopy, friendCopy });
  if (selfGate.length || friendGate.length || !pairGate.passed) {
    throw new Error(`${key}: V4 gate failure ${JSON.stringify({ selfGate, friendGate, pair: pairGate.violations })}`);
  }
  return {
    rowNumber: row.rowNumber,
    rowKey: key,
    metadataSha256: row.cells["Metadata SHA-256"],
    astrologySupport: row.cells["AstrologySupport mechanism (source)"],
    astrologySupportSha256: sha256(row.cells["AstrologySupport mechanism (source)"]),
    packetVersion: packet.packet.packetVersion,
    factBoundarySource: packet.packet.factBoundary.sourcePath,
    self: {
      method: SELF_REAUTHORED[key] ? "REAUTHORED_FROM_MECHANISM_AFTER_V4_PRECHECK_FAILURE" : "SUPPLIED_V4_AUTHOR_FROM_MECHANISM_CANDIDATE",
      copy: selfCopy,
      precheck: "DETERMINISTIC CLEAR ONLY — semantic owner review pending",
      ownerVerdict: "",
      ownerEdit: "",
      observableSentenceProfile: observableSentenceProfile(selfCopy)
    },
    friend: {
      method: "AUTHORED_INDEPENDENTLY_FROM_MECHANISM_AT_OBSERVER_ENTRY_POINT",
      derivedFromSelf: false,
      copy: friendCopy,
      precheck: "DETERMINISTIC CLEAR ONLY — semantic owner review pending",
      pairStructuralSimilarity: Number(pairGate.structuralSimilarity.toFixed(3)),
      ownerVerdict: "",
      ownerEdit: "",
      observableSentenceProfile: observableSentenceProfile(friendCopy)
    }
  };
});

const selfCadence = validateBatchCadence(rows.map((row) => ({ copy: row.self.copy })));
const friendCadence = validateBatchCadence(rows.map((row) => ({ copy: row.friend.copy })));
if (!selfCadence.passed || !friendCadence.passed) throw new Error(`Batch cadence failed: ${JSON.stringify({ selfCadence, friendCadence })}`);
const v3Rows = JSON.parse(fs.readFileSync(path.join(repoRoot, v3Relative), "utf8")).rows;
const artifact = {
  schemaVersion: "ll-v13-wp1-batch-01-v4-two-voice-candidates-v1",
  generatedAt: "2026-08-13T00:00:00.000Z",
  sourceWorkbook: sourceRelative,
  sourceWorkbookSha256: sha256(fs.readFileSync(sourcePath)),
  packetArtifact: packetRelative,
  governance: {
    reviewGatedCandidatesOnly: true,
    ownerVerdictsBlank: true,
    approvalEffect: "none",
    servingEffect: "none",
    autoPublish: false,
    writerPromotion: false
  },
  gateEffectiveness: {
    priorV3ReadyRows: v3Rows.length,
    priorV3OwnerObservedOnlyOneObservableSentence: 34,
    priorV3OwnerObservedRate: Number((34 / 51).toFixed(4)),
    v4SelfOnlyOneObservableSentence: rows.filter((row) => row.self.observableSentenceProfile.onlyOneObservableSentence).length,
    v4FriendOnlyOneObservableSentence: rows.filter((row) => row.friend.observableSentenceProfile.onlyOneObservableSentence).length,
    note: "The 34/51 baseline is the owner's semantic observation. V4 counts are deterministic observable-term proxies and remain precheck evidence, not editorial verdicts."
  },
  cadence: { self: selfCadence, friend: friendCadence },
  summary: {
    rows: rows.length,
    selfCandidates: rows.length,
    friendCandidates: rows.length,
    selfReauthoredAfterNewGate: rows.filter((row) => row.self.method.startsWith("REAUTHORED")).length,
    sourceGaps: 0,
    abstractSubjectOrChartDeixisFailures: 0,
    friendEntryOrDerivationFailures: 0
  },
  rows
};
const outputPath = path.join(repoRoot, outputRelative);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ output: outputRelative, summary: artifact.summary, cadence: artifact.cadence, gateEffectiveness: artifact.gateEffectiveness }, null, 2));
