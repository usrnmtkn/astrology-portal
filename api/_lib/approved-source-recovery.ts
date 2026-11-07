import { createHash } from "node:crypto";
import { servingPackageRecords } from "./serving-package-records.js";
import { isGovernedReaderEligible } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.browser.js";
import { isRetiredCompositionKey } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/retiredCompositions.mjs";
// @ts-ignore The installed reader artifact exports its package identity.
import { PACKAGE_VERSION } from "../../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

/** Resolve installed writing on the server; saved/client approval claims are never inputs. */
export function approvedSourceBaseline(contentKey: string) {
  if (isRetiredCompositionKey(contentKey) || /^(?:calendar\/|studio-writing-profile\/|report\/)/u.test(contentKey)) return null;
  const record = servingPackageRecords.get(contentKey);
  if (!record || !isGovernedReaderEligible(record as any)) return null;
  return {
    contentKey,
    sha256: createHash("sha256").update(JSON.stringify(record)).digest("hex"),
    reviewStatus: record.review_status as string,
    packageVersion: PACKAGE_VERSION as string,
  };
}
