#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { lintArticle, lintBatchRepetition } = require("./lint-placement-voice.js");

const packageRoot = path.resolve(__dirname, "..");
const reviewRoot = path.join(packageRoot, "review");
const sourceRoot = path.join(reviewRoot, "sky-placement-writer-sun-venus-24-2026-08-04");
const outputs = {
  json: path.join(reviewRoot, "sky-placement-writer-sun-venus-24-owner-edit-pass-v1-revised.json"),
  md: path.join(reviewRoot, "sky-placement-writer-sun-venus-24-owner-edit-pass-v1-revised.md"),
  diff: path.join(reviewRoot, "sun-venus-24-owner-edit-pass-v1-before-after.md"),
  lint: path.join(reviewRoot, "sun-venus-24-owner-edit-pass-v1-lint.json")
};

const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const sourceDirs = Object.fromEntries([
  ...signs.map((sign) => [`sun-${sign}`, `sun-${sign}`]),
  ...signs.map((sign) => [`venus-${sign}`, sign === "taurus" ? "venus-taurus-retry-16k-v2" : sign === "leo" ? "venus-leo-collective-retry-v2" : `venus-${sign}`])
]);

const records = Object.fromEntries(Object.entries(sourceDirs).map(([id, dir]) => {
  const sourcePath = path.join(sourceRoot, dir, "result.json");
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  return [id, {
    id,
    planet: source.target.planet,
    sign: source.target.sign,
    sourceResult: path.relative(packageRoot, sourcePath),
    sourceRunId: source.runId,
    writerRouting: source.writerRouting,
    article: structuredClone(source.article)
  }];
}));

const changes = [];
const unmapped = [];

function edit(id, section, item, field, before, after) {
  const record = records[id];
  const current = record?.article?.[field];
  if (typeof current !== "string") {
    unmapped.push({ id, section, item, field, before, reason: "target field is not a string" });
    return;
  }
  const hits = current.split(before).length - 1;
  if (hits !== 1) {
    unmapped.push({ id, section, item, field, before, reason: `expected one exact match; found ${hits}` });
    return;
  }
  record.article[field] = current.replace(before, after).replace(/ {2,}/g, " ").trim();
  changes.push({ id, section, item, field, before, after });
}

function replaceField(id, section, item, field, before, after) {
  const current = records[id]?.article?.[field];
  if (current !== before) {
    unmapped.push({ id, section, item, field, before, reason: "whole-field source did not match exactly", actual: current });
    return;
  }
  records[id].article[field] = after;
  changes.push({ id, section, item, field, before, after });
}

function replaceMove(id, section, item, before, after) {
  const moves = records[id]?.article?.try_this;
  const indexes = Array.isArray(moves) ? moves.flatMap((value, index) => value === before ? [index] : []) : [];
  if (indexes.length !== 1) {
    unmapped.push({ id, section, item, field: "try_this", before, reason: `expected one exact move; found ${indexes.length}` });
    return;
  }
  const index = indexes[0];
  if (after === null) moves.splice(index, 1);
  else moves[index] = after;
  changes.push({ id, section, item, field: `try_this[${index}]`, before, after: after || "[deleted]" });
}

function replaceMoves(id, section, item, before, after) {
  const moves = records[id]?.article?.try_this;
  if (JSON.stringify(moves) !== JSON.stringify(before)) {
    unmapped.push({ id, section, item, field: "try_this", before: JSON.stringify(before), reason: "move list did not match exactly", actual: moves });
    return;
  }
  records[id].article.try_this = after;
  changes.push({ id, section, item, field: "try_this", before: JSON.stringify(before), after: JSON.stringify(after) });
}

// Section A: exact owner wording.
edit("sun-aries", "A", "2", "tension",
  "Independence narrows into self-focus, and the energy that could have opened a path gets spent proving that the path we chose first must be the right one.",
  "Independence narrows into self-focus. We spend more time defending the first decision than checking whether it still makes sense.");
