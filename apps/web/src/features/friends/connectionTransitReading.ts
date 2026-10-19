import type { AuthoredCard } from "../../content/fallbackArchitectureV3Runtime";
import { isGovernedReaderEligible } from "../../content/fallbackArchitectureV3/resolver/readerEligibility.browser";
import { isFriendsAcceptedApprovalLevel } from "../../content/fallbackApproval";
import { moonTransitNatalAliases } from "../../content/fallbackArchitectureV3/resolver/moonTransitVariants.mjs";
import { connectionAspectWord, fillConnectionVariables } from "../../content/connectionTransit";

type ReadingFacts = { transiting: string; natal: string; aspect: string; voice: string; window: string };

/** The existing personal reader chooses an identity. Only a same-contact
 * authored aspect source may supply A; never reuse its composed/adapted output.
 */
export function connectionTransitReading(facts: ReadingFacts, lookup: (key: string) => AuthoredCard | null, selectedKeys: Iterable<string>) {
  // Same-point conjunctions are returns, not connection aspect articles.
  if (facts.aspect === "conjunction" && facts.transiting === facts.natal) return null;
  const heavy = ["saturn", "uranus", "neptune", "pluto", "chiron"];
  const family = facts.aspect === "conjunction"
    ? heavy.includes(facts.transiting) || heavy.includes(facts.natal) ? "hard" : "soft"
    : ["sextile", "trine"].includes(facts.aspect) ? "soft" : ["square", "opposition"].includes(facts.aspect) ? "hard" : null;
  const key = [...selectedKeys].find(key => {
    const [type, surface, transiting, natal, aspect] = key.split("/");
    return type === "authored" && surface === "transit-aspect" && transiting === facts.transiting
      && [facts.natal, ...moonTransitNatalAliases(facts.transiting, facts.natal)].includes(natal)
      && [facts.aspect, family].includes(aspect);
  });
  if (!key) return null;
  const row = lookup(key);
  const approval = row?.approval as { approvalLevel?: string } | undefined;
  if (!row || row.contentKey !== key || !isGovernedReaderEligible(row) || !isFriendsAcceptedApprovalLevel(approval?.approvalLevel)) return null;
  const body = facts.voice === "you" ? row.body_you ?? row.body : row.body_they;
  if (typeof body !== "string" || !body.trim()) return null;
  const rendered = fillConnectionVariables(body, { Name: facts.voice, aspectWord: connectionAspectWord(facts.aspect), untilDate: facts.window.replace(/^until\s+/iu, "") });
  return rendered ? { body: rendered, contentKey: key } : null;
}
