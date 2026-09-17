import assert from "node:assert/strict";
import fs from "node:fs";
import {
  exactPersonalTransitContentKeys,
  findNextMissingPersonalTransitWriteup,
  knowledgeIdsFor,
  missingPersonalTransitAudiences,
  parsePersonalTransitContact,
  parsePersonalTransitPreview,
  personalTransitReviewChecks,
  requestedAudiences,
  reviewPersonalTransitCopy
} from "../api/_lib/personal-transit-writing.ts";

const ui = fs.readFileSync(new URL("../apps/admin/src/PersonalTransitAiWriter.tsx", import.meta.url), "utf8");
const dashboard = fs.readFileSync(new URL("../apps/admin/src/GeneratedContentAdminDashboard.tsx", import.meta.url), "utf8");
const endpoint = fs.readFileSync(new URL("../api/admin/personal-transit-writing.ts", import.meta.url), "utf8");
const lib = fs.readFileSync(new URL("../api/_lib/personal-transit-writing.ts", import.meta.url), "utf8");

assert.equal(parsePersonalTransitContact({ transiting: "Sun", natal: "sun", aspect: "square" }).contentKey, "authored/transit-aspect/sun/sun/square");
assert.equal(parsePersonalTransitContact({ transiting: "sun", natal: "sun", aspect: "conjunction" }).contentKey, "authored/transit-return/sun");
assert.equal(parsePersonalTransitContact({ contentKey: "authored/transit-return/sun" }).contentKey, "authored/transit-return/sun");
assert.equal(parsePersonalTransitContact({ transiting: "sun", natal: "moon", aspect: "square", transitHouse: "3rd", natalHouse: "7" }).contentKey, "authored/transit-aspect/sun/moon/square");
assert.equal(parsePersonalTransitContact({ transiting: "sun", natal: "sun", aspect: "square", sign: "aries", transitHouse: "1", natalHouse: "1" }).contentKey, "authored/transit-aspect/sun/sun/square/aries/1/1");
assert.deepEqual(knowledgeIdsFor(parsePersonalTransitContact({ transiting: "sun", natal: "sun", aspect: "square", sign: "aries", transitHouse: "1", natalHouse: "1" })), ["transit-aspect/sun/sun/square"]);
assert.equal(parsePersonalTransitContact({ contentKey: "authored/transit-aspect/sun/sun/square/aries/1/1" }).contentKey, "authored/transit-aspect/sun/sun/square/aries/1/1");
assert.deepEqual(parsePersonalTransitPreview({ sign: "Aries", transitHouse: "1", natalHouse: "1" }), { sign: "aries", transitHouse: "1", natalHouse: "1" });
assert.deepEqual(knowledgeIdsFor(parsePersonalTransitContact({ transiting: "sun", natal: "moon", aspect: "square", transitHouse: "1" })), ["transit-aspect/sun/moon/square"]);
assert.doesNotMatch(lib, /ids\.push\(`house\//u);
assert.equal(parsePersonalTransitContact({ contentKey: "authored/transit-house-intro/sun/4" }).family, "house-intro");
assert.equal(parsePersonalTransitContact({ planet: "mars", house: "11", sign: "virgo" }).contentKey, "authored/transit-house-sign/mars/11/virgo");
assert.throws(() => parsePersonalTransitContact({ transiting: "sun", natal: "sun", aspect: "quincunx" }), /exact transit-to-natal contact or House Transit passage/u);
assert.deepEqual(missingPersonalTransitAudiences({ you: "", friend: "saved" }), ["you"]);
assert.deepEqual(missingPersonalTransitAudiences({ you: "saved", friend: "saved" }), []);
assert.deepEqual(requestedAudiences("both", "Starter You.", "{{Name}} starter Friend.", ""), []);
assert.deepEqual(requestedAudiences("both", "Starter You.", "{{Name}} starter Friend.", "", { allowFilledRewrite: true }), ["you", "friend"]);
assert.deepEqual(requestedAudiences("both", "Starter You.", "", ""), ["friend"]);
assert.deepEqual(requestedAudiences("you", "Starter You.", "", ""), []);
assert.deepEqual(requestedAudiences("you", "Starter You.", "", "", { allowFilledRewrite: true }), ["you"]);
assert.deepEqual(requestedAudiences("both", "Starter You.", "{{Name}} starter Friend.", "Tighten the opening."), ["you", "friend"]);

const checks = personalTransitReviewChecks({
  you: "You may defend a plan in Aries.",
  friend: "You may defend a plan in Aries.",
  siblings: [{ contentKey: "authored/transit-aspect/sun/sun/trine", you: "You may defend a plan in Aries.", friend: "" }]
});
assert(checks.some((item) => item.code === "unexpected-sign"));
assert(checks.some((item) => item.code === "missing-name"));
assert(checks.some((item) => item.code === "near-identical-sibling"));
assert(!personalTransitReviewChecks({
  you: "You may defend a plan in the 4th house.",
  allowHouses: true,
  allowSigns: false
}).some((item) => item.code === "unexpected-house" || item.code === "unexpected-sign"));

const keys = exactPersonalTransitContentKeys();
assert(keys.includes("authored/transit-aspect/sun/sun/sextile"));
assert(!keys.includes("authored/transit-aspect/sun/sun/square/aries/1/1"));
const next = findNextMissingPersonalTransitWriteup({
  keys: ["authored/transit-aspect/sun/sun/sextile", "authored/transit-aspect/sun/sun/square"],
  studioByKey: new Map([
    ["authored/transit-aspect/sun/sun/sextile", { content_key: "authored/transit-aspect/sun/sun/sextile", sections: { packageDraft: { body_you: "Saved You.", body_they: "Saved Friend." } } }]
  ])
});
assert.equal(next?.contentKey, "authored/transit-aspect/sun/sun/square");
assert.deepEqual(next?.missingAudiences, ["you", "friend"]);
const skipped = findNextMissingPersonalTransitWriteup({
  afterContentKey: "authored/transit-aspect/sun/sun/sextile",
  keys: ["authored/transit-aspect/sun/sun/sextile", "authored/transit-aspect/sun/sun/square"],
  studioByKey: new Map([
    ["authored/transit-aspect/sun/sun/square", { content_key: "authored/transit-aspect/sun/sun/square", sections: { packageDraft: { body_you: "Studio You only.", body_they: "" } } }]
  ])
});
assert.equal(skipped?.contentKey, "authored/transit-aspect/sun/sun/square");
assert.deepEqual(skipped?.missingAudiences, ["friend"]);
assert.equal(skipped?.hasStudioDraft, true);

assert.match(ui, /Generate You \+ Friend draft/u);
assert.match(ui, /Copied into this exact contact/u);
assert.match(ui, /if \(nextYou\) onUseYou\(nextYou\)/u);
assert.match(ui, /Run writing checks/u);
assert.match(ui, /Use You draft/u);
assert.match(ui, /Use Friend draft/u);
assert.match(ui, /Next missing write-up/u);
assert.match(ui, /adminCredentialHeaders\(credential\)/u);
// Keep the four-line compact instruction field without contradicting the
// shared CSS audit by requiring an inline pixel style.
assert.match(ui, /rows=\{4\}[\s\S]{0,120}className="admin-ai-writing-instruction"/u);
assert.doesNotMatch(ui, /\bstyle\s*=/u);
const studioCss = fs.readFileSync(new URL("../apps/admin/src/studio-system.css", import.meta.url), "utf8");
assert.match(studioCss, /\.admin-ai-writing-instruction\s*\{\s*min-height:\s*var\(--studio-compact-textarea-height\)/u);
assert.match(dashboard, /PersonalTransitAiWriter/u);
assert.match(dashboard, /transitHouse=\{transitNatalTransitHouse\}/u);
assert.match(dashboard, /natalHouse=\{transitNatalNatalHouse\}/u);
assert.match(dashboard, /sign=\{transitNatalSign\}/u);
assert.match(dashboard, /Write-up destination: six-part situation/u);
assert.match(dashboard, /exactSelection \?\? contact/u);
assert.match(dashboard, /isExactPersonalTransitDraft && isDynamicTransitNatalExactKey/u);
assert.match(dashboard, /authored\/transit-return\//u);
assert.match(dashboard, /defaultOpen/u);
assert.match(dashboard, /setPackageSectionField\(current, "body_you", text\)/u);
const exactAction = fs.readFileSync(new URL("../apps/admin/src/TransitNatalReaderPreview.tsx", import.meta.url), "utf8");
assert.match(exactAction, /<PersonalTransitAiWriter[\s\S]{0,800}youText=""/u);
assert.match(exactAction, /transitHouse=\{transitHouse\}/u);
assert.match(exactAction, /six-part situation/u);
assert.match(exactAction, /Write this six-part situation/u);
assert.doesNotMatch(exactAction, /Preview sign and houses are not used/u);
assert.match(exactAction, /defaultOpen/u);
const houseEditor = fs.readFileSync(new URL("../apps/admin/src/HouseTransitWriteupEditor.tsx", import.meta.url), "utf8");
assert.match(houseEditor, /PersonalTransitAiWriter/u);
assert.match(houseEditor, /authored\/transit-house/u);
assert.match(endpoint, /sendAdminMethodNotAllowed\(res, \["POST"\]\)/u);
assert.match(endpoint, /saved: false/u);
assert.match(endpoint, /action === "recheck"/u);
assert.doesNotMatch(endpoint, /status: "LIVE"/u);
assert.doesNotMatch(lib, /saveGeneratedInterpretation/u);
assert.match(lib, /loadStudioTransitRows/u);
assert.match(lib, /allowFilledRewrite: !saved\.studioPresent/u);
assert.match(lib, /licensedVariables: \[\.\.\.allowedVariables\]/u);
assert.match(lib, /housesExcluded: !allowsHouses/u);
assert.match(lib, /previewSituation: aspectPreviewLabel/u);
assert.match(lib, /Use this chart situation as the scene/u);
const reviewed = reviewPersonalTransitCopy({
  contact: parsePersonalTransitContact({ transiting: "sun", natal: "sun", aspect: "square" }),
  you: "You may defend a plan in Aries.",
  friend: "{{Name}} may defend a plan."
});
assert.equal(reviewed.contentKey, "authored/transit-aspect/sun/sun/square");
assert(reviewed.checks.some((item) => item.code === "unexpected-sign"));
const previewReviewed = reviewPersonalTransitCopy({
  contact: parsePersonalTransitContact({ transiting: "sun", natal: "sun", aspect: "square" }),
  preview: parsePersonalTransitPreview({ sign: "aries", transitHouse: "1", natalHouse: "1" }),
  you: "You may defend a plan from the 1st house while the Sun is in Aries.",
  friend: "{{Name}} may defend a plan from the 1st house."
});
assert.equal(previewReviewed.checks.some((item) => item.code === "unexpected-sign" || item.code === "unexpected-house"), false);
assert.match(lib, /signsExcluded: !allowsSigns/u);

const deployment = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const memoryConfig = JSON.parse(fs.readFileSync(new URL("../config/agent-memory-sources-v1.json", import.meta.url), "utf8"));
const pattern = deployment.functions["api/admin/personal-transit-writing.ts"]?.includeFiles ?? "";
assert.ok(pattern.length > 0 && pattern.length <= 256, "Personal Transit writer must have a deployable includeFiles pattern.");
assert.match(pattern, /data\/writing/u);
assert.match(pattern, /jsonl/u);
const packaged = new Set(fs.globSync(pattern));
for (const spec of memoryConfig.sources.filter((item) => item.kind === "correction")) {
  assert(packaged.has(spec.path), `Personal Transit writer is missing configured correction source: ${spec.path}`);
}

console.log("Personal Transit writer passed: exact-contact lock, House Transit destinations, Studio-draft inventory, missing-audience fill, review checks, no save/publish path, and correction-memory packaging.");