replaceField("sun-aries", "A", "1", "close",
  "Before {{exitDate}}, some of the strongest momentum may be carrying us toward a choice we no longer want simply because stopping would expose how quickly it was made.",
  "Before {{exitDate}}, momentum can keep us committed to a choice we no longer want because stopping would mean admitting how quickly we made it.");
edit("sun-cancer", "A", "3", "opening",
  "Under the Sun in Cancer, protecting what feels tender can give the day a clear center.",
  "Under the Sun in Cancer, taking care of what feels personal can give the day a clear center.");
edit("sun-cancer", "A", "4", "development",
  "A feeling contains information, but we may treat it as proof before anything has been confirmed.",
  "The feeling may be real, but it does not tell us what actually happened.");
edit("sun-leo", "A", "5", "tension",
  "A quiet response feels like a verdict.",
  "We start counting reactions and treating every quiet response like proof that the work did not land.");
edit("sun-leo", "A", "6", "opening",
  "especially when visibility serves more than personal attention",
  "especially when being seen helps the work reach the people it was made for");
edit("sun-virgo", "A", "7", "development",
  "This pass can expose the same exhausting bargain: life will feel settled once every weak spot has been handled.",
  "This pass can expose the same exhausting bargain: life will finally feel manageable once every weak spot has been handled.");
replaceField("sun-virgo", "A", "8", "close",
  "Before {{exitDate}}, the result can keep improving while our confidence shrinks under a standard that never says enough.",
  "Before {{exitDate}}, the result can keep improving while our confidence wears down under a standard that keeps moving.");
edit("sun-scorpio", "A", "9", "opening",
  "The Sun in Scorpio keeps looking after an easy answer stops working.",
  "The Sun in Scorpio keeps looking when an easy answer no longer explains what is happening.");
edit("sun-pisces", "A", "10", "opening",
  "attention moves toward what cannot be measured",
  "attention moves toward what we feel before we can explain it");
edit("sun-pisces", "A", "11", "development",
  "Pisces keeps the edges open, while the Sun needs enough shape to recognize a life as its own.",
  "When we do not name what we want, other people's moods and requests keep deciding where the day goes.");
edit("venus-aries", "A", "12", "tension",
  "When pursuit carries more of the feeling than intimacy, desire needs fresh resistance to stay alive.",
  "When pursuit carries more of the feeling than intimacy, interest can fade once the chase is over.");
edit("venus-cancer", "A", "13", "tension",
  "The unspoken bargain is simple: all this tending should make the connection safe.",
  "The expectation is simple but unspoken: after everything we have done, the relationship should feel more certain.");
edit("venus-cancer", "A", "14", "tension",
  "Because that bargain was never said aloud, the care lands as obligation while we feel unappreciated.",
  "Because we never said what we expected in return, the other person starts feeling pressured while we feel unappreciated.");
replaceField("venus-cancer", "A", "15", "close",
  "Before {{exitDate}}, care offered to secure love can leave us doing more for less connection, while every changed plan feels like a warning that the bond is slipping.",
  "Before {{exitDate}}, care offered to keep someone close can leave us doing more for less connection.");
edit("venus-virgo", "A", "16", "development",
  "Now the usefulness test may be easier to spot.",
  "Now it may be easier to notice how often we use helpfulness to measure whether we matter.");
edit("venus-virgo", "A", "17", "development",
  "Venus in Virgo can make receiving feel strangely exposed, because accepting help means letting care arrive without controlling its form.",
  "Accepting help can feel uncomfortable because we no longer control how the care is given.");
edit("venus-libra", "A", "18", "development",
  "a shared expense left unequal because naming the amount feels ungracious",
  "a shared expense left unequal because asking for the exact amount feels rude");
