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
  "Someone keeps cheering Sofia up.",
  "Object-position reader references in phrasal verbs must use the friend object form."
);

for (const row of transitAspectRows) {
  const friendBody = friendVoiceFromReaderCopy(row.body_you ?? row.body, "Sofia");
  const issues = findPronounGrammarIssues(friendBody);

  assert.doesNotMatch(
    friendBody,
    /\b(?:you|your|yours|yourself|yourselves)\b/iu,
    `${row.contentKey}: second-person language leaked into fallback friend voice.`
  );
  assert.deepEqual(
    issues,
    [],
    `${row.contentKey}: fallback conversion: ${issues.map((issue) => `${issue.pattern}: ${issue.sentence}`).join(" | ")}`
  );

  if (typeof row.body_they === "string" && row.body_they.trim()) {
    const explicitFriendBody = row.body_they
      .replaceAll("{{Name}}", "Sofia")
      .replaceAll("{{aspectWord}}", "square")
      .replaceAll("{{untilDate}}", "February 1");
    const explicitIssues = findPronounGrammarIssues(explicitFriendBody);
    assert.doesNotMatch(
      explicitFriendBody,
      /\b(?:you|your|yours|yourself|yourselves)\b/iu,
      `${row.contentKey}: second-person language leaked into explicit Friends copy.`
    );
    assert.deepEqual(
      explicitIssues,
      [],
      `${row.contentKey}: explicit Friends copy: ${explicitIssues.map((issue) => `${issue.pattern}: ${issue.sentence}`).join(" | ")}`
    );
  }
}

const neptuneHardRow = transitAspectRows.find(
  (row) => row.contentKey === "authored/transit-aspect/neptune/neptune/hard"
);
assert.ok(neptuneHardRow, "The Neptune-Neptune hard card must remain in the authored library.");

const neptuneFriendBody = friendVoiceFromReaderCopy(neptuneHardRow.body_you, "Nikki");
assert.match(
  neptuneFriendBody,
  /^The achievements that used to satisfy them may stop satisfying them\./u,
  "Fallback object-position reader references should render with the correct friend pronoun."
);
assert.doesNotMatch(
  neptuneFriendBody,
  /\bsatisf(?:y|ies|ied|ying)\s+they\b/iu,
  "The Neptune-Neptune fallback regression must never render object-position `they`."
);

assert.equal(typeof neptuneHardRow.body_they, "string", "The owner-approved Neptune-Neptune Friends release must carry explicit body_they.");
const renderedNeptuneFriendCard = renderTransitAspect({
  transiting: "neptune",
  natal: "neptune",
  aspect: "square",
  voice: "Nikki",
  window: "Until February 1"
});
const expectedExplicitNeptuneFriendBody = neptuneHardRow.body_they
  .replaceAll("{{Name}}", "Nikki")
  .replaceAll("{{aspectWord}}", "square")
  .replaceAll("{{untilDate}}", "February 1");
assert.ok(
  renderedNeptuneFriendCard.body === expectedExplicitNeptuneFriendBody
    || renderedNeptuneFriendCard.body.startsWith(`${expectedExplicitNeptuneFriendBody}\n\n`),
  "The production resolver must begin with the exact explicit owner-approved Friends passage before any governed addendum."
);
assert.deepEqual(
  findPronounGrammarIssues(renderedNeptuneFriendCard.body),
  [],
  "The full rendered Neptune-Neptune friend card, including any governed addendum, must pass pronoun grammar review."
);

console.log(`Transit friend-pronoun grammar passed for ${transitAspectRows.length} authored rows.`);
