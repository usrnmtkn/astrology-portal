import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";

import {
  friendVoiceFromReaderCopy,
  renderTransitAspect
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import {
  findPronounGrammarIssues
} from "../apps/web/src/services/personReferences.ts";

const transitLibrary = JSON.parse(
  fs.readFileSync(
    new URL(
      "../apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json",
      import.meta.url
    ),
    "utf8"
  )
);

const transitAspectRows = transitLibrary.authoredCards.filter((row) => (
  row.contentKey.startsWith("authored/transit-aspect/")
  && typeof (row.body_you ?? row.body) === "string"
));

assert.equal(
  transitAspectRows.length,
  378,
  "The friend-pronoun gate must cover the complete authored transit-aspect library."
);

assert.ok(
  findPronounGrammarIssues("The old goal may stop satisfying they.").some(
    (issue) => issue.pattern === "object verb uses subject they"
  ),
  "Pronoun grammar review must retain teeth for object-position `they`."
);
assert.equal(
  friendVoiceFromReaderCopy("Someone keeps cheering you up.", "Sofia"),
  "Someone keeps cheering them up.",
  "Object-position reader references in phrasal verbs must use the friend object form."
);

for (const row of transitAspectRows) {
  assert.equal(typeof row.body_they, "string", `${row.contentKey}: explicit Friends copy is required.`);
  assert.equal(row.body_they_review_status, "approved", `${row.contentKey}: Friends copy must retain its independent approval state.`);
  assert.equal(row.body_they_approval?.approvalLevel, "exact_owner_approved", `${row.contentKey}: Friends copy must retain exact owner approval.`);
  assert.equal(
    createHash("sha256").update(row.body_they).digest("hex"),
    row.body_they_sha256,
    `${row.contentKey}: Friends copy hash must match its approved payload.`
  );
  const firstSentence = row.body_they.match(/^[\s\S]*?[.!?](?:\s|$)/u)?.[0] ?? row.body_they;
  assert.match(firstSentence, /\{\{Name\}\}/u, `${row.contentKey}: the friend must be named in the first sentence.`);
  const friendBody = row.body_they.replaceAll("{{Name}}", "Sofia");
  const issues = findPronounGrammarIssues(friendBody);

  assert.doesNotMatch(
    friendBody,
    /\b(?:you|your|yours|yourself|yourselves)\b/iu,
    `${row.contentKey}: second-person language leaked into friend voice.`
  );
  assert.deepEqual(
    issues,
    [],
    `${row.contentKey}: ${issues.map((issue) => `${issue.pattern}: ${issue.sentence}`).join(" | ")}`
  );
}

const neptuneHardRow = transitAspectRows.find(
  (row) => row.contentKey === "authored/transit-aspect/neptune/neptune/hard"
);
assert.ok(neptuneHardRow, "The Neptune-Neptune hard card must remain in the authored library.");

const neptuneFriendBody = friendVoiceFromReaderCopy(neptuneHardRow.body_you, "Nikki");
assert.match(
  neptuneFriendBody,
  /^The achievements that used to satisfy them may stop satisfying them\./u,
  "Object-position reader references should render with the correct friend pronoun."
);
assert.doesNotMatch(
  neptuneFriendBody,
  /\bsatisf(?:y|ies|ied|ying)\s+they\b/iu,
  "The Neptune-Neptune regression must never render object-position `they`."
);

const renderedNeptuneFriendCard = renderTransitAspect({
  transiting: "neptune",
  natal: "neptune",
  aspect: "square",
  voice: "Nikki",
  window: "Until February 1"
});
assert.equal(
  renderedNeptuneFriendCard.templateKey,
  "authored/transit-aspect",
  "Approved explicit Friends copy must serve from the exact authored row."
);
assert.equal(
  renderedNeptuneFriendCard.contentKey,
  "authored/transit-aspect/neptune/neptune/hard",
  "Friend rendering must retain provenance from its approved explicit Friends row."
);
assert.match(
  renderedNeptuneFriendCard.body,
  /^For Nikki, the achievements that used to satisfy them may stop satisfying them\./u,
  "The exact Friends passage must establish the affected person by name in its first sentence."
);
assert.deepEqual(
  findPronounGrammarIssues(renderedNeptuneFriendCard.body),
  [],
  "The rendered Neptune-Neptune friend card must pass pronoun grammar review."
);

const renderedSunAscendantFriendCard = renderTransitAspect({
  transiting: "sun",
  natal: "ascendant",
  aspect: "square",
  sign: "virgo",
  voice: "Alisa P",
  window: "Until September 4"
});
assert.equal(
  renderedSunAscendantFriendCard.templateKey,
  "authored/transit-aspect",
  "Sun square Ascendant must use its approved explicit Friends passage."
);
assert.match(
  renderedSunAscendantFriendCard.body,
  /^For Alisa P, someone pushes today/u,
  "The screenshot regression must name Alisa P before any third-person pronoun."
);
assert.doesNotMatch(
  renderedSunAscendantFriendCard.body,
  /\b(?:you|your|yours|yourself|yourselves)\b/iu,
  "The friend-safe fallback must not leak second-person language."
);

console.log(`Transit friend-pronoun grammar passed for ${transitAspectRows.length} authored rows.`);