replaceField("venus-libra", "A", "19", "opening",
  records["venus-libra"].article.opening,
  "After moving through {{priorSign}} from {{priorSignEntryDate}} to {{priorSignExitDate}}, Venus enters Libra on {{entryDate}}, and we pay closer attention to whether interest, effort, and consideration are being returned. A shared decision includes both preferences. A purchase feels worth making because it is useful and beautiful. Affection becomes easier to trust when care does not have to be requested every time.");
edit("venus-scorpio", "A", "20", "opening",
  "attraction becomes more private, intense, and exacting",
  "attraction becomes more private and intense, with less patience for vague answers");
edit("venus-scorpio", "A", "21", "development",
  "The pressure grows when depth is measured by distress. A calm connection can seem less convincing than one that keeps us guessing.",
  "A calm relationship can start feeling less convincing than one that keeps us worried.");
replaceMove("venus-scorpio", "A", "22",
  "We can accept one offered kindness, such as a meal or a ride, without treating it as a debt or a test.",
  "We can answer one question fully the first time it is asked.");
edit("venus-capricorn", "A", "23", "tension",
  "A shared plan starts to feel like security, so a change of mind reads as a broken promise.",
  "A shared plan starts to feel like proof that the relationship is reliable, so a change of mind reads as a broken promise.");
replaceField("venus-aquarius", "A", "24", "close",
  "By {{exitDate}}, the bond may still look free even though neither side trusts it enough to state a need or make a promise.",
  "By {{exitDate}}, the relationship may still look free even when we do not trust it enough to state a need or make a promise.");
edit("venus-aquarius", "A", "25", "tension",
  "The first difficult moment arrives when attachment asks for a name.",
  "The first difficult moment arrives when someone wants to know what the relationship is.");
edit("venus-aquarius", "A", "26", "development",
  "Aquarius can strip away borrowed rules, but the absence of a rule is not an agreement.",
  "We can reject rules that never fit the relationship, but the absence of a rule is not an agreement.");
edit("venus-pisces", "A", "27", "tension",
  "The rescue reflex keeps us focused on someone else's pain, so we call our own disappointment patience and keep giving.",
  "We keep stepping in before anyone asks, so their pain stays at the center while our disappointment gets renamed as patience.");
replaceField("venus-pisces", "A", "28", "close",
  "By {{exitDate}}, sympathy and imagined potential can leave us doing all the work for a connection that only felt mutual.",
  "By {{exitDate}}, sympathy and hope can leave us doing all the work for a relationship that only felt mutual.");

// Section B: batch corrections.
replaceMoves("venus-cancer", "B", "29", [
  "We can ask for one concrete form of closeness, such as a visit or a shared meal, before offering extra care.",
  "We can set a spending limit before buying food, gifts, or home comforts for someone we want to keep close.",
  "We can accept one offered meal, ride, or favor without immediately trying to repay it."
], [
  "We can ask for one concrete form of closeness, such as a visit or a shared meal, before offering extra care.",
  "We can let one act of care go unmentioned and see that the bond survives it."
]);
edit("venus-gemini", "B", "30", "development",
  "A lively exchange may reveal real compatibility",
  "A lively exchange may show real compatibility");

// Section C: explicit pattern edits. Every transformation is recorded.
replaceMove("sun-aries", "C", "31", "We can make one small creative piece in a style we have never tried and show it to someone before the week ends.", "We can make one small creative work in a style we have never tried and show it to someone before the week ends.");
edit("sun-taurus", "C", "31", "opening", "return to a creative piece", "return to something we are making");
replaceMove("sun-taurus", "C", "31", "We can complete one small creative piece at its current level of polish.", "We can complete one unfinished piece at its current level of polish.");
replaceMove("sun-leo", "C", "31", "We can finish one small creative piece this week and put our name on it.", "We can finish one small project this week and put our name on it.");

