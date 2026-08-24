#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  fillDailyGlancePersonSlots,
  lintDailyGlanceFriendVoice
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/dailyGlanceVoice.mjs";
import {
  renderDailyGlance as renderNodeDailyGlance
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import {
  createTransitSynastryRenderer as createBrowserSourceRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts";
import {
  createTransitSynastryRenderer as createDistRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import {
  findPronounGrammarIssues,
  genericPersonReferenceSlots,
  possessiveName,
  resolvePersonReference
} from "../apps/web/src/services/personReferences.ts";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const source = JSON.parse(fs.readFileSync(
  new URL("../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json", import.meta.url),
  "utf8"
));
const review = JSON.parse(fs.readFileSync(
  new URL("../packages/astro-knowledge/review/friends-daily-glance-68-role-annotated-2026-08-15.json", import.meta.url),
  "utf8"
));

assert.equal(review.schema, "tldrastro-friends-daily-glance-role-annotated-v1");
assert.equal(review.status, "OWNER_APPROVED_FOR_SERVING");
assert.equal(review.promotionAuthorized, true);
assert.equal(review.servingChanges, true);
assert.equal(review.records.length, 68);
assert.equal(review.migration.agreementSensitiveRecuts, 65);
assert.equal(review.migration.cardsWithRecuts, 47);
assert.equal(review.migration.literalOtherPersonPronounCases, 3);

const sourceByKey = new Map(source.hookRows.map((row) => [row.contentKey, row]));
const dailyHookRows = source.hookRows.filter((row) => /^fallback-hook\/daily-(?:headline|body)\//u.test(row.contentKey));
assert.equal(dailyHookRows.length, 136);

const browserSourceRenderer = createBrowserSourceRenderer(
  { authoredCards: [] },
  { templates: [] },
  { hookRows: dailyHookRows, vocabularyRows: [], dailyGlanceVariants: { keys: {} } }
);
const distRenderer = createDistRenderer(
  { authoredCards: [] },
  { templates: [] },
  { hookRows: dailyHookRows, vocabularyRows: [], dailyGlanceVariants: { keys: {} } }
);

const profiles = [
  { label: "she/her", name: "Nikki", pronouns: "she" },
  { label: "he/him", name: "Ron", pronouns: "he" },
  { label: "they/them", name: "Alex", pronouns: "they" }
];

for (const entry of review.records) {
  assert.equal(entry.status, "OWNER_APPROVED", `${entry.key}: owner-approval status drift`);
  const headlineRow = sourceByKey.get(entry.headlineContentKey);
  const bodyRow = sourceByKey.get(entry.bodyContentKey);
  assert.ok(headlineRow, `${entry.key}: missing headline row`);
  assert.ok(bodyRow, `${entry.key}: missing body row`);
  assert.equal(headlineRow.review_status, "approved");
  assert.equal(bodyRow.review_status, "approved");
  assert.equal(sha256(headlineRow.body_you), entry.sourceSelf.headlineSha256, `${entry.key}: Self headline changed`);
  assert.equal(sha256(bodyRow.body_you), entry.sourceSelf.bodySha256, `${entry.key}: Self body changed`);
  assert.equal(headlineRow.body_they, entry.roleAnnotatedFriend.headline, `${entry.key}: Friend headline drift`);
  assert.equal(bodyRow.body_they, entry.roleAnnotatedFriend.body, `${entry.key}: Friend body drift`);
  assert.deepEqual(lintDailyGlanceFriendVoice(headlineRow.body_they), [], `${entry.key}: headline lint`);
  assert.deepEqual(lintDailyGlanceFriendVoice(bodyRow.body_they), [], `${entry.key}: body lint`);

  const [group, target] = entry.key.split("/");
  const facts = group === "house"
    ? { house: Number(target) }
    : { natal: target, aspect: group === "soft" ? "trine" : group };

  for (const profile of profiles) {
    const reference = resolvePersonReference({ name: profile.name, pronouns: profile.pronouns });
    const personSlots = {
      ...genericPersonReferenceSlots(reference),
      personPreferredName: profile.name,
      personPreferredNamePossessive: possessiveName(profile.name)
    };
    const expected = {
      headline: fillDailyGlancePersonSlots(entry.roleAnnotatedFriend.headline, personSlots),
      body: fillDailyGlancePersonSlots(entry.roleAnnotatedFriend.body, personSlots)
    };
    const rendered = [
      ["node", renderNodeDailyGlance({ ...facts, voice: "they", personSlots })],
      ["browser-source", browserSourceRenderer.renderDailyGlance({ ...facts, voice: "they", personSlots })],
      ["dist", distRenderer.renderDailyGlance({ ...facts, voice: "they", personSlots })]
    ];

    for (const [implementation, card] of rendered) {
      assert.deepEqual(
        { headline: card.headline, body: card.body },
        expected,
        `${entry.key} ${profile.label}: ${implementation} render drift`
      );
      assert.doesNotMatch(card.headline, /\{\{|\}\}/u, `${entry.key} ${profile.label}: unresolved headline slot`);
      assert.doesNotMatch(card.body, /\{\{|\}\}/u, `${entry.key} ${profile.label}: unresolved body slot`);
      assert.doesNotMatch(card.headline, /\b(?:you|your|yours|yourself|yourselves)\b/iu, `${entry.key} ${profile.label}: headline leaked second person`);
      assert.doesNotMatch(card.body, /\b(?:you|your|yours|yourself|yourselves)\b/iu, `${entry.key} ${profile.label}: body leaked second person`);
      assert.deepEqual(findPronounGrammarIssues(`${card.headline} ${card.body}`), [], `${entry.key} ${profile.label}: pronoun grammar`);
    }
  }
}

console.log("Daily Glance role-annotated Friend copy passed for 68 keys, three pronoun profiles, and Node/browser/dist renderers.");
