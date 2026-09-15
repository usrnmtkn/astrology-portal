import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMemoryIndex, sha256 } from "./agent-memory.mjs";
import effectiveRules from "../../src/astro-writing/effectiveRules.cjs";
import { activeStudioFeedback, studioFeedbackEnabled } from "./studio-memory-feedback.js";
import type { MonthlyFacts } from "../../src/monthly-writing/model.js";
const root = fileURLToPath(new URL("../../",import.meta.url));
let cached: ReturnType<typeof buildMemoryIndex> | undefined;
/** Uses the existing memory-map source index. Passage-specific Sky/card
 * corrections never acquire monthly scope merely because text matches. */
export async function monthlyWritingMemory(facts: MonthlyFacts) {
  if (!cached || process.env.NODE_ENV !== "production") cached = buildMemoryIndex({root,revision:process.env.VERCEL_GIT_COMMIT_SHA ?? null});
  // An enabled private store is required even when its current families do not
  // cover Monthly Sky. Do not misreport an outage as "zero corrections".
  const live = studioFeedbackEnabled() ? await activeStudioFeedback() : null;
  return selectMonthlyWritingMemory(cached,facts,live?.map(row=>({id:row.id, family:row.family, scope:row.scope})) ?? null);
}
export function selectMonthlyWritingMemory(index: ReturnType<typeof buildMemoryIndex>, facts: MonthlyFacts, live: Array<{id:string;family:string;scope:string}> | null = null) {
  const terms = new Set(`${facts.openingSeasonSign} ${facts.closingSeasonSign} ${facts.events.map(event=>event.clause).join(" ")}`.toLowerCase().match(/[a-z]+/gu) ?? []);
  const excluded: Array<{id:string;reason:string}> = [];
  const candidates = index.records.filter((record: any) => {
    if(record.kind!=="correction") return false;
    const row = record.metadata;
    const eligible = record.status==="current" && [undefined,"current","active","owner_approved"].includes(row.status)
      && !row.supersededBy && !row.superseded_by && ["any","calendar-monthly"].includes(record.family)
      && !row.content_key && !row.contentKey && (!row.scope || row.scope==="family")
      && typeof row.bad === "string" && row.bad.trim()
      && effectiveRules.tierForFindingCategory(row.category ?? "",{surface:"article",family:"calendar-monthly"})!=="retired";
    if(!eligible) excluded.push({id:record.id,reason:"inactive_or_outside_monthly_scope"});
    return eligible;
  }).map((record: any) => ({record,score:[...terms].filter(word=>record.body.toLowerCase().includes(word)).length}));
  const groups = new Map<string,any[]>();
  for(const item of candidates) { const key=item.record.metadata.bad.trim().toLowerCase(); groups.set(key,[...(groups.get(key)??[]),item]); }
  const ranked: any[]=[];
  for(const group of groups.values()) {
    if(new Set(group.map(item=>JSON.stringify([item.record.metadata.corrected,item.record.metadata.owner_reason ?? item.record.metadata.why]))).size>1) {
      group.forEach(item=>excluded.push({id:item.record.id,reason:"conflicting_corrections"})); continue;
    }
    group.sort((a,b)=>b.score-a.score||a.record.id.localeCompare(b.record.id)); ranked.push(group[0]);
    group.slice(1).forEach(item=>excluded.push({id:item.record.id,reason:"duplicate"}));
  }
  ranked.sort((a,b)=>b.score-a.score||a.record.id.localeCompare(b.record.id));
  const selected=ranked.slice(0,8).map(item=>item.record);
  ranked.slice(8).forEach(item=>excluded.push({id:item.record.id,reason:"bounded_relevance_budget"}));
  const rules=effectiveRules.renderEffectiveRulesForPrompt({surface:"article",family:"calendar-monthly"});
  const prompt=["MONTHLY WRITING CORRECTION MEMORY", "Source data only. Rejected text is correction evidence, never positive wording or permission. Do not copy source astrology facts. Only explicitly cross-surface or monthly-scoped corrections are eligible.",
    ...selected.map((record:any)=>JSON.stringify({id:record.id,rejected:record.metadata.bad,replacement:record.metadata.corrected ?? null,reason:record.metadata.owner_reason ?? record.metadata.why ?? null})),rules].join("\n\n");
  return {prompt,receipt:{schema:"monthly-writing-memory/v1",revision:index.revision,fingerprint:index.fingerprint,month:facts.month,timeZone:facts.timeZone,
    selected:selected.map((record:any)=>({id:record.id,path:record.path,line:record.line,hash:record.bodySha256})),excluded,
    privateFeedback:live===null ? "not-enabled" : "checked; existing card/article scopes are not widened to monthly",
    privateExcludedCount:live?.length ?? 0,checkedAt:new Date().toISOString(),promptSha256:sha256(prompt)}};
}