edit("sun-aries", "C", "32", "development", "Now the same pressure returns whenever movement becomes the quickest way to feel certain.", "We keep moving because action feels more certain than a pause.");
edit("sun-taurus", "C", "32", "development", "Now, the pressure spreads through small choices.", "We protect the familiar in one small choice after another.");
edit("sun-gemini", "C", "32", "tension", "The pressure starts when every new angle feels too valuable to leave out.", "Every new angle feels too valuable to leave out.");
edit("sun-cancer", "C", "32", "development", "The pattern repeats in the way concern becomes extra caretaking, a need becomes silence, and silence becomes proof that nobody understands.", "Concern becomes extra caretaking, a need becomes silence, and silence becomes proof that nobody understands.");
edit("sun-leo", "C", "32", "development", "This pressure changes what we make and how we claim it. ", "");
edit("sun-scorpio", "C", "32", "development", "The same pattern returns in smaller moments now. ", "");
edit("sun-sagittarius", "C", "32", "tension", "Restlessness adds pressure. ", "");
edit("sun-capricorn", "C", "32", "development", "The same pressure returns wherever competence has become the price of being taken seriously.", "We treat competence as the price of being taken seriously.");
edit("sun-aquarius", "C", "32", "tension", "The pressure rises when independence starts needing proof. ", "");
edit("sun-aquarius", "C", "32", "development", "The same pressure returns when a different view has to survive contact with the group it could serve.", "A different view still has to survive contact with the group it could serve.");
edit("sun-pisces", "C", "32", "development", "Now the pressure builds each time sensitivity replaces a clear choice. ", "");
edit("sun-libra", "C", "32", "development", "The same pressure can spread through different parts of life: a creative idea is revised until its sharpest part disappears; a shared decision drags because the honest objection stays polite and partial; a relationship looks calm because the same side keeps adjusting.", "We revise a creative idea until its sharpest part disappears, keep an honest objection polite and partial, and call a relationship calm while the same person keeps adjusting.");
edit("venus-gemini", "C", "32", "development", "The pattern can be easy to miss because nothing looks openly wrong. ", "");
edit("venus-cancer", "C", "32", "development", "The same pressure appears through more than one kind of exchange. ", "");
edit("venus-leo", "C", "32", "development", "This time, the pressure may show up in several places at once. ", "");
edit("venus-virgo", "C", "32", "tension", "The pressure begins when every detail starts looking like a test.", "We start treating every detail like a test.");
edit("venus-aquarius", "C", "32", "development", "Now the pressure gathers around what has not been said. ", "");

edit("sun-gemini", "C", "33", "opening", "The Sun in Gemini makes curiosity visible. ", "");
edit("sun-pisces", "C", "33", "tension", "The Sun in Pisces can recognize meaning before it can explain it. That helps us follow a creative impulse or respond with compassion when a need has not been said aloud.", "We follow a creative impulse or respond with compassion before a need has been said aloud.");
edit("sun-pisces", "C", "33", "tension", "It also makes every impression feel important and every need feel like ours to carry.", "But every impression can start to feel important, and every need can start to feel like ours to carry.");
edit("venus-libra", "C", "33", "tension", "Venus in Libra can find terms that leave both sides feeling considered. ", "");
edit("sun-libra", "C", "33", "development", "The Sun in Libra builds confidence through relationship, but constant adjustment leaves those relationships without a clear answer about what we want.", "Constant adjustment leaves those relationships without a clear answer about what we want.");

