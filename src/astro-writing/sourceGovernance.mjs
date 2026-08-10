export const SOURCE_AUTHORITY = Object.freeze([
  "exact-owner-approved",
  "explicit-owner-correction",
  "owner-corpus",
  "owner-approved-knowledge-matrix",
  "owner-voice-bank",
  "governed-neutral-astrology",
  "external-neutral-fact"
]);

export function sourceAuthorityRank(sourceClass) {
  const rank = SOURCE_AUTHORITY.indexOf(sourceClass);
  if (rank < 0) throw new Error(`Unknown source authority: ${sourceClass}`);
  return rank;
}

export function extractNeutralExternalMeaning({ sourceId, provenance, facts, externalProse }) {
  if (!sourceId || !provenance) throw new Error("External meaning extraction requires source ID and provenance.");
  if (!Array.isArray(facts) || !facts.length || facts.some((fact) => typeof fact !== "string" || !fact.trim())) {
    throw new Error("External meaning extraction requires neutral structured facts.");
  }
  if (typeof externalProse === "string" && externalProse.trim()) {
    throw new Error("Derivative-laundering guard: full external prose cannot enter drafting context.");
  }
  return Object.freeze({
    sourceId,
    sourceClass: "external-neutral-fact",
    provenance,
    neutralFacts: facts.map((fact) => fact.trim()),
    draftingText: null
  });
}

export function sortGovernedSources(sources) {
  return [...sources].sort((first, second) => sourceAuthorityRank(first.sourceClass) - sourceAuthorityRank(second.sourceClass));
}
