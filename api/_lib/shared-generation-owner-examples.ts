import crypto from "node:crypto";
import { isSkyIngressEssay } from "../../apps/web/src/content/skyIngressEssay.mjs";
import { ownerPositiveEvidenceFromVoiceIndexBySourceIds } from "../../src/astro-writing/ownerPositiveEvidence.mjs";

type VoiceEntry = {
  sourceId: string; sourcePath: string; sourceSha256: string; surface: string; structuralFunction: string; text: string;
  authorityClass: string; ownerAuthored: boolean; ownerApproved: boolean;
  useAsPositiveVoiceEvidence: boolean; useAsNegativeEvidence?: boolean;
};
type OwnerExampleSource = { id: string; contentKey: string; sourceFamily: string; structuralFunction: string; sourcePath: string; sourceRecordSha256: string; authorityClass: string; text: string };
type Target = { surface: string; eventType: string; contentKey: string; facts: Record<string, unknown> };
const words = (value: unknown) => new Set(JSON.stringify(value).toLowerCase().match(/[a-z][a-z'-]+/gu) ?? []);

function sourceFamilies(input: Target) {
  if (input.surface === 'sky' && isSkyIngressEssay(input.facts.articleFormat)) return ['sky-season'];
  const identity = `${input.surface} ${input.eventType} ${input.contentKey}`.toLowerCase();
  if (["synastry", "composite", "relationship", "friends"].includes(input.surface)
    || /synastry|bond-effect/u.test(identity)) return ["relationship-astrology"];
  if (/lunation|new-moon|full-moon|eclipse/u.test(identity)) return ["sky-lunation"];
  if (/season/u.test(identity)) return ["sky-season"];
  if (/daily|weekly/u.test(identity)) return ["weekly-astrology"];
  return ["sky-article-longform", "sky-article-reference"];
}

/** Use the governed owner index, never serving approval as a proxy for authorship.
 * These registered passages are adjacent voice references, not target facts. */
export function sharedGenerationOwnerExamples(index: { entries: VoiceEntry[] }, input: Target) {
  if (input.surface === "you" && input.eventType === "transit-aspect") {
    throw new Error("PERSONAL_TRANSIT_WRITER_CONTEXT_REQUIRED: use the dedicated meaning and voice inputs; no article fallback is allowed.");
  }
  const families = sourceFamilies(input);
  const ingressEssay = input.surface === "sky" && isSkyIngressEssay(input.facts.articleFormat);
  const seasonEssay = ingressEssay && input.facts.planet === 'sun';
  const register = ingressEssay ? "current_sky_direct_address" : input.surface === "sky" ? "collective" : "second_person";
  // Field descriptions, template plumbing and revision directions are not the
  // article's topic. Dated ingress prose can address its reader, unlike the
  // legacy collective Sky card register. Other surfaces keep their own routing.
  const needles = ingressEssay ? words([input.facts.planet, input.facts.sign]) : words(input);
  const candidates = index.entries.filter(entry =>
    entry.authorityClass === "owner_authored_final" && entry.ownerAuthored === true
    && entry.ownerApproved === true && entry.useAsPositiveVoiceEvidence === true
    && entry.useAsNegativeEvidence !== true && families.includes(entry.surface)
    && typeof entry.sourcePath === "string" && Boolean(entry.sourcePath.trim()) && /^[a-f0-9]{64}$/u.test(entry.sourceSha256)
    && typeof entry.text === "string" && Boolean(entry.text.trim())
    && (seasonEssay ? entry.structuralFunction === 'article paragraph'
      : /^(?:article paragraph|published article (?:opening|body) excerpt|paragraph under )/u.test(entry.structuralFunction))
    && !/^\s*(?:jump to horoscopes|horoscopes for)\b/iu.test(entry.text)
  ).map(entry => {
    const sourceRegister = /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(entry.text) ? "second_person" : "collective";
    const sourceTokens = `${entry.sourceId} ${entry.sourcePath}`.toLowerCase().split(/[^a-z]+/u);
    const exactSeason = seasonEssay && sourceTokens.includes(String(input.facts.sign).toLowerCase());
    return { entry, sourceRegister, score: (exactSeason ? 100 : 0)
      + [...words({ key: entry.sourceId, text: entry.text })].filter(word => needles.has(word)).length };
  }).filter(candidate => ingressEssay || candidate.sourceRegister === register)
    .sort((a, b) => b.score - a.score || a.entry.sourceId.localeCompare(b.entry.sourceId));
  // The owner designated the complete Libra overview for this guide's voice.
  // Preserve its eligible paragraphs in original order, rather than selecting
  // disconnected topical snippets or its separate rising-sign companion.
  const ordered = ingressEssay ? candidates.filter(({ entry }) => entry.structuralFunction === 'article paragraph'
    && entry.sourcePath.endsWith('/libra-season-autumn-equinox.md'))
    .sort((a, b) => a.entry.sourceId.localeCompare(b.entry.sourceId)) : candidates;
  const seen = new Set<string>();
  const complete = ordered.filter(({ entry }) => {
    if (seen.has(entry.text)) return false;
    seen.add(entry.text);
    return true;
  });
  const unique = ingressEssay ? complete : complete.slice(0, 4);
  if (unique.length < (ingressEssay ? 1 : 3)) throw new Error(`OWNER_POSITIVE_EVIDENCE_BELOW_FLOOR: ${families.join("|")}/${register}; no provider call is allowed.`);
  const sources = ownerPositiveEvidenceFromVoiceIndexBySourceIds(index, unique.map(({ entry }) => entry.sourceId), "shared-generation");
  const byId = new Map<string, OwnerExampleSource>(sources.map((source: OwnerExampleSource) => [source.id, source]));
  return unique.map(({ entry }) => {
    const source = byId.get(entry.sourceId)!;
    return {
      contentKey: source.contentKey, surface: source.sourceFamily, mode: "registered-owner-passage",
      eventType: source.structuralFunction, targetDate: "", headline: source.sourcePath,
      summary: "Adjacent owner-authored voice reference; preserve the target register and use only the target's supplied astrology facts.",
      body: source.text,
      evidence: { authority: source.authorityClass, sourceId: source.id, sourcePath: source.sourcePath,
        sourceSha256: source.sourceRecordSha256, wordCount: source.text.trim().split(/\s+/u).length, textSha256: crypto.createHash("sha256").update(source.text).digest("hex") }
    };
  });
}
