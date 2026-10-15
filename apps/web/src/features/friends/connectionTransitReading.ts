import type { AuthoredCard } from "../../content/fallbackArchitectureV3Runtime";
import { isGovernedReaderEligible } from "../../content/fallbackArchitectureV3/resolver/readerEligibility.browser";
import { isFriendsAcceptedApprovalLevel } from "../../content/fallbackApproval";
import { transitAspectSituationKey } from "../../content/transitNatalIdentity";
import { connectionAspectWord } from "../../content/connectionTransit";

type ReadingFacts = {
  transiting: string; natal: string; aspect: string; sign?: string;
  transitHouse?: number; natalHouse?: number; pass?: number; variant?: number;
  voice: string; window: string;
};

/** Reuse one complete authored transit-aspect unit for the selected contact.
 * Return cards, mirrors, generic contacts and composed templates are other types.
 */
export function connectionTransitReading(facts: ReadingFacts, lookup: (key: string) => AuthoredCard | null) {
  const { transiting, natal, aspect } = facts;
  const family = ["sextile", "trine"].includes(aspect) ? "soft" : ["square", "opposition"].includes(aspect) ? "hard" : null;
  const base = `authored/transit-aspect/${transiting}/${natal}/`;
  const keys = [transitAspectSituationKey(transiting, natal, aspect, facts.sign, facts.transitHouse, facts.natalHouse)];
  // Preserve the existing exact-before-family and pass/variant order, within A.
  for (const kind of [aspect, ...(family ? [family] : [])]) {
    if (facts.pass && facts.pass >= 1 && facts.pass <= 3) keys.push(`${base}${kind}/pass-${facts.pass}`);
    if (facts.variant) keys.push(`${base}${kind}/variant-${facts.variant}`);
    keys.push(`${base}${kind}`);
  }
  for (const key of keys) {
    if (!key) continue;
    const row = lookup(key);
    const approval = row?.approval as { approvalLevel?: string } | undefined;
    if (!row || row.contentKey !== key || !isGovernedReaderEligible(row) || !isFriendsAcceptedApprovalLevel(approval?.approvalLevel)) continue;
    const body = facts.voice === "you" ? row.body_you ?? row.body : row.body_they;
    if (typeof body !== "string" || !body.trim()) continue;
    if (/[{}]/u.test(body.replace(/\{\{\s*([^{}]+?)\s*\}\}/gu, ""))) return null;
    const slots: Record<string, string> = { Name: facts.voice, aspectWord: connectionAspectWord(aspect), untilDate: facts.window.replace(/^until\s+/iu, "") };
    let missing = false;
    const rendered = body.replace(/\{\{\s*([^{}]+?)\s*\}\}/gu, (_, slot: string) => {
      if (!Object.hasOwn(slots, slot) || !slots[slot]) { missing = true; return ""; }
      return slots[slot];
    });
    if (missing) return null;
    return { body: rendered, contentKey: key };
  }
  return null;
}
