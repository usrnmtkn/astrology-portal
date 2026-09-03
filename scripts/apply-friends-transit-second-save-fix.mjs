#!/usr/bin/env node
import fs from "node:fs";

const apiPath = "api/admin/generated-content.ts";
let api = fs.readFileSync(apiPath, "utf8");
const oldApi = `    const originalSlots = packagePlaceholders(original);
    for (const slot of packagePlaceholders(value)) {
      const isAllowedFriendName = (
        row.content_key.startsWith("fallback-hook/natal-aspect-lived/")
        || row.content_key.startsWith("authored/transit-aspect/")
      )
        && field.endsWith("body_they")
        && slot === "{{Name}}";
      if (isAllowedFriendName) continue;
      if (!originalSlots.has(slot)) {
        throw new Error(\`\${field} contains unresolved placeholder \${slot} that was not in the package original.\`);
      }
    }
`;
const newApi = `    const originalSlots = packagePlaceholders(original);
    const inheritedFriendSlots = (
      row.content_key.startsWith("authored/transit-aspect/")
      && field.endsWith("body_they")
      && originalSlots.size === 0
    )
      ? packagePlaceholders(record.body_you)
      : new Set<string>();
    for (const slot of packagePlaceholders(value)) {
      const isAllowedFriendName = (
        row.content_key.startsWith("fallback-hook/natal-aspect-lived/")
        || row.content_key.startsWith("authored/transit-aspect/")
      )
        && field.endsWith("body_they")
        && slot === "{{Name}}";
      if (isAllowedFriendName) continue;
      if (!originalSlots.has(slot) && !inheritedFriendSlots.has(slot)) {
        throw new Error(\`\${field} contains unresolved placeholder \${slot} that was not in the package original.\`);
      }
    }
`;
if (!api.includes(oldApi)) throw new Error("API placeholder validation block not found");
api = api.replace(oldApi, newApi);
fs.writeFileSync(apiPath, api);

const testPath = "scripts/test-content-studio-api-roundtrip.mjs";
let test = fs.readFileSync(testPath, "utf8");
const anchor = `assert.equal(savedPlaceholderTransitRevision.payload.rows[0].sections.packageDraft.body_you, placeholderRevisedBody);
row = packageRegressionBaseline;
`;
const insertion = `assert.equal(savedPlaceholderTransitRevision.payload.rows[0].sections.packageDraft.body_you, placeholderRevisedBody);

const placeholderFriendBody = "{{Name}} may need to cool down before answering. Venus {{aspectWord}} their Moon until {{untilDate}} keeps the relationship tension visible.";
row = {
  ...packageRegressionBaseline,
  id: "qa-transit-aspect-placeholder-friend-revision",
  content_key: placeholderTransitContentKey,
  surface: "you",
  mode: "feed",
  status: "LIVE",
  lane: "serving",
  review_state: null,
  body: placeholderOriginalBody,
  provider: "tldrastro-fallback-architecture-v3",
  sections: {
    body_you: placeholderOriginalBody,
    body_they: null,
    packageRecord: {
      contentKey: placeholderTransitContentKey,
      content_role: "full_copy",
      body_you: placeholderOriginalBody,
      review_status: "approved"
    },
    packageDraft: {
      contentKey: placeholderTransitContentKey,
      content_role: "full_copy",
      body_you: placeholderOriginalBody,
      body_they: placeholderFriendBody,
      review_status: "approved"
    }
  },
  facts: { fallbackArchitectureV3: true, content_role: "full_copy", review_status: "approved" },
  source_snapshot: {
    sourcePackage: "tldrastro-fallback-architecture-v3",
    content_role: "full_copy",
    review_status: "approved"
  }
};
const savedPlaceholderTransitFriendRevision = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id,
  headline: row.headline,
  summary: row.summary,
  body: row.body,
  sections: row.sections,
  facts: row.facts,
  sourceSnapshot: row.source_snapshot,
  reviewStatus: "needs_review"
});
assert.equal(savedPlaceholderTransitFriendRevision.status, 200, "A blank transit body_they baseline must accept body_you transit placeholders plus {{Name}}.");
assert.equal(savedPlaceholderTransitFriendRevision.payload.rows[0].sections.packageDraft.body_they, placeholderFriendBody);

const publishedPlaceholderTransitFriendRevision = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id,
  ownerAction: "approve-package-revision"
});
assert.equal(publishedPlaceholderTransitFriendRevision.status, 200);
assert.equal(publishedPlaceholderTransitFriendRevision.payload.rows[0].sections.packageRecord.body_they, placeholderFriendBody);
assert.equal(publishedPlaceholderTransitFriendRevision.payload.rows[0].sections.body_they, placeholderFriendBody);

const secondPlaceholderFriendBody = "{{Name}} can answer more clearly after a pause. Venus {{aspectWord}} their Moon until {{untilDate}} still asks for a direct conversation.";
const savedSecondPlaceholderTransitFriendRevision = await invokeApi("PATCH", "/api/admin/generated-content", {
  id: row.id,
  headline: row.headline,
  summary: row.summary,
  body: row.body,
  sections: {
    ...row.sections,
    packageDraft: {
      ...row.sections.packageRecord,
      body_they: secondPlaceholderFriendBody
    }
  },
  facts: row.facts,
  sourceSnapshot: row.source_snapshot,
  reviewStatus: "needs_review"
});
assert.equal(savedSecondPlaceholderTransitFriendRevision.status, 200, "A published Friends transit must be editable again without reloading the package.");
assert.equal(savedSecondPlaceholderTransitFriendRevision.payload.rows[0].sections.packageDraft.body_they, secondPlaceholderFriendBody);
row = packageRegressionBaseline;
`;
if (!test.includes(anchor)) throw new Error("Transit placeholder regression anchor not found");
test = test.replace(anchor, insertion);
fs.writeFileSync(testPath, test);
