import { createRequire } from "node:module";
import { retrieveOwnerContext } from "./retrieveOwnerContext.mjs";
import { assertSurfaceStrategy } from "./surfaceStrategies.mjs";

const require = createRequire(import.meta.url);
const phraseResolver = require("../../packages/astro-knowledge/scripts/phrase-resolver.js");

export function resolveVoiceEvidence({
  canonicalId,
  plan,
  examples = [],
  corrections = [],
  family,
  register,
  strategy,
  context = null
}) {
  assertSurfaceStrategy(strategy);
  const ownerContext = retrieveOwnerContext(plan, {
    relevantOwnerPassagesAvailableCount: 0,
    ownerPassageRelevanceTier: "none",
    examples,
    corrections,
    contentFamily: family,
    register
  });
  const phraseEnabled = strategy.voiceEvidenceRoles.includes("available-line")
    || strategy.voiceEvidenceRoles.includes("available-component");
  const phraseEvidence = phraseEnabled
    ? phraseResolver.assertPhraseEvidence(phraseResolver.selectPhrases(canonicalId, {
      context: context ?? {},
      surface: strategy.evidenceSurface
    }))
    : null;
  return Object.freeze({
    schemaVersion: 1,
    canonicalId,
    surfaceStrategy: strategy.id,
    allowedRoles: [...strategy.voiceEvidenceRoles],
    ownerContext,
    phraseEvidence,
    governance: Object.freeze({
      examplesMustBeOwnerApproved: true,
      reviewDraftsAreAuditOnly: true,
      phraseEvidenceIsNotAstrologicalTruth: true,
      scenePermissionIsNotVoiceEvidence: true
    })
  });
}

export function assertVoiceEvidence(evidence, strategy) {
  assertSurfaceStrategy(strategy);
  if (!evidence || evidence.surfaceStrategy !== strategy.id || !evidence.canonicalId) {
    throw new Error("VOICE_EVIDENCE_TARGET_MISMATCH: no provider call is allowed.");
  }
  if ((evidence.ownerContext?.examples ?? []).some((entry) => entry.ownerApproved !== true)) {
    throw new Error("VOICE_EVIDENCE_UNAPPROVED_EXAMPLE: no provider call is allowed.");
  }
  if (evidence.phraseEvidence) phraseResolver.assertPhraseEvidence(evidence.phraseEvidence);
  return evidence;
}

export function voiceEvidenceToPrompt(evidence) {
  const blocks = [];
  if (evidence.phraseEvidence) blocks.push(phraseResolver.phraseEvidenceToPrompt(evidence.phraseEvidence));
  return blocks.filter(Boolean).join("\n\n");
}

export function voiceEvidenceLedgerFields(evidence) {
  return {
    surfaceStrategy: evidence.surfaceStrategy,
    ownerExampleIds: (evidence.ownerContext?.examples ?? []).map((entry) => entry.id ?? entry.fixture_id).filter(Boolean),
    phraseIndexSha256: evidence.phraseEvidence?.phraseIndexSha256 ?? null,
    phraseSha256: (evidence.phraseEvidence?.availableLines ?? []).map((entry) => entry.phraseSha256),
    componentSha256: (evidence.phraseEvidence?.components?.exact ?? [])
      .flatMap((set) => set.components.map((entry) => entry.textSha256))
  };
}
