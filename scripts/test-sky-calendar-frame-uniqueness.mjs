#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  auditSkyCalendarFrameUniqueness,
  constructionSkeleton,
  DEFAULT_FRAME_CAP,
} from "./sky-calendar-frame-uniqueness.mjs";

const beats = {
  whatMayHappen: "recognition meets a shared rule",
  whyItMatters: "credit and equal application both matter",
  whyItSticksOrMoves: "both positions hold under pressure",
  whatCanMove: "the agreement can become more specific",
};

const ownerForecast = "On Tuesday, August 18, someone may want their effort recognized while the answer coming back is that the same rule applies to everyone. That can turn a quiet frustration into a direct disagreement about credit, exceptions, or what the policy actually covers. Neither side is likely to back down quickly. What can change is the agreement: what counts, who gets recognized, and which rule applies here.";
const ownerDetails = "Sun in Leo opposite Saturn in Aquarius. Someone may want their contribution recognized while the answer coming back is that the same rule applies to everyone. The Sun in Leo puts more weight on individual contribution and recognition, while Saturn in Aquarius holds to the standard meant to apply across the group. The opposition makes both positions difficult to ignore, and because both signs are fixed, neither side is likely to give way quickly. What can move is the agreement itself: what counts, who gets recognized, and which rule applies here.";

const ownerShapeResult = auditSkyCalendarFrameUniqueness([{
  key: "owner-approved-shape",
  forecast: ownerForecast,
  details: ownerDetails,
  forecastBeats: beats,
  detailsBeats: beats,
}]);
assert.equal(ownerShapeResult.pass, true, JSON.stringify(ownerShapeResult.defects, null, 2));

const repeatedFrameCards = Array.from({ length: DEFAULT_FRAME_CAP + 1 }, (_, index) => ({
  key: `repeat-${index + 1}`,
  forecast: `On Tuesday, August ${18 + index}, someone may want item ${index + 1} recognized while the answer coming back is that rule ${index + 1} applies. This produces consequence ${index + 1}. The pressure remains visible in version ${index + 1}. Movement changes term ${index + 1}.`,
  details: `Example ${index + 1} names both positions. Situation ${index + 1} becomes visible. Explanation ${index + 1} covers both sources. Pressure ${index + 1} shows the mechanism. Movement ${index + 1} identifies the changed term.`,
  forecastBeats: beats,
  detailsBeats: beats,
}));
const repeatedFrameResult = auditSkyCalendarFrameUniqueness(repeatedFrameCards);
assert.equal(repeatedFrameResult.pass, false);
assert.ok(repeatedFrameResult.defects.some((defect) => defect.code === "forecast_opener_frame_cap"));

const duplicateSentenceResult = auditSkyCalendarFrameUniqueness([
  {
    key: "duplicate-a",
    forecast: "One condition becomes visible. Shared exact sentence.",
    details: "First details construction explains both positions. A distinct ending remains.",
    forecastBeats: beats,
    detailsBeats: beats,
  },
  {
    key: "duplicate-b",
    forecast: "Another condition becomes visible. Shared exact sentence.",
    details: "Second details construction explains both positions. Another distinct ending remains.",
    forecastBeats: beats,
    detailsBeats: beats,
  },
]);
assert.equal(duplicateSentenceResult.pass, false);
assert.ok(duplicateSentenceResult.defects.some((defect) => defect.code === "duplicate_sentence"));

const verbatimComponentResult = auditSkyCalendarFrameUniqueness([{
  key: "verbatim-component",
  forecast: "A shared condition becomes visible. Both positions become difficult to ignore.",
  details: "A composed explanation names both positions. The terms remain under review.",
  forecastBeats: beats,
  detailsBeats: beats,
}], {
  componentValues: ["Both positions become difficult to ignore."],
});
assert.equal(verbatimComponentResult.pass, false);
assert.ok(verbatimComponentResult.defects.some((defect) => defect.code === "verbatim_component_sentence"));

assert.equal(
  constructionSkeleton("On Tuesday, August 18, someone may want their effort recognized while the answer comes back."),
  constructionSkeleton("On Wednesday, August 19, someone may want their work credited while the answer comes back."),
  "Date and content nouns should not hide a repeated opener construction",
);

console.log("Sky Calendar frame-uniqueness gate: PASS");
