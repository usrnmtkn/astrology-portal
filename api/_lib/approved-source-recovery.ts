import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { servingPackageRecords } from "./serving-package-records.js";
import { isGovernedReaderEligible } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.browser.js";
import { isRetiredCompositionKey } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/retiredCompositions.mjs";
// @ts-ignore The installed reader artifact exports its package identity.
import { PACKAGE_VERSION } from "../../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

/** Resolve installed writing on the server; saved/client approval claims are never inputs. */
export function approvedSourceBaseline(contentKey: string) {
  if (isRetiredCompositionKey(contentKey) || /^(?:calendar\/|studio-writing-profile\/|report\/)/u.test(contentKey)) return null;
  const record = servingPackageRecords.get(contentKey);
  if (!record && contentKey.startsWith("composite-")) return reviewedCompositeSignBaseline(contentKey);
  if (!record || !isGovernedReaderEligible(record as any)) return null;
  return {
    contentKey,
    sha256: createHash("sha256").update(JSON.stringify(record)).digest("hex"),
    reviewStatus: record.review_status as string,
    packageVersion: PACKAGE_VERSION as string,
  };
}

// These registered sign passages are compiled into the relationship reader from this source.
function reviewedCompositeSignBaseline(contentKey: string) {
  const match = /^composite-(sun|moon|ascendant)-in-(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)$/u.exec(contentKey);
  if (!match) return null;
  const [, planet, sign] = match;
  const url = new URL(`../../packages/astro-knowledge/data/composite/sign/${planet}_${sign}.json`, import.meta.url);
  const source = JSON.parse(readFileSync(url, "utf8"));
  if (source.id !== `${planet}_${sign}` || source.placementType !== "sign" || source.planet !== planet
    || source.sign !== sign || source.status !== "REVIEWED" || typeof source.plainTranslation !== "string" || !source.plainTranslation.trim()) return null;
  return { contentKey, sha256: createHash("sha256").update(JSON.stringify(source)).digest("hex"),
    reviewStatus: source.status, packageVersion: PACKAGE_VERSION as string };
}
