import {
  SKY_PLACEMENT_SPINE_ELEMENTS,
  spineQualityElementsForFamily,
  SPINE_QUALITY_REQUIREMENTS
} from "./spineQuality.mjs";

const qualityRequirementsFor = (elements) => Object.freeze(Object.fromEntries(
  elements.map((element) => [element, SPINE_QUALITY_REQUIREMENTS[element]])
));

export const SPINE_REGISTRY_VERSION = "sky-placement-article-spine-v1-2026-08-14";

export const SPINE_USAGE_POLICY = Object.freeze({
  satisfactionMode: "semantic_presence_plus_element_quality_not_reader_facing_template",
  ownerRulingDate: "2026-08-14",
  slotsAsChecksOwnerRulingDate: "2026-08-13",
  readerCopyRule: "A spine element is satisfied when its content is present in the prose, not when a sentence announces it.",
  structuralVocabulary: Object.freeze([
    "the job of",
    "this is a period for",
    "the collective lesson is"
  ]),
  constructionReuseRule: "A construction approved once does not license its reuse; repetition across a set turns a strong line into machinery.",
  registerRule: "The page speaks to the reader. Direct address is used; the fourth wall stays intact.",
  inheritedElementRule: "Prior approval under an earlier standard does not satisfy the current spine.",
  negationPivotPageCap: 1,
  symbolRule: "Mythology and symbolism appear when they interpret the mechanism.",
  coldReadRule: "Every sentence is judged as rendered prose, read cold."
});

export const CONTENT_SPINES = Object.freeze({
  "slow-mover-article": Object.freeze({
    id: "sky-placement-article-slow-mover-v1",
    status: "recorded",
    ownerApproved: true,
    ownerRulingDate: "2026-08-14",
    satisfactionMode: SPINE_USAGE_POLICY.satisfactionMode,
    fields: Object.freeze([
      "planet",
      "condition",
      "handoff",
      "thesis",
      "lived_evidence",
      "failure_mechanism",
      "strategy",
      "era_frame",
      "recurrence",
      "older_analogs",
      "collective_lesson",
      "close"
    ]),
    qualityRequirements: qualityRequirementsFor(spineQualityElementsForFamily("slow-mover-article"))
  }),
  "fast-mover-article": Object.freeze({
    id: "sky-placement-article-fast-mover-v1",
    status: "recorded",
    ownerApproved: true,
    ownerRulingDate: "2026-08-14",
    satisfactionMode: SPINE_USAGE_POLICY.satisfactionMode,
    fields: Object.freeze([
      "planet",
      "condition",
      "handoff",
      "thesis",
      "lived_evidence",
      "failure_mechanism",
      "strategy",
      "close"
    ]),
    qualityRequirements: qualityRequirementsFor(SKY_PLACEMENT_SPINE_ELEMENTS),
    rules: Object.freeze({
      condition: "Include when the planet has dignity in the sign. State the rulership and explain what it changes about how directly the planet operates. When the sign has a symbol, the symbol interprets the mechanism.",
      handoff: "One opening sentence names the prior sign and its dates and what the focus shifts from and to."
    })
  })
});

export const SPINE_COVERAGE = Object.freeze([
  Object.freeze({ family: "slow-mover-article", status: "recorded", spineId: "sky-placement-article-slow-mover-v1" }),
  Object.freeze({ family: "fast-mover-article", status: "recorded", spineId: "sky-placement-article-fast-mover-v1" }),
  Object.freeze({ family: "cards", status: "missing" }),
  Object.freeze({ family: "lunations", status: "missing" }),
  Object.freeze({ family: "aspects", status: "missing" }),
  Object.freeze({ family: "house-cores", status: "missing" })
]);

export function getContentSpine(family) {
  return CONTENT_SPINES[String(family ?? "").trim()] ?? null;
}

export function assertContentSpine(family) {
  const spine = getContentSpine(family);
  if (!spine || spine.status !== "recorded") throw new Error(`RECORDED_CONTENT_SPINE_REQUIRED:${family}`);
  return spine;
}

export function missingContentSpines() {
  return SPINE_COVERAGE.filter((entry) => entry.status === "missing").map((entry) => entry.family);
}
