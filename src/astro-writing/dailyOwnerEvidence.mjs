import {isOrdinaryMoonIngress} from './dailyWriterFacts.mjs';

export const DAILY_OWNER_EVIDENCE='daily-owner-evidence/v1-2026-10-31';

/** Rank voice evidence against this audience's actual developments. An ordinary
 * Moon placement must not become the shared subject of all twelve requests.
 * This chooses evidence relevance, not a story, required transit or outcome. */
export function dailyOwnerEvidenceQuery(developments,{rising,savedOutline=''}) {
  const significant=developments.events.filter(event=>!isOrdinaryMoonIngress(event));
  const candidates=significant.length?significant:developments.background.filter(entry=>entry.planet!=='moon');
  const bindings=candidates.flatMap(entry=>entry.placements??[entry]);
  return {version:DAILY_OWNER_EVIDENCE,surface:'daily',register:'second_person',audienceSign:rising,
    humanSituation:[savedOutline,...bindings.map(entry=>entry.domain)].filter(Boolean).join('\n'),
    mechanism:JSON.stringify(candidates),
    factIds:candidates.map(entry=>entry.id),
    bindings:bindings.map(({planet,sign,house,domain})=>({planet,sign,house,domain})),
    use:'Voice relevance only. Actual house topics come from each calculated participant. Complete examples supply prose behavior, not their historical facts, scenarios, timing or a required concern. Ordinary Moon facts remain in the complete writing input.'};
}