edit("venus-capricorn", "C", "34", "tension", "it also makes connection feel conditional", "it also makes affection feel conditional");
edit("venus-capricorn", "C", "34", "development", "A dependable connection can carry more expectation than we have said aloud.", "A dependable relationship can carry more expectation than we have said aloud.");
replaceField("venus-capricorn", "C", "34", "close", "By {{exitDate}}, some promises will still be kept, but the connection around them may feel more like an obligation than a choice.", "By {{exitDate}}, some promises will still be kept, but keeping them may feel more like an obligation than a choice.");
edit("venus-sagittarius", "C", "34", "development", "A connection built on shared curiosity still has to survive an inconvenient answer.", "Shared curiosity still has to survive an inconvenient answer.");
edit("venus-pisces", "C", "34", "tension", "build a bond around what we hope is there", "build an arrangement around what we hope is there");
edit("venus-pisces", "C", "34", "development", "Generosity stops creating connection", "Generosity stops creating closeness");
edit("venus-pisces", "C", "34", "development", "Art and tenderness can deepen a mutual bond.", "Art and tenderness can deepen a mutual relationship.");
edit("venus-aquarius", "C", "34", "opening", "connections that allow separate lives", "relationships that allow separate lives");
edit("venus-aquarius", "C", "34", "development", "Nothing gets said because the bond is supposed to be easy.", "Nobody says anything because the arrangement is supposed to be easy.");

edit("sun-aries", "C", "35", "opening", "A stalled idea gets its first real attempt. A choice that has been waiting for approval gets made.", "We give a stalled idea its first real attempt. We make a choice that has been waiting for approval.");
edit("sun-aries", "C", "35", "development", "An idea gets launched because beginning feels alive. A challenge gets accepted because backing down feels worse. Self-trust gets confused with loyalty to the first answer.", "We launch an idea because beginning feels alive. We accept a challenge because backing down feels worse. We confuse self-trust with loyalty to the first answer.");
edit("sun-taurus", "C", "35", "opening", "A loose idea gets a solid shape.", "We give a loose idea a solid shape.");
edit("sun-taurus", "C", "35", "tension", "An unfinished piece gets one more adjustment, then another, because finished means visible.", "We make one more adjustment to an unfinished piece, then another, because finished means visible.");
edit("sun-cancer", "C", "35", "opening", "A familiar place gets more comfortable before anyone asks.", "We make a familiar place more comfortable before anyone asks.");
edit("sun-leo", "C", "35", "opening", "A half-finished idea gets shown.", "We show a half-finished idea.");
edit("sun-leo", "C", "35", "development", "the way a creative risk gets edited toward applause", "the way we edit a creative risk toward applause");
edit("sun-virgo", "C", "35", "opening", "The loose button gets sewn on. The confusing instructions get rewritten. A routine that drains energy gets simplified.", "We sew on the loose button. We rewrite confusing instructions. We simplify a routine that drains energy.");
edit("sun-virgo", "C", "35", "tension", "A finished task gets reopened because one line could be cleaner.", "We reopen a finished task because one line could be cleaner.");
edit("sun-libra", "C", "35", "opening", "A hard conversation gets less defensive when both sides are heard.", "A hard conversation becomes less defensive when each person is heard.");
edit("sun-libra", "C", "35", "tension", "The decision still gets made, but now it belongs to the strongest opinion or the nearest deadline.", "We still make the decision, but now it belongs to the strongest opinion or the nearest deadline.");
edit("sun-scorpio", "C", "35", "opening", "A vague unease gets a direct question.", "We ask a direct question about a vague unease.");
edit("sun-capricorn", "C", "35", "tension", "A finished task gets another round of improvement. Rest gets pushed behind one more milestone.", "We give a finished task another round of improvement. We push rest behind one more milestone.");
edit("sun-aquarius", "C", "35", "opening", "A familiar rule gets questioned out loud.", "We question a familiar rule out loud.");
edit("sun-aquarius", "C", "35", "development", "An idea gets announced before the group knows what it improves.", "We announce an idea before the group knows what it improves.");
edit("venus-aries", "C", "35", "opening", "A preference gets said before anyone asks. A flirtation gets named.", "We say what we prefer before anyone asks. We name the flirtation.");
edit("venus-aries", "C", "35", "development", "and now both sides have preferences", "and now each person has preferences");
edit("venus-gemini", "C", "35", "development", "A difficult answer gets replaced by another question", "We replace a difficult answer with another question");
edit("venus-virgo", "C", "35", "opening", "Someone mentions a sticking cabinet door, and it gets fixed that afternoon. A shared expense gets checked before it grows.", "Someone mentions a sticking cabinet door, and we fix it that afternoon. We check a shared expense before it grows.");
edit("venus-virgo", "C", "35", "development", "A kind offer gets refused, then care feels one-sided.", "We refuse a kind offer, then care feels one-sided.");
edit("venus-scorpio", "C", "35", "opening", "The follow-up question gets asked.", "We ask the follow-up question.");
edit("venus-scorpio", "C", "35", "tension", "Reassurance arrives, but gets treated as suspicious because it came too easily.", "Reassurance arrives, but we treat it as suspicious because it came too easily.");
edit("venus-scorpio", "C", "35", "development", "even open affection gets checked for hidden motives", "we check even open affection for hidden motives");
edit("venus-capricorn", "C", "35", "opening", "Plans get confirmed.", "We confirm plans.");
edit("venus-capricorn", "C", "35", "development", "A wanted purchase gets dismissed because pleasure alone does not feel like enough reason.", "We dismiss a wanted purchase because pleasure alone does not feel like enough reason.");

