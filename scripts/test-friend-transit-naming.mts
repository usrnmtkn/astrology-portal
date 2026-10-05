import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import * as reference from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import { createTransitSynastryRenderer as browserRenderer } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts";
import { createTransitSynastryRenderer as shippedRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { personalTransitReviewChecks, friendTransitNamingRule, bondTransitNamingRule } from "../api/_lib/personal-transit-writing.ts";
import { bondEffectPageHeadline } from "../apps/admin/src/bondEffectPageAssembly.ts";
import { packageAuthoredCardFromRow } from "../apps/web/src/services/fallbackArchitectureV3CorePackaging.ts";

const root = "apps/web/src/content/fallbackArchitectureV3/";
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const authored = read(`${root}source-rows/transit-synastry-rows-v1.json`);
const hooks = read(`${root}source-rows/fallback-source-rows-v3.json`);
const templates = read(`${root}templates/fallback-templates-v3.json`);
const shipped = read(`${root}bundled-transit-core-authored-cards-v3.json`);
const ledger = read("packages/astro-knowledge/review/friend-transit-pronouns-2026-10-05.json");
const restoration = read("packages/astro-knowledge/review/between-you-two-name-restoration-2026-10-05.json");
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const rows = new Map([...authored.authoredCards, ...hooks.hookRows].map(row => [row.contentKey, row]));
for (const edit of ledger.edits.filter(edit => !edit.contentKey.startsWith("fallback-hook/bond-effect-"))) {
  const row = rows.get(edit.contentKey)!;
  assert.equal(hash(row[edit.field]), edit.afterSha256, `${edit.contentKey}/${edit.field}: exact reviewed revision`);
  assert.doesNotMatch(row[edit.field], /\{\{(?:Name|holder1)\}\}/u);
  assert.doesNotMatch(row[edit.field], /\bthey (?:is|was|has|does|gets|needs|wants)\b/iu);
  assert.doesNotMatch(row[edit.field], /\b(?:for|to|with|fitting) they\b/iu);
}

const renderers = [reference, browserRenderer(authored, templates, hooks), shippedRenderer(shipped, templates, hooks)];
for (const edit of restoration.edits) {
  assert.equal(hash(rows.get(edit.contentKey)![edit.field]), edit.afterSha256, `${edit.contentKey}/${edit.field}: whole-sentence name restoration`);
}
const relationshipRows = hooks.hookRows.filter(row => row.contentKey.startsWith("fallback-hook/bond-effect-"));
assert.equal(relationshipRows.length, 139);
for (const row of relationshipRows) for (const field of ["body_you", "body_they"]) {
  assert.doesNotMatch(row[field], /\b(?:in|keep|for|with) they\b|\bthey (?:realiz|probably means|no longer has|notice your work and says)\b|\byou know them noticed\b|bothers the two of you does not argue/iu, `${row.contentKey}/${field}: damaged conversion must not return`);
  assert.doesNotMatch(row[field], /\{\{(?!holder1\}\})/u);
}
const supplied = authored.authoredCards.filter(row => row.body_they_authorship === "owner_supplied");
assert.equal(supplied.length, 6);
const previous = shippedRenderer({ authoredCards: authored.authoredCards.filter(row => row.body_they_authorship !== "owner_supplied") }, templates, hooks);
for (const row of supplied) {
  const [, , transiting, natal, aspect] = row.contentKey.split("/");
  const facts = { transiting, natal, aspect, voice: "Example Friend", window: "until October 28" };
  for (const renderer of renderers) {
    const card = renderer.renderTransitAspect(facts);
    assert.equal(card.contentKey, row.contentKey);
    assert.equal(card.body, row.body_they, "Complete supplied copy serves verbatim, including its ending.");
    assert.doesNotMatch(card.headline, /Example Friend/u);
    assert.equal(renderer.renderTransitAspect({ ...facts, voice: "you" }).body, previous.renderTransitAspect({ ...facts, voice: "you" }).body, "Friend-only revisions must preserve the You passage.");
  }
  const hydrated = packageAuthoredCardFromRow({ id: "fixture", content_key: row.contentKey, sections: { packageRecord: row }, facts: { content_role: "full_copy", review_status: "approved" }, updated_at: "2026-10-05T00:00:00Z" } as any);
  assert.equal(hydrated?.body_they, row.body_they, "Studio packaging preserves a friend-only exact revision.");
  assert.equal(hydrated?.body_you, undefined);
}

const cases = [
  {
    facts: { transiting: "saturn", aspect: "sextile", endpointOwner: "reader", endpointPlanet: "ascendant", activatedPlanets: ["saturn", "ascendant", "midheaven"], sign: "aries", window: "Until November 10" },
    headline: "Saturn sextile your Ascendant",
    opening: "A recurring agreement between you and Example Friend finally gets put into actual terms. The date gets picked, the standing call goes on the calendar, or the two of you decide who is paying and who is responsible for what. There is less room to remember the agreement differently later.",
    astrology: "Saturn in Aries is sextile your Ascendant through November 10, activating the connections it makes with Example Friend's Saturn, Ascendant, and Midheaven."
  },
  {
    facts: { transiting: "jupiter", aspect: "opposition", endpointOwner: "friend", endpointPlanet: "sun", activatedPlanets: ["mars", "midheaven", "uranus", "neptune"], sign: "leo", window: "Until October 28" },
    headline: "Jupiter opposite Example Friend's Sun",
    opening: "Example Friend wants the bigger version of the plan while you are figuring out what it actually costs. The idea may be good. The disagreement starts around how much money, time, or effort the two of you can realistically give it.",
    astrology: "Jupiter in Leo is opposite Example Friend's Sun through October 28, activating the connections their Sun makes with your Mars, Midheaven, Uranus, and Neptune."
  }
];
for (const fixture of cases) for (const renderer of renderers) {
  const card = renderer.renderBondTransit({ ...fixture.facts, otherName: "Example Friend", friendPossessivePronoun: "his" } as any);
  assert.equal(card.headline, fixture.headline);
  assert.deepEqual(card.parts, [fixture.opening, fixture.astrology]);
}
assert.equal(bondEffectPageHeadline("jupiter", "opposition", "sun", "they", "Example Friend"), "Jupiter opposite Example Friend's Sun");
assert.match(bondTransitNamingRule, /identify the other person with \{\{holder1\}\}/u);
assert.match(friendTransitNamingRule, /Only use the person's name when pronouns would genuinely make the sentence ambiguous/u);
assert.deepEqual(personalTransitReviewChecks({ friend: supplied[0].body_they }), []);
for (const fixture of cases) assert.deepEqual(personalTransitReviewChecks({ you: fixture.opening, family: "bond-effect" }), []);
assert.equal(reference.friendVoiceFromReaderCopy("You're ready. Your plan gives you room. Keep your notes.", "Example Friend"), "They're ready. Their plan gives them room. They should keep their notes.");
console.log(`Friend transit naming: ${restoration.edits.length} restored fields, all 278 relationship passages, six personal passages, three resolvers, Studio packaging, and writer checks passed.`);
