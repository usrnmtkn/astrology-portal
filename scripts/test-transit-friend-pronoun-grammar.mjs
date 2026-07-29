import assert from "node:assert/strict";
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
  377,
  "The friend-pronoun gate must cover the complete authored transit-aspect library."
);

assert.ok(
  findPronounGrammarIssues("The old goal may stop satisfying they.").some(
    (issue) => issue.pattern === "object verb uses subject they"
  ),
  "Pronoun grammar review must retain teeth for object-position `they`."
);

for (const row of transitAspectRows) {
  const friendBody = friendVoiceFromReaderCopy(row.body_you ?? row.body, "Sofia");
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
assert.match(
  renderedNeptuneFriendCard.body,
  /^The achievements that used to satisfy them may stop satisfying them\./u,
  "The production resolver must use the grammar-safe friend rendering."
);
assert.deepEqual(
  findPronounGrammarIssues(renderedNeptuneFriendCard.body),
  [],
  "The rendered Neptune-Neptune friend card must pass pronoun grammar review."
);

console.log(`Transit friend-pronoun grammar passed for ${transitAspectRows.length} authored rows.`);