edit("sun-libra", "C", "D-mediation-language", "opening", "without flattening either side", "without flattening either person's view");
edit("venus-cancer", "C", "D-mediation-language", "development", "The more care is used to prevent distance, the less freely both sides can choose closeness. What began as protection leaves one side monitoring every response and the other pulling away from the pressure.", "The more care is used to prevent distance, the less freely each person can choose closeness. What began as protection leaves one person monitoring every response while the other pulls away.");
edit("venus-libra", "C", "D-mediation-language", "development", "a relationship where one side always chooses the harmless answer", "a relationship where the same person always chooses the harmless answer");
replaceField("venus-libra", "C", "D-mediation-language", "close", "Before {{exitDate}}, an arrangement may strain when one side can no longer keep agreeing to what it does not want.", "Before {{exitDate}}, an arrangement may strain when the person who kept agreeing can no longer accept what they do not want.");
edit("venus-aquarius", "C", "D-mediation-language", "development", "even as one side reads it as rejection", "even as one partner reads it as rejection");
edit("venus-aquarius", "C", "D-mediation-language", "development", "When nobody names the attachment, each side starts protecting independence from a demand that has not even been made.", "When nobody names what the relationship is, each person starts protecting independence from a demand that has not even been made.");

const lintShape = (article) => ({ hook: article.opening, lived: article.tension, turn: article.development, close: article.close, moves: article.try_this });
const articles = Object.values(records).map((record) => {
  const lint = lintArticle({ ...lintShape(record.article), planet: record.planet, sign: record.sign });
  return {
    ...record,
    editorialStatus: "owner_edit_candidate",
    reviewStatus: "needs_review",
    ownerApproved: false,
    promotionAuthorized: false,
    canonical: false,
    servingAuthorized: false,
    generationEvidenceAuthorized: false,
    lint
  };
});
const batchLint = lintBatchRepetition(articles.map(({ id, article }) => ({ id, article })));
const lintSummary = {
  articleCount: articles.length,
  scoreCounts: articles.reduce((counts, entry) => ({ ...counts, [entry.lint.score]: (counts[entry.lint.score] || 0) + 1 }), {}),
  totalFails: articles.reduce((sum, entry) => sum + entry.lint.fails, 0),
  totalWarns: articles.reduce((sum, entry) => sum + entry.lint.warns, 0),
  articles: articles.map(({ id, lint }) => ({ id, ...lint })),
  batchRepetition: batchLint
};
const payload = {
  schemaVersion: 1,
  id: "sky-placement-writer-sun-venus-24-owner-edit-pass-v1-revised",
  recordedAt: new Date().toISOString(),
  authority: "review/sun-venus-24-owner-edit-pass-v1.md",
  sourceSet: "sky-placement-writer-sun-venus-24-2026-08-04",
  changeCounts: {
    total: changes.length,
    sectionA: changes.filter((entry) => entry.section === "A").length,
    sectionB: changes.filter((entry) => entry.section === "B").length,
    sectionC: changes.filter((entry) => entry.section === "C").length
  },
  governance: {
    reviewStatus: "needs_review",
    ownerApproved: false,
    promotionAuthorized: false,
    canonical: false,
    servingAuthorized: false,
    generationEvidenceAuthorized: false,
    billedCalls: 0,
    terraCalls: 0,
    approvalRecordedFromThisPass: false
  },
  unmappedEdits: unmapped,
  articles
};

