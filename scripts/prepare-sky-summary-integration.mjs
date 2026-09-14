// Temporary review helper. Applies only to one verified App blob in an isolated
// CI checkout. It never writes a branch, merges a PR, or runs during deployment.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
const path='apps/web/src/App.tsx';
const before=fs.readFileSync(path,'utf8');
const gitHash=text=>createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0`).update(text).digest('hex');
assert.equal(gitHash(before),'be2a1a41543a3f84e32d6a0062ddbe2a49f4e073','App changed; re-review integration anchors before proceeding.');
let source=before;
function once(oldText,newText) {
 assert.equal(source.split(oldText).length,2,`Expected one exact integration anchor: ${oldText.slice(0,80)}`);
 source=source.replace(oldText,newText);
}
once('function SkyCards({\n  onOpenEvent,\n  generatedContent,','function SkyCards({\n  onOpenEvent,');
once('  const [eventContent, setEventContent] = useState<Map<string, LiveGeneratedContent>>(new Map());','  const [summaryFactsError, setSummaryFactsError] = useState<string | null>(null);\n  const [summaryFactsRetry, setSummaryFactsRetry] = useState(0);');
once('    const anchor = new Date(sky.generatedAt);\n    void import("./services/calendarApi")','    setSummaryFactsError(null);\n    const anchor = new Date(sky.generatedAt);\n    void import("./services/calendarApi")');
once('        const keys = events.flatMap(ingressSummaryKeys);\n        if (keys.length) {\n          const content = await loadLiveGeneratedContentForKeys(keys);\n          if (active) setEventContent(content);\n        }','');
once('      }).catch(error => console.warn("Daily sky events could not load.", error));','      }).catch(error => {\n        console.warn("Daily sky events could not load.", error);\n        if (active) setSummaryFactsError(requestKey);\n      });');
once('  }, [requestKey]);\n  const events = dailyEvents.key === requestKey ? dailyEvents.events : [];\n  const summaryContent = new Map([...eventContent, ...generatedContent]);','  }, [requestKey, summaryFactsRetry]);\n  const events = dailyEvents.key === requestKey ? dailyEvents.events : [];');
once('      }).catch(error => console.warn("Daily sky lunation placements could not be verified.", error));','      }).catch(error => {\n        console.warn("Daily sky lunation placements could not be verified.", error);\n        if (active) setSummaryFactsError(exactEventKey);\n      });');
once('  }, [exactEventKey]);\n  const verifiedEventSky','  }, [exactEventKey, summaryFactsRetry]);\n  const verifiedEventSky');
once('  const summaryParts = skyDailySummaryParts({','  const summaryFacts = {');
once('    ...skySummaryEventFacts(events, summaryContent),\n','');
once('  }, summaryContent);','  };');
once('        <div className="sky-daily-summary__body" aria-label="Daily sky summary">\n          {skySummaryParagraphs(summaryParts).map','        <PublishedSkySummary facts={summaryFacts} events={events}\n          factsReady={dailyEvents.key === requestKey && (!exactEventKey || Boolean(verifiedEventSky))}\n          factsError={summaryFactsError === requestKey || Boolean(exactEventKey && summaryFactsError === exactEventKey)}\n          onRetryFacts={() => setSummaryFactsRetry(value => value + 1)}>\n          {summaryParts => skySummaryParagraphs(summaryParts).map');
once('          </p>)}\n        </div>\n\n        <button className="sky-today-ledger__foot"','          </p>)}\n        </PublishedSkySummary>\n\n        <button className="sky-today-ledger__foot"');
once('import { skyDailySummaryParts, skySummaryParagraphs } from "./content/skyDailySummary";','import { skySummaryParagraphs } from "./content/skyDailySummary";\nimport { PublishedSkySummary } from "./features/sky/PublishedSkySummary";');
once('import { ingressSummaryKeys, skySummaryEventFacts } from "./content/skySummaryEvents";\n','');
fs.writeFileSync(path,source);
console.log(JSON.stringify({path,before:gitHash(before),after:gitHash(source)}));
