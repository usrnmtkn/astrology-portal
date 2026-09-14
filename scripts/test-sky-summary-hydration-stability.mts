import assert from "node:assert/strict";
import { installContentPublications } from "../apps/web/src/content/contentPublicationState.ts";
import { skyDailySummaryParts } from "../apps/web/src/content/skyDailySummary.ts";

const key = "cms/sky-daily-summary/moon/libra/regular";
const updatedAtA = "2026-09-13T18:00:00.000001Z";
const updatedAtB = "2026-09-13T18:10:00.000002Z";
const facts = {
  sun: { sign: "Virgo", degree: 21 },
  moon: { sign: "Libra", degree: 26 },
  moonIsVoid: true,
  voidRemainingLabel: "7h 4m"
};
const text = (content = new Map<string, any>()) => skyDailySummaryParts(facts, content).map(part => part.text).join("");

installContentPublications([{
  content_key: key,
  state: "live",
  revision: 1,
  row_id: "moon-libra-a",
  row_updated_at: updatedAtA,
  updated_at: updatedAtA
}]);

const first = new Map([[key, {
  id: "moon-libra-a",
  updatedAt: updatedAtA,
  status: "LIVE",
  body: "reads the balance sheet, and evening things out is how it self-soothes"
}]]);
assert.match(text(first), /reads the balance sheet/);
assert.match(text(), /reads the balance sheet/, "A temporary empty hydration map must retain the exact verified live Moon summary.");
assert.doesNotMatch(text(), /Moon moves through Libra/, "Background revalidation must not rewrite the visible Moon sentence to its missing-source fallback.");

installContentPublications([{
  content_key: key,
  state: "live",
  revision: 2,
  row_id: "moon-libra-b",
  row_updated_at: updatedAtB,
  updated_at: updatedAtB
}]);
assert.doesNotMatch(text(), /reads the balance sheet/, "A new publication identity must invalidate the previous verified body.");

const second = new Map([[key, {
  id: "moon-libra-b",
  updatedAt: updatedAtB,
  status: "LIVE",
  body: "brings fairness, tone, and the give-and-take between people into clearer view"
}]]);
assert.match(text(second), /brings fairness, tone/);
assert.match(text(), /brings fairness, tone/, "The new verified revision must remain stable across a later hydration reset.");

installContentPublications([{
  content_key: key,
  state: "retired",
  revision: 3,
  row_id: "moon-libra-b",
  row_updated_at: updatedAtB,
  updated_at: "2026-09-13T18:20:00.000003Z"
}]);
assert.doesNotMatch(text(), /reads the balance sheet|brings fairness, tone/, "Retirement must clear verified cached reader copy.");

console.log("PASS Sky daily summary keeps the last verified publication stable during hydration without crossing revision or retirement boundaries.");
