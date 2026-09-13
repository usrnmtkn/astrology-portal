import assert from "node:assert/strict";
import { installContentPublications } from "../apps/web/src/content/contentPublicationState.ts";
import { clearPublishedSkySummaryCopyCache } from "../apps/web/src/content/skyDailySummaryPublishedCopyCache.ts";
import { skyDailySummaryParts } from "../apps/web/src/content/skyDailySummary.ts";

const sunKey = "cms/sky-daily-summary/sun/virgo";
const moonKey = "cms/sky-daily-summary/moon/libra/regular";
const sunUpdatedAt = "2026-09-13T19:00:00.123456Z";
const moonUpdatedAt = "2026-09-13T19:00:01.123456Z";
const facts = {
  sun: { sign: "Virgo", degree: 21 },
  moon: { sign: "Libra", degree: 26 },
  moonIsVoid: true,
  voidRemainingLabel: "7 hours 4 minutes",
  retrogradePlanets: ["Saturn", "Uranus", "Neptune", "Pluto", "Chiron", "Lilith"]
};
const publication = (content_key: string, revision: number, row_id: string, row_updated_at: string) => ({
  content_key,
  state: "live" as const,
  revision,
  row_id,
  row_updated_at,
  updated_at: row_updated_at
});
const text = (content = new Map<string, any>()) => skyDailySummaryParts(facts, content).map(part => part.text).join("");

clearPublishedSkySummaryCopyCache();
installContentPublications([
  publication(sunKey, 1, "sun-row-1", sunUpdatedAt),
  publication(moonKey, 1, "moon-row-1", moonUpdatedAt)
]);

assert.equal(text(), "", "A known live Daily Sky revision must not flash bundled or factual fallback copy while its exact row hydrates.");

const firstHydration = new Map<string, any>([
  [sunKey, {
    id: "sun-row-1",
    updatedAt: sunUpdatedAt,
    status: "LIVE",
    body: "turns our attention to the daily rituals and systems we rely on, helping us see which support us and which have become too rigid, demanding, or punishing"
  }],
  [moonKey, {
    id: "moon-row-1",
    updatedAt: moonUpdatedAt,
    status: "LIVE",
    body: "reads the balance sheet, and evening things out is how it self-soothes"
  }]
]);
const firstText = text(firstHydration);
assert.match(firstText, /The Moon in Libra at 26° reads the balance sheet/u);
assert.doesNotMatch(firstText, /The Moon moves through Libra/u);
assert.equal(text(), firstText, "After exact hydration, the same published copy must remain stable if the async content map temporarily clears.");

const nextMoonUpdatedAt = "2026-09-13T19:30:01.654321Z";
installContentPublications([publication(moonKey, 2, "moon-row-2", nextMoonUpdatedAt)]);
assert.equal(text(), "", "A new publication identity must invalidate the prior cached sentence instead of showing stale copy during hydration.");
assert.equal(text(firstHydration), "", "An older hydrated row cannot substitute for a newly published revision.");

const secondHydration = new Map(firstHydration);
secondHydration.set(moonKey, {
  id: "moon-row-2",
  updatedAt: nextMoonUpdatedAt,
  status: "LIVE",
  body: "makes fairness, tone, and the give-and-take between people easier to notice"
});
const secondText = text(secondHydration);
assert.match(secondText, /The Moon in Libra at 26° makes fairness, tone/u);
assert.doesNotMatch(secondText, /reads the balance sheet|The Moon moves through Libra/u);
assert.equal(text(), secondText, "The exact new revision becomes the only cached Daily Sky wording after hydration.");

console.log("PASS Daily Sky holds one exact published summary across async hydration and revision changes");
