import { createRequire } from "node:module";
import type { AskTldrRankedEvidence, AskTldrRetrievalPlan } from "./ask-tldr-model.js";

const require = createRequire(import.meta.url);
const knowledgeResolver = require("../../packages/astro-knowledge/scripts/knowledge-resolver.js") as {
  resolve: (canonicalId: string, options?: { surface?: string; usage?: "primary" | "mechanism-reference" }) => {
    id: string;
    kind: string | null;
    records: Array<Record<string, unknown>>;
  };
  buildPacket: (canonicalId: string, options?: Record<string, unknown>) => Record<string, unknown>;
  buildMultiTargetPacket: (canonicalIds: string[], options?: Record<string, unknown>) => Record<string, unknown>;
  packetToPrompt: (packet: Record<string, unknown>) => string;
  multiTargetPacketToPrompt: (packet: Record<string, unknown>) => string;
  loadIndex: () => { byId: Map<string, unknown> };
};

const APPROVED_AUTHORITIES = new Set(["owner-approved-prose", "factual-evidence"]);
const FILTER_ID = "ask-tldr-question-relevance-v1";

function words(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function token(value: string) {
  return value.trim().toLowerCase().replaceAll("_", "-").replace(/\s+/gu, "-");
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function approvedRecord(record: Record<string, unknown>) {
  return APPROVED_AUTHORITIES.has(words(record.authorityClass));
}

function matchedSelectors(factor: AskTldrRankedEvidence, plan: AskTldrRetrievalPlan) {
  const houses = unique((factor.houses ?? []).filter((house) => plan.focus.houses.includes(house)));
  const angleWanted = new Set(plan.focus.angles.map((value) => value.toLowerCase()));
  const angles = unique((factor.angles ?? []).filter((angle) => angleWanted.has(angle.toLowerCase())));
  const pointWanted = new Set(plan.focus.points.map((value) => value.toLowerCase()));
  const points = unique((factor.points ?? []).filter((point) => pointWanted.has(point.toLowerCase())));
  return { houses, angles, points };
}

function targetIds(factor: AskTldrRankedEvidence, plan: AskTldrRetrievalPlan) {
  const matched = matchedSelectors(factor, plan);
  const ids = [
    ...matched.houses.map((house) => `house/${house}`),
    ...matched.angles.map((angle) => `body/${token(angle)}`),
    ...matched.points.map((point) => `body/${token(point)}`)
  ];
  return { matched, ids: unique(ids).filter((id) => knowledgeResolver.loadIndex().byId.has(id)) };
}

export type AskTldrQuestionRelevanceEvidence = {
  status: "full" | "missing";
  matched: { houses: number[]; angles: string[]; points: string[] };
  canonicalIds: string[];
  packet: Record<string, unknown> | null;
  promptEvidence: string | null;
  packetSha256: string | null;
};

export function resolveAskTldrQuestionRelevanceEvidence(input: {
  factor: AskTldrRankedEvidence;
  plan: AskTldrRetrievalPlan;
}): AskTldrQuestionRelevanceEvidence {
  const { matched, ids } = targetIds(input.factor, input.plan);
  const hasRequiredMatch = input.plan.focus.houses.length > 0 || input.plan.focus.angles.length > 0
    ? matched.houses.length > 0 || matched.angles.length > 0
    : input.plan.focus.points.length > 0
      ? matched.points.length > 0
      : true;
  if (!hasRequiredMatch || ids.length === 0) {
    return { status: "missing", matched, canonicalIds: ids, packet: null, promptEvidence: null, packetSha256: null };
  }
  const approvedIds = ids.filter((canonicalId) => {
    const resolved = knowledgeResolver.resolve(canonicalId, { surface: "you-transit", usage: "mechanism-reference" });
    return resolved.kind && resolved.records.some(approvedRecord);
  });
  if (!approvedIds.length) {
    return { status: "missing", matched, canonicalIds: [], packet: null, promptEvidence: null, packetSha256: null };
  }
  const options = {
    surface: "you-transit",
    register: "article",
    targetUsage: "mechanism-reference",
    targetUsages: approvedIds.map(() => "mechanism-reference"),
    includeRelated: false,
    recordFilter: approvedRecord,
    filterId: FILTER_ID
  };
  const packet = approvedIds.length === 1
    ? knowledgeResolver.buildPacket(approvedIds[0], options)
    : knowledgeResolver.buildMultiTargetPacket(approvedIds, options);
  const promptEvidence = approvedIds.length === 1
    ? knowledgeResolver.packetToPrompt(packet)
    : knowledgeResolver.multiTargetPacketToPrompt(packet);
  return {
    status: "full",
    matched,
    canonicalIds: approvedIds,
    packet,
    promptEvidence,
    packetSha256: words(packet.packetSha256) || null
  };
}