const title = (value) => value[0].toUpperCase() + value.slice(1);
const quoteBlock = (value) => {
  const text = String(value);
  if (!text) return "> *(deleted)*";
  return text.split("\n").map((line) => `> ${line.trimEnd()}`).join("\n");
};
const articleMd = [
  "# Sun/Venus 24 owner edit pass V1 - revised drafts",
  "",
  "Status: `needs_review`. No approval, promotion, generation-evidence authorization, canonical status, or serving authorization is recorded by this pass.",
  "",
  `Applied changes: ${changes.length}. Unmapped edits: ${unmapped.length}. Billed calls: 0. Terra calls: 0.`,
  "",
  ...articles.flatMap((entry) => [
    `## ${title(entry.planet)} in ${title(entry.sign)}`,
    "",
    `Lint: score ${entry.lint.score}; fails ${entry.lint.fails}; warnings ${entry.lint.warns}.`,
    "",
    "**Opening**", "", entry.article.opening, "",
    "**Tension**", "", entry.article.tension, "",
    "**Development**", "", entry.article.development, "",
    "**Close**", "", entry.article.close, "",
    "**Try this**", "", ...entry.article.try_this.map((move) => `- ${move}`), ""
  ])
].join("\n");

const beforeAfterMd = [
  "# Sun/Venus 24 owner edit pass V1 - before/after diff",
  "",
  "Every editorial change in the revised 24-draft set is listed here. Original model result files remain unchanged.",
  "",
  `Total changes: ${changes.length}. Section A: ${changes.filter((entry) => entry.section === "A").length}. Section B: ${changes.filter((entry) => entry.section === "B").length}. Section C: ${changes.filter((entry) => entry.section === "C").length}.`,
  "",
  ...changes.flatMap((entry, index) => [
    `## ${index + 1}. ${entry.id} - Section ${entry.section}, item ${entry.item}`,
    "",
    `Field: \`${entry.field}\``,
    "",
    "**Before**", "", quoteBlock(entry.before), "",
    "**After**", "", quoteBlock(entry.after), ""
  ]),
  "## Unmapped edits", "",
  ...(unmapped.length ? unmapped.map((entry) => `- ${entry.id} Section ${entry.section} item ${entry.item}: ${entry.reason}`) : ["- None."]),
  ""
].join("\n");

fs.writeFileSync(outputs.json, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(outputs.md, `${articleMd.trimEnd()}\n`);
fs.writeFileSync(outputs.diff, `${beforeAfterMd.trimEnd()}\n`);
fs.writeFileSync(outputs.lint, `${JSON.stringify(lintSummary, null, 2)}\n`);

if (unmapped.length) {
  console.error(JSON.stringify({ unmapped }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    articles: articles.length,
    changes: payload.changeCounts,
    lint: {
      scoreCounts: lintSummary.scoreCounts,
      totalFails: lintSummary.totalFails,
      totalWarns: lintSummary.totalWarns,
      batchRepetitionPassed: batchLint.passed
    },
    outputs: Object.values(outputs).map((value) => path.relative(packageRoot, value))
  }, null, 2));
}
