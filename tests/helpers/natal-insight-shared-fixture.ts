import { natalInsightRulerPlanets, natalInsightRuledHouses, natalInsightRulerPlacementKey, natalInsightHouseConnectionKey, natalInsightOptionalSlots, natalInsightTopics, natalInsightSigns, natalInsightPassageGroups, natalInsightPassageKey, natalInsightTemplateKey, natalInsightSlotGroups, natalInsightTemplateSlots, natalInsightPassageSlots } from "../../apps/web/src/content/natalInsightCatalog";

import { natalInsightFixtureHeadings } from "./natal-insight-heading-fixture";
import { natalInsightGuideKey } from "../../apps/web/src/content/natalInsightCatalog";

export function natalInsightGuideFixtureRows(status = "LIVE") {
  return natalInsightTopics.map(topic => ({
    id: `guide-${topic.id}`, content_key: natalInsightGuideKey(topic.id), headline: topic.title,
    body: `Complete ${topic.id} guide opening.\nWhat we look at in your chart:\n- First chart factor.\n- Second chart factor.\n- For example: Complete ${topic.id} guide ending.`,
    summary: "", sections: {}, facts: {}, surface: "natal", mode: "article", status, lane: "serving",
    review_state: status === "LIVE" ? null : "EDITORIAL_REVIEW_REQUIRED", target_date: null,
    block_type: "essay", updated_at: "2026-10-09T00:00:00Z", created_at: "2026-10-09T00:00:00Z",
    source_snapshot: { contentType: "mustache-template", contentSystem: "cms-surface-override", content_role: "full_copy", allowedSlots: [] }
  }));
}

// Synthetic copy only. Owner drafts and reader profiles never enter fixtures.
export function natalInsightSharedFixtureRows(status = "LIVE") {
  const rows: Array<Record<string, any>> = [];
  const add = (key: string, headline: string, body: string, template: boolean) => rows.push({
    id: `shared-insight-${rows.length}`, content_key: key, headline, body, summary: "", sections: {}, facts: {},
    surface: "natal", mode: "article", status, lane: "serving", review_state: status === "LIVE" ? null : "EDITORIAL_REVIEW_REQUIRED",
    event_type: "natal-insight-shared", target_date: null, block_type: "essay", updated_at: "2026-10-07T00:00:00Z", created_at: "2026-10-07T00:00:00Z",
    source_snapshot: { contentType: "mustache-template", contentSystem: "cms-surface-override", content_role: template ? "template" : "passage", allowedSlots: template ? natalInsightTemplateSlots : natalInsightPassageSlots }
  });
  for (const group of natalInsightPassageGroups) for (const value of group === "ruler-house" ? Array.from({ length: 12 }, (_, i) => i + 1) : natalInsightSigns) {
    add(natalInsightPassageKey(group, value), `${group} ${value}`, `{{#insightIsYou}}**You can read the complete ${group} ${value} passage.** Its final sentence stays editable.{{/insightIsYou}}{{^insightIsYou}}**They can read the complete ${group} ${value} passage.** Its final sentence stays editable.{{/insightIsYou}}`, false);
  }
  for (const audience of ["you", "friend"] as const) {
    for (const planet of natalInsightRulerPlanets) for (const sign of natalInsightSigns) {
      add(natalInsightRulerPlacementKey(audience, planet, sign), `${audience} ruler ${planet} ${sign}`, `**Complete ${audience} ${planet} in ${sign} interpretation.** Its final sentence stays editable.`, false);
    }
    for (const source of natalInsightRuledHouses) for (let destination = 1; destination <= 12; destination++) {
      add(natalInsightHouseConnectionKey(audience, source, destination), `${audience} house ${source} ruler in ${destination}`, `**Complete ${audience} house ${source} to ${destination} connection through {{rulerName}}.** Its final sentence stays editable.`, false);
    }
  }
  for (const topic of natalInsightTopics) for (const audience of ["you", "friend"] as const) for (const untimed of topic.id === "approach" ? [false, true] : [false]) {
    add(natalInsightTemplateKey(topic.id, audience, untimed), topic.title, Object.keys(natalInsightSlotGroups(topic.id, untimed, audience)).map(slot => {
      const heading = natalInsightFixtureHeadings[natalInsightTemplateKey(topic.id, audience, untimed)]?.[slot];
      const unit = `${heading ? `${heading}\n\n` : ""}{{${slot}}}`;
      return natalInsightOptionalSlots.includes(slot) ? `{{#${slot}}}${unit}{{/${slot}}}` : unit;
    }).join("\n\n"), true);
  }
  return rows;
}
