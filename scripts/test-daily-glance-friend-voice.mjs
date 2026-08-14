#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  fillDailyGlancePersonSlots,
  lintDailyGlanceFriendVoice
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/dailyGlanceVoice.mjs";
import {
  renderDailyGlance
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import { SourceGapError } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import { createTransitSynastryRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { findPronounGrammarIssues } from "../apps/web/src/services/personReferences.ts";

const fixtures = JSON.parse(fs.readFileSync(
  new URL("./fixtures/daily-glance-friend-voice-broken-v1.json", import.meta.url),
  "utf8"
));

// Preserve the owner-reported failure shapes as first-class regressions.
for (const fixture of fixtures) {
  const lintRuleIds = lintDailyGlanceFriendVoice(fixture.bodyThey).map((finding) => finding.id);
  const pronounIssues = findPronounGrammarIssues(fixture.bodyThey).map((issue) => issue.pattern);

  for (const ruleId of fixture.expectedLintRules ?? []) {
    assert.ok(lintRuleIds.includes(ruleId), `${fixture.id}: expected ${ruleId}`);
  }
  for (const issue of fixture.expectedPronounIssues ?? []) {
    assert.ok(pronounIssues.includes(issue), `${fixture.id}: expected ${issue}`);
  }
}

const tokenizedTheyCopy = "For the next few hours, {{personPreferredName}} may find it easier to act on what matters to {{personObject}}. Thirty minutes of action can get ahead of {{personPossessiveAdjective}} case for waiting again.";

// Authored friend copy may safely choose where the preferred name appears.
const theyCopy = fillDailyGlancePersonSlots(tokenizedTheyCopy, {
  personPreferredName: "Matthew",
  personObject: "them",
  personPossessiveAdjective: "their"
});
assert.equal(
  theyCopy,
  "For the next few hours, Matthew may find it easier to act on what matters to them. Thirty minutes of action can get ahead of their case for waiting again."
);
assert.doesNotMatch(theyCopy, /\b(?:you|your|yours|yourself|yourselves)\b/iu);

// Pronoun slots come from the profile; the resolver does not change grammar.
const sheCopy = fillDailyGlancePersonSlots(
  "{{personPreferredName}} may reconsider the delay once {{personSubject}} can see what {{personPossessiveAdjective}} first step costs.",
  { personPreferredName: "Alisa", personSubject: "she", personPossessiveAdjective: "her" }
);
assert.equal(sheCopy, "Alisa may reconsider the delay once she can see what her first step costs.");

const fixtureRenderer = createTransitSynastryRenderer(
  { authoredCards: [] },
  { templates: [] },
  {
    vocabularyRows: [],
    hookRows: [
      {
        contentKey: "fallback-hook/daily-headline/soft/mars",
        content_role: "fallback_hook",
        grammar_frame: "complete_sentence",
        review_status: "approved",
        body_you: "Starting is easier today.",
        body_they: "{{personPreferredName}} has an easier opening today."
      },
      {
        contentKey: "fallback-hook/daily-body/soft/mars",
        content_role: "fallback_hook",
        grammar_frame: "complete_sentence",
        review_status: "approved",
        body_you: "You can start the delayed task.",
        body_they: "{{personPreferredName}} may find it easier to start the task {{personSubject}} delayed."
      }
    ]
  }
);
const fixtureFriendCard = fixtureRenderer.renderDailyGlance({
  natal: "mars",
  aspect: "trine",
  voice: "they",
  personSlots: {
    personPreferredName: "Chris",
    personSubject: "he"
  }
});
assert.deepEqual(
  { headline: fixtureFriendCard.headline, body: fixtureFriendCard.body },
  {
    headline: "Chris has an easier opening today.",
    body: "Chris may find it easier to start the task he delayed."
  }
);

// Unknown or missing slots fail closed instead of leaking package artifacts.
assert.throws(
  () => fillDailyGlancePersonSlots("{{friendNickname}} can start.", {}),
  /DG-THEY-ALLOWED-PERSON-SLOTS-ONLY/u
);
assert.throws(
  () => fillDailyGlancePersonSlots("{{personPreferredName}} can start.", {}),
  /DG-THEY-MISSING-PERSON-SLOT/u
);

// The self surface remains byte-for-byte on body_you.
const selfSoftMars = renderDailyGlance({ natal: "mars", aspect: "trine" });
assert.equal(
  selfSoftMars.body,
  "The task you have been putting off may take less energy than all the time you have spent thinking about it. The conversation, decision, or errand may still be annoying, but it feels more possible once you start. Give it thirty minutes before you decide to put it off again."
);

// Mirrored legacy body_they cannot enter the authored friend path.
assert.throws(
  () => renderDailyGlance({
    natal: "mars",
    aspect: "trine",
    voice: "they",
    personSlots: {
      personPreferredName: "Matthew",
      personSubject: "they",
      personPossessiveAdjective: "their"
    }
  }),
  (error) => error instanceof SourceGapError && /DG-THEY-NO-SECOND-PERSON/u.test(error.message)
);

// The migration bridge uses the original author-final second-person copy. It
// keeps the card visible without manufacturing third-person grammar.
const houseElevenBridge = renderDailyGlance({ house: 11 });
assert.equal(
  houseElevenBridge.body,
  "Everyone else may have decided what the plan is before you had much say in it. That puts you in the position of responding to terms you did not choose. Get clear on what is actually required, what can still be changed, and what needs to be clarified in writing. Do not make an imposed plan harder on yourself by quietly agreeing to expectations that were never realistic in the first place."
);
assert.doesNotMatch(houseElevenBridge.body, /locks they|works for them/u);
assert.deepEqual(findPronounGrammarIssues(houseElevenBridge.body), []);

// Every serving key remains visible during the authored-they migration. Clean
// body_they rows render directly; legacy rows use the unchanged self-addressed
// copy rather than a grammar transformer.
const sourceRows = JSON.parse(fs.readFileSync(
  new URL("../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", import.meta.url),
  "utf8"
));
const dailyHeadlinePrefix = "fallback-hook/daily-headline/";
const houseElevenBodyRow = sourceRows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/daily-body/house/11"
);
assert.equal(
  houseElevenBodyRow?.body_they,
  "Notice how tempting it gets to nod along just because the room is moving in one direction. Slipping into consensus keeps things smooth now, but it locks you into commitments you never asked for. Speak up to one person: name what part of the plan actually works for you, and outline the one change that makes it worth your time.",
  "house/11 body_they stays unchanged until the governed Friends migration"
);
const servingKeys = sourceRows.hookRows
  .filter((row) => row.contentKey?.startsWith(dailyHeadlinePrefix) && row.review_status === "approved")
  .map((row) => row.contentKey.slice(dailyHeadlinePrefix.length))
  .sort();
assert.equal(servingKeys.length, 68, "expected the complete 68-key serving surface");

for (const key of servingKeys) {
  const [group, target] = key.split("/");
  const args = group === "house"
    ? { house: Number(target) }
    : { natal: target, aspect: group === "soft" ? "trine" : group };
  let card;
  try {
    card = renderDailyGlance({
      ...args,
      voice: "they",
      personSlots: {
        personName: "Nikki Example",
        personNamePossessive: "Nikki Example's",
        personPreferredName: "Nikki",
        personPreferredNamePossessive: "Nikki's",
        personSubject: "they",
        personObject: "them",
        personPossessiveAdjective: "their",
        personPossessivePronoun: "theirs",
        personReflexive: "themself"
      }
    });
  } catch (error) {
    assert.ok(error instanceof SourceGapError, `${key}: unexpected friend-voice error`);
    card = renderDailyGlance(args);
  }
  assert.ok(card.headline?.trim(), `${key}: visible card needs a headline`);
  assert.ok(card.body?.trim(), `${key}: visible card needs a body`);
  assert.doesNotMatch(card.body, /\b(?:locks|works|costs|helps|lets|keeps) they\b/iu, `${key}: malformed bridge output`);
}

const manualChartsPanel = fs.readFileSync(
  new URL("../apps/web/src/features/friends/ManualChartsPanel.tsx", import.meta.url),
  "utf8"
);
const friendDailyStart = manualChartsPanel.indexOf("function friendDailyGlance(");
const friendDailyEnd = manualChartsPanel.indexOf("\n  function pairDailyClauseKey", friendDailyStart);
const friendDailySource = manualChartsPanel.slice(friendDailyStart, friendDailyEnd > friendDailyStart ? friendDailyEnd : undefined);
assert.match(friendDailySource, /renderDailyGlance\(\{[\s\S]*?voice: "they",[\s\S]*?personSlots/u);
assert.match(friendDailySource, /Migration bridge:[\s\S]*?renderDailyGlance\(\{[\s\S]*?dateKey,[\s\S]*?userId/u);
assert.doesNotMatch(friendDailySource, /createNatalGeneratedCopyForOwnerConverter|repairSingularOwnerVerbAgreement/u);
assert.match(friendDailySource, /personPreferredName: preferredName/u);

console.log("daily At-a-Glance friend-voice checks passed");
