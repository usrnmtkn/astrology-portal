import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  betweenYouTwoFamily,
  betweenYouTwoSourceGroups,
  renderBetweenYouTwoPreview
} from "../apps/admin/src/betweenYouTwoSources.ts";

const selection = {
  transiting: "venus",
  transitAspect: "trine",
  endpointPlanet: "mars",
  endpointOwner: "friend",
  activatedPlanet: "sun",
  natalAspect: "conjunction"
};

assert.equal(betweenYouTwoFamily("venus", "trine"), "soft");
assert.equal(betweenYouTwoFamily("saturn", "conjunction"), "hard");
const groups = betweenYouTwoSourceGroups(selection);
assert.deepEqual(groups.map((group) => group.key), ["reader-card", "fallbacks"]);
assert.deepEqual(groups[0].sources[0].candidateKeys, ["fallback-hook/bond-effect-trine/venus"]);
assert.deepEqual(groups[0].sources[1].candidateKeys, [
  "fallback-hook/synastry-pair/sun/mars/conjunction",
  "fallback-hook/synastry-pair/mars/sun/conjunction"
]);
assert.deepEqual(groups[1].sources.slice(0, 3).map((source) => source.candidateKeys[0]), [
  "fallback-hook/bond-effect-soft/venus",
  "fallback-hook/bond-effect-soft/venus/variant-2",
  "fallback-hook/bond-effect-soft/venus/variant-3"
]);

const rows = new Map([
  ["fallback-hook/bond-effect-trine/venus", {
    key: "fallback-hook/bond-effect-trine/venus",
    bodyYou: "{{holder1}} remembers what you like.",
    bodyThey: "You remember what {{holder1}} likes."
  }],
  ["fallback-hook/synastry-pair/sun/mars/conjunction", {
    key: "fallback-hook/synastry-pair/sun/mars/conjunction",
    bodyYou: "You give {{holder2}}'s urge to act a clear direction.",
    bodyThey: "{{holder1}} gives your urge to act a clear direction."
  }]
]);
const preview = renderBetweenYouTwoPreview(selection, (candidateKeys) => {
  const key = candidateKeys.find((candidate) => rows.has(candidate));
  return key ? rows.get(key) : null;
}, "Alisa");
assert.equal(preview.complete, true);
assert.equal(preview.headline, "Venus trine Alisa's Mars");
assert.equal(preview.effectText, "You remember what Alisa likes.");
assert.equal(preview.calculatedFact, "Venus is trine Alisa's Mars, activating the connection it makes with your Sun.");
assert.equal(preview.connectionHeadline, "Your Sun conjunct Alisa's Mars");
assert.equal(preview.connectionText, "You give Alisa's urge to act a clear direction.");

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const dashboard = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const endpoint = fs.readFileSync(path.join(repoRoot, "api/admin/generated-content.ts"), "utf8");
assert.match(dashboard, /Between You Two workspace/u, "Content Studio must expose a dedicated Between You Two workspace.");
assert.match(dashboard, /Calculated astrology fact, not editable/u, "Calculated chart facts must remain separate from editable prose.");
assert.match(dashboard, /When your chart is contacted[\s\S]*?resolved\.bodyYou/u, "The editor must map the reader-contacted direction to body_you.");
assert.match(dashboard, /When their chart is contacted[\s\S]*?resolved\.bodyThey/u, "The editor must map the friend-contacted direction to body_they without pronoun substitution.");
assert.match(dashboard, /Save creates or updates a source through the Content Studio API/u, "The workspace must explain the API-backed CRUD lifecycle.");
assert.match(dashboard, /announceContentUpdate/u, "Saved rows must notify reader hydration after updates.");
assert.match(dashboard, /admin-between-you-two-catalog-v1\.json/u, "The workspace must load its resilient packaged source catalog.");
assert.match(dashboard, /betweenYouTwoSourceForCandidates[\s\S]*?savedRow[\s\S]*?betweenYouTwoSources\.get/u, "Saved API rows must override packaged relationship sources.");
assert.match(dashboard, /packageReviewStatusForDraft\(draftFromRow\(row\)\) !== "deprecated"/u, "Archived CMS overrides must fall back to the packaged reader source.");
assert.match(dashboard, /packageRecord\.body_they === "string" \? packageRecord\.body_they : ""/u, "Missing directional copy must stay empty instead of being synthesized from body_you.");
assert.match(endpoint, /content_key\.like\.fallback-hook\/bond-effect-%/u, "Reloading Compatibility inventory must return saved Between You Two effect rows.");

console.log("Between You Two Content Studio source, CRUD, and hydration contract passed.");
