import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { ZODIAC_SEASON_SOURCE_STARTERS } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs";

const require = createRequire(import.meta.url);
const bank = require("../../apps/web/src/content/fallbackArchitectureV3/source-rows/editorial-source-bank-v1.json");

// Authoring starters reuse whole, independently authored season/axis entries.
// They are not excerpts from historical articles, and confer no serving approval.
export const calendarWritingSourceStarters = ZODIAC_SEASON_SOURCE_STARTERS.map((starter: Record<string, any>) => {
  const collection = bank.collections.find((item: any) => item.id === (starter.contentKey.includes("zodiac-season-polar-axis/") ? "sign-axis-tensions" : "sign-season-content"));
  const entry = collection?.entries.find((item: any) => item.id === starter.sign || item.signs?.includes(starter.sign));
  if (!entry?.body?.trim()) throw new Error(`Missing existing season writing: ${starter.contentKey}`);
  return { ...starter, body: entry.body, source_keys: collection.source_keys,
    calendarWritingSource: { contentKey: `fallback-source/editorial/${collection.id}/${entry.id}`, title: collection.title,
      bankVersion: bank.bankVersion, bodySha256: createHash("sha256").update(entry.body).digest("hex"),
      wordCount: entry.body.trim().split(/\s+/u).length, originalBody: entry.body },
    review_status: "needs_review"
  };
});
