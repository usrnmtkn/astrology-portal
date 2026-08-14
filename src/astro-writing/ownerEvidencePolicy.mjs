import {
  evidenceEntriesPresentedAsOwnerAuthoredGenerated,
  REQUIRED_CORE_EVIDENCE_ROLES
} from "./sharedEvidenceIndex.mjs";

export const OWNER_EVIDENCE_POLICY_VERSION = "shared-owner-evidence-v2-2026-08-13";
export const MIN_SAME_FAMILY_OWNER_PASSAGES = 3;
export const MIN_REGISTER_GOLD_PASSAGES = 1;

const ARTICLE_POLICY = Object.freeze({
  sameFamilyFamilies: Object.freeze(["sky-placement-current-sky-writer"]),
  allowedRegisters: Object.freeze(["collective", "second_person"]),
  minimumSameFamilyPassages: MIN_SAME_FAMILY_OWNER_PASSAGES,
  minimumRegisterGoldPassages: MIN_REGISTER_GOLD_PASSAGES,
  maximumSameFamilyPassages: 4,
  registerGoldIds: Object.freeze(["register-gold:sky-placement:saturn-capricorn-v3"])
});

export const OWNER_EVIDENCE_FAMILY_MAP = Object.freeze({
  "fast-mover-article": ARTICLE_POLICY,
  "slow-mover-article": ARTICLE_POLICY
});

export class OwnerEvidencePreconditionError extends Error {
  constructor(code, detail = {}) {
    super(`${code}:${JSON.stringify(detail)}`);
    this.name = "OwnerEvidencePreconditionError";
    this.code = code;
    this.detail = detail;
  }
}

export function ownerEvidencePolicyFor(family) {
  const policy = OWNER_EVIDENCE_FAMILY_MAP[family];
  if (!policy) {
    throw new OwnerEvidencePreconditionError("OWNER_EVIDENCE_FAMILY_MAPPING_REQUIRED", { family });
  }
  return policy;
}

export function normalizeOwnerEvidence(entry) {
  const text = typeof entry?.text === "string"
    ? entry.text
    : Array.isArray(entry?.sections)
      ? entry.sections.filter((value) => typeof value === "string" && value.trim()).join("\n\n")
      : "";
  return { ...entry, text };
}

export function assertPositiveOwnerEvidenceContext(context, { family } = {}) {
  const policy = ownerEvidencePolicyFor(family);
  const sameFamilyCount = context?.sameFamilyExamples?.length ?? 0;
  const registerGoldCount = context?.registerGoldExamples?.length ?? 0;
  const matrixAvailableCount = context?.evidencePolicy?.matrixEvidenceAvailableCount ?? 0;
  const matrixSelectedCount = context?.knowledgeMatrixExamples?.length ?? 0;
  const sceneAvailableCount = context?.evidencePolicy?.samePlanetSignSceneAvailableCount ?? 0;
  const sceneSelectedCount = context?.sceneExamples?.length ?? 0;
  const phraseThemeMatched = context?.evidencePolicy?.phraseThemeMatched === true;
  const phraseAvailableCount = context?.evidencePolicy?.phraseEvidenceAvailableCount ?? 0;
  const phraseSelectedCount = context?.phraseExamples?.length ?? 0;
  if (context?.evidencePolicy?.phraseEvidenceLookupPerformed !== true) {
    throw new OwnerEvidencePreconditionError("OWNER_PHRASE_EVIDENCE_LOOKUP_REQUIRED", {
      family,
      phraseSelectedCount
    });
  }
  if (context?.evidencePolicy?.matrixEvidenceAvailableCount == null) {
    throw new OwnerEvidencePreconditionError("OWNER_MATRIX_EVIDENCE_LOOKUP_REQUIRED", {
      family,
      matrixSelectedCount
    });
  }
  if (matrixAvailableCount > 0 && matrixSelectedCount === 0) {
    throw new OwnerEvidencePreconditionError("OWNER_MATRIX_EVIDENCE_MISSING", {
      family,
      matrixAvailableCount,
      matrixSelectedCount
    });
  }
  if (context?.evidencePolicy?.samePlanetSignSceneAvailableCount == null) {
    throw new OwnerEvidencePreconditionError("OWNER_SCENE_EVIDENCE_LOOKUP_REQUIRED", {
      family,
      sceneSelectedCount
    });
  }
  if (sceneAvailableCount > 0 && sceneSelectedCount === 0) {
    throw new OwnerEvidencePreconditionError("OWNER_SAME_PLANET_SIGN_SCENE_EVIDENCE_MISSING", {
      family,
      sceneAvailableCount,
      sceneSelectedCount
    });
  }
  if (phraseThemeMatched && phraseSelectedCount === 0) {
    throw new OwnerEvidencePreconditionError("OWNER_PHRASE_EVIDENCE_MISSING", {
      family,
      matchedThemes: context?.evidencePolicy?.phraseMatchedThemes ?? [],
      phraseAvailableCount,
      phraseSelectedCount
    });
  }
  if (sameFamilyCount === 0) {
    throw new OwnerEvidencePreconditionError("OWNER_POSITIVE_EVIDENCE_EMPTY", {
      family,
      matchedFamilies: policy.sameFamilyFamilies,
      sameFamilyCount,
      registerGoldCount
    });
  }
  if (sameFamilyCount < policy.minimumSameFamilyPassages) {
    throw new OwnerEvidencePreconditionError("OWNER_POSITIVE_EVIDENCE_BELOW_FLOOR", {
      family,
      minimum: policy.minimumSameFamilyPassages,
      actual: sameFamilyCount
    });
  }
  if (registerGoldCount < policy.minimumRegisterGoldPassages) {
    throw new OwnerEvidencePreconditionError("OWNER_REGISTER_GOLD_BELOW_FLOOR", {
      family,
      minimum: policy.minimumRegisterGoldPassages,
      actual: registerGoldCount,
      requiredIds: policy.registerGoldIds
    });
  }
  const packet = context?.sharedEvidencePacket;
  if (!packet) {
    throw new OwnerEvidencePreconditionError("OWNER_SHARED_EVIDENCE_PACKET_REQUIRED", { family });
  }
  const generatedLaundering = evidenceEntriesPresentedAsOwnerAuthoredGenerated(packet.entries);
  if (generatedLaundering.length) {
    throw new OwnerEvidencePreconditionError("GENERATED_COPY_AS_OWNER_EVIDENCE", {
      family,
      evidenceIds: generatedLaundering.map((entry) => entry.id)
    });
  }
  for (const role of REQUIRED_CORE_EVIDENCE_ROLES) {
    if ((packet.roles?.[role]?.length ?? 0) === 0) {
      throw new OwnerEvidencePreconditionError("OWNER_EVIDENCE_ROLE_MISSING", { family, role });
    }
  }
  return true;
}
